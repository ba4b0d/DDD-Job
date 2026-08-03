"""
Customers — auto-derived CRM from orders.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.database import get_db
from app.models import Order
from app.routers.auth import require_any_role

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])


@router.get("")
def list_customers(user=Depends(require_any_role), db: Session = Depends(get_db)):
    """Group orders by normalized contact to build a customer list."""
    orders = (
        db.query(Order)
        .filter(Order.is_active == True)  # noqa: E712
        .order_by(Order.created_at.desc())
        .all()
    )

    customers = {}
    for o in orders:
        name = (o.customer_name or "").strip() or "بدون نام"
        contact = (o.contact or "").strip().lower()
        key = contact or f"name:{name}"
        if key not in customers:
            customers[key] = {
                "name": name,
                "contact": o.contact or "",
                "order_count": 0,
                "total_spent": 0.0,
                "last_order": o.created_at.isoformat() if o.created_at else None,
            }
        c = customers[key]
        c["order_count"] += 1
        c["total_spent"] += (o.quoted_price or 0) * (o.qty or 1)
        if o.created_at:
            iso = o.created_at.isoformat()
            if not c["last_order"] or iso > c["last_order"]:
                c["last_order"] = iso

    return sorted(customers.values(), key=lambda c: c["total_spent"], reverse=True)