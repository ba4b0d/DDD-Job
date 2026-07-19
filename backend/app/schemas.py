from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, field_validator


# ── Settings ──────────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    key: str
    value: float
    description: Optional[str] = None
    string_value: Optional[str] = None


class SettingsBulkUpdate(BaseModel):
    settings: list[SettingsUpdate]


class SettingsResponse(BaseModel):
    id: int
    key: str
    value: float
    description: str

    class Config:
        from_attributes = True


# ── Machine ───────────────────────────────────────────────────────────────

class MachineCreate(BaseModel):
    name: str
    power_watts: float = 0
    purchase_price: float = Field(default=0, ge=0)
    life_hours: float = Field(default=5000, ge=0)
    maintenance_pct: float = Field(default=0.05, ge=0, le=1)
    is_active: bool = True

    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('نام ماشین نمی‌تواند خالی باشد')
        return v.strip()

    @field_validator('power_watts')
    @classmethod
    def power_positive(cls, v):
        if v <= 0:
            raise ValueError('توان باید بزرگتر از صفر باشد')
        return v


class MachineUpdate(BaseModel):
    name: Optional[str] = None
    power_watts: Optional[float] = None
    purchase_price: Optional[float] = None
    life_hours: Optional[float] = None
    maintenance_pct: Optional[float] = None
    is_active: Optional[bool] = None


class MachineResponse(BaseModel):
    id: int
    name: str
    power_watts: float
    purchase_price: float
    life_hours: float
    maintenance_pct: float
    is_active: bool

    class Config:
        from_attributes = True


# ── Material ──────────────────────────────────────────────────────────────

class MaterialCreate(BaseModel):
    name: str
    price_per_kg: float = 0
    waste_pct: float = 0.05
    color: str = ""
    notes: str = ""
    is_active: bool = True

    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('نام ماده نمی‌تواند خالی باشد')
        return v.strip()

    @field_validator('price_per_kg')
    @classmethod
    def price_not_negative(cls, v):
        if v < 0:
            raise ValueError('قیمت نمی‌تواند منفی باشد')
        return v


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    price_per_kg: Optional[float] = None
    waste_pct: Optional[float] = None
    color: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class MaterialResponse(BaseModel):
    id: int
    name: str
    price_per_kg: float
    waste_pct: float
    color: str
    notes: str
    is_active: bool

    class Config:
        from_attributes = True


# ── Product ───────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    product_id: str = ""
    name: str
    qty: int = 1
    machine_id: Optional[int] = None
    material_id: Optional[int] = None
    weight_g: float = 0
    support_g: float = 0
    flushed_g: float = 0
    print_time_hours: float = 0
    post_pro_hours: float = 0
    extras_cost: float = 0
    final_price: Optional[float] = None
    image_url: Optional[str] = None
    category: str = ""
    notes: str = ""
    is_active: bool = True

    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('نام محصول نمی‌تواند خالی باشد')
        return v.strip()

    @field_validator('weight_g')
    @classmethod
    def weight_positive(cls, v):
        if v <= 0:
            raise ValueError('وزن باید بزرگتر از صفر باشد')
        return v

    @field_validator('print_time_hours')
    @classmethod
    def print_time_positive(cls, v):
        if v <= 0:
            raise ValueError('زمان چاپ باید بزرگتر از صفر باشد')
        return v


class ProductUpdate(BaseModel):
    product_id: Optional[str] = None
    name: Optional[str] = None
    qty: Optional[int] = None
    machine_id: Optional[int] = None
    material_id: Optional[int] = None
    weight_g: Optional[float] = None
    support_g: Optional[float] = None
    flushed_g: Optional[float] = None
    print_time_hours: Optional[float] = None
    post_pro_hours: Optional[float] = None
    extras_cost: Optional[float] = None
    final_price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    id: int
    product_id: str
    name: str
    qty: int
    machine_id: Optional[int]
    machine_name: Optional[str] = None
    material_id: Optional[int]
    material_name: Optional[str] = None
    material_color: Optional[str] = None
    weight_g: float
    support_g: float
    flushed_g: float
    print_time_hours: float
    post_pro_hours: float
    extras_cost: float
    final_price: Optional[float]
    image_url: Optional[str] = None
    category: str
    notes: str
    is_active: bool

    # Computed cost fields
    material_cost: float = 0
    power_cost: float = 0
    downtime_cost: float = 0
    maintenance_cost: float = 0
    coloring_cost: float = 0
    overhead_cost: float = 0
    base_price: float = 0
    suggested_price: float = 0
    gross_margin: float = 0
    margin_pct: float = 0

    class Config:
        from_attributes = True


