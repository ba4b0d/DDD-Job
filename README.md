<p align="center">
  <img src="./assets/readme/hero.svg" width="100%"
       alt="Spaghetti — 3D printing pricing, catalog, blog CMS and workshop orders">
</p>

<div align="center">

**سیستم جامع مدیریت محصولات، قیمت‌گذاری و سفارشات چاپ سه‌بعدی اسپاگتی**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 🌟 Overview

**Spaghetti** is a modern, production-ready full-stack web application designed for 3D printing workshops (**FDM**). It combines an automated product pricing engine, public storefront catalog, lightweight blog/CMS with SEO metadata, and a real-time shop order tracking board.

---

## ✨ Key Features & Capabilities

- 🧮 **Real-time Cost Engine** — Material weight, support, flushed volume, power consumption, machine depreciation, maintenance, post-processing, overhead, and custom markup in a single formula.
- ⭐ **Default Printer & Filament** — Mark primary machines and filaments to auto-populate forms when creating new products.
- 📝 **Blog & CMS Module** — Built-in article manager with cover image upload, Persian reading time, Telegram sharing, and structured `Article` JSON-LD schema for SEO. Dynamic on/off toggle via Settings.
- 🛒 **Workshop Orders Board** — Manage shop orders with Shamsi (Jalali) calendar support, payment statuses, and quick action steps.
- 📏 **Auto 3D Mesh Extraction** — Automatically computes X/Y/Z dimensions directly from uploaded 3MF or STL files.
- 💾 **WAL-Safe Database Backup & Restore** — One-click database export (`.db`), instant backup upload & restore in UI, plus an automated daily 14-day rolling backup script for production.
- 🛡️ **Hardened Security** — `httpOnly` cookie JWT auth, `slowapi` rate limiting on sensitive routes, and strict magic-byte validation for uploaded images (PNG/JPG/WEBP).
- 🇮🇷 **Native Persian / RTL UI** — Vazirmatn typography, responsive Tailwind layout, and soft-blue / brand-orange dark theme.

---

<p align="center">
  <img src="./assets/readme/section-screenshots.svg" width="100%"
       alt="Screenshots section header">
</p>

| 📊 Dashboard & Analytics | 🛒 Orders Board (Kanban) | 📦 Inventory & Products |
|:---:|:---:|:---:|
| ![Dashboard](screenshots/dashboard.png) | ![Orders](screenshots/orders.png) | ![Products](screenshots/products.png) |
| *KPIs + Monthly Analytics* | *Kanban Board + Shamsi Dates* | *Inventory Management* |

| 🧮 Cost Calculator Engine | 🛍️ Public Customer Storefront | 📝 Blog & CMS Module |
|:---:|:---:|:---:|
| ![Calculator](screenshots/calculator.png) | ![Catalog](screenshots/catalog.png) | ![Blog & CMS Module](screenshots/blog.png) |
| *Live Pricing Breakdown* | *Farsi Customer Catalog* | *SEO Articles & CMS Management* |

---

## 🧮 Cost Calculation Engine

$$\text{Material Cost} = (\text{weight} + \text{support} + \text{flushed}) \times (1 + \text{waste\%}) \times \frac{\text{price\_per\_kg}}{1000}$$

$$\text{Power Cost} = \frac{\text{watts}}{1000} \times \text{print\_hours} \times \text{electricity\_rate}$$

$$\text{Depreciation Cost} = \text{print\_hours} \times \frac{\text{purchase\_price}}{\text{life\_hours}}$$

$$\text{Base Price} = \text{Material} + \text{Power} + \text{Depreciation} + \text{Maintenance} + \text{Coloring} + \text{Overhead (30\%)}$$

$$\text{Suggested Price} = \text{Base Price} \times \text{Markup (e.g. 3.0}\times\text{)}$$

---

## 🚀 Quick Start

### Prerequisites
- **Python** 3.11+
- **Node.js** 18+ & **npm**

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
echo "JWT_SECRET=your-super-secret-key-32-chars-min" > .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Production Docker Deployment
```bash
docker compose up -d --build
docker compose logs -f
```

---

## 📍 Navigation & Access

| Page / Endpoint | Path | Auth Required |
|:---|:---|:---:|
| Public Storefront Catalog | `http://localhost:5173/` | ❌ |
| Public Blog Articles | `http://localhost:5173/blog` | ❌ (if enabled) |
| Admin Login | `http://localhost:5173/login` | ❌ |
| Dashboard | `http://localhost:5173/dashboard` | ✅ |
| Workshop Orders Board | `http://localhost:5173/orders` | ✅ |
| Admin CMS Posts | `http://localhost:5173/admin/posts` | ✅ |
| System Settings | `http://localhost:5173/settings` | ✅ |
| Interactive API Docs | `http://localhost:8000/docs` | ❌ |

**Default Admin Credentials**: `admin` / `admin` *(Forces password change on initial login)*.

---

## 🛡️ Security & Backup Architecture

- **Auth Storage**: JWT issued via `httpOnly`, `SameSite=Lax` cookies — immune to XSS token theft.
- **Rate Limiting**: `slowapi` integration enforcing 5 attempts/minute limit on `/login` to stop brute-force attacks.
- **Image Inspection**: Validates binary magic-byte signatures (`\x89PNG`, `\xff\xd8\xff`, `RIFF` WEBP) to block uploaded script payloads.
- **Database Backup**:
  - **Manual UI**: Download `.db` backup file or restore from a previous backup in `/settings`.
  - **Automated Host Script**: Run `./scripts/backup-db.sh` via cron for daily WAL-safe backups with automatic 14-day rotation.

```cron
# Example daily 3:00 AM backup cron job
0 3 * * * /bin/bash /path/to/3djat-pricing/scripts/backup-db.sh >> /path/to/backup.log 2>&1
```

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11, FastAPI 0.104+, SQLAlchemy 2.0 (SQLite WAL mode), Pydantic v2, PyJWT, slowapi.
- **Frontend**: React 18, Vite 5, TailwindCSS, React Router v6, Axios (`withCredentials`), Lucide Icons, `jalaali-js`.
- **Infrastructure**: Docker Compose (Non-root containers with HTTP healthchecks).

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

<div align="center">

**Designed with ❤️ for 3D Printing Workshops & Businesses**

</div>
