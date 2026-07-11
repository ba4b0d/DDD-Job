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
│   │   ├── main.py          # FastAPI app, CORS, startup seed
│   │   ├── models.py         # SQLAlchemy: Settings, Machine, Material, Product
│   │   ├── schemas.py        # Pydantic request/response models
│   │   ├── calculator.py     # Cost calculation engine (pure + DB-aware)
│   │   ├── cache.py          # In-memory settings cache (60s TTL)
│   │   ├── seed.py           # DB seeding on first run
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   └── routers/
│   │       ├── products.py   # CRUD + image upload + /calculate
│   │       ├── materials.py  # CRUD
│   │       ├── machines.py   # CRUD
│   │       ├── settings.py   # Bulk update
│   │       └── stats.py      # Aggregate dashboard stats
│   └── uploads/              # Product images (UUID filenames)
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Routes
│   │   ├── main.jsx          # Entry point
│   │   ├── index.css         # Themes (hybrid/dark), RTL, Vazirmatn
│   │   ├── pages/            # Dashboard, Products, ProductDetail, Materials, Machines, Settings, Calculator
│   │   ├── components/       # Layout, Sidebar, Modal, CostBreakdown, PriceDisplay, etc.
│   │   └── lib/
│   │       ├── api.js        # Axios API client (/api/v1/*)
│   │       ├── theme.jsx     # Theme context (dark/hybrid)
│   │       └── utils.js      # formatPrice, formatMinutes, etc.
│   └── public/manifest.json  # PWA manifest
└── data/3djat.db             # SQLite database
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
- **Theme**: CSS custom properties via `data-theme` attribute (hybrid=light sidebar + dark content, dark=full dark)
- **RTL**: `dir="rtl"` on root `<html>` and layout `<div>`
- All monetary values in Iranian Toman (IRR)

## Running
```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```
