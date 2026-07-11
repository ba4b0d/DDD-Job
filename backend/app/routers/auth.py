"""
Authentication & user management with role-based access.
Roles: admin (full access), employee (products + categories only).
"""
import os
import time

import bcrypt
import jwt
from pydantic import BaseModel, Field, field_validator
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# ── Config ─────────────────────────────────────────────────────────
_jwt_secret = os.getenv("JWT_SECRET")
if not _jwt_secret:
    raise RuntimeError("JWT_SECRET environment variable is required but not set")
JWT_SECRET = _jwt_secret
TOKEN_EXPIRY_HOURS = 24 * 7

security = HTTPBearer(auto_error=False)


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
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_token(credentials.credentials)


def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="فقط مدیران دسترسی دارند")
    return user


def require_any_role(user=Depends(get_current_user)):
    """Admin or employee — any logged-in user."""
    if user.get("role") not in ("admin", "employee"):
        raise HTTPException(status_code=403, detail="دسترسی غیرمجاز")
    return user


def _ensure_default_admin(db: Session):
    """Create default admin if no users exist."""
    if db.query(User).count() == 0:
        admin = User(
            username="admin",
            password_hash=_hash("3djat2024"),
            display_name="مدیر سیستم",
            role="admin",
        )
        db.add(admin)
        db.commit()


# ── Auth endpoints ─────────────────────────────────────────────────
@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    _ensure_default_admin(db)

    user = db.query(User).filter(User.username == body.username, User.is_active == True).first()
    if not user or not _verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است")

    token = create_token(user.id, user.username, user.role)
    return {
        "token": token,
        "username": user.username,
        "display_name": user.display_name,
        "role": user.role,
    }


@router.get("/verify")
def verify(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    return {"username": payload.get("username"), "role": payload.get("role"), "valid": True}


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
    db.commit()
    return {"message": "رمز عبور تغییر کرد"}
