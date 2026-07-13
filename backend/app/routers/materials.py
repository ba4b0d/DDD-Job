from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Material
from app.schemas import MaterialCreate, MaterialUpdate, MaterialResponse
from app.routers.stats import invalidate_stats

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
def create_material(material: MaterialCreate, db: Session = Depends(get_db)):
    # Uniqueness check: reject duplicate names
    if db.query(Material).filter(Material.name == material.name).first():
        raise HTTPException(status_code=400, detail="ماده با این نام قبلاً وجود دارد")
    new_mat = Material(**material.model_dump())
    db.add(new_mat)
    db.commit()
    db.refresh(new_mat)
    invalidate_stats()
    return new_mat


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(material_id: int, material: MaterialUpdate, db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.id == material_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    for field, value in material.model_dump(exclude_unset=True).items():
        setattr(existing, field, value)
    db.commit()
    db.refresh(existing)
    invalidate_stats()
    return existing


@router.delete("/{material_id}")
def delete_material(material_id: int, db: Session = Depends(get_db)):
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
    db.delete(existing)
    db.commit()
    invalidate_stats()
    return {"message": "Material permanently deleted", "id": material_id}
