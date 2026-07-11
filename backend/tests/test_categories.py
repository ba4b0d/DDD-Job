"""
Category CRUD API tests.
"""
import time


def test_list_categories(client):
    """GET /categories returns a list (public or auth-free)."""
    resp = client.get("/api/v1/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_create_category(client, auth_headers):
    """POST /categories creates a new category."""
    unique_name = f"TestCat-{int(time.time())}"
    resp = client.post("/api/v1/categories", json={
        "name": unique_name,
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == unique_name
    assert "id" in data


def test_update_category(client, auth_headers):
    """PUT /categories/{id} updates a category."""
    # Create
    unique_name = f"UpdCat-{int(time.time())}"
    create_resp = client.post("/api/v1/categories", json={
        "name": unique_name,
    }, headers=auth_headers)
    cat_id = create_resp.json()["id"]

    # Update
    resp = client.put(f"/api/v1/categories/{cat_id}", json={
        "name": f"{unique_name}-v2",
        "description": "Updated desc",
    }, headers=auth_headers)
    assert resp.status_code == 200


def test_delete_category(client, auth_headers):
    """DELETE /categories/{id} removes a category."""
    unique_name = f"DelCat-{int(time.time())}"
    create_resp = client.post("/api/v1/categories", json={
        "name": unique_name,
    }, headers=auth_headers)
    cat_id = create_resp.json()["id"]

    resp = client.delete(f"/api/v1/categories/{cat_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert "حذف شد" in resp.json()["message"]
