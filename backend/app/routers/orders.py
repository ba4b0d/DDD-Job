"""
Orders router — light accounting for a small 3D-printing shop.

Features:
  - qty field (auto-total = qty × unit_price)
  - Auto-fill quoted_price from product.suggested_price when product_id is set
  - Snapshot unit_cost at creation time
  - Auto-stamp delivered_at when status → delivered
  - paid_amount ≤ quoted_price validation
  - Monthly summary endpoint
  - CSV export
  - Customer search + date range filtering
"""
import csv
import io
from datetime import datetime, timezone, date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.database import get_db
from app.models import Order, ORDER_STATUSES, Product, Material, Machine
from app.schemas import OrderCreate, OrderUpdate
from app.routers.auth import require_any_role
from app.routers.stats import invalidate_stats
from app.cache import get_settings_dict
from app.calculator import calculate_product_costs_from_dicts

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])

STATUS_LABELS_FA = {
    "new": "جدید",
    "quoted": "قیمت‌داده‌شده",
    "printing": "در حال چاپ",
    "ready": "آماده تحویل",
    "delivered": "تحویل‌شده",
    "cancelled": "لغو",
}


# ── Helpers ─────────────────────────────────────────────────────────────

def _date_iso(d) -> str | None:
    return d.isoformat() if d else None


def _snapshot_product_cost(db: Session, product: Product) -> float:
    """Calculate and return the product's current base_price (no markup)."""
    settings = get_settings_dict(db)
    mat = db.query(Material).filter(Material.id == product.material_id).first() if product.material_id else None
    mach = db.query(Machine).filter(Machine.id == product.machine_id).first() if product.machine_id else None
    costs = calculate_product_costs_from_dicts(product, mat, mach, settings)
    return costs.get("base_price", 0.0)


def _serialize(order: Order) -> dict:
    quoted = float(order.quoted_price or 0)
    paid = float(order.paid_amount or 0)
    qty = int(order.qty or 1)
    total_quoted = round(quoted * qty, 2)
    remaining = max(0.0, total_quoted - paid)
    return {
        "id": order.id,
        "customer_name": order.customer_name or "",
        "contact": order.contact or "",
        "product_label": order.product_label or "",
        "product_id": order.product_id,
        "qty": qty,
        "quoted_price": quoted,
        "total_quoted": total_quoted,
        "paid_amount": paid,
        "remaining": remaining,
        "unit_cost": order.unit_cost,
        "status": order.status,
        "status_label": STATUS_LABELS_FA.get(order.status, order.status),
        "notes": order.notes or "",
        "started_at": _date_iso(getattr(order, "started_at", None)),
        "ready_by": _date_iso(getattr(order, "ready_by", None)),
        "is_active": bool(order.is_active),
        "delivered_at": _date_iso(getattr(order, "delivered_at", None)),
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    }


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    """Return (inclusive_start, exclusive_end) for a given year/month."""
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    return start, end


# ── Statuses (read-only) ───────────────────────────────────────────────

@router.get("/statuses")
def list_statuses(user=Depends(require_any_role)):
    """Fixed status catalog for the board UI."""
    return [
        {"value": s, "label": STATUS_LABELS_FA.get(s, s)}
        for s in ORDER_STATUSES
    ]


# ── List (with search + date range) ────────────────────────────────────

@router.get("")
def list_orders(
    status: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    search: str | None = Query(default=None, description="Search by customer name or contact"),
    from_date: str | None = Query(default=None, description="Gregorian ISO date (YYYY-MM-DD)"),
    to_date: str | None = Query(default=None, description="Gregorian ISO date (YYYY-MM-DD)"),
    user=Depends(require_any_role),
    db: Session = Depends(get_db),
):
    q = db.query(Order)
    if include_inactive is not True:
        q = q.filter(Order.is_active == True)  # noqa: E712
    if isinstance(status, str) and status:
        if status not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail="وضعیت نامعتبر است")
        q = q.filter(Order.status == status)
    if isinstance(search, str) and search.strip():
        term = f"%{search.strip()}%"
        q = q.filter(
            (Order.customer_name.ilike(term)) | (Order.contact.ilike(term))
        )
    if from_date:
        try:
            fd = date.fromisoformat(from_date)
            q = q.filter(Order.created_at >= datetime.combine(fd, datetime.min.time()))
        except ValueError:
            raise HTTPException(status_code=400, detail="تاریخ شروع نامعتبر است")
    if to_date:
        try:
            td = date.fromisoformat(to_date)
            q = q.filter(Order.created_at < datetime.combine(td, datetime.max.time()))
        except ValueError:
            raise HTTPException(status_code=400, detail="تاریخ پایان نامعتبر است")
    rows = q.order_by(Order.created_at.desc(), Order.id.desc()).all()
    return [_serialize(r) for r in rows]


