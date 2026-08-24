"""Regression tests for orders route shadowing and archive recovery."""
from datetime import datetime, timezone


def _create_order(client, auth_headers, customer_name="Route Shadow Customer"):
    resp = client.post(
        "/api/v1/orders",
        json={
            "customer_name": customer_name,
            "contact": "09120000000",
            "paid_amount": 25,
            "status": "new",
            "items": [
                {"product_label": "Route-safe item", "qty": 2, "unit_price": 100},
            ],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_orders_summary_monthly_is_not_shadowed_by_order_id_route(client, auth_headers):
    """GET /orders/summary/monthly should reach the summary route, not /{order_id}."""
    _create_order(client, auth_headers)
    month = datetime.now(timezone.utc).strftime("%Y-%m")

    resp = client.get(
        "/api/v1/orders/summary/monthly",
        params={"month": month},
        headers=auth_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["month"] == month
    assert data["order_count"] >= 1
    assert data["total_quoted"] >= 200


def test_orders_export_csv_is_not_shadowed_by_order_id_route(client, auth_headers):
    """GET /orders/export/csv should stream CSV, not parse 'export' as an order id."""
    order = _create_order(client, auth_headers, customer_name="CSV Shadow Customer")

    resp = client.get("/api/v1/orders/export/csv", headers=auth_headers)

    assert resp.status_code == 200, resp.text
    assert "text/csv" in resp.headers.get("content-type", "")
    assert "orders.csv" in resp.headers.get("content-disposition", "")
    csv_text = resp.text
    assert "CSV Shadow Customer" in csv_text
    assert str(order["id"]) in csv_text


def test_archived_orders_can_be_included_and_restored(client, auth_headers):
    """Soft-deleted orders stay recoverable via include_inactive and restore."""
    order = _create_order(client, auth_headers, customer_name="Archived Recoverable")
    order_id = order["id"]

    delete_resp = client.delete(f"/api/v1/orders/{order_id}", headers=auth_headers)
    assert delete_resp.status_code == 200, delete_resp.text

    active_resp = client.get("/api/v1/orders", headers=auth_headers)
    assert active_resp.status_code == 200, active_resp.text
    assert order_id not in [o["id"] for o in active_resp.json()]

    archived_resp = client.get(
        "/api/v1/orders",
        params={"include_inactive": True},
        headers=auth_headers,
    )
    assert archived_resp.status_code == 200, archived_resp.text
    archived = next((o for o in archived_resp.json() if o["id"] == order_id), None)
    assert archived is not None
    assert archived["is_active"] is False

    restore_resp = client.post(f"/api/v1/orders/{order_id}/restore", headers=auth_headers)
    assert restore_resp.status_code == 200, restore_resp.text
    assert restore_resp.json()["is_active"] is True

    active_after_restore = client.get("/api/v1/orders", headers=auth_headers)
    assert order_id in [o["id"] for o in active_after_restore.json()]
