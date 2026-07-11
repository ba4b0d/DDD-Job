"""
Authentication & user management tests.
"""
import time


def test_login_success(client):
    """Valid credentials return a token and user info."""
    resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "3djat2024",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["username"] == "admin"
    assert data["role"] == "admin"
    assert data["display_name"]


def test_login_wrong_password(client):
    """Wrong password returns 401."""
    resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    """Non-existent user returns 401."""
    resp = client.post("/api/v1/auth/login", json={
        "username": "nobody",
        "password": "anything",
    })
    assert resp.status_code == 401


def test_verify_token_valid(client, auth_headers):
    """Valid token passes /verify."""
    resp = client.get("/api/v1/auth/verify", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["username"] == "admin"
    assert data["role"] == "admin"


def test_verify_token_invalid(client):
    """Bogus token returns 401."""
    resp = client.get("/api/v1/auth/verify", headers={
        "Authorization": "Bearer invalid.token.here",
    })
    assert resp.status_code == 401


def test_verify_token_expired(client):
    """Expired token returns 401."""
    import jwt as pyjwt
    os_secret = os.environ.get("JWT_SECRET", "test-secret-key-for-pytest-2024")
    payload = {
        "sub": "1",
        "username": "admin",
        "role": "admin",
        "iat": int(time.time()) - 100000,
        "exp": int(time.time()) - 1,  # already expired
    }
    token = pyjwt.encode(payload, os_secret, algorithm="HS256")
    resp = client.get("/api/v1/auth/verify", headers={
        "Authorization": f"Bearer {token}",
    })
    assert resp.status_code == 401


def test_create_user_admin_only(client, auth_headers):
    """Admin can create new users."""
    resp = client.post("/api/v1/auth/users", json={
        "username": "newuser",
        "password": "password123",
        "display_name": "New User",
        "role": "employee",
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "newuser"
    assert data["role"] == "employee"


def test_create_user_employee_forbidden(client, employee_headers):
    """Employee cannot create users (admin-only endpoint)."""
    resp = client.post("/api/v1/auth/users", json={
        "username": "shouldfail",
        "password": "password123",
        "display_name": "Fail",
        "role": "employee",
    }, headers=employee_headers)
    assert resp.status_code == 403


def test_change_password(client, auth_headers):
    """Admin can change another user's password."""
    # Get employee user ID
    users_resp = client.get("/api/v1/auth/users", headers=auth_headers)
    assert users_resp.status_code == 200
    users = users_resp.json()
    emp_user = next(u for u in users if u["username"] == "employee")

    resp = client.put(
        f"/api/v1/auth/users/{emp_user['id']}/password",
        json={"password": "newpass456"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert "تغییر کرد" in resp.json()["message"]

    # Verify new password works
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "employee",
        "password": "newpass456",
    })
    assert login_resp.status_code == 200


def test_refresh_token_valid(client, auth_headers):
    """A token within REFRESH_WINDOW_HOURS of expiry should be refreshable."""
    import jwt as pyjwt
    os_secret = os.environ.get("JWT_SECRET", "test-secret-key-for-pytest-2024")
    # Craft a token expiring in 30 minutes (within 1h refresh window)
    payload = {
        "sub": "1",
        "username": "admin",
        "role": "admin",
        "iat": int(time.time()) - 82800,
        "exp": int(time.time()) + 1800,  # 30 min from now
    }
    token = pyjwt.encode(payload, os_secret, algorithm="HS256")
    resp = client.post("/api/v1/auth/refresh", headers={
        "Authorization": f"Bearer {token}",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["username"] == "admin"
    assert data["role"] == "admin"
    # The new token should be valid
    verify_resp = client.get("/api/v1/auth/verify", headers={
        "Authorization": f"Bearer {data['token']}",
    })
    assert verify_resp.status_code == 200


def test_refresh_token_expired(client):
    """An expired token should be rejected by /refresh."""
    import jwt as pyjwt
    os_secret = os.environ.get("JWT_SECRET", "test-secret-key-for-pytest-2024")
    payload = {
        "sub": "1",
        "username": "admin",
        "role": "admin",
        "iat": int(time.time()) - 100000,
        "exp": int(time.time()) - 1,  # already expired
    }
    token = pyjwt.encode(payload, os_secret, algorithm="HS256")
    resp = client.post("/api/v1/auth/refresh", headers={
        "Authorization": f"Bearer {token}",
    })
    assert resp.status_code == 401


def test_refresh_token_too_early(client):
    """A token not yet within the refresh window should return 400."""
    import jwt as pyjwt
    os_secret = os.environ.get("JWT_SECRET", "test-secret-key-for-pytest-2024")
    payload = {
        "sub": "1",
        "username": "admin",
        "role": "admin",
        "iat": int(time.time()),
        "exp": int(time.time()) + 7200,  # 2 hours from now (outside 1h window)
    }
    token = pyjwt.encode(payload, os_secret, algorithm="HS256")
    resp = client.post("/api/v1/auth/refresh", headers={
        "Authorization": f"Bearer {token}",
    })
    assert resp.status_code == 400


def test_token_expiry_24_hours(client, auth_headers):
    """Tokens should have a 24-hour expiry (not 7 days)."""
    import jwt as pyjwt
    os_secret = os.environ.get("JWT_SECRET", "test-secret-key-for-pytest-2024")
    # Login to get a real token
    resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "3djat2024",
    })
    assert resp.status_code == 200
    token = resp.json()["token"]
    payload = pyjwt.decode(token, os_secret, algorithms=["HS256"])
    delta = payload["exp"] - payload["iat"]
    # Should be ~24 hours (±60s tolerance for test execution)
    assert 86340 <= delta <= 86460, f"Token expiry should be ~24h, got {delta}s"


# Needed for test_verify_token_expired
import os
