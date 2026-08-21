"""
Automated Google Drive Backup Script for Spaghetti Print
Creates a WAL-safe snapshot of the SQLite database and uploads it to Google Drive.
Supports both OAuth 2.0 User Token (15GB quota) and Service Account credentials.
"""
import os
import sys
import json
import time
import uuid
import sqlite3
import tempfile
import requests
import jwt
from datetime import datetime, timezone
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_FILE = os.path.join(BASE_DIR, 'backend', 'gdrive_token.json')
SERVICE_ACCOUNT_FILE = os.path.join(BASE_DIR, 'backend', 'gsc_credentials.json')
DB_PATH = os.path.join(BASE_DIR, 'backend', 'data', '3djat.db')

DEFAULT_FOLDER_ID = '15q1LaC5ffH-DhAK8dlgCCyzM9rRxIkqA'


def get_access_token():
    # 1. Prefer OAuth user token (unlimited / personal 15GB quota)
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, scopes=['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'])
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_FILE, 'w', encoding='utf-8') as token:
                token.write(creds.to_json())
        return creds.token

    # 2. Fallback to Service Account
    if os.path.exists(SERVICE_ACCOUNT_FILE):
        with open(SERVICE_ACCOUNT_FILE, 'r', encoding='utf-8') as f:
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

    raise FileNotFoundError(f"No Google Drive credentials found. Please run scripts/gdrive_oauth_setup.py first.")


def upload_backup_to_gdrive(folder_id=None, custom_db_path=None):
    folder_id = folder_id or DEFAULT_FOLDER_ID
    target_db = custom_db_path or DB_PATH
    if not os.path.exists(target_db):
        raise FileNotFoundError(f"Database file not found at {target_db}")

    print(f"Creating WAL-safe snapshot of {target_db}...")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"spaghetti_backup_{timestamp}.db"

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_file_path = os.path.join(temp_dir, backup_filename)

        # WAL-safe online snapshot
        src = sqlite3.connect(target_db)
        dst = sqlite3.connect(temp_file_path)
        with dst:
            src.backup(dst, pages=100)
        dst.close()
        src.close()

        file_size_kb = os.path.getsize(temp_file_path) / 1024
        print(f"Snapshot created: {backup_filename} ({file_size_kb:.1f} KB)")

        access_token = get_access_token()

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
        resp = requests.post(upload_url, headers=headers, data=body, timeout=60)

        if resp.status_code not in (200, 201):
            raise RuntimeError(f"Google Drive upload failed ({resp.status_code}): {resp.text}")

        res_data = resp.json()
        print(f"✅ Successfully uploaded to Google Drive! File ID: {res_data.get('id')}")
        print(f"View in your folder: https://drive.google.com/drive/folders/{folder_id}")
        return res_data


if __name__ == '__main__':
    folder = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_FOLDER_ID
    try:
        upload_backup_to_gdrive(folder_id=folder)
    except Exception as e:
        print(f"❌ Error: {e}")
