import os
import sys
import json
from datetime import datetime, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', 'gsc_credentials.json')
SITE_URL = 'sc-domain:spaghettiprints.ir'
SCOPES = ['https://www.googleapis.com/auth/webmasters']


def main():
    if not os.path.exists(KEY_FILE):
        print(f"Error: Key file {KEY_FILE} not found.")
        sys.exit(1)

    creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
    service = build('searchconsole', 'v1', credentials=creds)

    print("==================================================================")
    print("GOOGLE SEARCH CONSOLE — LIVE STATUS & INDEXING REPORT")
    print("==================================================================")

    # 1. Check Sites & Permissions
    try:
        sites_res = service.sites().list().execute()
        site_entries = sites_res.get('siteEntry', [])
        print("\n🌐 Verified Sites:")
        for s in site_entries:
            print(f"  - {s.get('siteUrl')} (Permission: {s.get('permissionLevel')})")
    except Exception as e:
        print(f"Error listing sites: {e}")

    # 2. Check Sitemaps
    try:
        sitemaps_res = service.sitemaps().list(siteUrl=SITE_URL).execute()
        sitemap_entries = sitemaps_res.get('sitemap', [])
        print(f"\n🗺️ Submitted Sitemaps for {SITE_URL}:")
        if not sitemap_entries:
            print("  No sitemaps found via API.")
        for sm in sitemap_entries:
            path = sm.get('path')
            last_sub = sm.get('lastSubmitted')
            last_dl = sm.get('lastDownloaded')
            errors = sm.get('errors', 0)
            warnings = sm.get('warnings', 0)
            contents = sm.get('contents', [])
            print(f"  - Path: {path}")
            print(f"    Last Submitted:  {last_sub}")
            print(f"    Last Downloaded: {last_dl}")
            print(f"    Errors: {errors} | Warnings: {warnings}")
            for c in contents:
                c_type = c.get('type')
                c_sub = c.get('submitted', 0)
                c_idx = c.get('indexed', 0)
                print(f"    Content [{c_type}]: {c_idx} indexed / {c_sub} submitted")
    except Exception as e:
        print(f"Error checking sitemaps: {e}")

    # 3. URL Inspection (Sample URLs)
    sample_urls = [
        'https://spaghettiprints.ir/',
        'https://spaghettiprints.ir/catalog',
        'https://spaghettiprints.ir/catalog/ke011',
        'https://spaghettiprints.ir/custom-order',
        'https://spaghettiprints.ir/how-to-order',
        'https://spaghettiprints.ir/contact'
    ]

    print("\n🔍 URL Inspection (Live Status):")
    print(f"{'Inspection URL':<42} | {'Index Status':<22} | {'Coverage State'}")
    print("-" * 90)
    for url in sample_urls:
        try:
            insp_req = {
                'inspectionUrl': url,
                'siteUrl': SITE_URL,
                'languageCode': 'fa'
            }
            insp_res = service.urlInspection().index().inspect(body=insp_req).execute()
            result = insp_res.get('inspectionResult', {})
            idx_result = result.get('indexStatusResult', {})
            verdict = idx_result.get('verdict', 'UNKNOWN')
            coverage = idx_result.get('coverageState', 'Unknown')
            robots = idx_result.get('robotsTxtState', '')
            indexing_state = idx_result.get('indexingState', '')
            last_crawl = idx_result.get('lastCrawlTime', 'Never')
            print(f"{url:<42} | {verdict:<22} | {coverage}")
            print(f"   ↳ Last Crawl: {last_crawl} | Robots: {robots} | State: {indexing_state}")
        except Exception as e:
            print(f"{url:<42} | ERROR: {e}")

    # 4. Search Performance (Past 28 Days)
    today = datetime.utcnow().date()
    start_date = (today - timedelta(days=28)).isoformat()
    end_date = today.isoformat()
    try:
        perf_req = {
            'startDate': start_date,
            'endDate': end_date
        }
        perf_res = service.searchanalytics().query(siteUrl=SITE_URL, body=perf_req).execute()
        rows = perf_res.get('rows', [])
        total_row = rows[0] if rows else {}
        clicks = total_row.get('clicks', 0)
        impressions = total_row.get('impressions', 0)
        ctr = total_row.get('ctr', 0) * 100
        position = total_row.get('position', 0)
        print("\n📊 Search Performance (Last 28 Days):")
        print(f"  - Total Clicks:      {clicks}")
        print(f"  - Total Impressions: {impressions}")
        print(f"  - Avg CTR:           {ctr:.2f}%")
        print(f"  - Avg Position:      {position:.1f}")
    except Exception as e:
        print(f"Error fetching search performance: {e}")


if __name__ == '__main__':
    main()
