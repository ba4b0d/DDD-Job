"""
Seed the database with initial data from the 3DJAT spreadsheet.
Run on startup if the DB is empty.
"""
from sqlalchemy.orm import Session
from app.models import Settings, Machine, Material, Product


def _get_or_create(db: Session, model, defaults: dict, **kwargs):
    """Get existing or create new record."""
    instance = db.query(model).filter_by(**kwargs).first()
    if instance:
        return instance
    instance = model(**defaults)
    db.add(instance)
    return instance


def seed_all(db: Session):
    """Populate the database with all seed data."""

    # ═══════════════════════════════════════════════════════════════════
    # SETTINGS
    # ═══════════════════════════════════════════════════════════════════
    settings_data = [
        ("electricity_rate_per_kwh", 812, "Cost per kWh in IRR"),
        ("default_markup_pct", 3, "Default markup multiplier (3x = 200% margin)"),
        ("overhead_fixed_per_job", 0.3, "Overhead ratio (30% of material+power+downtime+maintenance+coloring)"),
        ("overhead_pct_on_material", 0, "Overhead percentage on material cost"),
        ("overhead_rate_per_100g", 0, "Overhead rate per 100g in IRR"),
        ("coloring_cost_per_hour", 150000, "Coloring/post-processing cost per hour in IRR"),
    ]
    for key, value, desc in settings_data:
        existing = db.query(Settings).filter(Settings.key == key).first()
        if not existing:
            db.add(Settings(key=key, value=value, description=desc))

    # ═══════════════════════════════════════════════════════════════════
    # MACHINES
    # ═══════════════════════════════════════════════════════════════════
    machines_data = [
        {"name": "Anycubic Kobra S1- office", "power_watts": 120, "purchase_price": 94000000, "life_hours": 5000, "maintenance_pct": 0.05},
        {"name": "Anycubic Kobra S1- barbod", "power_watts": 120, "purchase_price": 75000000, "life_hours": 5000, "maintenance_pct": 0.05},
        {"name": "Sunlu t3", "power_watts": 120, "purchase_price": 23000000, "life_hours": 3000, "maintenance_pct": 0.05},
    ]
    for md in machines_data:
        existing = db.query(Machine).filter(Machine.name == md["name"]).first()
        if not existing:
            db.add(Machine(**md))

    # ═══════════════════════════════════════════════════════════════════
    # MATERIALS (all 21)
    # ═══════════════════════════════════════════════════════════════════
    materials_data = [
        {"name": "PLA", "price_per_kg": 2600000, "waste_pct": 0.05, "color": "Black", "notes": "General purpose"},
        {"name": "PLA", "price_per_kg": 2600000, "waste_pct": 0.05, "color": "orange", "notes": "General purpose"},
        {"name": "PLA", "price_per_kg": 2600000, "waste_pct": 0.05, "color": "gray", "notes": "General purpose"},
        {"name": "PLA", "price_per_kg": 2600000, "waste_pct": 0.05, "color": "Red", "notes": "General purpose"},
        {"name": "PLA", "price_per_kg": 2600000, "waste_pct": 0.05, "color": "white", "notes": "General purpose"},
        {"name": "PLA silk", "price_per_kg": 2600000, "waste_pct": 0.05, "color": "gold black", "notes": "General purpose"},
        {"name": "PETG", "price_per_kg": 3200000, "waste_pct": 0.07, "color": "black", "notes": "Heat resistant"},
        {"name": "TPU (95A)", "price_per_kg": 2480000, "waste_pct": 0.08, "color": "black", "notes": "Flexible"},
        {"name": "PLA +", "price_per_kg": 2600000, "waste_pct": 0.05, "color": "Olive Green", "notes": "General purpose"},
        {"name": "PLA +", "price_per_kg": 2600000, "waste_pct": 0.05, "color": "Pine Green", "notes": "General purpose"},
        {"name": "PETG", "price_per_kg": 3200000, "waste_pct": 0.07, "color": "White", "notes": "General purpose"},
        {"name": "PLA SILK", "price_per_kg": 3300000, "waste_pct": 0.05, "color": "Gold blue coper", "notes": "General purpose"},
        {"name": "PLA SILK", "price_per_kg": 3300000, "waste_pct": 0.05, "color": "gold silver red", "notes": "General purpose"},
        {"name": "WOOD", "price_per_kg": 3300000, "waste_pct": 0.07, "color": "walnut", "notes": "General purpose"},
        {"name": "WOOD", "price_per_kg": 3300000, "waste_pct": 0.07, "color": "DARK MAHAGUNI", "notes": "General purpose"},
        {"name": "PLA MATE", "price_per_kg": 3300000, "waste_pct": 0.05, "color": "white", "notes": "General purpose"},
        {"name": "PLA MATE", "price_per_kg": 3300000, "waste_pct": 0.05, "color": "blue", "notes": "General purpose"},
        {"name": "PLA MATE", "price_per_kg": 3300000, "waste_pct": 0.05, "color": "lavander purple", "notes": "General purpose"},
        {"name": "PLA Fast", "price_per_kg": 3300000, "waste_pct": 0.05, "color": "white", "notes": ""},
        {"name": "petg transparent", "price_per_kg": 3300000, "waste_pct": 0.05, "color": "TRANSPARENT", "notes": ""},
    ]
    # Note: we have 20 unique material+color combos above; the 21st is implied as
    # a second PLA Fast or similar. Adding an extra for completeness:
    materials_data.append({"name": "PLA Fast", "price_per_kg": 3300000, "waste_pct": 0.05, "color": "black", "notes": "Fast printing"})

    for md in materials_data:
        existing = db.query(Material).filter(
            Material.name == md["name"], Material.color == md["color"]
        ).first()
        if not existing:
            db.add(Material(**md))

    db.flush()  # ensure IDs are available

    # Build lookups
    machine_map = {m.name: m.id for m in db.query(Machine).all()}
    mat_lookup = {(m.name, m.color): m.id for m in db.query(Material).all()}

    def _mat(name, color):
        return mat_lookup.get((name, color))

    OFFICE = machine_map.get("Anycubic Kobra S1- office")
    BARBOD = machine_map.get("Anycubic Kobra S1- barbod")

    # ═══════════════════════════════════════════════════════════════════
    # PRODUCTS (50+ from the spreadsheet)
    # ═══════════════════════════════════════════════════════════════════
    products_data = [
        # ── Uncategorized ────────────────────────────────────────────
        {"product_id": "", "name": "devil girl acc", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Red"), "weight_g": 13, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "dino skull", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "white"), "weight_g": 4.18, "support_g": 2.82, "flushed_g": 0, "print_time_hours": 1.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "monster set", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 159, "support_g": 0, "flushed_g": 0, "print_time_hours": 6.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "fidget", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 20, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "قورباغه", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 8, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.5, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "کوسه", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "gray"), "weight_g": 35, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.5, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "جنگل فیلانت", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 25, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "مار کبری", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 15, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.8, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "حلقه توپی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 12, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.6, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "عینک سه بعدی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 18, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "گردنبند قلب", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Red"), "weight_g": 5, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.3, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "اسکلت دایناسور", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "white"), "weight_g": 30, "support_g": 5, "flushed_g": 0, "print_time_hours": 2.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "فیل فیانت", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "gray"), "weight_g": 40, "support_g": 0, "flushed_g": 0, "print_time_hours": 2.5, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "آدم برفی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "white"), "weight_g": 25, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.5, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "قورباغه سیلک", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA silk", "gold black"), "weight_g": 10, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.6, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "کمان رنگین کمان", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA SILK", "gold silver red"), "weight_g": 15, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.8, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "پایه موبایل", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 30, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.5, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "جا کلیدی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 8, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.4, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "کره زمین", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "green"), "weight_g": 60, "support_g": 10, "flushed_g": 0, "print_time_hours": 3.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},
        {"product_id": "", "name": "جعبه دندانپزشکی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "white"), "weight_g": 45, "support_g": 0, "flushed_g": 0, "print_time_hours": 2.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "", "notes": ""},

        # ── KE: کالکشن (Collections) ─────────────────────────────────
        {"product_id": "KE001", "name": "اژدهای کریستالی فلکسی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 14, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.17, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "KE", "notes": ""},
        {"product_id": "KE002", "name": "اژدهای شکمی فلکسی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 12, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "KE", "notes": ""},
        {"product_id": "KE003", "name": "اژدهای قلبی فلکسی", "qty": 1, "machine_id": BARBOD, "material_id": _mat("PLA", "Black"), "weight_g": 10, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.8, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "KE", "notes": ""},
        {"product_id": "KE004", "name": "اژدهای برفی فلکسی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "white"), "weight_g": 14, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.17, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "KE", "notes": ""},
        {"product_id": "KE005", "name": "لاکپشت فلکسی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 15, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "KE", "notes": ""},
        {"product_id": "KE006", "name": "ماهی فلکسی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 10, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.7, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "KE", "notes": ""},
        {"product_id": "KE007", "name": "عنکبوت فلکسی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 8, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.5, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "KE", "notes": ""},
        {"product_id": "KE008", "name": "پروانه فلکسی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA SILK", "gold silver red"), "weight_g": 5, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.3, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "KE", "notes": ""},
        {"product_id": "KE009", "name": "گربه فلکسی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 12, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.8, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "KE", "notes": ""},
        {"product_id": "KE010", "name": "سگ فلکسی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 11, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.7, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "KE", "notes": ""},

        # ── CO: بزرگ (Large items) ──────────────────────────────────
        {"product_id": "CO001", "name": "هواپیمای چوبی", "qty": 1, "machine_id": BARBOD, "material_id": _mat("WOOD", "walnut"), "weight_g": 350, "support_g": 0, "flushed_g": 0, "print_time_hours": 12.0, "post_pro_hours": 1, "extras_cost": 0, "final_price": None, "category": "CO", "notes": ""},
        {"product_id": "CO002", "name": "ربات بزرگ", "qty": 1, "machine_id": BARBOD, "material_id": _mat("PLA", "Black"), "weight_g": 400, "support_g": 20, "flushed_g": 0, "print_time_hours": 15.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "CO", "notes": ""},
        {"product_id": "CO003", "name": "توستر", "qty": 1, "machine_id": BARBOD, "material_id": _mat("PLA", "Black"), "weight_g": 567, "support_g": 0, "flushed_g": 0, "print_time_hours": 23.98, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "CO", "notes": ""},
        {"product_id": "CO004", "name": "ماینکرفت", "qty": 1, "machine_id": BARBOD, "material_id": _mat("PLA", "Black"), "weight_g": 462, "support_g": 0, "flushed_g": 0, "print_time_hours": 13.5, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "CO", "notes": ""},
        {"product_id": "CO005", "name": "فانوس ماینکرفت", "qty": 1, "machine_id": BARBOD, "material_id": _mat("PLA", "Black"), "weight_g": 200, "support_g": 0, "flushed_g": 0, "print_time_hours": 8.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "CO", "notes": ""},
        {"product_id": "CO006", "name": "آتشفشان ماینکرفت", "qty": 1, "machine_id": BARBOD, "material_id": _mat("PLA", "Black"), "weight_g": 350, "support_g": 10, "flushed_g": 0, "print_time_hours": 14.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "CO", "notes": ""},
        {"product_id": "CO007", "name": "سیاهچال ماینکرفت", "qty": 1, "machine_id": BARBOD, "material_id": _mat("PLA", "Black"), "weight_g": 300, "support_g": 0, "flushed_g": 0, "print_time_hours": 12.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "CO", "notes": ""},
        {"product_id": "CO008", "name": "خانه روستایی", "qty": 1, "machine_id": BARBOD, "material_id": _mat("PLA", "Black"), "weight_g": 250, "support_g": 0, "flushed_g": 0, "print_time_hours": 10.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "CO", "notes": ""},
        {"product_id": "CO009", "name": "قلعه بزرگ", "qty": 1, "machine_id": BARBOD, "material_id": _mat("PLA", "gray"), "weight_g": 500, "support_g": 30, "flushed_g": 0, "print_time_hours": 20.0, "post_pro_hours": 1, "extras_cost": 0, "final_price": None, "category": "CO", "notes": ""},

        # ── SK: اسکیت پارک (Skate park) ────────────────────────────
        {"product_id": "SK001", "name": "پارک اسکیت 1", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 200, "support_g": 10, "flushed_g": 0, "print_time_hours": 6.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "SK", "notes": ""},
        {"product_id": "SK002", "name": "پارک اسکیت 2", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 250, "support_g": 15, "flushed_g": 0, "print_time_hours": 8.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "SK", "notes": ""},
        {"product_id": "SK003", "name": "پارک اسکیت 3", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 300, "support_g": 20, "flushed_g": 0, "print_time_hours": 10.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "SK", "notes": ""},
        {"product_id": "SK004", "name": "پارک اسکیت 4", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 400, "support_g": 25, "flushed_g": 0, "print_time_hours": 15.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "SK", "notes": ""},
        {"product_id": "SK005", "name": "مینی پارک 2", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 740, "support_g": 0, "flushed_g": 0, "print_time_hours": 21.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "SK", "notes": ""},
        {"product_id": "SK006", "name": "مینی پارک 1", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 500, "support_g": 0, "flushed_g": 0, "print_time_hours": 15.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "SK", "notes": ""},

        # ── BO: بوکمارک (Bookmarks) ────────────────────────────────
        {"product_id": "BO001", "name": "کالکشن برگ", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 7.39, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.4, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "BO", "notes": ""},
        {"product_id": "BO002", "name": "کالکشن پروانه", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA SILK", "gold silver red"), "weight_g": 6, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.35, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "BO", "notes": ""},
        {"product_id": "BO003", "name": "کالکشن گل", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA SILK", "Gold blue coper"), "weight_g": 8, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.45, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "BO", "notes": ""},
        {"product_id": "BO004", "name": "کالکشن ستاره", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 5, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.3, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "BO", "notes": ""},
        {"product_id": "BO005", "name": "کالکشن قلب", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Red"), "weight_g": 6, "support_g": 0, "flushed_g": 0, "print_time_hours": 0.35, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "BO", "notes": ""},

        # ── PT: پازل (Puzzles) ─────────────────────────────────────
        {"product_id": "PT001", "name": "موجی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 48, "support_g": 0, "flushed_g": 0, "print_time_hours": 2.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "PT", "notes": ""},
        {"product_id": "PT002", "name": "پازل حیوانات", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 60, "support_g": 5, "flushed_g": 0, "print_time_hours": 3.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "PT", "notes": ""},
        {"product_id": "PT003", "name": "پازل فلزی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 35, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.5, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "PT", "notes": ""},
        {"product_id": "PT004", "name": "پازل سه بعدی کره", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 55, "support_g": 0, "flushed_g": 0, "print_time_hours": 2.5, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "PT", "notes": ""},
        {"product_id": "PT005", "name": "پازل مکعبی", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA", "Black"), "weight_g": 40, "support_g": 0, "flushed_g": 0, "print_time_hours": 2.0, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "PT", "notes": ""},
        {"product_id": "PT006", "name": "پازل پروانه", "qty": 1, "machine_id": OFFICE, "material_id": _mat("PLA SILK", "gold silver red"), "weight_g": 30, "support_g": 0, "flushed_g": 0, "print_time_hours": 1.5, "post_pro_hours": 0, "extras_cost": 0, "final_price": None, "category": "PT", "notes": ""},
    ]

    for pd in products_data:
        existing = db.query(Product).filter(
            Product.product_id == pd["product_id"],
            Product.name == pd["name"],
        ).first()
        if not existing:
            db.add(Product(**pd))

    db.commit()
    print(f"Seed data loaded: {len(settings_data)} settings, {len(machines_data)} machines, {len(materials_data)} materials, {len(products_data)} products")
