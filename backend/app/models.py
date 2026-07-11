from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Float, nullable=False, default=0.0)
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

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price_per_kg = Column(Float, nullable=False, default=0)
    waste_pct = Column(Float, nullable=False, default=0.05)
    color = Column(String, default="")
    notes = Column(String, default="")
    is_active = Column(Boolean, default=True)

    products = relationship("Product", back_populates="material")


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
    print_time_hours = Column(Float, default=0)
    post_pro_hours = Column(Float, default=0)
    extras_cost = Column(Float, default=0)
    final_price = Column(Float, nullable=True)
    image_url = Column(String, nullable=True, default=None)
    category = Column(String, default="", index=True)
    notes = Column(String, default="")
    is_active = Column(Boolean, default=True, index=True)

    machine = relationship("Machine", back_populates="products")
    material = relationship("Material", back_populates="products")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, default="")
    role = Column(String, nullable=False, default="employee")  # admin | employee
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, default="")
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
