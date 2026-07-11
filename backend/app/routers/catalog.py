"""Public catalog — no auth required."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.products import _enrich_product, _batch_load_related

router = APIRouter(prefix="/api/v1", tags=["catalog"])


@router.get("/catalog")
def get_catalog(db: Session = Depends(get_db)):
    """Public endpoint — return active products for the customer catalog."""
    from app.models import Product
    products = db.query(Product).filter(Product.is_active == True).all()
    machines_dict, materials_dict = _batch_load_related(db)
    return [_enrich_product(p, db, machines_dict, materials_dict) for p in products]


@router.get("/catalog/categories")
def get_catalog_categories(db: Session = Depends(get_db)):
    """Public endpoint — return active categories for the customer catalog."""
    from app.models import Category
    cats = db.query(Category).filter(Category.is_active == True).order_by(Category.sort_order, Category.name).all()
    return [{"id": c.id, "name": c.name, "description": c.description} for c in cats]
