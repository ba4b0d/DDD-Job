import os
import io
import time
import uuid
import sqlite3
import tempfile
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db, DB_PATH
from app.routers.auth import require_admin

router = APIRouter(prefix="/api/v1/admin/backup", tags=["backup"])

BACKUP_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "backups",
)
os.makedirs(BACKUP_DIR, exist_ok=True)


@router.get("/export")
def export_database_backup(user=Depends(require_admin)):
    """Export WAL-safe SQLite database backup file for download."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="فایل دیتابیس یافت نشد")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"3djat_backup_{timestamp}.db"

    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, filename)

    try:
        src = sqlite3.connect(DB_PATH)
        dst = sqlite3.connect(temp_file_path)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطا در ساخت فایل پشتیبان: {str(e)}")

    return FileResponse(
        path=temp_file_path,
        filename=filename,
        media_type="application/octet-stream",
    )


@router.post("/import")
async def import_database_backup(
    file: UploadFile = File(...),
    user=Depends(require_admin),
):
    """Restore database state from an uploaded .db backup file."""
    filename = file.filename or ""
    if not filename.lower().endswith(".db"):
        raise HTTPException(status_code=400, detail="فایل پشتیبان باید دارای پسوند .db باشد")

    content = await file.read()
    if len(content) < 100 or not content.startswith(b"SQLite format 3\x00"):
        raise HTTPException(status_code=400, detail="فایل آپلود شده یک دیتابیس معتبر SQLite نیست")

    temp_dir = tempfile.gettempdir()
    temp_upload_path = os.path.join(temp_dir, f"restore_{uuid.uuid4().hex}.db")

    with open(temp_upload_path, "wb") as f:
        f.write(content)

    try:
        # Perform WAL-safe restore into active database
        src = sqlite3.connect(temp_upload_path)
        dst = sqlite3.connect(DB_PATH)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()
    except Exception as e:
        if os.path.exists(temp_upload_path):
            os.remove(temp_upload_path)
        raise HTTPException(status_code=500, detail=f"خطا در بازگردانی پشتیبان: {str(e)}")

    if os.path.exists(temp_upload_path):
        os.remove(temp_upload_path)

    return {"message": "دیتابیس با موفقیت بازگردانی شد"}


@router.get("/list")
def list_local_backups(user=Depends(require_admin)):
    """List recent local backup snapshots."""
    files = []
    if os.path.exists(BACKUP_DIR):
        for fname in os.listdir(BACKUP_DIR):
            if fname.endswith(".db"):
                fpath = os.path.join(BACKUP_DIR, fname)
                stat = os.stat(fpath)
                files.append(
                    {
                        "filename": fname,
                        "size_bytes": stat.st_size,
                        "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                    }
                )
    files.sort(key=lambda x: x["created_at"], reverse=True)
    return files
