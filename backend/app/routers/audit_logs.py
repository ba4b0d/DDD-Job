"""
Audit log — read-only view of who changed what.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog
from app.routers.auth import require_admin

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


@router.get("")
def list_audit_logs(limit: int = Query(100, ge=1, le=500), user=Depends(require_admin), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "user": l.user,
            "action": l.action,
            "entity": l.entity,
            "entity_id": l.entity_id,
            "summary": l.summary,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]