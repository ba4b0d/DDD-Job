<p align="center">
  <img src="./assets/readme/hero.svg" width="100%"
       alt="Spaghetti — 3D printing pricing, catalog and workshop orders">
</p>

<div align="center">

**سیستم مدیریت محصولات و قیمت‌گذاری چاپ سه‌بعدی**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## What it is

Spaghetti is a full-stack web app for **FDM 3D-print** product catalog, cost calculation, inventory, and a lightweight workshop **orders board**. Admin manages products, materials and machines; customers browse a public Farsi catalog.

## Why it's different

- 🧮 **Real-time cost engine** — material, power, downtime, overhead, markup in one formula
- 🛒 **Workshop board (B)** — fixed statuses, Shamsi dates, paid/quoted amounts
- 📏 **Auto-dimensions** — extracts X/Y/Z from uploaded 3MF/STL files (no PrusaSlicer)
- 🔐 **Role-based auth** — admin vs employee, httpOnly cookies, RBAC on every admin route
- 🇮🇷 **Persian/Farsi RTL** — Vazirmatn font, soft-blue + logo-orange brand

---

<p align="center">
  <img src="./assets/readme/section-screenshots.svg" width="100%"
       alt="Screenshots section header">
</p>

| Dashboard | Orders | Products |
|:---:|:---:|:---:|
| ![Dashboard](screenshots/dashboard.png) | ![Orders](screenshots/orders.png) | ![Products](screenshots/products.png) |
| *KPIs + monthly سفارش‌ها* | *Board + Shamsi dates* | *Catalog management* |

| Calculator | Public catalog |
|:---:|:---:|
| ![Calculator](screenshots/calculator.png) | ![Catalog](screenshots/catalog.png) |
| *Live cost breakdown* | *Farsi public storefront* |

---

## How it works

```
material_cost = (weight + support + flushed) × (1 + waste%) × price_per_kg ÷ 1000
power_cost     = (watts ÷ 1000) × print_hours × electricity_rate
downtime_cost  = print_hours × (purchase_price ÷ life_hours)
maintenance    = downtime_cost × maintenance_pct
coloring       = post_pro_hours × coloring_cost_per_hour
overhead       = (sum_above) × overhead_ratio  [default 30%]
base_price     = sum_above + overhead + extras_cost
suggested      = base_price × markup  [default 3×]
```

The cost engine, the orders board and the dimension extractor all read the same product/material/machine rows — one source of truth.

---

## Quick Start

### Prerequisites
- Python 3.11+ · Node.js 18+ · npm

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
echo "JWT_SECRET=your-super-secret-key" > .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Access

| Page | URL | Auth |
|------|-----|------|
| Public catalog | http://localhost:5173/ | ❌ |
| Login | http://localhost:5173/login | ❌ |
| Dashboard | http://localhost:5173/dashboard | ✅ |
| Orders | http://localhost:5173/orders | ✅ |
| API docs | http://localhost:8000/docs | ❌ |

**Default credentials:** `admin` / `admin` — forced password change on first login.

### Docker
```bash
docker compose up -d
docker compose logs -f
docker compose down
```

---

## Tech Stack

**Backend** — FastAPI 0.104+, SQLAlchemy 2.0, SQLite (WAL mode), Pydantic v2, bcrypt + JWT (httpOnly cookie), slowapi rate-limit, magic-byte image validation, auto-dimension extraction from 3MF/STL.

**Frontend** — React 18, Vite 5, TailwindCSS, React Router v6, Axios (`withCredentials`), Lucide icons, `jalaali-js` + `react-multi-date-picker` for Shamsi dates.

---

## API surface

Base path: `/api/v1/` — interactive docs at `/docs`.

| Area | Notes |
|------|-------|
| Auth | `POST /auth/login`, verify, refresh, logout |
| Catalog | Public product + category lists (no cost breakdown) |
| Products | CRUD, multi-image upload, **dimension extraction**, calculate, import/export |
| Orders | Board CRUD + soft archive |
| Materials / Machines / Categories | CRUD |
| Settings | Bulk update + admin-only branding upload |
| Stats | Dashboard aggregates + monthly order KPIs |

---

## Workshop board

Minimal shop ops — **not** full accounting. Soft-archive via `is_active=false`.

| Status | Meaning |
|--------|---------|
| `new` | جدید |
| `quoted` | قیمت‌داده‌شده |
| `printing` | در حال چاپ |
| `ready` | آماده تحویل |
| `delivered` | تحویل‌شده |
| `cancelled` | لغو |

- **Dates** — `started_at` / `ready_by` in ISO Gregorian, **Shamsi** in UI (Jalali picker)
- **Money** — `quoted_price`, `paid_amount` in تومان

---

## Project Structure

```
3djat-pricing/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI, CORS, startup migrations
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic v2 (ConfigDict)
│   │   ├── calculator.py        # Cost engine
│   │   ├── cache.py             # 60s TTL settings cache (deepcopy)
│   │   ├── seed.py              # First-run seed
│   │   ├── database.py          # SQLite + WAL mode
│   │   ├── repositories/        # Data access layer
│   │   └── routers/             # auth, products, catalog, orders, …
│   ├── uploads/                 # Product images + 3MF/STL models
│   ├── requirements.txt
│   └── Dockerfile               # non-root user
├── frontend/
│   ├── src/
│   │   ├── pages/               # Dashboard, Orders, Products, Catalog
│   │   ├── components/          # Layout, ShamsiDateField, CostBreakdown
│   │   └── lib/                 # api (withCredentials), auth (cookie), utils
│   ├── package.json
│   └── Dockerfile               # non-root nginx
├── assets/readme/               # Hero + section SVGs
├── screenshots/                 # README captures
├── scripts/                     # CLI tools (PrusaSlicer-aware)
├── docker-compose.yml           # healthchecks, named volumes
└── README.md
```

---

## Environment

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ | — | JWT signing key (≥ 32 chars) |
| `ADMIN_USER` | — | `admin` | Seed admin username |
| `ADMIN_PASS` | — | `admin` | Seed password (force-change on first login) |
| `VITE_API_URL` | — | `/api/v1` (nginx proxied) | Dev override (e.g. `:8001`) |
| `CORS_ORIGINS` | — | empty (same-origin only) | Comma-separated dev origins |

---

## Security

- 🔒 JWT in **httpOnly** cookie (not localStorage) — XSS can't steal it
- 🛡️ Admin routes require `require_admin` — role-checked, not just login
- ⏱️ Login rate-limited (slowapi) per IP
- 🖼️ Image uploads validated by **magic bytes** (not just content-type)
- 📦 Uploads persisted in **named Docker volume** — survives rebuilds
- 🐳 Containers run **non-root**, healthchecks on both services
- ✅ SQLAlchemy ORM only — no raw SQL, parameterized queries

---

## Testing

```bash
# Backend
cd backend && pip install -r requirements-dev.txt && pytest tests/ -v

# Frontend
cd frontend && npm test
```

---

## Contributing

1. Fork / clone
2. Branch: `git checkout -b feature/…`
3. Commit & push
4. Open a PR

```bash
git remote add origin https://github.com/ba4b0d/3djat-pricing.git
git push origin master
```

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

**Built with ❤️ for 3D printing businesses · FDM · تومان · RTL**

</div>
