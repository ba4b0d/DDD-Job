"""
Simple in-memory settings cache with 60-second TTL.
Avoids repeated DB queries for the same settings row.
"""
import time
from sqlalchemy.orm import Session
from app.models import Settings

_TTL = 60  # seconds

# { "settings_dict_key": { "data": dict, "ts": float } }
_settings_cache: dict = {}


def invalidate_settings_cache():
    """Force cache miss on next call."""
    _settings_cache.clear()


def get_settings_dict(db: Session) -> dict:
    """
    Return all settings as { key: value } dict, cached for 60s.
    Falls back to individual queries on miss.
    """
    now = time.time()
    cache_key = "all_settings"

    entry = _settings_cache.get(cache_key)
    if entry and (now - entry["ts"]) < _TTL:
        return entry["data"].copy()

    # Cache miss — query DB once for ALL settings
    rows = db.query(Settings.key, Settings.value).all()
    data = {row.key: row.value for row in rows}
    _settings_cache[cache_key] = {"data": data, "ts": now}
    return data
