from sqlalchemy import Column, Integer, Float, String, Boolean, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import re
import unicodedata
from app.database import Base


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Float, nullable=False, default=0.0)
    string_value = Column(String, default="")
    description = Column(String, default="")


class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    power_watts = Column(Float, nullable=False, default=0)
    purchase_price = Column(Float, nullable=False, default=0)
    life_hours = Column(Float, nullable=False, default=5000)
    maintenance_pct = Column(Float, nullable=False, default=0.05)
    is_active = Column(Boolean, default=True)

    products = relationship("Product", back_populates="machine")


class Material(Base):
    __tablename__ = "materials"
    __table_args__ = (
        UniqueConstraint("name", "color", name="uq_material_name_color"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price_per_kg = Column(Float, nullable=False, default=0)
    waste_pct = Column(Float, nullable=False, default=0.05)
    color = Column(String, default="")
    notes = Column(String, default="")
    is_active = Column(Boolean, default=True)

    products = relationship("Product", back_populates="material")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String, nullable=False)
    sort_order = Column(Integer, default=0, index=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="images")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, default="")
    name = Column(String, nullable=False)
    qty = Column(Integer, default=1)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True, index=True)
    weight_g = Column(Float, default=0)
    support_g = Column(Float, default=0)
    flushed_g = Column(Float, default=0)
    dimension_x = Column(Float, nullable=True)  # mm
    dimension_y = Column(Float, nullable=True)  # mm
    dimension_z = Column(Float, nullable=True)  # mm
    print_time_hours = Column(Float, default=0)
    post_pro_hours = Column(Float, default=0)
    extras_cost = Column(Float, default=0)
    final_price = Column(Float, nullable=True)
    image_url = Column(String, nullable=True, default=None)  # Kept for backward compat — primary image
    model_file = Column(String, nullable=True, default=None)  # 3MF/STL model file path
    category = Column(String, default="", index=True)
    notes = Column(String, default="")
    is_active = Column(Boolean, default=True, index=True)
    slug = Column(String, unique=True, nullable=True, index=True)
    tags = Column(String, nullable=True, default="")  # comma-separated: 'keychain,gift,pet'
    machine = relationship("Machine", back_populates="products")
    material = relationship("Material", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")

    @staticmethod
    def generate_slug(name: str) -> str:
        """Convert a product name (Persian/English) to a URL-safe slug."""
        if not name:
            return ""
        slug = unicodedata.normalize("NFKD", name)
        slug = slug.encode("ascii", "ignore").decode("ascii").lower()
        slug = re.sub(r"[^a-z0-9]+", "-", slug)
        slug = re.sub(r"-+", "-", slug).strip("-")
        return slug or "product"
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, default="")
    role = Column(String, nullable=False, default="employee")  # admin | employee
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, default="")
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)


# Fixed shop-ops statuses (B board) — keep list short for ADHD/OCD-friendly UI
ORDER_STATUSES = (
    "new",        # جدید
    "quoted",     # قیمت‌داده‌شده
    "printing",   # در حال چاپ
    "ready",      # آماده تحویل
    "delivered",  # تحویل‌شده
    "cancelled",  # لغو
)


class Order(Base):
    """Minimal shop order board — not accounting."""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False, default="", index=True)
    contact = Column(String, default="")  # phone / Telegram / etc.
    product_label = Column(String, default="")  # free text what they ordered
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    qty = Column(Integer, default=1)
    quoted_price = Column(Float, default=0)  # تومان (per unit)
    paid_amount = Column(Float, default=0)   # تومان
    unit_cost = Column(Float, nullable=True)  # snapshot of product base_price at creation
    status = Column(String, nullable=False, default="new", index=True)
    notes = Column(String, default="")
    # Shop schedule (optional) — not notifications yet
    started_at = Column(Date, nullable=True)   # تاریخ شروع کار
    ready_by = Column(Date, nullable=True)     # موعد آماده ارسال / تحویل
    is_active = Column(Boolean, default=True, index=True)
    delivered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    product = relationship("Product", lazy="joined")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.id")


class OrderItem(Base):
    """Line item within an order — supports multi-product orders."""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    product_label = Column(String, default="")  # free text fallback
    qty = Column(Integer, default=1)
    unit_price = Column(Float, default=0)  # quoted price per unit
    unit_cost = Column(Float, nullable=True)  # snapshot of base_price
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    order = relationship("Order", back_populates="items")
    product = relationship("Product", lazy="joined")
