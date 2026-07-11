"""
Material CRUD API tests.
"""
import time


def test_list_materials(client, auth_headers):
    """GET /materials returns seeded materials."""
    resp = client.get("/api/v1/materials", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Verify structure
    first = data[0]
    assert "id" in first
    assert "name" in first
    assert "price_per_kg" in first


def test_create_material(client, auth_headers):
    """POST /materials creates a new material."""
    # Add a unique timestamp suffix to avoid name collision with seed data
    unique_name = f"TestPLA-{int(time.time())}"
    resp = client.post("/api/v1/materials", json={
        "name": unique_name,
        "price_per_kg": 2000000,
        "waste_pct": 0.05,
        "color": "purple",
        "notes": "test material",
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == unique_name
    assert data["price_per_kg"] == 2000000
    assert data["color"] == "purple"


def test_create_duplicate_material(client, auth_headers):
    """POST /materials with duplicate name returns 400."""
    unique_name = f"DupMat-{int(time.time())}"
    payload = {
        "name": unique_name,
        "price_per_kg": 1000000,
        "waste_pct": 0.05,
        "color": "blue",
    }
    resp1 = client.post("/api/v1/materials", json=payload, headers=auth_headers)
    assert resp1.status_code == 201

    resp2 = client.post("/api/v1/materials", json=payload, headers=auth_headers)
    assert resp2.status_code == 400


def test_update_material(client, auth_headers):
    """PUT /materials/{id} updates fields."""
    # Create first
    unique_name = f"UpdMat-{int(time.time())}"
    create_resp = client.post("/api/v1/materials", json={
        "name": unique_name,
        "price_per_kg": 1500000,
    }, headers=auth_headers)
    mat_id = create_resp.json()["id"]

    # Update
    resp = client.put(f"/api/v1/materials/{mat_id}", json={
        "price_per_kg": 2000000,
        "notes": "updated",
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["price_per_kg"] == 2000000
    assert resp.json()["notes"] == "updated"


def test_delete_material(client, auth_headers):
    """DELETE /materials/{id} soft-deletes (is_active=False)."""
    unique_name = f"DelMat-{int(time.time())}"
    create_resp = client.post("/api/v1/materials", json={
        "name": unique_name,
        "price_per_kg": 1000000,
    }, headers=auth_headers)
    mat_id = create_resp.json()["id"]

    resp = client.delete(f"/api/v1/materials/{mat_id}", headers=auth_headers)
    assert resp.status_code == 200

    # Should not appear in active list
    list_resp = client.get("/api/v1/materials", headers=auth_headers)
    ids = [m["id"] for m in list_resp.json()]
    assert mat_id not in ids
