# 3DJAT Pricing App — Design Document

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend framework | FastAPI | 0.110+ |
| ORM | SQLAlchemy | 2.0+ |
| Database | SQLite (file-based) | 3.x |
| Validation | Pydantic v2 | 2.x |
| Frontend framework | React | 18 |
| Build tool | Vite | 5.x |
| Styling | TailwindCSS | 3.x |
| Routing | React Router | 6.x |
| HTTP client | Axios | 1.x |
| Icons | Lucide React | latest |
| Font | Vazirmatn (Google Fonts) | — |
| API style | REST (JSON) | — |
| API prefix | `/api/v1/` | — |

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (PWA)                     │
│  ┌────────────────────────────────────────────────┐  │
│  │  React SPA (Vite dev server / dist)            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │ Pages    │ │Components│ │ lib/api.js    │  │  │
│  │  │ 7 views  │ │ 10+ UI   │ │ (Axios → /api)│  │  │
│  │  └──────────┘ └──────────┘ └───────┬───────┘  │  │
│  └─────────────────────────────────────┼──────────┘  │
└────────────────────────────────────────┼─────────────┘
                                         │ HTTP
                                         ▼
┌────────────────────────────────────────────────────┐
│  FastAPI Backend (port 8000)                        │
│  ┌──────────────────────────────────────────────┐  │
│  │  Routers: products, materials, machines,     │  │
│  │           settings, stats, /calculate        │  │
│  └──────────────────────┬───────────────────────┘  │
│  ┌──────────────────────┴───────────────────────┐  │
│  │  calculator.py (pure function, no DB access)  │  │
│  │  cache.py (60s TTL in-memory cache)          │  │
│  └──────────────────────┬───────────────────────┘  │
│                         │                           │
│  ┌──────────────────────┴───────────────────────┐  │
│  │  SQLAlchemy ORM → SQLite (data/3djat.db)     │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Static: /uploads/ (product images)          │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

**Key design decisions:**
- Calculator logic is a **pure function** (`calculate_product_costs_from_values`) — no DB calls, easily testable
- DB-aware wrapper fetches settings from cache, looks up material/machine, delegates to pure function
- **CORS** allows all origins (development mode)
- **Soft deletes** via `is_active` flag — records are never physically removed
- **Auto-seed** on startup if settings table is empty
- Stats endpoint uses **in-memory cache** (60s TTL) to avoid N+1 queries

## 3. Data Model

### 3.1 Entity Relationship

```
Settings (key-value config)
    └── referenced by calculator.py

Machine ──┐
          ├── Product (FK: machine_id → machines.id)
Material ─┘     (FK: material_id → materials.id)
```

### 3.2 Tables

#### `settings`
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK |
| key | String | UNIQUE, NOT NULL, INDEX |
| value | Float | NOT NULL, default 0.0 |
| description | String | default "" |

**Seed keys:** `electricity_rate_per_kwh` (812), `default_markup_pct` (3.0), `overhead_fixed_per_job` (0.3), `overhead_pct_on_material` (0), `overhead_rate_per_100g` (0), `coloring_cost_per_hour` (150000)

#### `machines`
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK |
| name | String | NOT NULL |
| power_watts | Float | NOT NULL, default 0 |
| purchase_price | Float | NOT NULL, default 0 |
| life_hours | Float | NOT NULL, default 5000 |
| maintenance_pct | Float | NOT NULL, default 0.05 |
| is_active | Boolean | default True |

**Seed data:** 3 machines (Anycubic Kobra S1 office, Anycubic Kobra S1 barbod, Sunlu T3)

#### `materials`
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK |
| name | String | NOT NULL |
| price_per_kg | Float | NOT NULL, default 0 |
| waste_pct | Float | NOT NULL, default 0.05 |
| color | String | default "" |
| notes | String | default "" |
| is_active | Boolean | default True |

**Seed data:** 21 material+color combos (PLA, PLA Silk, PETG, TPU, PLA+, WOOD, PLA Mate, PLA Fast, PETG Transparent)

