from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Settings
from app.schemas import SettingsUpdate, SettingsBulkUpdate, SettingsResponse
from app.cache import invalidate_settings_cache
from app.routers.stats import invalidate_stats

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


ALLOWED_PUBLIC_KEYS = {"favicon_url", "logo_url", "site_name", "site_title"}


@router.get("")
def get_all_settings(db: Session = Depends(get_db)):
    """Return all settings as a flat key-value dict."""
    settings = db.query(Settings).all()
    return {s.key: {"value": s.value, "description": s.description, "id": s.id, "string_value": s.string_value or ""} for s in settings}


@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    """DEPRECATED: This route is currently shadowed by the auth-protected settings router.
    Use /api/v1/brand (no auth) instead. Kept here for backward reference only."""
    settings = db.query(Settings).filter(Settings.key.in_(ALLOWED_PUBLIC_KEYS)).all()
    return {s.key: s.string_value or "" for s in settings}


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


import os
import uuid

BRANDING_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "branding")
os.makedirs(BRANDING_UPLOAD_DIR, exist_ok=True)


@router.post("/upload/{key}")
async def upload_branding_asset(key: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a favicon or logo image and store its URL in settings."""
    if key not in ("favicon_url", "logo_url"):
        raise HTTPException(status_code=400, detail="Invalid key. Must be 'favicon_url' or 'logo_url'")

    # Validate extension
    allowed_ext = {".png", ".jpg", ".jpeg", ".svg", ".ico", ".webp"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"فرمت فایل مجاز نیست. مجاز: {', '.join(allowed_ext)}")

    # Validate size (max 2MB)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم فایل نباید بیشتر از ۲ مگابایت باشد")

    # Save with UUID filename
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(BRANDING_UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    # Store URL in settings
    url = f"/uploads/branding/{filename}"
    setting = db.query(Settings).filter(Settings.key == key).first()
    if setting:
        setting.string_value = url
    else:
        setting = Settings(key=key, value=0, string_value=url, description=f"Branding asset for {key}")
        db.add(setting)
    db.commit()
    invalidate_settings_cache()
    return {"url": url, "key": key}
