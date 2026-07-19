"""
Minimal shop order board (ops layer B) — not accounting.
Fixed statuses only; any authenticated role can manage.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Order, ORDER_STATUSES
from app.schemas import OrderCreate, OrderUpdate
from app.routers.auth import require_any_role
from app.routers.stats import invalidate_stats

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])

STATUS_LABELS_FA = {
    "new": "جدید",
    "quoted": "قیمت‌داده‌شده",
    "printing": "در حال چاپ",
    "ready": "آماده تحویل",
    "delivered": "تحویل‌شده",
    "cancelled": "لغو",
}


def _date_iso(d) -> str | None:
    return d.isoformat() if d else None


def _serialize(order: Order) -> dict:
    quoted = float(order.quoted_price or 0)
    paid = float(order.paid_amount or 0)
    remaining = max(0.0, quoted - paid)
    return {
        "id": order.id,
        "customer_name": order.customer_name or "",
        "contact": order.contact or "",
        "product_label": order.product_label or "",
        "product_id": order.product_id,
        "quoted_price": quoted,
        "paid_amount": paid,
        "remaining": remaining,
        "status": order.status,
        "status_label": STATUS_LABELS_FA.get(order.status, order.status),
        "notes": order.notes or "",
        "started_at": _date_iso(getattr(order, "started_at", None)),
        "ready_by": _date_iso(getattr(order, "ready_by", None)),
        "is_active": bool(order.is_active),
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    }


@router.get("/statuses")
def list_statuses(user=Depends(require_any_role)):
    """Fixed status catalog for the board UI."""
    return [
        {"value": s, "label": STATUS_LABELS_FA.get(s, s)}
        for s in ORDER_STATUSES
    ]


@router.get("")
def list_orders(
    status: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    user=Depends(require_any_role),
    db: Session = Depends(get_db),
):
    q = db.query(Order)
    # Query() defaults are truthy when called outside FastAPI — only honor real bool
    if include_inactive is not True:
        q = q.filter(Order.is_active == True)  # noqa: E712
    # FastAPI injects None; defensive for direct calls where Query() may leak as default
    if isinstance(status, str) and status:
        if status not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail="وضعیت نامعتبر است")
        q = q.filter(Order.status == status)
    rows = q.order_by(Order.created_at.desc(), Order.id.desc()).all()
    return [_serialize(r) for r in rows]


@router.get("/{order_id}")
def get_order(order_id: int, user=Depends(require_any_role), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")
    return _serialize(order)


@router.post("")
def create_order(body: OrderCreate, user=Depends(require_any_role), db: Session = Depends(get_db)):
    order = Order(
        customer_name=body.customer_name,
        contact=body.contact or "",
        product_label=body.product_label or "",
        product_id=body.product_id,
        quoted_price=body.quoted_price or 0,
        paid_amount=body.paid_amount or 0,
        status=body.status or "new",
        notes=body.notes or "",
        started_at=body.started_at,
        ready_by=body.ready_by,
        is_active=True,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    invalidate_stats()
    return _serialize(order)


@router.put("/{order_id}")
def update_order(
    order_id: int,
    body: OrderUpdate,
    user=Depends(require_any_role),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")

    data = body.model_dump(exclude_unset=True)
    for key, val in data.items():
        setattr(order, key, val)
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)
    invalidate_stats()
    return _serialize(order)


@router.delete("/{order_id}")
def soft_delete_order(order_id: int, user=Depends(require_any_role), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")
    order.is_active = False
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    invalidate_stats()
    return {"message": "سفارش بایگانی شد", "id": order_id}
