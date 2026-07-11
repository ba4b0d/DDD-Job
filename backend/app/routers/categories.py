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

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).filter(Category.is_active == True).order_by(Category.sort_order, Category.name).all()

    # Batch-load product counts with a single GROUP BY query (fixes N+1)
    count_rows = (
        db.query(Product.category, func.count(Product.id))
        .filter(Product.is_active == True)
        .group_by(Product.category)
        .all()
    )
    cat_counts = {cat_name: count for cat_name, count in count_rows}

    result = []
    for c in cats:
        result.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "product_count": cat_counts.get(c.name, 0),
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
            # Rename in all products too
            db.query(Product).filter(Product.category == cat.name).update({"category": new_name})
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

    # Clear category from products instead of deleting them
    db.query(Product).filter(Product.category == cat.name).update({"category": ""})
    db.delete(cat)
    db.commit()
    return {"message": "دسته‌بندی حذف شد"}
