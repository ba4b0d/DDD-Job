"""
Authentication & user management with role-based access.
Roles: admin (full access), employee (products + categories only).
"""
import os
import time

import bcrypt
import jwt
from pydantic import BaseModel, Field, field_validator
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# ── Config ─────────────────────────────────────────────────────────
_jwt_secret = os.getenv("JWT_SECRET")
if not _jwt_secret:
    raise RuntimeError("JWT_SECRET environment variable is required but not set")
JWT_SECRET = _jwt_secret
TOKEN_EXPIRY_HOURS = 24  # 24-hour access tokens
REFRESH_WINDOW_HOURS = 1  # allow refresh within 1 hour of expiry

AUTH_COOKIE_NAME = "access_token"

security = HTTPBearer(auto_error=False)


def _set_auth_cookie(response: Response, token: str):
    is_secure = os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1", "yes")
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=TOKEN_EXPIRY_HOURS * 3600,
    )


def _clear_auth_cookie(response: Response):
    response.delete_cookie(key=AUTH_COOKIE_NAME)


# ── Password hashing (bcrypt) ──────────────────────────────────────
def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


# ── Pydantic request models ────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str
    password: str
    display_name: str = ""
    role: str = "employee"

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        if v not in ("admin", "employee"):
            raise ValueError("نقش نامعتبر است")
        return v


class UpdateUserRequest(BaseModel):
    display_name: str | None = None
    role: str | None = None
    password: str | None = None
    is_active: bool | None = None

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        if v is not None and v not in ("admin", "employee"):
            raise ValueError("نقش نامعتبر است")
        return v


class ChangePasswordRequest(BaseModel):
    password: str = Field(..., min_length=6, max_length=128)


def create_token(user_id: int, username: str, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time()) + (TOKEN_EXPIRY_HOURS * 3600),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    # Prefer cookie, fallback to Authorization header (for API compatibility)
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token and credentials:
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_token(token)


def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="فقط مدیران دسترسی دارند")
    return user


def require_any_role(user=Depends(get_current_user)):
    """Admin, employee, or writer — any logged-in user."""
    if user.get("role") not in ("admin", "employee", "writer"):
        raise HTTPException(status_code=403, detail="دسترسی غیرمجاز")
    return user


def require_blog_role(user=Depends(get_current_user)):
    """Admin or writer — blog management only."""
    if user.get("role") not in ("admin", "writer"):
        raise HTTPException(status_code=403, detail="فقط مدیران و نویسندگان دسترسی دارند")
    return user


def _ensure_default_admin(db: Session):
    """Create default admin if no users exist."""
    if db.query(User).count() == 0:
        admin = User(
            username="admin",
            password_hash=_hash("admin"),
            display_name="مدیر سیستم",
            role="admin",
            must_change_password=True,
        )
        db.add(admin)
        db.commit()
        
        print("\n" + "=" * 60)
        print("🔐 DEFAULT ADMIN ACCOUNT CREATED")
        print("=" * 60)
        print("   Username: admin")
        print("   Password: admin")
        print("=" * 60)
        print("⚠️  You MUST change password on first login!")
        print("=" * 60 + "\n")


# ── Auth endpoints ─────────────────────────────────────────────────
@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username, User.is_active == True).first()
    if not user or not _verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است")

    token = create_token(user.id, user.username, user.role)
    _set_auth_cookie(response, token)
    return {
        "username": user.username,
        "display_name": user.display_name,
        "role": user.role,
        "must_change_password": user.must_change_password,
    }


@router.post("/logout")
def logout(response: Response):
    _clear_auth_cookie(response)
    return {"message": "خروج انجام شد"}


@router.get("/verify")
def verify(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(token)
    
    # Check if user must change password
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    must_change = user.must_change_password if user else False
    
    return {
        "username": payload.get("username"),
        "role": payload.get("role"),
        "valid": True,
        "must_change_password": must_change,
    }

@router.post("/refresh")
def refresh_token(request: Request, response: Response):
    """Issue a new token if the current one is valid and within REFRESH_WINDOW_HOURS of expiry."""
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(token)

    exp = payload.get("exp", 0)
    now = int(time.time())
    hours_left = (exp - now) / 3600

    if hours_left <= 0:
        raise HTTPException(status_code=401, detail="Token expired")
    if hours_left > REFRESH_WINDOW_HOURS:
        raise HTTPException(status_code=400, detail=f"Token cannot be refreshed yet ({hours_left:.1f}h remaining, must be within {REFRESH_WINDOW_HOURS}h of expiry)")

    new_token = create_token(
        int(payload["sub"]),
        payload["username"],
        payload["role"],
    )
    _set_auth_cookie(response, new_token)
    return {"username": payload["username"], "role": payload["role"]}


# ── User CRUD (admin only) ────────────────────────────────────────
@router.get("/users")
def list_users(user=Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/users")
def create_user(body: CreateUserRequest, user=Depends(require_admin), db: Session = Depends(get_db)):
    username = body.username.strip()
    if not username or not body.password:
        raise HTTPException(status_code=400, detail="نام کاربری و رمز عبور الزامی است")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="این نام کاربری قبلاً استفاده شده")

    new_user = User(
        username=username,
        password_hash=_hash(body.password),
        display_name=body.display_name,
        role=body.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "username": new_user.username, "role": new_user.role, "message": "کاربر ایجاد شد"}


@router.put("/users/{user_id}")
def update_user(user_id: int, body: UpdateUserRequest, user=Depends(require_admin), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")

    if body.display_name is not None:
        target.display_name = body.display_name
    if body.role is not None:
        target.role = body.role
    if body.is_active is not None:
        target.is_active = body.is_active
    if body.password:
        target.password_hash = _hash(body.password)

    db.commit()
    return {"message": "کاربر به‌روزرسانی شد"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    if target.username == "admin":
        raise HTTPException(status_code=400, detail="امکان حذف مدیر اصلی وجود ندارد")

    db.delete(target)
    db.commit()
    return {"message": "کاربر حذف شد"}


@router.put("/users/{user_id}/password")
def change_password(user_id: int, body: ChangePasswordRequest, user=Depends(require_admin), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")

    target.password_hash = _hash(body.password)
    target.must_change_password = False
    db.commit()
    return {"message": "رمز عبور تغییر کرد"}


@router.post("/change-my-password")
def change_my_password(body: ChangePasswordRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Allow any user to change their own password (for forced password change)."""
    target = db.query(User).filter(User.id == int(user["sub"])).first()
    if not target:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    
    target.password_hash = _hash(body.password)
    target.must_change_password = False
    db.commit()
    return {"message": "رمز عبور تغییر کرد"}
