"""
Stats endpoint — optimized to avoid N+1 queries.

Loads settings, materials, and machines ONCE per request, then iterates
products using the pure-calculation function (no DB calls per product).

Also returns KISS shop-ops monthly order totals (not accounting).

Results are cached in-memory for 60 seconds.
"""
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product, Material, Machine, Order
from app.cache import get_settings_dict
from app.calculator import calculate_product_costs_from_values

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])

# ── In-memory stats cache ──────────────────────────────────────────
_STATS_TTL = 60  # seconds
_stats_cache: dict = {}

_OPEN_STATUSES = frozenset({"new", "quoted", "printing", "ready"})


def _invalidate_stats_cache():
    _stats_cache.clear()


def _month_bounds_utc(now: datetime | None = None) -> tuple[datetime, datetime, int, int]:
    """Inclusive start / exclusive end of current calendar month (UTC)."""
    now = now or datetime.now(timezone.utc)
    y, m = now.year, now.month
    start = datetime(y, m, 1, tzinfo=timezone.utc)
    # exclusive end = first day of next month
    if m == 12:
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(y, m + 1, 1, tzinfo=timezone.utc)
    return start, end, y, m


from sqlalchemy import func, case


def _order_ops_stats(db: Session) -> dict:
    """Monthly order volume + cash in using SQL aggregation queries."""
    start, end, year, month = _month_bounds_utc()
    start_naive = start.replace(tzinfo=None)
    end_naive = end.replace(tzinfo=None)

    # 1. Total open active orders
    open_count = (
        db.query(func.count(Order.id))
        .filter(Order.is_active == True, Order.status.in_(_OPEN_STATUSES))
        .scalar()
        or 0
    )

    # 2. Monthly active non-cancelled orders aggregation
    month_stats = (
        db.query(
            func.count(Order.id).label("count"),
            func.coalesce(func.sum(Order.paid_amount), 0.0).label("paid"),
            func.coalesce(func.sum(Order.quoted_price), 0.0).label("quoted"),
            func.coalesce(
                func.sum(
                    case(
                        (Order.quoted_price > Order.paid_amount, Order.quoted_price - Order.paid_amount),
                        else_=0.0,
                    )
                ),
                0.0,
            ).label("remaining"),
        )
        .filter(
            Order.is_active == True,
            Order.status != "cancelled",
            Order.created_at >= start_naive,
            Order.created_at < end_naive,
        )
        .first()
    )

    return {
        "orders_this_month": month_stats.count if month_stats else 0,
        "orders_paid_this_month": round(float(month_stats.paid), 2) if month_stats else 0.0,
        "orders_quoted_this_month": round(float(month_stats.quoted), 2) if month_stats else 0.0,
        "orders_remaining_this_month": round(float(month_stats.remaining), 2) if month_stats else 0.0,
        "orders_open": open_count,
        "orders_month": month,
        "orders_year": year,
    }


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    """Aggregate stats across products — O(1) DB reads for settings."""
    now = time.time()
    cached = _stats_cache.get("stats")
    if cached and (now - cached["ts"]) < _STATS_TTL:
        return cached["data"]

    # ── Batch-load everything ONCE ────────────────────────────────────
    settings = get_settings_dict(db)

    all_materials = {m.id: m for m in db.query(Material).all()}
    all_machines = {m.id: m for m in db.query(Machine).all()}

    total_products = db.query(Product).count()
    all_products = db.query(Product).filter(Product.is_active == True).all()
    active_products = all_products  # already filtered
    total_materials = sum(1 for m in all_materials.values() if m.is_active)
    total_machines = sum(1 for m in all_machines.values() if m.is_active)

    # ── Compute margins for active products ────────────────────────────
    margins = []
    prices = []
    categories: dict[str, int] = {}

    for p in active_products:
        mat = all_materials.get(p.material_id) if p.material_id else None
        mach = all_machines.get(p.machine_id) if p.machine_id else None

        costs = calculate_product_costs_from_values(
            settings,
            weight_g=p.weight_g,
            support_g=p.support_g,
            flushed_g=p.flushed_g,
            print_time_hours=p.print_time_hours,
            post_pro_hours=p.post_pro_hours,
            extras_cost=p.extras_cost,
            material_price_per_kg=mat.price_per_kg if mat else 0.0,
            material_waste_pct=mat.waste_pct if mat else 0.05,
            machine_power_watts=mach.power_watts if mach else 120.0,
            machine_purchase_price=mach.purchase_price if mach else 0.0,
            machine_life_hours=mach.life_hours if mach else 5000.0,
            machine_maintenance_pct=mach.maintenance_pct if mach else 0.05,
        )
        margins.append(costs["margin_pct"])
        prices.append(costs["suggested_price"])
        cat = p.category or "uncategorized"
        categories[cat] = categories.get(cat, 0) + 1

    avg_margin = round(sum(margins) / len(margins), 2) if margins else 0
    price_min = round(min(prices), 2) if prices else None
    price_max = round(max(prices), 2) if prices else None

    order_ops = _order_ops_stats(db)

    result = {
        "total_products": total_products,
        "active_products": len(active_products),
        "total_materials": total_materials,
        "total_machines": total_machines,
        "avg_margin_pct": avg_margin,
        "price_min": price_min,
        "price_max": price_max,
        "products_per_category": categories,
        **order_ops,
    }

    _stats_cache["stats"] = {"data": result, "ts": now}
    return result


# Expose invalidation for other routers to call after writes
def invalidate_stats():
    """Call from product/material/machine/settings/order routers after mutations."""
    _stats_cache.clear()
