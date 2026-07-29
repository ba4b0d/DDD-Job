"""
Category CRUD — admin and employee can manage categories.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Category, Product
from app.schemas import CategoryCreate, CategoryUpdate
from app.routers.auth import require_any_role
from app.routers.stats import invalidate_stats

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("", dependencies=[Depends(require_any_role)])
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).filter(Category.is_active == True).order_by(Category.sort_order, Category.name).all()

    from app.models import ProductCategory
    count_rows = (
        db.query(ProductCategory.category_id, func.count(ProductCategory.product_id))
        .join(Product, Product.id == ProductCategory.product_id)
        .filter(Product.is_active == True)
        .group_by(ProductCategory.category_id)
        .all()
    )
    cat_counts = {cat_id: count for cat_id, count in count_rows}

    result = []
    for c in cats:
        result.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "product_count": cat_counts.get(c.id, 0),
            "sort_order": c.sort_order,
        })
    return result


@router.post("")
def create_category(body: CategoryCreate, user=Depends(require_any_role), db: Session = Depends(get_db)):
    name = body.name
    if db.query(Category).filter(Category.name == name).first():
        raise HTTPException(status_code=400, detail="این دسته‌بندی قبلاً وجود دارد")

    cat = Category(name=name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": cat.id, "name": cat.name, "message": "دسته‌بندی ایجاد شد"}


@router.put("/{cat_id}")
def update_category(cat_id: int, body: CategoryUpdate, user=Depends(require_any_role), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="دسته‌بندی یافت نشد")

    if body.name is not None:
        new_name = body.name
        if new_name != cat.name:
            if db.query(Category).filter(Category.name == new_name).first():
                raise HTTPException(status_code=400, detail="این نام قبلاً استفاده شده")
            cat.name = new_name

    if body.description is not None:
        cat.description = body.description
    if body.sort_order is not None:
        cat.sort_order = body.sort_order

    db.commit()
    return {"message": "دسته‌بندی به‌روزرسانی شد"}


@router.delete("/{cat_id}")
def delete_category(cat_id: int, user=Depends(require_any_role), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="دسته‌بندی یافت نشد")

    from app.models import ProductCategory
    # Clear category associations in junction table
    db.query(ProductCategory).filter(ProductCategory.category_id == cat_id).delete()
    db.delete(cat)
    db.commit()
    invalidate_stats()
    return {"message": "دسته‌بندی حذف شد"}
