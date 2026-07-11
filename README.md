# DDD Job — 3D Printing Product Pricing System

<div align="center">

**سیستم مدیریت محصولات و قیمت‌گذاری چاپ سه‌بعدی**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## Overview

DDD Job is a full-stack web application for managing 3D printing products, materials, machines, and calculating production costs with configurable formulas. It provides an admin panel for business management and a public catalog for customers to browse products.

**Key Features:**
- 🔐 Role-based authentication (Admin / Employee)
- 📊 Real-time cost calculation engine
- 🖼️ Product image management
- 📦 Material and machine inventory
- 🏷️ Category management
- 🌐 Public product catalog
- 🌙 Dark & Hybrid themes
- 🇮🇷 Persian/Farsi RTL interface

---

## Screenshots

| Admin Dashboard | Product Catalog | Cost Calculator |
|:---:|:---:|:---:|
| *Statistics & management* | *Public product view* | *Real-time pricing* |

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | FastAPI 0.104+ |
| Database | SQLite (SQLAlchemy ORM) |
| Auth | bcrypt + JWT (PyJWT) |
| Validation | Pydantic v2 |
| Rate Limiting | slowapi |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Bundler | Vite 5 |
| Styling | TailwindCSS |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Icons | Lucide React |

---

## Project Structure

```
3djat-pricing/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, startup
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── calculator.py        # Cost calculation engine
│   │   ├── cache.py             # In-memory settings cache
│   │   ├── seed.py              # Database seeding
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── repositories/
│   │   │   └── products.py      # Product repository pattern
│   │   └── routers/
│   │       ├── auth.py          # Authentication + user management
│   │       ├── products.py      # Product CRUD + images
│   │       ├── materials.py     # Material CRUD
│   │       ├── machines.py      # Machine CRUD
│   │       ├── categories.py    # Category CRUD
│   │       ├── settings.py      # App settings
│   │       └── stats.py         # Dashboard statistics
│   ├── tests/                   # pytest test suite
│   ├── uploads/                 # Product images
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Routes + code splitting
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   ├── hooks/               # Custom React hooks
│   │   └── lib/                 # Utilities, API client, auth
│   ├── __tests__/               # Vitest test suite
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "JWT_SECRET=your-super-secret-key-here" > .env

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access the App

| Page | URL |
|------|-----|
| Admin Panel | http://localhost:5173 |
| Public Catalog | http://localhost:5173/catalog |
| API Docs | http://localhost:8000/docs |

**Default Credentials:**
- Username: `admin`
- Password: `3djat2024`

> ⚠️ Change the default password immediately after first login!

---

## Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Login and get JWT token |
| `/api/v1/auth/verify` | GET | Verify current token |
| `/api/v1/auth/refresh` | POST | Refresh token (within 1h of expiry) |

### Products

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/v1/products` | GET | List all products | ✅ |
| `/api/v1/products/active` | GET | List active products | ❌ |
| `/api/v1/products/{id}` | GET | Get product details | ❌ |
| `/api/v1/products` | POST | Create product | ✅ |
| `/api/v1/products/{id}` | PUT | Update product | ✅ |
| `/api/v1/products/{id}` | DELETE | Delete product | ✅ |
| `/api/v1/products/{id}/image` | POST | Upload image | ✅ |
| `/api/v1/products/calculate` | POST | Calculate costs | ✅ |

### Materials

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/v1/materials` | GET | List materials | ✅ |
| `/api/v1/materials` | POST | Create material | ✅ |
| `/api/v1/materials/{id}` | PUT | Update material | ✅ |
| `/api/v1/materials/{id}` | DELETE | Delete material | ✅ |

### Machines

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/v1/machines` | GET | List machines | ✅ |
| `/api/v1/machines` | POST | Create machine | ✅ |
| `/api/v1/machines/{id}` | PUT | Update machine | ✅ |
| `/api/v1/machines/{id}` | DELETE | Delete machine | ✅ |

---

## Cost Calculation Formula

```
material_cost = (weight + support + flushed) × (1 + waste%) × price_per_kg ÷ 1000
power_cost = (watts ÷ 1000) × print_hours × electricity_rate
downtime_cost = print_hours × (purchase_price ÷ life_hours)
maintenance_cost = downtime_cost × maintenance_pct
coloring_cost = post_pro_hours × coloring_cost_per_hour
overhead = (sum_above) × overhead_ratio  [default 30%]
base_price = sum_above + overhead + extras_cost
suggested_price = base_price × markup  [default 3x]
```

---

## Testing

### Backend Tests (pytest)

```bash
cd backend
pytest tests/ -v
# 40 tests covering auth, calculator, CRUD, settings
```

### Frontend Tests (Vitest)

```bash
cd frontend
npm test
# 36 tests covering utils, components, pages
```

---

## Environment Variables

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | Secret key for JWT tokens |
| `ADMIN_USER` | No | `admin` | Default admin username |
| `ADMIN_PASS` | No | `3djat2024` | Default admin password |

---

## Features in Detail

### 🔐 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **Admin** | Full access (products, materials, machines, settings, users) |
| **Employee** | Products + categories only |

### 📊 Real-Time Cost Calculator

Calculate product costs with live updates:
- Material costs (weight, support, waste)
- Power consumption
- Machine downtime & maintenance
- Post-processing (coloring, assembly)
- Overhead & markup

### 🌙 Theme System

- **Hybrid:** Light sidebar + dark content area
- **Dark:** Full dark mode
- Persistent theme selection (localStorage)

### 📱 Responsive Design

- Mobile-friendly catalog view
- Collapsible admin sidebar
- RTL (Right-to-Left) layout for Persian

---

## Security Features

- ✅ bcrypt password hashing
- ✅ JWT authentication with 24h expiry
- ✅ Rate limiting (5 attempts/minute on login)
- ✅ CORS restricted to explicit origins
- ✅ Pydantic input validation
- ✅ File upload size limits (10MB)
- ✅ Role-based endpoint protection
- ✅ SQL injection prevention (SQLAlchemy ORM)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Support

For issues and questions:
- Open an [Issue](https://github.com/ba4b0d/3djat-pricing/issues)
- Contact: [Your Contact Info]

---

<div align="center">

**Built with ❤️ for 3D printing businesses**

</div>
