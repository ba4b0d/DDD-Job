"""
Settings API tests.
"""


def test_get_settings(client, auth_headers):
    """GET /settings returns all settings as a dict."""
    resp = client.get("/api/v1/settings", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Verify key settings exist (from seed data)
    assert "electricity_rate_per_kwh" in data
    assert "default_markup_pct" in data
    assert "overhead_fixed_per_job" in data
    # Check structure
    entry = data["electricity_rate_per_kwh"]
    assert "value" in entry
    assert "description" in entry
    assert entry["value"] == 812


def test_update_settings(client, auth_headers):
    """PUT /settings bulk-updates settings."""
    resp = client.put("/api/v1/settings", json={
        "settings": [
            {"key": "electricity_rate_per_kwh", "value": 900},
        ]
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert "electricity_rate_per_kwh" in resp.json()["updated"]

    # Verify it persisted
    get_resp = client.get("/api/v1/settings", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["electricity_rate_per_kwh"]["value"] == 900
