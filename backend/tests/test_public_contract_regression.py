"""Regression tests for the anonymous/public API contract."""


def test_custom_order_submit_is_public_and_admin_inbox_stays_protected(client):
    public_resp = client.post(
        "/api/v1/custom-orders",
        json={
            "name": "Public Customer",
            "contact": "@public-customer",
            "channel": "telegram",
            "description": "Need a custom print",
        },
    )

    assert public_resp.status_code == 200
    assert public_resp.json()["contact"] == "@public-customer"

    protected_resp = client.get("/api/v1/admin/requests")
    assert protected_resp.status_code == 401


def test_public_brand_and_contact_do_not_require_auth(client):
    brand_resp = client.get("/api/v1/brand")
    contact_resp = client.get("/api/v1/contact")

    assert brand_resp.status_code == 200
    assert isinstance(brand_resp.json(), dict)
    assert contact_resp.status_code == 200
    assert isinstance(contact_resp.json(), dict)
