"""Lightweight audit logging — record who changed what."""
from sqlalchemy.orm import Session
from app.models import AuditLog


def log(db: Session, user: str, action: str, entity: str, entity_id: int | None = None, summary: str = ""):
    """Append an audit entry. Best-effort: never raises."""
    try:
        db.add(AuditLog(
            user=user or "system",
            action=action,
            entity=entity,
            entity_id=entity_id,
            summary=summary,
        ))
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass


def log_user(user: dict, db: Session, action: str, entity: str, entity_id: int | None = None, summary: str = ""):
    """Log with the requesting user's username from the auth dict."""
    username = ""
    if isinstance(user, dict):
        username = user.get("username") or user.get("display_name") or ""
    return log(db, username, action, entity, entity_id, summary)
