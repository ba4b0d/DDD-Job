"""Public catalog — no auth required."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Product
from app.calculator import calculate_product_costs_from_dicts
from app.cache import get_settings_dict

router = APIRouter(prefix="/api/v1", tags=["catalog"])


def _batch_load_related(db: Session):
    """Pre-fetch machines and materials into lookup dicts to avoid N+1 queries."""
    from app.models import Machine, Material
    machines = {m.id: m for m in db.query(Machine).all()}
    materials = {m.id: m for m in db.query(Material).all()}
    return machines, materials


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
        "category": product.category,
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
        "created_at": getattr(product, "created_at", None),
        "images": [
            {"id": img.id, "image_url": img.image_url, "sort_order": img.sort_order, "is_primary": img.is_primary}
            for img in (product.images or [])
        ],
        "suggested_price": calculate_product_costs_from_dicts(product, mat, mach, settings).get("suggested_price", 0),
    }


# IMPORTANT: static routes BEFORE parameterized /catalog/{product_id}
@router.get("/catalog")
def get_catalog(db: Session = Depends(get_db)):
    """Public endpoint — return active products for the customer catalog."""
    products = db.query(Product).options(selectinload(Product.images)).filter(Product.is_active == True).all()
    machines_dict, materials_dict = _batch_load_related(db)
    settings = get_settings_dict(db)
    return [_catalog_product(p, machines_dict, materials_dict, settings) for p in products]


@router.get("/catalog/categories")
def get_catalog_categories(db: Session = Depends(get_db)):
    """Public endpoint — return active categories for the customer catalog."""
    from app.models import Category
    cats = db.query(Category).filter(Category.is_active == True).order_by(Category.sort_order, Category.name).all()
    return [{"id": c.id, "name": c.name, "description": c.description} for c in cats]


@router.get("/catalog/{product_id}")
def get_catalog_product(product_id: int, db: Session = Depends(get_db)):
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
