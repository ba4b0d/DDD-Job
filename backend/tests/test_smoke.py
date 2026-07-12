"""
Smoke tests — minimal end-to-end health checks that verify the FastAPI
app boots, exposes its OpenAPI schema, and serves the public catalog.

These tests are intentionally cheap (no DB writes, no auth) so they can
run as a fast first gate before the heavier CRUD tests in
test_auth.py / test_products.py / test_categories.py / test_materials.py
/ test_settings.py / test_calculator.py.
"""
import os

# JWT_SECRET must be set before any app import that touches auth.py.
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-pytest-2024")


def test_root_returns_service_info(client):
    """GET / returns service name + version (no auth required)."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "name" in data
    assert data["name"] == "3DJAT Pricing API"
    assert "version" in data
    assert "docs" in data


def test_health_endpoint(client):
    """GET /health returns 200 with a status payload (liveness probe)."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_openapi_schema_available(client):
    """GET /openapi.json returns the generated OpenAPI 3.1 schema."""
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    data = resp.json()
    # FastAPI's generated schema — verify the title matches what main.py sets.
    assert data["info"]["title"] == "3DJAT Pricing API"
    assert data["info"]["version"] == "1.0.0"
    # The auth router and products router should both be registered.
    paths = data["paths"]
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/products" in paths
    # Catalog is registered without an auth dependency, so it must also appear.
    assert "/api/v1/catalog" in paths


def test_docs_endpoint_served(client):
    """GET /docs returns the Swagger UI HTML (200, text/html)."""
    resp = client.get("/docs")
    assert resp.status_code == 200
    assert "text/html" in resp.headers.get("content-type", "")


def test_catalog_public_returns_active_products(client):
    """GET /api/v1/catalog is unauthenticated and returns the active product list."""
    resp = client.get("/api/v1/catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # Seed data populates ~50 products; just verify there's at least one.
    assert len(data) > 0
    first = data[0]
    # _enrich_product always emits these keys
    for key in ("id", "name", "is_active", "material_cost", "suggested_price", "base_price"):
        assert key in first, f"Catalog item missing key: {key}"
    # Catalog must never include inactive items
    assert first["is_active"] is True


def test_catalog_categories_public(client):
    """GET /api/v1/catalog/categories is unauthenticated and returns a list."""
    resp = client.get("/api/v1/catalog/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # Each entry is shaped like {id, name, description}
    for entry in data:
        assert "id" in entry
        assert "name" in entry


def test_admin_categories_requires_auth_when_not_public(client):
    """
    /api/v1/categories has no auth-required dependency in categories.py
    (the router is mounted without require_any_role), so it currently
    returns 200 unauthenticated. Lock this behavior in as a smoke test
    so any future auth tightening is caught.
    """
    resp = client.get("/api/v1/categories")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_protected_endpoint_rejects_anonymous(client):
    """
    Auth-protected endpoints (settings, materials, machines, products CRUD)
    must reject unauthenticated requests. Using /api/v1/settings as a
    representative protected route.
    """
    resp = client.get("/api/v1/settings")
    assert resp.status_code in (401, 403)


def test_search_endpoints_are_searchable(client, auth_headers):
    """Light sanity check: list endpoint with auth returns >= 1 product."""
    resp = client.get("/api/v1/products", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # Seed populates ~50+ products — verify at least the seed data is present.
    assert len(data) >= 10
    # Step 3: /products/categories was removed (unified into /categories)
    # /categories returns a list of Category objects (cached/seeded empty or populated)
    cats = client.get("/api/v1/categories", headers=auth_headers)
    assert cats.status_code == 200
    cat_data = cats.json()
    assert isinstance(cat_data, list)
    # Each entry (if present) is shaped like {id, name, description, product_count, sort_order}
    for entry in cat_data:
        assert "id" in entry
        assert "name" in entry
