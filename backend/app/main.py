"""
3DJAT 3D Printing Product Pricing API
FastAPI application with CORS, SQLite, and seed data.
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()  # Load .env file if present
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, SessionLocal, Base
from app.models import Settings, Machine, Material, Product, Category
from app.seed import seed_all
from fastapi import HTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.routers.auth import require_any_role, limiter

from app.routers.settings import router as settings_router
from app.routers.materials import router as materials_router
from app.routers.machines import router as machines_router
from app.routers.products import router as products_router
from app.routers.stats import router as stats_router
from app.routers.auth import router as auth_router
from app.routers.categories import router as categories_router

# ── Uploads directory ────────────────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and seed data on first run."""
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed if settings table is empty
        if db.query(Settings).count() == 0:
            seed_all(db)
            print("Database seeded with initial data.")
        else:
            print("Database already contains data, skipping seed.")

        # Sync: import existing product category strings into categories table
        existing_cat_names = {c.name for c in db.query(Category.name).all()}
        product_cats = (
            db.query(Product.category)
            .filter(Product.category != None, Product.category != "")
            .distinct()
            .all()
        )
        imported = 0
        for (cat_name,) in product_cats:
            if cat_name not in existing_cat_names:
                db.add(Category(name=cat_name))
                existing_cat_names.add(cat_name)
                imported += 1
        if imported:
            db.commit()
            print(f"Imported {imported} product categories into categories table.")
    finally:
        db.close()

    yield


app = FastAPI(
    title="3DJAT Pricing API",
    description="3D printing product cost calculation and pricing",
    version="1.0.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS (explicit origins) ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://192.168.100.9:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ──────────────────────────────────────────────────
app.include_router(settings_router, dependencies=[Depends(require_any_role)])
app.include_router(materials_router, dependencies=[Depends(require_any_role)])
app.include_router(machines_router, dependencies=[Depends(require_any_role)])
app.include_router(products_router, dependencies=[Depends(require_any_role)])
app.include_router(stats_router, dependencies=[Depends(require_any_role)])
app.include_router(auth_router)
app.include_router(categories_router)

# ── Static files for uploads ────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {
        "name": "3DJAT Pricing API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
