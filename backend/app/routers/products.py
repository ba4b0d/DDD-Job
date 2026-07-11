from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import uuid, os, shutil

from app.database import get_db
from app.models import Product, Machine, Material
from app.repositories.products import ProductRepository
from app.schemas import (
    ProductCreate, ProductUpdate, ProductResponse,
    CalculateRequest, CalculateResponse,
)
from app.calculator import calculate_product_costs, calculate_product_costs_from_dicts
from app.cache import get_settings_dict
from app.routers.stats import invalidate_stats

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB

router = APIRouter(prefix="/api/v1", tags=["products"])


def _enrich_product(product: Product, db: Session, machines_dict: dict = None, materials_dict: dict = None) -> dict:
    """Build ProductResponse dict with computed costs."""
    # Use pre-fetched dicts when available to avoid per-product DB queries
    if machines_dict is not None and materials_dict is not None:
        mat = materials_dict.get(product.material_id) if product.material_id else None
        mach = machines_dict.get(product.machine_id) if product.machine_id else None
        settings = get_settings_dict(db)
        costs = calculate_product_costs_from_dicts(product, mat, mach, settings)
        machine_name = mach.name if mach else None
        material_name = mat.name if mat else None
        material_color = mat.color if mat else None
    else:
        costs = calculate_product_costs(
            db,
            weight_g=product.weight_g,
            support_g=product.support_g,
            flushed_g=product.flushed_g,
            print_time_hours=product.print_time_hours,
            post_pro_hours=product.post_pro_hours,
            extras_cost=product.extras_cost,
            machine_id=product.machine_id,
            material_id=product.material_id,
        )
        machine_name = product.machine.name if product.machine else None
        material_name = product.material.name if product.material else None
        material_color = product.material.color if product.material else None

    data = {
        "id": product.id,
        "product_id": product.product_id,
        "name": product.name,
        "qty": product.qty,
        "machine_id": product.machine_id,
        "machine_name": machine_name,
        "material_id": product.material_id,
        "material_name": material_name,
        "material_color": material_color,
        "weight_g": product.weight_g,
        "support_g": product.support_g,
        "flushed_g": product.flushed_g,
        "print_time_hours": product.print_time_hours,
        "post_pro_hours": product.post_pro_hours,
        "extras_cost": product.extras_cost,
        "image_url": product.image_url,
        "final_price": product.final_price,
        "category": product.category,
        "notes": product.notes,
        "is_active": product.is_active,
    }
    data.update(costs)
    return data


def _batch_load_related(db: Session):
    """Pre-fetch machines and materials into lookup dicts to avoid N+1 queries."""
    machines = {m.id: m for m in db.query(Machine).all()}
    materials = {m.id: m for m in db.query(Material).all()}
    return machines, materials


# ── Specific routes BEFORE parameterized ──────────────────────────────

@router.get("/products/all", response_model=list[ProductResponse])
def get_all_products(db: Session = Depends(get_db)):
    """Return ALL products including inactive, with computed costs."""
    repo = ProductRepository(db)
    products = repo.get_all(active_only=False)
    machines_dict, materials_dict = _batch_load_related(db)
    return [_enrich_product(p, db, machines_dict, materials_dict) for p in products]


@router.get("/products", response_model=list[ProductResponse])
def get_active_products(db: Session = Depends(get_db)):
    """Return only active products with computed costs."""
    repo = ProductRepository(db)
    products = repo.get_all(active_only=True)
    machines_dict, materials_dict = _batch_load_related(db)
    return [_enrich_product(p, db, machines_dict, materials_dict) for p in products]


@router.get("/products/categories")
def get_categories(db: Session = Depends(get_db)):
    """Return distinct product categories with counts."""
    products = db.query(Product).filter(Product.is_active == True).all()
    cats: dict[str, int] = {}
    for p in products:
        cat = p.category or "uncategorized"
        cats[cat] = cats.get(cat, 0) + 1
    return cats


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Return single product with computed costs."""
    repo = ProductRepository(db)
    product = repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _enrich_product(product, db)


@router.post("/products", response_model=ProductResponse, status_code=201)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    repo = ProductRepository(db)
    try:
        new_prod = repo.create(product.model_dump())
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="خطا در ایجاد محصول")
    invalidate_stats()
    return _enrich_product(new_prod, db)


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product: ProductUpdate, db: Session = Depends(get_db)):
    repo = ProductRepository(db)
    updated = repo.update(product_id, product.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    invalidate_stats()
    return _enrich_product(updated, db)


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    repo = ProductRepository(db)
    if not repo.delete(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    invalidate_stats()
    return {"message": "Product deactivated", "id": product_id}


@router.post("/products/{product_id}/image")
async def upload_product_image(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload an image for a product. Accepts multipart file upload."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File must be JPEG, PNG, WebP, or GIF")

    # Check file size (read content first)
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="حجم فایل نباید بیشتر از ۱۰ مگابایت باشد")
    await file.seek(0)

    # Delete old image if exists
    if product.image_url:
        old_filename = product.image_url.split("/")[-1]
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    # Save new image with UUID filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    product.image_url = f"/uploads/{filename}"
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="خطا در ذخیره تصویر")
    db.refresh(product)

    return {"message": "Image uploaded", "image_url": product.image_url}


@router.delete("/products/{product_id}/image")
def delete_product_image(product_id: int, db: Session = Depends(get_db)):
    """Remove the image from a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.image_url:
        filename = product.image_url.split("/")[-1]
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)

    product.image_url = None
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="خطا در حذف تصویر")

    return {"message": "Image removed"}


# ── Stateless calculator ──────────────────────────────────────────────

@router.post("/calculate", response_model=CalculateResponse)
def stateless_calculator(req: CalculateRequest, db: Session = Depends(get_db)):
    """Calculate costs without creating a product."""
    costs = calculate_product_costs(
        db,
        weight_g=req.weight_g,
        support_g=req.support_g,
        flushed_g=req.flushed_g,
        print_time_hours=req.print_time_hours,
        post_pro_hours=req.post_pro_hours,
        extras_cost=req.extras_cost,
        machine_id=req.machine_id,
        material_id=req.material_id,
    )
    return costs
