"""Public catalog — no auth required."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Product
from app.calculator import calculate_product_costs_from_dicts
from app.cache import get_settings_dict

router = APIRouter(prefix="/api/v1", tags=["catalog"])


def _public_base_url(request: Request) -> str:
    """Build site origin from reverse-proxy headers (works with any domain on Pi5).

    OpenResty/Caddy terminate TLS and often forward to Docker nginx on :80.
    Inner nginx then sets X-Forwarded-Proto=$scheme → http, so sitemap would
    emit http://… unless we correct for non-local public hosts.
    """
    # Prefer first value if a chain of proxies sent a comma list
    raw_proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "https")
    proto = raw_proto.split(",")[0].strip().lower() or "https"

    raw_host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.netloc
        or ""
    )
    host = raw_host.split(",")[0].strip()
    bare = host.split(":")[0].lower()

    local = (
        bare in ("localhost", "127.0.0.1", "0.0.0.0", "::1")
        or bare.endswith(".local")
        or bare.startswith("192.168.")
        or bare.startswith("10.")
        or bare.startswith("172.")
    )
    # Public domain behind TLS terminator → always https in sitemap/absolute URLs
    if not local and proto == "http":
        proto = "https"

    return f"{proto}://{host}".rstrip("/")


from app.repositories.products import batch_load_machines_and_materials as _batch_load_related


def _catalog_product(product: Product, machines_dict: dict, materials_dict: dict, settings: dict) -> dict:
    """Public catalog product — no cost breakdowns, no margins."""
    mat = materials_dict.get(product.material_id) if product.material_id else None
    mach = machines_dict.get(product.machine_id) if product.machine_id else None

    material_name = mat.name if mat else None
    material_color = mat.color if mat else None
    machine_name = mach.name if mach else None

    return {
        "id": product.id,
        "product_id": product.product_id,
        "name": product.name,
        "category": product.category,  # Keep for backward compat
        "categories": [{"id": c.id, "name": c.name} for c in (product.categories or [])],
        "collections": [{"id": c.id, "name": c.name, "slug": c.slug} for c in (product.collections or [])],
        "machine_name": machine_name,
        "material_name": material_name,
        "material_color": material_color,
        "weight_g": product.weight_g,
        "dimension_x": product.dimension_x,
        "dimension_y": product.dimension_y,
        "dimension_z": product.dimension_z,
        "print_time_hours": product.print_time_hours,
        "post_pro_hours": product.post_pro_hours,
        "extras_cost": product.extras_cost,
        "final_price": product.final_price,
        "image_url": product.image_url,
        "notes": getattr(product, "notes", None) or "",
        "package_info": getattr(product, "package_info", None) or "",
        "created_at": getattr(product, "created_at", None),
        "slug": getattr(product, "slug", None),
        "tags": getattr(product, "tags", None),
        "images": [
            {"id": img.id, "image_url": img.image_url, "sort_order": img.sort_order, "is_primary": img.is_primary}
            for img in (product.images or [])
        ],
        "suggested_price": calculate_product_costs_from_dicts(product, mat, mach, settings).get("suggested_price", 0),
    }


from app.routers.auth import limiter


# IMPORTANT: static routes BEFORE parameterized /catalog/{product_id}
@router.get("/catalog")
@limiter.limit("60/minute")
def get_catalog(request: Request, db: Session = Depends(get_db)):
    """Public endpoint — return active products for the customer catalog."""
    products = db.query(Product).options(selectinload(Product.images), selectinload(Product.categories)).filter(Product.is_active == True).all()
    machines_dict, materials_dict = _batch_load_related(db)
    settings = get_settings_dict(db)
    return [_catalog_product(p, machines_dict, materials_dict, settings) for p in products]


@router.get("/catalog/categories")
def get_catalog_categories(db: Session = Depends(get_db)):
    """Public endpoint — return active categories as a tree for the customer catalog."""
    from app.models import Category
    cats = db.query(Category).filter(Category.is_active == True).order_by(Category.sort_order, Category.name).all()
    flat = [{"id": c.id, "name": c.name, "description": c.description, "parent_id": c.parent_id} for c in cats]

    def build_tree(parent_id=None):
        tree = []
        for c in flat:
            if c["parent_id"] == parent_id:
                children = build_tree(c["id"])
                node = {**c, "children": children}
                tree.append(node)
        tree.sort(key=lambda x: x["name"])
        return tree

    return build_tree()


@router.get("/sitemap.xml", response_class=Response)
def get_sitemap(request: Request, db: Session = Depends(get_db)):
    """Dynamic sitemap: static public pages + active products + blog posts if enabled."""
    base = _public_base_url(request)
    now = datetime.now(timezone.utc).date().isoformat()

    static_pages = [
        ("/", "1.0", "weekly"),
        ("/catalog", "0.9", "weekly"),
        ("/contact", "0.7", "monthly"),
        ("/how-to-order", "0.7", "monthly"),
    ]

    urls = []
    for path, priority, freq in static_pages:
        urls.append(
            f"  <url>\n"
            f"    <loc>{base}{path}</loc>\n"
            f"    <lastmod>{now}</lastmod>\n"
            f"    <changefreq>{freq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            f"  </url>"
        )

    products = (
        db.query(Product)
        .filter(Product.is_active == True, Product.slug.isnot(None), Product.slug != "")
        .order_by(Product.id)
        .all()
    )
    for p in products:
        created = getattr(p, "created_at", None)
        lastmod = created.date().isoformat() if created else now
        urls.append(
            f"  <url>\n"
            f"    <loc>{base}/catalog/{p.slug}</loc>\n"
            f"    <lastmod>{lastmod}</lastmod>\n"
            f"    <changefreq>weekly</changefreq>\n"
            f"    <priority>0.8</priority>\n"
            f"  </url>"
        )

    settings = get_settings_dict(db)
    if settings.get("enable_blog", 0.0) > 0:
        from app.models import BlogPost
        posts = (
            db.query(BlogPost)
            .filter(BlogPost.is_published == True, BlogPost.slug.isnot(None), BlogPost.slug != "")
            .order_by(BlogPost.id)
            .all()
        )
        for post in posts:
            created = getattr(post, "created_at", None)
            lastmod = created.date().isoformat() if created else now
            urls.append(
                f"  <url>\n"
                f"    <loc>{base}/blog/{post.slug}</loc>\n"
                f"    <lastmod>{lastmod}</lastmod>\n"
                f"    <changefreq>weekly</changefreq>\n"
                f"    <priority>0.7</priority>\n"
                f"  </url>"
            )

    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )
    return Response(content=body, media_type="application/xml")


@router.get("/robots.txt", response_class=Response)
def get_robots_txt(request: Request):
    """Dynamic robots.txt referencing sitemap.xml."""
    base = _public_base_url(request)
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Allow: /api/v1/catalog\n"
        "Allow: /api/v1/brand\n"
        "Allow: /api/v1/contact\n"
        "Disallow: /admin/\n"
        "Disallow: /dashboard\n"
        "Disallow: /login\n"
        "Disallow: /settings\n"
        "Disallow: /orders\n"
        "Disallow: /users\n"
        "Disallow: /api/v1/auth/\n"
        "Disallow: /api/v1/products\n"
        "Disallow: /api/v1/orders\n"
        "Disallow: /api/v1/settings\n"
        "Disallow: /api/v1/machines\n"
        "Disallow: /api/v1/materials\n"
        "Disallow: /api/v1/users\n"
        "Disallow: /api/v1/backup\n"
        f"\nSitemap: {base}/sitemap.xml\n"
    )
    return Response(content=body, media_type="text/plain")



@router.get("/catalog/by-slug/{slug}")
@limiter.limit("60/minute")
def get_catalog_product_by_slug(request: Request, slug: str, db: Session = Depends(get_db)):
    """Public endpoint — return a single active product by slug."""
    product = (
        db.query(Product)
        .options(selectinload(Product.images))
        .filter(Product.slug == slug, Product.is_active == True)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    machines_dict, materials_dict = _batch_load_related(db)
    settings = get_settings_dict(db)
    return _catalog_product(product, machines_dict, materials_dict, settings)


@router.get("/catalog/{product_id}")
@limiter.limit("60/minute")
def get_catalog_product(request: Request, product_id: int, db: Session = Depends(get_db)):
    """Public endpoint — return a single active product by ID."""
    product = (
        db.query(Product)
        .options(selectinload(Product.images))
        .filter(Product.id == product_id, Product.is_active == True)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    machines_dict, materials_dict = _batch_load_related(db)
    settings = get_settings_dict(db)
    return _catalog_product(product, machines_dict, materials_dict, settings)
