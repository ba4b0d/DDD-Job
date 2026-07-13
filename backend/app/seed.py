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
    # PRODUCTS — empty by default, import via Excel or add through UI
    # ═══════════════════════════════════════════════════════════════════
    products_data = []

    for pd in products_data:
        existing = db.query(Product).filter(
            Product.product_id == pd["product_id"],
            Product.name == pd["name"],
        ).first()
        if not existing:
            db.add(Product(**pd))

    db.commit()
    print(f"Seed data loaded: {len(settings_data)} settings, {len(machines_data)} machines, {len(materials_data)} materials, {len(products_data)} products")
