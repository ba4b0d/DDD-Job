"""
Product CRUD API tests.
"""


def test_list_products_requires_auth(client):
    """GET /products without token returns 401 or 403."""
    resp = client.get("/api/v1/products")
    assert resp.status_code in (401, 403)


def test_list_products_with_auth(client, auth_headers):
    """GET /products with valid token returns a list."""
    resp = client.get("/api/v1/products", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Verify structure
    first = data[0]
    assert "id" in first
    assert "name" in first
    assert "material_cost" in first
    assert "suggested_price" in first


def test_create_product(client, auth_headers):
    """POST /products creates a product and returns 201."""
    resp = client.post("/api/v1/products", json={
        "name": "Test Product",
        "weight_g": 50,
        "print_time_hours": 2,
        "category": "TEST",
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Product"
    assert data["category"] == "TEST"
    assert data["weight_g"] == 50
    assert "id" in data


def test_get_product(client, auth_headers):
    """GET /products/{id} returns a single product."""
    # First create one
    create_resp = client.post("/api/v1/products", json={
        "name": "Fetchable Product",
        "weight_g": 100,
        "print_time_hours": 3,
    }, headers=auth_headers)
    assert create_resp.status_code == 201
    product_id = create_resp.json()["id"]

    resp = client.get(f"/api/v1/products/{product_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Fetchable Product"


def test_update_product(client, auth_headers):
    """PUT /products/{id} updates fields."""
    create_resp = client.post("/api/v1/products", json={
        "name": "Updatable Product",
        "weight_g": 10,
        "print_time_hours": 1,
    }, headers=auth_headers)
    product_id = create_resp.json()["id"]

    resp = client.put(f"/api/v1/products/{product_id}", json={
        "name": "Updated Product",
        "notes": "modified",
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Product"
    assert resp.json()["notes"] == "modified"


def test_delete_product(client, auth_headers):
    """DELETE /products/{id} soft-deletes (sets is_active=False)."""
    create_resp = client.post("/api/v1/products", json={
        "name": "Deletable Product",
        "weight_g": 10,
        "print_time_hours": 1,
    }, headers=auth_headers)
    product_id = create_resp.json()["id"]

    resp = client.delete(f"/api/v1/products/{product_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert "deactivated" in resp.json()["message"].lower()

    # Should not appear in active list anymore
    list_resp = client.get("/api/v1/products", headers=auth_headers)
    ids = [p["id"] for p in list_resp.json()]
    assert product_id not in ids