# ── Get single ─────────────────────────────────────────────────────────

@router.get("/{order_id}")
def get_order(order_id: int, user=Depends(require_any_role), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="سفارش یافت نشد")
    return _serialize(order)


# ── Create ──────────────────────────────────────────────────────────────

@router.post("")
def create_order(body: OrderCreate, user=Depends(require_any_role), db: Session = Depends(get_db)):
    # Validate product exists if linked
    product = None
    if body.product_id:
        product = db.query(Product).filter(Product.id == body.product_id, Product.is_active == True).first()
        if not product:
            raise HTTPException(status_code=400, detail="محصول یافت نشد")

    # Auto-fill quoted_price from product if not provided
    quoted_price = body.quoted_price or 0
    unit_cost = None
    if product and quoted_price == 0:
        # Use product's suggested_price (with markup)
        unit_cost = _snapshot_product_cost(db, product)
        settings = get_settings_dict(db)
        markup = settings.get("default_markup_pct", 3.0)
        quoted_price = round(unit_cost * markup, 2)
    elif product:
        # Price was provided — still snapshot the cost
        unit_cost = _snapshot_product_cost(db, product)

    # Auto-fill product_label from product if empty
    product_label = body.product_label or ""
    if product and not product_label:
        product_label = product.name

    # Validate paid_amount ≤ total (qty × quoted_price)
    qty = body.qty or 1
    total = round(quoted_price * qty, 2)
    if body.paid_amount and body.paid_amount > total:
        raise HTTPException(status_code=400, detail=f"مبلغ پرداختی ({body.paid_amount}) از کل سفارش ({total}) بیشتر است")

    order = Order(
        customer_name=body.customer_name,
        contact=body.contact or "",
        product_label=product_label,
        product_id=body.product_id,
        qty=qty,
        quoted_price=quoted_price,
        paid_amount=body.paid_amount or 0,
        unit_cost=unit_cost,
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


# ── Update ──────────────────────────────────────────────────────────────

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

    # If product_id changed, re-snapshot cost and auto-fill label
    if "product_id" in data and data["product_id"]:
        product = db.query(Product).filter(Product.id == data["product_id"], Product.is_active == True).first()
        if not product:
            raise HTTPException(status_code=400, detail="محصول یافت نشد")
        data["unit_cost"] = _snapshot_product_cost(db, product)
        if not data.get("product_label"):
            data["product_label"] = product.name
        # Auto-fill quoted_price from product if current is 0 and not explicitly set
        if "quoted_price" not in data and (order.quoted_price or 0) == 0:
            settings = get_settings_dict(db)
            markup = settings.get("default_markup_pct", 3.0)
            data["quoted_price"] = round(data["unit_cost"] * markup, 2)

    # Validate paid_amount ≤ total
    qty = data.get("qty", order.qty) or 1
    quoted = data.get("quoted_price", order.quoted_price) or 0
    total = round(quoted * qty, 2)
    paid = data.get("paid_amount", order.paid_amount) or 0
    if paid > total:
        raise HTTPException(status_code=400, detail=f"مبلغ پرداختی ({paid}) از کل سفارش ({total}) بیشتر است")

    # Auto-stamp delivered_at when status changes to delivered
    new_status = data.get("status")
    if new_status and new_status != order.status:
        if new_status == "delivered":
            data["delivered_at"] = datetime.now(timezone.utc)
        elif order.status == "delivered" and new_status != "delivered":
            data["delivered_at"] = None  # un-deliver → clear timestamp

    for key, val in data.items():
        setattr(order, key, val)
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)
    invalidate_stats()
    return _serialize(order)


