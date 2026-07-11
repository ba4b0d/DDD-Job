"""Debug: check what exception verify_token raises."""
import os, time, sys
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-pytest-2024")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import jwt as pyjwt
from app.routers.auth import verify_token

token_payload = {
    "sub": "1", "username": "admin", "role": "admin",
    "iat": int(time.time()) - 100000, "exp": int(time.time()) - 1,
}
token = pyjwt.encode(token_payload, "test-secret-key-for-pytest-2024", algorithm="HS256")
print(f"Token: {token[:50]}...")

try:
    result = verify_token(token)
    print(f"Result: {result}")
except Exception as e:
    print(f"Exception type: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
