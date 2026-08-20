"""
Google Search Console Analytics Tool for Spaghetti Prints
Fetches live ranking, queries, clicks, impressions, and indexation stats.
"""
import os
import sys
from datetime import datetime, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', 'gsc_credentials.json')
SITE_URL = 'sc-domain:spaghettiprints.ir'
SCOPES = ['https://www.googleapis.com/auth/webmasters']


def get_gsc_service():
    if not os.path.exists(KEY_FILE):
        raise FileNotFoundError(f"Credentials file not found at {KEY_FILE}")
    creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
    return build('searchconsole', 'v1', credentials=creds)


def get_performance_summary(days=28, row_limit=25):
    service = get_gsc_service()
    today = datetime.utcnow().date()
    start_date = (today - timedelta(days=days)).isoformat()
    end_date = today.isoformat()

    # 1. Total summary
    total_req = {
        'startDate': start_date,
        'endDate': end_date,
    }
    total_resp = service.searchanalytics().query(siteUrl=SITE_URL, body=total_req).execute()
    total_row = total_resp.get('rows', [{}])[0] if total_resp.get('rows') else {}

    # 2. Top queries
    query_req = {
        'startDate': start_date,
        'endDate': end_date,
        'dimensions': ['query'],
        'rowLimit': row_limit,
    }
    query_resp = service.searchanalytics().query(siteUrl=SITE_URL, body=query_req).execute()
    queries = query_resp.get('rows', [])

    # 3. Top pages
    page_req = {
        'startDate': start_date,
        'endDate': end_date,
        'dimensions': ['page'],
        'rowLimit': row_limit,
    }
    page_resp = service.searchanalytics().query(siteUrl=SITE_URL, body=page_req).execute()
    pages = page_resp.get('rows', [])

    return {
        'date_range': f"{start_date} to {end_date}",
        'total_clicks': total_row.get('clicks', 0),
        'total_impressions': total_row.get('impressions', 0),
        'avg_ctr': total_row.get('ctr', 0) * 100,
        'avg_position': total_row.get('position', 0),
        'queries': queries,
        'pages': pages,
    }


if __name__ == '__main__':
    data = get_performance_summary(days=28, row_limit=15)
    print("==================================================================")
    print(f"GOOGLE SEARCH CONSOLE LIVE REPORT ({data['date_range']})")
    print("==================================================================")
    print(f"Total Clicks:       {data['total_clicks']}")
    print(f"Total Impressions:  {data['total_impressions']}")
    print(f"Average CTR:        {data['avg_ctr']:.2f}%")
    print(f"Average Position:   {data['avg_position']:.1f}")

    print("\n🏆 Top Search Queries:")
    print(f"{'Query':<35} | {'Clicks':<6} | {'Imp':<6} | {'CTR':<7} | {'Position'}")
    print("-" * 70)
    for q in data['queries']:
        name = q['keys'][0]
        clicks = q['clicks']
        imp = q['impressions']
        ctr = f"{q['ctr']*100:.1f}%"
        pos = f"{q['position']:.1f}"
        print(f"{name:<35} | {clicks:<6} | {imp:<6} | {ctr:<7} | {pos}")

    print("\n📄 Top Landing Pages:")
    print(f"{'Page URL':<55} | {'Clicks':<6} | {'Imp':<6} | {'Position'}")
    print("-" * 75)
    for p in data['pages'][:10]:
        url = p['keys'][0].replace('https://spaghettiprints.ir', '')
        clicks = p['clicks']
        imp = p['impressions']
        pos = f"{p['position']:.1f}"
        print(f"{url:<55} | {clicks:<6} | {imp:<6} | {pos}")