# ── Soft delete (archive) ──────────────────────────────────────────────

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


# ── Monthly summary ────────────────────────────────────────────────────

@router.get("/summary/monthly")
def monthly_summary(
    month: str = Query(..., description="YYYY-MM format"),
    user=Depends(require_any_role),
    db: Session = Depends(get_db),
):
    """Return monthly totals: revenue, collected, outstanding, profit, counts by status."""
    try:
        parts = month.split("-")
        year, mon = int(parts[0]), int(parts[1])
        start, end = _month_bounds(year, mon)
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="فرمت ماه نامعتبر است (مثال: 2026-07)")

    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end, datetime.min.time())

    rows = (
        db.query(Order)
        .filter(
            Order.is_active == True,  # noqa: E712
            Order.created_at >= start_dt,
            Order.created_at < end_dt,
        )
        .all()
    )

    by_status = {}
    total_quoted = 0.0
    total_paid = 0.0
    total_cost = 0.0
    order_count = 0

    for o in rows:
        s = o.status
        if s == "cancelled":
            continue
        order_count += 1
        qty = int(o.qty or 1)
        quoted = float(o.quoted_price or 0) * qty
        paid = float(o.paid_amount or 0)
        cost = float(o.unit_cost or 0) * qty

        total_quoted += quoted
        total_paid += paid
        total_cost += cost

        by_status[s] = by_status.get(s, 0) + 1

    total_outstanding = max(0.0, total_quoted - total_paid)
    total_profit = total_paid - total_cost if total_cost > 0 else None

    return {
        "month": month,
        "order_count": order_count,
        "by_status": {s: {"count": by_status.get(s, 0), "label": STATUS_LABELS_FA.get(s, s)} for s in ORDER_STATUSES if s != "cancelled"},
        "total_quoted": round(total_quoted, 2),
        "total_paid": round(total_paid, 2),
        "total_outstanding": round(total_outstanding, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": round(total_profit, 2) if total_profit is not None else None,
    }


# ── CSV Export ──────────────────────────────────────────────────────────

@router.get("/export/csv")
def export_orders_csv(
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    status: str | None = Query(default=None),
    user=Depends(require_any_role),
    db: Session = Depends(get_db),
):
    """Export orders as CSV with Persian headers."""
    q = db.query(Order).filter(Order.is_active == True)  # noqa: E712

    if status and status in ORDER_STATUSES:
        q = q.filter(Order.status == status)
    if from_date:
        try:
            fd = date.fromisoformat(from_date)
            q = q.filter(Order.created_at >= datetime.combine(fd, datetime.min.time()))
        except ValueError:
            pass
    if to_date:
        try:
            td = date.fromisoformat(to_date)
            q = q.filter(Order.created_at < datetime.combine(td, datetime.max.time()))
        except ValueError:
            pass

    rows = q.order_by(Order.created_at.desc()).all()

    output = io.StringIO()
    output.write("\ufeff")  # BOM for Excel RTL support
    writer = csv.writer(output)
    writer.writerow([
        "شماره", "مشتری", "تماس", "محصول", "تعداد",
        "قیمت واحد", "کل", "پرداختی", "مانده",
        "هزینه تولید", "سود", "وضعیت", "تاریخ ثبت", "تاریخ تحویل",
    ])

    for o in rows:
        qty = int(o.qty or 1)
        quoted = float(o.quoted_price or 0)
        total = round(quoted * qty, 2)
        paid = float(o.paid_amount or 0)
        remaining = max(0.0, total - paid)
        cost = float(o.unit_cost or 0) * qty if o.unit_cost else None
        profit = round(paid - cost, 2) if cost is not None and cost > 0 else None

        writer.writerow([
            o.id,
            o.customer_name or "",
            o.contact or "",
            o.product_label or "",
            qty,
            quoted,
            total,
            paid,
            remaining,
            round(cost, 2) if cost is not None else "",
            profit if profit is not None else "",
            STATUS_LABELS_FA.get(o.status, o.status),
            o.created_at.strftime("%Y-%m-%d") if o.created_at else "",
            o.delivered_at.strftime("%Y-%m-%d") if o.delivered_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=orders.csv"},
    )