#### `products`
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK |
| product_id | String | default "" |
| name | String | NOT NULL |
| qty | Integer | default 1 |
| machine_id | Integer | FK → machines.id, nullable |
| material_id | Integer | FK → materials.id, nullable |
| weight_g | Float | default 0 |
| support_g | Float | default 0 |
| flushed_g | Float | default 0 |
| print_time_hours | Float | default 0 |
| post_pro_hours | Float | default 0 |
| extras_cost | Float | default 0 |
| final_price | Float | nullable |
| image_url | String | nullable |
| category | String | default "" |
| notes | String | default "" |
| is_active | Boolean | default True |

**Seed data:** ~60 products across categories: uncategorized, KE (Collections), CO (Large), SK (Skate Park), BO (Bookmarks), PT (Puzzles)

## 4. API Endpoints

All endpoints are prefixed with `/api/v1/`.

### 4.1 Products (`/api/v1/products`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List active products (with computed costs) |
| GET | `/products/all` | List ALL products (including inactive) |
| GET | `/products/categories` | Distinct categories with counts |
| GET | `/products/{id}` | Single product with costs |
| POST | `/products` | Create product (201) |
| PUT | `/products/{id}` | Update product |
| DELETE | `/products/{id}` | Soft-delete (set is_active=false) |
| POST | `/products/{id}/image` | Upload image (JPEG/PNG/WebP/GIF) |
| DELETE | `/products/{id}/image` | Remove product image |

### 4.2 Materials (`/api/v1/materials`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/materials` | List active materials |
| GET | `/materials/all` | List ALL materials (including inactive) |
| POST | `/materials` | Create material (201) |
| PUT | `/materials/{id}` | Update material |
| DELETE | `/materials/{id}` | Soft-delete |

### 4.3 Machines (`/api/v1/machines`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/machines` | List active machines |
| GET | `/machines/all` | List ALL machines (including inactive) |
| POST | `/machines` | Create machine (201) |
| PUT | `/machines/{id}` | Update machine |
| DELETE | `/machines/{id}` | Soft-delete |

### 4.4 Settings (`/api/v1/settings`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings` | Get all settings as key→{value, description, id} |
| PUT | `/settings` | Bulk update settings (invalidates cache) |

### 4.5 Stats (`/api/v1/stats`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Aggregate stats (products count, margins, price range, categories) |

### 4.6 Calculator (`/api/v1/calculate`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/calculate` | Stateless cost calculation (no product created) |

### 4.7 Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API info (name, version, docs link) |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI (auto-generated) |
| GET | `/uploads/{file}` | Serve uploaded product images |

## 5. File Structure (Top 2 Levels)

```
3djat-pricing/
├── CLAUDE.md               # AI agent context
├── requirements.md          # Software requirements spec
├── design.md                # This document
├── README.md                # (if exists)
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app entry
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── calculator.py     # Cost engine
│   │   ├── cache.py          # Settings cache
│   │   ├── database.py       # DB setup
│   │   ├── seed.py           # Initial data
│   │   ├── import_excel.py   # Excel import utility
│   │   ├── import_remaining.py
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── products.py
│   │       ├── materials.py
│   │       ├── machines.py
│   │       ├── settings.py
│   │       └── stats.py
│   ├── uploads/              # Product images
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Route definitions
│   │   ├── main.jsx          # React entry
│   │   ├── index.css         # Global styles + themes
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── Materials.jsx
│   │   │   ├── Machines.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── Calculator.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── CostBreakdown.jsx
│   │   │   ├── PriceDisplay.jsx
│   │   │   ├── ProductForm.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   └── StatCard.jsx
│   │   └── lib/
│   │       ├── api.js        # Axios client
│   │       ├── theme.jsx     # Theme provider
│   │       └── utils.js      # Helpers
│   ├── public/
│   │   └── manifest.json     # PWA manifest
│   ├── dist/                 # Built output
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── data/
    └── 3djat.db              # SQLite database
```
