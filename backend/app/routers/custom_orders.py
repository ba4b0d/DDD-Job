"""
Custom order requests — lead capture from the public /custom-order form.
Public: submit (POST). Admin/employee: list, update status, delete.
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import CustomOrderRequest
from app.routers.auth import require_any_role, limiter
from app.audit import log_user

router = APIRouter(prefix="/api/v1", tags=["custom-orders"])

REQUEST_STATUSES = ("new", "contacted", "closed")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "requests")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_IMAGE_SIZE = 5 * 1024 * 1024


class CustomOrderCreate(BaseModel):
    name: str = ""
    contact: str = Field(default="", min_length=3)
    channel: str = "telegram"
    description: str = ""
    reference_product: str = ""


def _serialize(r: CustomOrderRequest) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "contact": r.contact,
        "channel": r.channel,
        "description": r.description,
        "reference_product": r.reference_product,
        "image_url": r.image_url,
        "status": r.status,
        "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


# IMPORTANT: submit route must not require auth
@router.post("/custom-orders")
@limiter.limit("20/minute")
def create_custom_order(request: Request, body: CustomOrderCreate, db: Session = Depends(get_db)):
    req = CustomOrderRequest(
        name=(body.name or "").strip(),
        contact=(body.contact or "").strip(),
        channel=body.channel or "telegram",
        description=(body.description or "").strip(),
        reference_product=(body.reference_product or "").strip(),
        status="new",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _serialize(req)


@router.post("/requests/{req_id}/image")
async def upload_request_image(req_id: int, file: UploadFile = File(...), user=Depends(require_any_role), db: Session = Depends(get_db)):
    """Upload an image/photo for a custom order request (admin-only)."""
    req = db.query(CustomOrderRequest).filter(CustomOrderRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="درخواست یافت نشد")
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="حجم فایل نباید بیشتر از ۵ مگابایت باشد")
    filename = f"{uuid.uuid4().hex}.jpg"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    req.image_url = f"/uploads/requests/{filename}"
    db.commit()
    return {"image_url": req.image_url}


@router.get("/admin/requests")
def list_requests(status: str | None = None, user=Depends(require_any_role), db: Session = Depends(get_db)):
    q = db.query(CustomOrderRequest)
    if status:
        q = q.filter(CustomOrderRequest.status == status)
    reqs = q.order_by(CustomOrderRequest.created_at.desc()).all()
    return [_serialize(r) for r in reqs]


@router.put("/admin/requests/{req_id}")
def update_request(req_id: int, body: dict, user=Depends(require_any_role), db: Session = Depends(get_db)):
    req = db.query(CustomOrderRequest).filter(CustomOrderRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="درخواست یافت نشد")
    if "status" in body and body.get("status") in REQUEST_STATUSES:
        req.status = body["status"]
    if "notes" in body:
        req.notes = body.get("notes") or ""
    db.commit()
    log_user(user, db, "update", "customer_request", req.id, f"به‌روزرسانی درخواست #{req.id}")
    return _serialize(req)


@router.delete("/admin/requests/{req_id}")
def delete_request(req_id: int, user=Depends(require_any_role), db: Session = Depends(get_db)):
    req = db.query(CustomOrderRequest).filter(CustomOrderRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="درخواست یافت نشد")
    db.delete(req)
    db.commit()
    log_user(user, db, "delete", "customer_request", req_id, f"حذف درخواست #{req_id}")
    return {"message": "درخواست حذف شد"}