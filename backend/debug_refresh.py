"""Quick debug script to see what 500 response body contains."""
import os, time, sys
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-pytest-2024")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import jwt as pyjwt
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine("sqlite:///tests/debug.db", connect_args={"check_same_thread": False})
TestSession = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)
from app.seed import seed_all
from app.models import Settings, User
from app.routers.auth import _hash
db = TestSession()
if db.query(Settings).count() == 0:
    from app.models import Settings
    seed_all(db)
if not db.query(User).filter(User.username == "admin").first():
    db.add(User(username="admin", password_hash=_hash("3djat2024"), display_name="Admin", role="admin"))
    db.commit()
db.close()

def override():
    s = TestSession()
    try:
        yield s
    finally:
        s.close()

app.dependency_overrides[get_db] = override

with TestClient(app, raise_server_exceptions=False) as c:
    # Test 1: expired token on /refresh
    payload = {"sub": "1", "username": "admin", "role": "admin", "iat": int(time.time()) - 100000, "exp": int(time.time()) - 1}
    token = pyjwt.encode(payload, "test-secret-key-for-pytest-2024", algorithm="HS256")
    resp = c.post("/api/v1/auth/refresh", headers={"Authorization": f"Bearer {token}"})
    print(f"Expired refresh: status={resp.status_code} body={resp.text}")

    # Test 2: expired token on /verify (should work)
    resp2 = c.get("/api/v1/auth/verify", headers={"Authorization": f"Bearer {token}"})
    print(f"Expired verify: status={resp2.status_code} body={resp2.text}")

    # Test 3: too-early refresh
    payload2 = {"sub": "1", "username": "admin", "role": "admin", "iat": int(time.time()), "exp": int(time.time()) + 7200}
    token2 = pyjwt.encode(payload2, "test-secret-key-for-pytest-2024", algorithm="HS256")
    resp3 = c.post("/api/v1/auth/refresh", headers={"Authorization": f"Bearer {token2}"})
    print(f"Too early refresh: status={resp3.status_code} body={resp3.text}")

app.dependency_overrides.clear()
