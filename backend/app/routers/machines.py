from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Machine
from app.schemas import MachineCreate, MachineUpdate, MachineResponse
from app.routers.stats import invalidate_stats
from app.routers.auth import require_admin

router = APIRouter(prefix="/api/v1/machines", tags=["machines"])


@router.get("/all", response_model=list[MachineResponse])
def get_all_machines(db: Session = Depends(get_db)):
    """Return ALL machines including inactive."""
    return db.query(Machine).all()


@router.get("", response_model=list[MachineResponse])
def get_active_machines(db: Session = Depends(get_db)):
    """Return only active machines."""
    return db.query(Machine).filter(Machine.is_active == True).all()


@router.post("", response_model=MachineResponse, status_code=201)
def create_machine(machine: MachineCreate, user=Depends(require_admin), db: Session = Depends(get_db)):
    data = machine.model_dump()
    if data.get("is_default"):
        db.query(Machine).update({"is_default": False})
    new_mach = Machine(**data)
    db.add(new_mach)
    db.commit()
    db.refresh(new_mach)
    invalidate_stats()
    return new_mach


@router.put("/{machine_id}", response_model=MachineResponse)
def update_machine(machine_id: int, machine: MachineUpdate, user=Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(Machine).filter(Machine.id == machine_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Machine not found")
    data = machine.model_dump(exclude_unset=True)
    if data.get("is_default"):
        db.query(Machine).filter(Machine.id != machine_id).update({"is_default": False})
    for field, value in data.items():
        setattr(existing, field, value)
    db.commit()
    db.refresh(existing)
    invalidate_stats()
    return existing


@router.post("/{machine_id}/set-default", response_model=MachineResponse)
def set_default_machine(machine_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(Machine).filter(Machine.id == machine_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Machine not found")
    db.query(Machine).update({"is_default": False})
    existing.is_default = True
    db.commit()
    db.refresh(existing)
    invalidate_stats()
    return existing


@router.delete("/{machine_id}")
def delete_machine(machine_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(Machine).filter(Machine.id == machine_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Machine not found")
    existing.is_active = False
    db.commit()
    invalidate_stats()
    return {"message": "Machine deactivated", "id": machine_id}


@router.delete("/{machine_id}/permanent")
def permanent_delete_machine(machine_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(Machine).filter(Machine.id == machine_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Machine not found")
    from app.models import Product
    in_use = db.query(Product).filter(Product.machine_id == machine_id).count()
    if in_use:
        raise HTTPException(
            status_code=400,
            detail=f"این ماشین توسط {in_use} محصول استفاده می‌شود و نمی‌توان آن را برای همیشه حذف کرد. ابتدا محصولات را به ماشین دیگری تغییر دهید، یا فقط آن را مخفی کنید.",
        )
    # If the deleted machine was the default printer, fall back to none so the
    # form auto-select simply skips until the user picks one.
    db.delete(existing)
    db.commit()
    invalidate_stats()
    return {"message": "Machine permanently deleted", "id": machine_id}
