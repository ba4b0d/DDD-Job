# 3DJAT Pricing App

## Overview
A 3D printing product cost calculation and pricing tool for the 3DJAT business.
Manages products, materials, and machines; computes costs using configurable formulas; displays suggested prices with markup.

## Tech Stack
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, SQLite (file: `data/3djat.db`)
- **Frontend**: React 18, Vite, TailwindCSS, React Router, Axios, Lucide icons
- **Language**: Persian/Farsi (RTL) with Vazirmatn font

## Project Structure
```
3djat-pricing/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, startup seed/migrations
│   │   ├── models.py         # SQLAlchemy: Settings, Machine, Material, Product
│   │   ├── schemas.py        # Pydantic request/response models
│   │   ├── calculator.py     # Cost calculation engine (pure + DB-aware)
│   │   ├── cache.py          # In-memory settings cache (60s TTL, deepcopied)
│   │   ├── database.py       # SQLAlchemy engine + session (WAL mode)
│   │   ├── seed.py           # DB seeding on first run
│   │   ├── import_remaining.py # Legacy importer
│   │   ├── repositories/     # Data access layer
│   │   └── routers/
│   │       ├── auth.py       # JWT (httpOnly cookie), role-based auth
│   │       ├── products.py   # CRUD + image upload + dimension extract + /calculate
│   │       ├── materials.py  # CRUD (uniqueness: name+color)
│   │       ├── machines.py   # CRUD
│   │       ├── settings.py   # Bulk update + branding upload (admin only)
│   │       ├── catalog.py    # Public catalog (no auth, no cost breakdown)
│   │       ├── categories.py # Authenticated list
│   │       ├── stats.py      # Aggregate dashboard stats
│   │       └── orders.py     # Shop order board
│   └── uploads/              # Product images + 3MF/STL models
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Routes (AdminRoute wrapper for role gating)
│   │   ├── main.jsx          # Entry point
│   │   ├── index.css         # Themes + CSS vars (--border, --bg-card, --accent)
│   │   ├── pages/            # Dashboard, Products, ProductDetail, Materials, Machines, Settings, Calculator, Catalog, Orders, Categories
│   │   ├── components/       # Layout, Sidebar, Modal, CostBreakdown, PriceDisplay, ForcePasswordChange, ShamsiDateField, etc.
│   │   └── lib/
│   │       ├── api.js        # Axios API client (/api/v1/*, withCredentials: true)
│   │       ├── auth.jsx      # Cookie-based auth context
│   │       ├── theme.jsx     # Theme context (dark/hybrid)
│   │       └── utils.js      # formatPrice, formatMinutes, etc.
│   └── public/manifest.json  # PWA manifest
├── data/3djat.db             # SQLite database (WAL mode)
├── scripts/                  # CLI tools (upload_product.py uses PrusaSlicer)
└── docker-compose.yml        # Backend + frontend services (non-root, healthchecks)
```

## Cost Calculation Formula
```
material_cost = (weight + support + flushed) * (1 + waste%) * price_per_kg / 1000
power_cost = (watts / 1000) * print_hours * electricity_rate
downtime_cost = print_hours * (purchase_price / life_hours)
maintenance_cost = downtime_cost * maintenance_pct
coloring_cost = post_pro_hours * coloring_cost_per_hour
overhead = (sum_above) * overhead_ratio  [default 30%]
base_price = sum_above + overhead + extras_cost
suggested_price = base_price * markup  [default 3x]
```

## API Base
All endpoints under `/api/v1/`. Products returned with computed cost fields via `_enrich_product()`.

## Key Conventions
- **Soft deletes**: `is_active = false` instead of row deletion
- **Cache invalidation**: Settings and stats caches auto-invalidate on writes
- **Validation errors** are in Persian (Farsi)
- **Theme**: CSS custom properties via `data-theme` attribute (single soft-blue theme; orange brand accents)
- **RTL**: `dir="rtl"` on root `<html>` and layout `<div>`
- All monetary values in Iranian Toman (IRR)
- **Auth**: JWT in httpOnly cookie (`SameSite=Lax`); `require_admin` for role-gated routes
- **Image uploads**: validated by magic bytes (JPEG/PNG/WebP/GIF); max 5 images per product, 10MB each
- **Dimensions**: auto-extracted from 3MF/STL mesh vertex bounding box (no PrusaSlicer needed)

## Running
```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev

# Docker (production-like, non-root)
docker compose up -d --build
```
