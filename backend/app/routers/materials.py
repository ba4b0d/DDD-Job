from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Material
from app.schemas import MaterialCreate, MaterialUpdate, MaterialResponse
from app.routers.stats import invalidate_stats
from app.routers.auth import require_admin
router = APIRouter(prefix="/api/v1/materials", tags=["materials"])


@router.get("/all", response_model=list[MaterialResponse])
def get_all_materials(db: Session = Depends(get_db)):
    """Return ALL materials including inactive."""
    return db.query(Material).all()


@router.get("", response_model=list[MaterialResponse])
def get_active_materials(db: Session = Depends(get_db)):
    """Return only active materials."""
    return db.query(Material).filter(Material.is_active == True).all()


@router.post("", response_model=MaterialResponse, status_code=201)
def create_material(material: MaterialCreate, user=Depends(require_admin), db: Session = Depends(get_db)):
    # Uniqueness check: reject duplicate (name + color) combos
    if (
        db.query(Material)
        .filter(Material.name == material.name, Material.color == material.color)
        .first()
    ):
        raise HTTPException(status_code=400, detail="ماده با این نام و رنگ قبلاً وجود دارد")
    data = material.model_dump()
    if data.get("is_default"):
        db.query(Material).update({"is_default": False})
    new_mat = Material(**data)
    db.add(new_mat)
    db.commit()
    db.refresh(new_mat)
    invalidate_stats()
    return new_mat


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(material_id: int, material: MaterialUpdate, user=Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.id == material_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    data = material.model_dump(exclude_unset=True)
    if data.get("is_default"):
        db.query(Material).filter(Material.id != material_id).update({"is_default": False})
    for field, value in data.items():
        setattr(existing, field, value)
    db.commit()
    db.refresh(existing)
    invalidate_stats()
    return existing


@router.post("/{material_id}/set-default", response_model=MaterialResponse)
def set_default_material(material_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.id == material_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    db.query(Material).update({"is_default": False})
    existing.is_default = True
    db.commit()
    db.refresh(existing)
    invalidate_stats()
    return existing


@router.delete("/{material_id}")
def delete_material(material_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.id == material_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    existing.is_active = False
    db.commit()
    invalidate_stats()
    return {"message": "Material deactivated", "id": material_id}


@router.delete("/{material_id}/permanent")
def permanent_delete_material(material_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.id == material_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    from app.models import Product
    in_use = db.query(Product).filter(Product.material_id == material_id).count()
    if in_use:
        raise HTTPException(
            status_code=400,
            detail=f"این ماده توسط {in_use} محصول استفاده می‌شود و نمی‌توان آن را برای همیشه حذف کرد. ابتدا محصولات را به مادهٔ دیگری تغییر دهید، یا فقط آن را مخفی کنید.",
        )
    db.delete(existing)
    db.commit()
    invalidate_stats()
    return {"message": "Material permanently deleted", "id": material_id}
