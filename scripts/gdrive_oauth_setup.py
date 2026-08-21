"""
One-Time Google Drive OAuth 2.0 Setup for Spaghetti Print
Authorizes your personal Google account so backups use your 15GB Drive quota.
"""
import os
import sys
from google_auth_oauthlib.flow import InstalledAppFlow

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIENT_SECRET_FILE = os.path.join(BASE_DIR, 'backend', 'client_secret.json')
TOKEN_FILE = os.path.join(BASE_DIR, 'backend', 'gdrive_token.json')

SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']


def run_oauth_flow():
    if not os.path.exists(CLIENT_SECRET_FILE):
        print(f"❌ Error: {CLIENT_SECRET_FILE} not found.")
        print("\nPlease download your OAuth Client ID JSON from Google Cloud Console:")
        print("1. Go to https://console.cloud.google.com/apis/credentials?project=spaghetti-seo")
        print("2. Click 'Create Credentials' -> 'OAuth client ID' -> Application type: 'Desktop app'")
        print("3. Download the JSON file and save it as: backend/client_secret.json")
        sys.exit(1)

    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
    creds = flow.run_local_server(port=0)

    with open(TOKEN_FILE, 'w', encoding='utf-8') as token:
        token.write(creds.to_json())

    print(f"\n✅ Authorization successful! Token saved to {TOKEN_FILE}")
    print("You can now run automated backups with: python scripts/gdrive_backup.py")


if __name__ == '__main__':
    run_oauth_flow()