# ── Calculator (stateless) ───────────────────────────────────────────────

class CalculateRequest(BaseModel):
    weight_g: float = 0
    support_g: float = 0
    flushed_g: float = 0
    print_time_hours: float = 0
    post_pro_hours: float = 0
    extras_cost: float = 0
    machine_id: Optional[int] = None
    material_id: Optional[int] = None


class CalculateResponse(BaseModel):
    material_cost: float
    power_cost: float
    downtime_cost: float
    maintenance_cost: float
    coloring_cost: float
    overhead_cost: float
    base_price: float
    suggested_price: float
    gross_margin: float
    margin_pct: float


# ── Category ──────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str

    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('نام دسته‌بندی الزامی است')
        return v.strip()


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None


# ── Order (shop ops board B) ──────────────────────────────────────────────

ORDER_STATUS_VALUES = ("new", "quoted", "printing", "ready", "delivered", "cancelled")


def _empty_date(v):
    """Treat '', whitespace, and missing as None for optional date fields."""
    if v is None:
        return None
    if isinstance(v, str) and not v.strip():
        return None
    return v


class OrderCreate(BaseModel):
    customer_name: str
    contact: str = ""
    product_label: str = ""
    product_id: Optional[int] = None
    quoted_price: float = Field(default=0, ge=0)
    paid_amount: float = Field(default=0, ge=0)
    status: str = "new"
    notes: str = ""
    started_at: Optional[date] = None
    ready_by: Optional[date] = None

    @field_validator("customer_name")
    @classmethod
    def customer_name_not_empty(cls, v):
        if not v or not str(v).strip():
            raise ValueError("نام مشتری الزامی است")
        return str(v).strip()

    @field_validator("status")
    @classmethod
    def status_allowed(cls, v):
        if v not in ORDER_STATUS_VALUES:
            raise ValueError("وضعیت نامعتبر است")
        return v

    @field_validator("started_at", "ready_by", mode="before")
    @classmethod
    def optional_dates(cls, v):
        return _empty_date(v)


class OrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    contact: Optional[str] = None
    product_label: Optional[str] = None
    product_id: Optional[int] = None
    quoted_price: Optional[float] = Field(default=None, ge=0)
    paid_amount: Optional[float] = Field(default=None, ge=0)
    status: Optional[str] = None
    notes: Optional[str] = None
    started_at: Optional[date] = None
    ready_by: Optional[date] = None
    is_active: Optional[bool] = None

    @field_validator("customer_name")
    @classmethod
    def customer_name_not_empty(cls, v):
        if v is None:
            return v
        if not str(v).strip():
            raise ValueError("نام مشتری الزامی است")
        return str(v).strip()

    @field_validator("status")
    @classmethod
    def status_allowed(cls, v):
        if v is None:
            return v
        if v not in ORDER_STATUS_VALUES:
            raise ValueError("وضعیت نامعتبر است")
        return v

    @field_validator("started_at", "ready_by", mode="before")
    @classmethod
    def optional_dates(cls, v):
        return _empty_date(v)


# ── Stats ─────────────────────────────────────────────────────────────────

class StatsResponse(BaseModel):
    total_products: int
    active_products: int
    total_materials: int
    total_machines: int
    avg_margin_pct: float
    price_min: Optional[float]
    price_max: Optional[float]
    products_per_category: dict[str, int]
