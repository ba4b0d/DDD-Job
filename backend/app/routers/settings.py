from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Settings
from app.schemas import SettingsUpdate, SettingsBulkUpdate, SettingsResponse
from app.cache import invalidate_settings_cache
from app.routers.stats import invalidate_stats

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.get("")
def get_all_settings(db: Session = Depends(get_db)):
    """Return all settings as a flat key-value dict."""
    settings = db.query(Settings).all()
    return {s.key: {"value": s.value, "description": s.description, "id": s.id, "string_value": s.string_value or ""} for s in settings}


@router.put("")
def update_settings(payload: SettingsBulkUpdate, db: Session = Depends(get_db)):
    """Update one or more settings by key."""
    updated = []
    for item in payload.settings:
        setting = db.query(Settings).filter(Settings.key == item.key).first()
        if setting:
            setting.value = item.value
            if hasattr(item, 'string_value') and item.string_value is not None:
                setting.string_value = item.string_value
            if item.description is not None:
                setting.description = item.description
            updated.append(setting.key)
        else:
            sv = getattr(item, 'string_value', None) or ""
            new_setting = Settings(key=item.key, value=item.value, string_value=sv, description=item.description or "")
            db.add(new_setting)
            updated.append(item.key)
    db.commit()
    invalidate_settings_cache()
    invalidate_stats()
    return {"updated": updated}
