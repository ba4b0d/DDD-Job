import os
import io
import time
import uuid
import json
import sqlite3
import tempfile
import requests
import jwt
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db, DB_PATH
from app.models import Settings
from app.routers.auth import require_admin

router = APIRouter(prefix="/api/v1/admin/backup", tags=["backup"])

BACKUP_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "backups",
)
os.makedirs(BACKUP_DIR, exist_ok=True)


def upload_to_gdrive_service_account(creds_dict: dict, file_path: str, filename: str, folder_id: str = None) -> dict:
    """Upload a file to Google Drive using a Service Account JSON credentials dict."""
    client_email = creds_dict.get("client_email")
    private_key = creds_dict.get("private_key")
    token_uri = creds_dict.get("token_uri", "https://oauth2.googleapis.com/token")

    if not client_email or not private_key:
        raise ValueError("اعتبارنامه Service Account ناقص است (client_email یا private_key یافت نشد)")

    now = int(time.time())
    payload = {
        "iss": client_email,
        "aud": token_uri,
        "iat": now,
        "exp": now + 3600,
        "scope": "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
    }

    try:
        assertion = jwt.encode(payload, private_key, algorithm="RS256")
    except Exception as e:
        raise ValueError(f"خطا در امضای توکن کلید خصوصی گوگل: {str(e)}")

    token_resp = requests.post(
        token_uri,
        data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        },
        timeout=15,
    )
    if token_resp.status_code != 200:
        raise ValueError(f"خطا در احراز هویت با گوگل: {token_resp.text}")

    access_token = token_resp.json().get("access_token")

    # Google Drive v3 API expects multipart/related (NOT multipart/form-data)
    metadata = {"name": filename}
    if folder_id and folder_id.strip():
        metadata["parents"] = [folder_id.strip()]

    boundary = f"spaghetti_gdrive_{uuid.uuid4().hex}"
    meta_json = json.dumps(metadata)

    with open(file_path, "rb") as f_data:
        file_bytes = f_data.read()

    body = (
        f"--{boundary}\r\n"
        "Content-Type: application/json; charset=UTF-8\r\n\r\n"
        f"{meta_json}\r\n"
        f"--{boundary}\r\n"
        "Content-Type: application/octet-stream\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": f"multipart/related; boundary={boundary}",
        "Content-Length": str(len(body)),
    }

    upload_url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&supportsTeamDrives=true"
    upload_resp = requests.post(
        upload_url,
        headers=headers,
        data=body,
        timeout=60,
    )

    if upload_resp.status_code not in (200, 201):
        raise ValueError(f"خطا در ارسال به گوگل درایو: {upload_resp.text}")

    return upload_resp.json()


@router.get("/export")
def export_database_backup(user=Depends(require_admin)):
    """Export WAL-safe SQLite database backup file for download."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="فایل دیتابیس یافت نشد")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"spaghetti_backup_{timestamp}.db"

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


MAX_BACKUP_SIZE = 100 * 1024 * 1024  # 100MB max limit


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
    if len(content) > MAX_BACKUP_SIZE:
        raise HTTPException(status_code=400, detail="حجم فایل پشتیبان نباید بیشتر از ۱۰۰ مگابایت باشد")

    if len(content) < 100 or not content.startswith(b"SQLite format 3\x00"):
        raise HTTPException(status_code=400, detail="فایل آپلود شده یک دیتابیس معتبر SQLite نیست")

    temp_dir = tempfile.gettempdir()
    temp_upload_path = os.path.join(temp_dir, f"restore_{uuid.uuid4().hex}.db")

    with open(temp_upload_path, "wb") as f:
        f.write(content)

    try:
        # Validate SQLite integrity before restoring
        src = sqlite3.connect(temp_upload_path)
        check_res = src.execute("PRAGMA quick_check").fetchone()
        if not check_res or check_res[0] != "ok":
            src.close()
            raise ValueError("فایل دیتابیس آپلود شده دچار آسیب‌دیدگی ساختاری است")

        # Perform WAL-safe restore into active database
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


@router.post("/upload-gdrive-creds")
async def upload_gdrive_credentials(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    """Upload Google Service Account JSON file and save to settings."""
    content = await file.read()
    try:
        data = json.loads(content.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="فایل آپلود شده یک JSON معتبر نیست")

    if not data.get("client_email") or not data.get("private_key"):
        raise HTTPException(
            status_code=400,
            detail="فایل JSON فاقد کلیدهای client_email یا private_key می‌باشد",
        )

    # Save JSON to settings table
    setting = db.query(Settings).filter(Settings.key == "gdrive_credentials_json").first()
    if not setting:
        setting = Settings(
            key="gdrive_credentials_json",
            value=1.0,
            string_value=content.decode("utf-8"),
            description="Google Drive Service Account JSON",
        )
        db.add(setting)
    else:
        setting.value = 1.0
        setting.string_value = content.decode("utf-8")

    db.commit()
    return {"message": "اعتبارنامه گوگل درایو با موفقیت ثبت شد", "client_email": data.get("client_email")}


@router.post("/gdrive-upload")
def push_backup_to_gdrive(
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    """Generate local WAL-safe backup and upload to Google Drive."""
    setting = db.query(Settings).filter(Settings.key == "gdrive_credentials_json").first()
    if not setting or not setting.string_value:
        raise HTTPException(status_code=400, detail="فایل اعتبارنامه گوگل درایو (Service Account JSON) ثبت نشده است")

    try:
        creds_dict = json.loads(setting.string_value)
    except Exception:
        raise HTTPException(status_code=400, detail="فرمت اعتبارنامه گوگل درایو نامعتبر است")

    folder_setting = db.query(Settings).filter(Settings.key == "gdrive_folder_id").first()
    folder_id = folder_setting.string_value if folder_setting else None

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"spaghetti_backup_{timestamp}.db"
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, filename)

    try:
        src = sqlite3.connect(DB_PATH)
        dst = sqlite3.connect(temp_file_path)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()

        res = upload_to_gdrive_service_account(creds_dict, temp_file_path, filename, folder_id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطا در ارسال به گوگل درایو: {str(e)}")
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return {
        "message": "پشتیبان با موفقیت به گوگل درایو ارسال شد",
        "file_id": res.get("id"),
        "name": res.get("name"),
    }
