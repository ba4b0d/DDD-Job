"""
Automated Google Drive Backup Script for Spaghetti Print
Creates a WAL-safe snapshot of the SQLite database and optionally packages uploads.
Supports OAuth 2.0 User Token (15GB quota) and auto-pruning.
"""
import os
import sys
import json
import time
import uuid
import sqlite3
import tempfile
import zipfile
import requests
import jwt
from datetime import datetime, timezone, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_FOLDER_ID = '15q1LaC5ffH-DhAK8dlgCCyzM9rRxIkqA'


def find_file(candidates):
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]


def get_token_file():
    return find_file([
        os.path.join(BASE_DIR, 'backend', 'gdrive_token.json'),
        '/app/gdrive_token.json',
        'backend/gdrive_token.json',
    ])


def get_service_account_file():
    return find_file([
        os.path.join(BASE_DIR, 'backend', 'gsc_credentials.json'),
        '/app/gsc_credentials.json',
        'backend/gsc_credentials.json',
    ])


def get_db_path():
    return find_file([
        '/app/data/3djat.db',
        os.path.join(BASE_DIR, 'backend', 'data', '3djat.db'),
        os.path.join(BASE_DIR, 'data', '3djat.db'),
    ])


def get_uploads_dir():
    return find_file([
        '/app/uploads',
        os.path.join(BASE_DIR, 'backend', 'uploads'),
        os.path.join(BASE_DIR, 'uploads'),
    ])


def get_access_token():
    token_file = get_token_file()
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, scopes=['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'])
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(token_file, 'w', encoding='utf-8') as token:
                token.write(creds.to_json())
        return creds.token

    sa_file = get_service_account_file()
    if os.path.exists(sa_file):
        with open(sa_file, 'r', encoding='utf-8') as f:
            creds_dict = json.load(f)
        client_email = creds_dict.get('client_email')
        private_key = creds_dict.get('private_key')
        token_uri = creds_dict.get('token_uri', 'https://oauth2.googleapis.com/token')

        now = int(time.time())
        payload = {
            'iss': client_email,
            'aud': token_uri,
            'iat': now,
            'exp': now + 3600,
            'scope': 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
        }
        assertion = jwt.encode(payload, private_key, algorithm='RS256')
        resp = requests.post(token_uri, data={'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion': assertion}, timeout=15)
        if resp.status_code != 200:
            raise ValueError(f"Authentication with Google failed: {resp.text}")
        return resp.json().get('access_token')

    raise FileNotFoundError(f"No Google Drive credentials found at {token_file}")


def prune_old_backups(access_token, folder_id, keep_days=14):
    """Delete backups in Google Drive folder older than keep_days."""
    try:
        query = f"'{folder_id}' in parents and trashed = false"
        url = f"https://www.googleapis.com/drive/v3/files?q={requests.utils.quote(query)}&fields=files(id,name,createdTime)"
        headers = {'Authorization': f'Bearer {access_token}'}
        resp = requests.get(url, headers=headers, timeout=20)
        if resp.status_code == 200:
            files = resp.json().get('files', [])
            cutoff = datetime.now(timezone.utc) - timedelta(days=keep_days)
            for f in files:
                created_str = f.get('createdTime', '')
                if created_str:
                    created_dt = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
                    if created_dt < cutoff and f['name'].startswith('spaghetti_'):
                        del_url = f"https://www.googleapis.com/drive/v3/files/{f['id']}"
                        requests.delete(del_url, headers=headers, timeout=15)
                        print(f"🗑️ Pruned old backup: {f['name']}")
    except Exception as e:
        print(f"Warning: Auto-prune skipped ({e})")


def upload_backup_to_gdrive(folder_id=None, custom_db_path=None, include_uploads=False):
    folder_id = folder_id or DEFAULT_FOLDER_ID
    target_db = custom_db_path or get_db_path()
    uploads_dir = get_uploads_dir()
    if not os.path.exists(target_db):
        raise FileNotFoundError(f"Database file not found at {target_db}")

    print(f"Creating WAL-safe snapshot of {target_db}...")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    with tempfile.TemporaryDirectory() as temp_dir:
        access_token = get_access_token()

        if include_uploads and os.path.exists(uploads_dir):
            backup_filename = f"spaghetti_full_backup_{timestamp}.zip"
            temp_file_path = os.path.join(temp_dir, backup_filename)
            db_snap_path = os.path.join(temp_dir, f"spaghetti_backup_{timestamp}.db")

            # 1. Database snapshot
            src = sqlite3.connect(target_db)
            dst = sqlite3.connect(db_snap_path)
            with dst:
                src.backup(dst, pages=100)
            dst.close()
            src.close()

            # 2. Zip DB + Uploads folder
            print(f"Packaging database and media uploads into {backup_filename}...")
            with zipfile.ZipFile(temp_file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.write(db_snap_path, arcname=f"database/spaghetti_backup_{timestamp}.db")
                for root, _, files in os.walk(uploads_dir):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, uploads_dir)
                        zipf.write(full_path, arcname=f"uploads/{rel_path}")
        else:
            backup_filename = f"spaghetti_backup_{timestamp}.db"
            temp_file_path = os.path.join(temp_dir, backup_filename)

            # WAL-safe online snapshot
            src = sqlite3.connect(target_db)
            dst = sqlite3.connect(temp_file_path)
            with dst:
                src.backup(dst, pages=100)
            dst.close()
            src.close()

        file_size_kb = os.path.getsize(temp_file_path) / 1024
        print(f"Archive ready: {backup_filename} ({file_size_kb:.1f} KB)")

        metadata = {'name': backup_filename}
        if folder_id and folder_id.strip():
            metadata['parents'] = [folder_id.strip()]

        boundary = f"spaghetti_gdrive_{uuid.uuid4().hex}"
        meta_json = json.dumps(metadata)

        with open(temp_file_path, 'rb') as f:
            file_bytes = f.read()

        body = (
            f"--{boundary}\r\n"
            "Content-Type: application/json; charset=UTF-8\r\n\r\n"
            f"{meta_json}\r\n"
            f"--{boundary}\r\n"
            "Content-Type: application/octet-stream\r\n\r\n"
        ).encode('utf-8') + file_bytes + f"\r\n--{boundary}--\r\n".encode('utf-8')

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': f'multipart/related; boundary={boundary}',
            'Content-Length': str(len(body)),
        }

        print(f"Uploading to Google Drive folder [{folder_id}]...")
        upload_url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true"
        resp = requests.post(upload_url, headers=headers, data=body, timeout=120)

        if resp.status_code not in (200, 201):
            raise RuntimeError(f"Google Drive upload failed ({resp.status_code}): {resp.text}")

        res_data = resp.json()
        print(f"✅ Successfully uploaded to Google Drive! File ID: {res_data.get('id')}")
        print(f"View in your folder: https://drive.google.com/drive/folders/{folder_id}")

        # Prune old backups (keeps last 14 days)
        prune_old_backups(access_token, folder_id, keep_days=14)

        return res_data


if __name__ == '__main__':
    include_up = '--include-uploads' in sys.argv
    args = [a for a in sys.argv[1:] if a != '--include-uploads']
    folder = args[0] if len(args) > 0 else DEFAULT_FOLDER_ID
    try:
        upload_backup_to_gdrive(folder_id=folder, include_uploads=include_up)
    except Exception as e:
        print(f"❌ Error: {e}")
