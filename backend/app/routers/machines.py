from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Machine
from app.schemas import MachineCreate, MachineUpdate, MachineResponse
from app.routers.stats import invalidate_stats

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
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
    new_mach = Machine(**machine.model_dump())
    db.add(new_mach)
    db.commit()
    db.refresh(new_mach)
    invalidate_stats()
    return new_mach


@router.put("/{machine_id}", response_model=MachineResponse)
def update_machine(machine_id: int, machine: MachineUpdate, db: Session = Depends(get_db)):
    existing = db.query(Machine).filter(Machine.id == machine_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Machine not found")
    for field, value in machine.model_dump(exclude_unset=True).items():
        setattr(existing, field, value)
    db.commit()
    db.refresh(existing)
    invalidate_stats()
    return existing


@router.delete("/{machine_id}")
def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    existing = db.query(Machine).filter(Machine.id == machine_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Machine not found")
    existing.is_active = False
    db.commit()
    invalidate_stats()
    return {"message": "Machine deactivated", "id": machine_id}
