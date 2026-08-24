"""Regression tests for collection route shadowing."""


def test_collection_by_slug_is_not_shadowed_by_numeric_id_route(client, auth_headers):
    """GET /collections/by-slug/{slug} should not be captured by /{coll_id}."""
    create_resp = client.post(
        "/api/v1/collections",
        json={
            "name": "Route Shadow Collection",
            "slug": "route-shadow-collection",
            "description": "Collection used to prove route ordering",
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200, create_resp.text

    resp = client.get(
        "/api/v1/collections/by-slug/route-shadow-collection",
        headers=auth_headers,
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["name"] == "Route Shadow Collection"
    assert data["slug"] == "route-shadow-collection"
