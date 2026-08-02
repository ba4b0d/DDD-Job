"""
Collection CRUD — admin and employee can manage collections.
Supports grouping products into named collections with product_ids association.
"""
import re
import unicodedata
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Collection, Product, ProductCollection
from app.schemas import CollectionCreate, CollectionUpdate, CollectionResponse
from app.routers.auth import require_any_role
from app.routers.stats import invalidate_stats

router = APIRouter(prefix="/api/v1/collections", tags=["collections"])


def _slugify(name: str) -> str:
    """Convert collection name to a URL-safe slug."""
    if not name:
        return ""
    slug = re.sub(r"[^\w\s-]", "", name, flags=re.UNICODE).strip().lower()
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug or "collection"


def _collection_dict(c: Collection, db: Session) -> dict:
    """Build collection response dict with product_ids and count."""
    p_ids = [p.id for p in c.products if p.is_active]
    return {
        "id": c.id,
        "name": c.name,
        "slug": c.slug,
        "description": c.description or "",
        "is_active": c.is_active,
        "sort_order": c.sort_order,
        "product_count": len(p_ids),
        "product_ids": p_ids,
    }


@router.get("", dependencies=[Depends(require_any_role)])
def list_collections(db: Session = Depends(get_db)):
    collections = db.query(Collection).filter(Collection.is_active == True).order_by(Collection.sort_order, Collection.name).all()
    return [_collection_dict(c, db) for c in collections]


@router.get("/all", dependencies=[Depends(require_any_role)])
def list_all_collections(db: Session = Depends(get_db)):
    collections = db.query(Collection).order_by(Collection.sort_order, Collection.name).all()
    return [_collection_dict(c, db) for c in collections]


@router.post("")
def create_collection(body: CollectionCreate, user=Depends(require_any_role), db: Session = Depends(get_db)):
    name = body.name
    if db.query(Collection).filter(Collection.name == name).first():
        raise HTTPException(status_code=400, detail="این کالکشن قبلاً وجود دارد")

    slug = body.slug or _slugify(name)
    base_slug = slug
    i = 1
    while db.query(Collection).filter(Collection.slug == slug).first():
        slug = f"{base_slug}-{i}"
        i += 1

    coll = Collection(
        name=name,
        slug=slug,
        description=body.description or "",
        sort_order=body.sort_order or 0,
    )
    db.add(coll)
    db.flush()

    if body.product_ids:
        for p_id in body.product_ids:
            p = db.query(Product).filter(Product.id == p_id).first()
            if p:
                db.add(ProductCollection(product_id=p_id, collection_id=coll.id))

    db.commit()
    db.refresh(coll)
    invalidate_stats()
    return _collection_dict(coll, db)


@router.get("/{coll_id}")
def get_collection(coll_id: int, db: Session = Depends(get_db)):
    coll = db.query(Collection).filter(Collection.id == coll_id).first()
    if not coll:
        raise HTTPException(status_code=404, detail="کالکشن یافت نشد")
    return _collection_dict(coll, db)


@router.get("/by-slug/{slug}")
def get_collection_by_slug(slug: str, db: Session = Depends(get_db)):
    coll = db.query(Collection).filter(Collection.slug == slug, Collection.is_active == True).first()
    if not coll:
        raise HTTPException(status_code=404, detail="کالکشن یافت نشد")
    return _collection_dict(coll, db)


@router.put("/{coll_id}")
def update_collection(coll_id: int, body: CollectionUpdate, user=Depends(require_any_role), db: Session = Depends(get_db)):
    coll = db.query(Collection).filter(Collection.id == coll_id).first()
    if not coll:
        raise HTTPException(status_code=404, detail="کالکشن یافت نشد")

    if body.name is not None:
        new_name = body.name
        if new_name != coll.name:
            if db.query(Collection).filter(Collection.name == new_name).first():
                raise HTTPException(status_code=400, detail="این نام قبلاً استفاده شده است")
            coll.name = new_name

    if body.description is not None:
        coll.description = body.description
    if body.is_active is not None:
        coll.is_active = body.is_active
    if body.sort_order is not None:
        coll.sort_order = body.sort_order
    if body.slug is not None and body.slug != coll.slug:
        slug = body.slug
        base_slug = slug
        i = 1
        while db.query(Collection).filter(Collection.slug == slug, Collection.id != coll_id).first():
            slug = f"{base_slug}-{i}"
            i += 1
        coll.slug = slug

    if body.product_ids is not None:
        db.query(ProductCollection).filter(ProductCollection.collection_id == coll_id).delete()
        for p_id in body.product_ids:
            p = db.query(Product).filter(Product.id == p_id).first()
            if p:
                db.add(ProductCollection(product_id=p_id, collection_id=coll_id))

    db.commit()
    db.refresh(coll)
    invalidate_stats()
    return _collection_dict(coll, db)


@router.delete("/{coll_id}")
def delete_collection(coll_id: int, user=Depends(require_any_role), db: Session = Depends(get_db)):
    coll = db.query(Collection).filter(Collection.id == coll_id).first()
    if not coll:
        raise HTTPException(status_code=404, detail="کالکشن یافت نشد")

    db.delete(coll)
    db.commit()
    invalidate_stats()
    return {"message": "کالکشن حذف شد", "id": coll_id}
