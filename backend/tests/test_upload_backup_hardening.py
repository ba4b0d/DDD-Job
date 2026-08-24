"""Regression tests for bounded uploads and backup validation."""
import sqlite3

import pytest
from fastapi import HTTPException, UploadFile

from app.routers.backup import _validate_backup_schema
from app.services.uploads import read_upload_limited


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_read_upload_limited_rejects_oversized_stream(tmp_path):
    upload_path = tmp_path / "large.bin"
    upload_path.write_bytes(b"x" * 17)

    with upload_path.open("rb") as stream:
        upload = UploadFile(filename="large.bin", file=stream)
        with pytest.raises(HTTPException) as exc:
            await read_upload_limited(upload, max_bytes=16, detail="too large", chunk_size=8)

    assert exc.value.status_code == 413
    assert exc.value.detail == "too large"


@pytest.mark.anyio
async def test_read_upload_limited_returns_content_within_limit(tmp_path):
    upload_path = tmp_path / "small.bin"
    upload_path.write_bytes(b"valid")

    with upload_path.open("rb") as stream:
        upload = UploadFile(filename="small.bin", file=stream)
        assert await read_upload_limited(upload, max_bytes=16) == b"valid"


def test_validate_backup_schema_rejects_unrelated_sqlite_database(tmp_path):
    db_path = tmp_path / "unrelated.db"
    with sqlite3.connect(db_path) as conn:
        conn.execute("CREATE TABLE unrelated (id INTEGER PRIMARY KEY)")

    with pytest.raises(HTTPException) as exc:
        _validate_backup_schema(str(db_path))

    assert exc.value.status_code == 400
    assert "ساختار" in exc.value.detail


def test_validate_backup_schema_accepts_required_application_tables(tmp_path):
    db_path = tmp_path / "application.db"
    required = {
        "settings": {"id": "INTEGER", "key": "TEXT", "value": "REAL"},
        "users": {"id": "INTEGER", "username": "TEXT", "password_hash": "TEXT", "role": "TEXT"},
        "products": {"id": "INTEGER", "name": "TEXT", "is_active": "INTEGER"},
        "materials": {"id": "INTEGER", "name": "TEXT", "price_per_kg": "REAL"},
        "machines": {"id": "INTEGER", "name": "TEXT", "power_watts": "REAL"},
    }
    with sqlite3.connect(db_path) as conn:
        for table, columns in required.items():
            ddl = ", ".join(f'"{name}" {kind}' for name, kind in columns.items())
            conn.execute(f'CREATE TABLE "{table}" ({ddl})')

    _validate_backup_schema(str(db_path))
