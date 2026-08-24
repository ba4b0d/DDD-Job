"""Regression tests for audited authentication/RBAC fixes."""
import time

import jwt as pyjwt

from app.models import User
from app.routers.auth import JWT_SECRET, _hash, create_token
from tests.conftest import TestSessionLocal


def _create_user(username: str, role: str, *, active: bool = True, must_change: bool = False, password: str = "pass12345") -> int:
    db = TestSessionLocal()
    try:
        user = User(
            username=username,
            password_hash=_hash(password),
            display_name=username.title(),
            role=role,
            is_active=active,
            must_change_password=must_change,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id
    finally:
        db.close()


def _set_user_state(user_id: int, **changes) -> None:
    db = TestSessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        assert user is not None
        for key, value in changes.items():
            setattr(user, key, value)
        db.commit()
    finally:
        db.close()


def _get_user(username: str) -> User:
    db = TestSessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        assert user is not None
        db.expunge(user)
        return user
    finally:
        db.close()


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _soon_expiring_token(user_id: int, username: str, role: str) -> str:
    now = int(time.time())
    return pyjwt.encode(
        {
            "sub": str(user_id),
            "username": username,
            "role": role,
            "iat": now - 82800,
            "exp": now + 1800,
        },
        JWT_SECRET,
        algorithm="HS256",
    )


def test_current_user_resolves_database_role_instead_of_trusting_jwt_claim(client):
    user_id = _create_user("rolechanged", "employee")
    stale_employee_token = create_token(user_id, "rolechanged", "employee")
    _set_user_state(user_id, role="writer")

    staff_resp = client.get("/api/v1/orders/statuses", headers=_bearer(stale_employee_token))
    assert staff_resp.status_code == 403

    blog_resp = client.get("/api/v1/admin/posts", headers=_bearer(stale_employee_token))
    assert blog_resp.status_code == 200

    verify_resp = client.get("/api/v1/auth/verify", headers=_bearer(stale_employee_token))
    assert verify_resp.status_code == 200
    assert verify_resp.json()["role"] == "writer"


def test_deleted_or_inactive_jwt_subject_is_rejected_on_verify_and_dependencies(client):
    user_id = _create_user("inactivewriter", "writer")
    token = create_token(user_id, "inactivewriter", "writer")
    _set_user_state(user_id, is_active=False)

    verify_resp = client.get("/api/v1/auth/verify", headers=_bearer(token))
    assert verify_resp.status_code == 401

    blog_resp = client.get("/api/v1/admin/posts", headers=_bearer(token))
    assert blog_resp.status_code == 401


def test_must_change_password_allows_only_verify_logout_and_own_password_change(client):
    user_id = _create_user("forcedemployee", "employee", must_change=True)
    token = create_token(user_id, "forcedemployee", "employee")

    staff_resp = client.get("/api/v1/orders/statuses", headers=_bearer(token))
    assert staff_resp.status_code == 403

    verify_resp = client.get("/api/v1/auth/verify", headers=_bearer(token))
    assert verify_resp.status_code == 200
    assert verify_resp.json()["must_change_password"] is True

    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        headers=_bearer(_soon_expiring_token(user_id, "forcedemployee", "employee")),
    )
    assert refresh_resp.status_code == 403

    logout_resp = client.post("/api/v1/auth/logout", headers=_bearer(token))
    assert logout_resp.status_code == 200

    change_resp = client.post(
        "/api/v1/auth/change-my-password",
        json={"password": "newpass123"},
        headers=_bearer(token),
    )
    assert change_resp.status_code == 200

    staff_after_change_resp = client.get("/api/v1/orders/statuses", headers=_bearer(token))
    assert staff_after_change_resp.status_code == 200


def test_writer_role_validation_and_admin_password_reset_forces_change(client, auth_headers):
    create_resp = client.post(
        "/api/v1/auth/users",
        json={
            "username": "writeruser",
            "password": "writerpass123",
            "display_name": "Writer User",
            "role": "writer",
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    assert create_resp.json()["role"] == "writer"

    writer = _get_user("writeruser")
    assert writer.role == "writer"
    assert writer.must_change_password is True

    writer_token = create_token(writer.id, writer.username, writer.role)
    assert client.get("/api/v1/admin/posts", headers=_bearer(writer_token)).status_code == 403

    reset_resp = client.put(
        f"/api/v1/auth/users/{writer.id}/password",
        json={"password": "resetpass123"},
        headers=auth_headers,
    )
    assert reset_resp.status_code == 200
    assert _get_user("writeruser").must_change_password is True

    short_password_resp = client.put(
        f"/api/v1/auth/users/{writer.id}",
        json={"password": "short"},
        headers=auth_headers,
    )
    assert short_password_resp.status_code == 422
