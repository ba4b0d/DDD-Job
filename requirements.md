# 3DJAT Pricing App — Software Requirements Specification

> **Document version:** 1.0 (retroactive, reverse-engineered from codebase)
> **Date:** 2026-07-10
> **Status:** Implemented

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for the 3DJAT Pricing Application — a web-based tool for managing 3D printing products, materials, and machines, with automated cost calculation and suggested pricing.

### 1.2 Scope
The system covers product catalog management, material/machine CRUD, configurable cost formulas, a stateless price calculator, a statistics dashboard, and Persian/Farsi RTL user interface with dark mode.

### 1.3 Definitions
| Term | Definition |
|------|-----------|
| **Base price** | Sum of all cost components (material + power + downtime + maintenance + coloring + overhead + extras) |
| **Suggested price** | Base price × markup multiplier (default 3×) |
| **Overhead** | Fixed percentage applied to the sum of material+power+downtime+maintenance+coloring costs |
| **IRR/Toman** | Iranian Rial / Toman — all monetary values use this currency |

---

## 2. Functional Requirements

### 2.1 Product Management

#### REQ-001: Product Listing
The system shall display a grid/list of all active products with computed cost fields.
**Acceptance criteria:**
- Products are displayed in a responsive card grid (1/2/3 columns)
- Each card shows: name, category badge, weight, print time, suggested price, and optional image
- Results count is displayed ("X محصول یافت شد")

#### REQ-002: Product Search and Filtering
The system shall support searching products by name, product_id, or category, and filtering by category, material, and machine.
**Acceptance criteria:**
- Text search filters products client-side across name, product_id, and category fields
- Dropdown filters exist for category, material, and machine
- Sort options: newest (by ID), name (Persian locale), price ascending, price descending, weight

#### REQ-003: Product Detail View
The system shall display a dedicated detail page for each product showing all specifications, cost breakdown, pricing, and product image.
**Acceptance criteria:**
- URL pattern: `/products/:id`
- Shows: category, material name, machine name, weight, support weight, flushed weight, print time, post-processing time, extras cost, notes
- Displays full cost breakdown with horizontal bar chart
- Shows base price, suggested price, gross margin percentage
- Provides edit and delete buttons
- Shows product image with upload/replace/delete controls

#### REQ-004: Product Creation
The system shall allow creating new products with the following fields: name, product_id, category, material, machine, weight_g, support_g, flushed_g, print_time_hours, post_pro_hours, extras_cost, final_price, notes.
**Acceptance criteria:**
- Name is required and must not be empty (validated in Persian)
- Weight must be greater than 0
- Print time must be greater than 0
- Material and machine are optional references
- Product list refreshes after creation

#### REQ-005: Product Update
The system shall allow updating any product field via a PUT request.
**Acceptance criteria:**
- All fields are optional in the update payload
- Only provided fields are modified (partial update via `exclude_unset=True`)
- Computed cost fields are recalculated on read, not stored

#### REQ-006: Product Soft Delete
The system shall deactivate products (soft delete) by setting `is_active = false` rather than removing the record.
**Acceptance criteria:**
- Deactivated products are excluded from the default `GET /products` listing
- Deactivated products are included in `GET /products/all`
- A confirmation modal is shown before deletion
- User is redirected to the products list after deletion

#### REQ-007: Product Image Upload
The system shall allow uploading an image for each product via a multipart form upload.
**Acceptance criteria:**
- Supported formats: JPEG, PNG, WebP, GIF
- Uploaded file is saved with a UUID-based filename in the `backend/uploads/` directory
- Image URL is stored in the product record as `/uploads/{filename}`
- Replacing an image deletes the old file from disk
- Images are served as static files via FastAPI's StaticFiles mount
- Frontend displays image in product cards and detail view

#### REQ-008: Product Image Delete
The system shall allow removing a product's image.
**Acceptance criteria:**
- The physical file is deleted from the uploads directory
- The `image_url` field is set to null in the database
- Frontend updates immediately after deletion

### 2.2 Cost Calculation

#### REQ-009: Cost Calculation Engine
The system shall compute a full cost breakdown for each product using the following formula:
```
material_cost = (weight_g + support_g + flushed_g) × (1 + waste_pct) × price_per_kg / 1000
power_cost = (power_watts / 1000) × print_time_hours × electricity_rate_per_kwh
downtime_cost = print_time_hours × (purchase_price / life_hours)
maintenance_cost = downtime_cost × maintenance_pct
coloring_cost = post_pro_hours × coloring_cost_per_hour
overhead_cost = (material + power + downtime + maintenance + coloring) × overhead_fixed_per_job
base_price = material + power + downtime + maintenance + coloring + overhead + extras_cost
suggested_price = base_price × default_markup_pct
gross_margin = suggested_price - base_price
margin_pct = (default_markup_pct - 1) × 100
```
**Acceptance criteria:**
All cost components are returned as rounded floats (2 decimal places)
Default fallbacks apply when material/machine is not assigned (e.g., power_watts=120, waste_pct=0.05)
The calculator is a pure function with no DB access in its core implementation
Products returned from the API include all computed cost fields inline

#### REQ-010: Stateless Calculator Endpoint
The system shall provide a stateless calculator endpoint that computes costs without creating or modifying a product.
**Acceptance criteria:**
Endpoint: `POST /api/v1/calculate`
Accepts: weight_g, support_g, flushed_g, print_time_hours, post_pro_hours, extras_cost, machine_id (optional), material_id (optional)
Returns: full cost breakdown (material_cost through margin_pct)
The Calculator page provides a UI form with debounced auto-calculation (300ms delay)
Print time is entered in minutes on the frontend but converted to hours for the API

### 2.3 Material Management

#### REQ-011: Material Listing
The system shall display all materials (including inactive) in a table format.
**Acceptance criteria:**
Table columns: name, color (with color swatch), price per kg, waste percentage, active status toggle, edit/delete actions
Color swatches render using a mapping from color name to hex value
Prices are formatted with Persian numerals and "تومان" suffix

#### REQ-012: Material CRUD
The system shall support creating, reading, updating, and soft-deleting materials.
**Acceptance criteria:**
Create/update form fields: name (required), price_per_kg, waste_pct, color, notes
Name must not be empty (validated in Persian)
Price must not be negative (validated in Persian)
Active/inactive toggle via PATCH on is_active field
Delete is a soft delete (sets is_active=false)
Modal form for add/edit operations

### 2.4 Machine Management

#### REQ-013: Machine Listing
The system shall display all machines as cards showing key properties and computed hourly cost.
**Acceptance criteria:**
Each card shows: name, power (watts), purchase price, useful life (hours), maintenance %, active status, hourly cost
Hourly cost is computed as: (watts/1000 × electricity_rate) + (purchase_price / life_hours) + (downtime_cost × maintenance_pct)
Grid layout: 1/2/3 columns responsive
Edit and delete buttons on each card

#### REQ-014: Machine CRUD
The system shall support creating, reading, updating, and soft-deleting machines.
**Acceptance criteria:**
Create/update form fields: name (required, non-empty), power_watts (>0), purchase_price, life_hours, maintenance_pct
Validation messages in Persian
Delete is a soft delete (sets is_active=false)
Modal form for add/edit operations

### 2.5 Settings Management

#### REQ-015: Settings Display and Update
The system shall display global pricing configuration parameters and allow bulk update.
**Acceptance criteria:**
Editable settings:
  - `electricity_rate_per_kwh` — electricity cost per kWh in IRR (default: 812)
  - `default_markup_pct` — price markup multiplier (default: 3.0, meaning 3× base)
  - `overhead_fixed_per_job` — overhead ratio applied to subtotal (default: 0.3, meaning 30%)
  - `coloring_cost_per_hour` — post-processing cost per hour in IRR (default: 150,000)
Additional seed settings (not displayed in UI): `overhead_pct_on_material`, `overhead_rate_per_100g`
All settings are saved in a single bulk PUT request
Settings cache is invalidated after save (60s TTL)
Save confirmation indicator ("ذخیره شد!") shown for 2 seconds
Hints shown for markup: "۳ = سه برابر هزینه پایه"

### 2.6 Dashboard

#### REQ-016: Statistics Dashboard
The system shall display an aggregated statistics dashboard on the home page.
**Acceptance criteria:**
Four stat cards:
  - Total products count
  - Total materials count (active only)
  - Average margin percentage across all active products
  - Price range (min–max suggested price)
Recent products table (up to 10 most recent by ID) with: name, category, weight, print time, suggested price
Category distribution bar chart showing product count per category as horizontal bars with percentages
"View all" link navigates to products page
Stats endpoint is cached in-memory for 60 seconds
Stats cache is invalidated when products, materials, or settings are modified

### 2.7 Navigation and Layout

#### REQ-017: Sidebar Navigation
The system shall provide a persistent sidebar navigation with links to all pages.
**Acceptance criteria:**
Navigation items: Dashboard, Products, Materials, Machines, Settings, Calculator
Active link is highlighted with accent color background
Sidebar includes 3DJAT logo and tagline ("قیمت‌گذاری چاپ سه‌بعدی")
Sidebar footer with copyright text
Fixed width: 260px

#### REQ-018: Responsive Layout
The system shall provide a responsive layout with collapsible sidebar on mobile.
**Acceptance criteria:**
Sidebar slides in/out on mobile (< lg breakpoint)
Hamburger menu button in header toggles sidebar
Overlay backdrop when sidebar is open on mobile
Main content has left margin offset on desktop to accommodate sidebar
Sticky header with app title and theme toggle

### 2.8 Theme Management

#### REQ-019: Theme Toggle
The system shall support switching between two visual themes: "hybrid" and "dark".
**Acceptance criteria:**
Hybrid theme: light content area, dark sidebar
Dark theme: full dark background
Theme persists in localStorage under key `3djat-theme`
Default theme is "hybrid"
Theme is applied via `data-theme` attribute on `<html>` element
Sun/Moon icon toggle button in header
Smooth 0.3s CSS transition on background-color and color
All components use CSS custom properties (`var(--bg-primary)`, `var(--accent)`, etc.)

### 2.9 Data Seeding

#### REQ-020: Automatic Database Seeding
The system shall automatically populate the database with seed data on first startup when the settings table is empty.
**Acceptance criteria:**
Seed data includes: 6 settings, 3 machines, 21 materials, ~60 products
Machines: Anycubic Kobra S1 (office), Anycubic Kobra S1 (barbod), Sunlu T3
Materials: PLA (5 colors), PLA Silk (2), PETG (2), TPU, PLA+ (2), WOOD (2), PLA Matte (3), PLA Fast (2), PETG Transparent
Products span categories: uncategorized, KE (Collections), CO (Large), SK (Skate Park), BO (Bookmarks), PT (Puzzles)
Existing data is not re-seeded (checked via settings count)

### 2.10 Caching

#### REQ-021: Settings Cache
The system shall cache settings in memory for 60 seconds to avoid repeated database queries.
**Acceptance criteria:**
Cache stores all settings as a `{ key: value }` dict
Cache TTL is 60 seconds
Cache is invalidated explicitly via `invalidate_settings_cache()` after settings updates
Falls back to DB query on cache miss

#### REQ-022: Stats Cache
The system shall cache aggregate statistics in memory for 60 seconds.
**Acceptance criteria:**
Cache is invalidated when products, materials, or settings are written
Stats computation loads all materials and machines once, then iterates products using the pure calculation function (no N+1 queries)

### 2.11 API Design

#### REQ-023: REST API with Versioning
The system shall expose a RESTful API under the `/api/v1/` prefix with JSON request/response format.
**Acceptance criteria:**
All CRUD endpoints follow REST conventions (GET list, GET detail, POST create, PUT update, DELETE)
API documentation is auto-generated via FastAPI's Swagger UI at `/docs`
Health check endpoint at `/health`
CORS is configured to allow all origins (development mode)

#### REQ-024: Error Handling
The system shall return appropriate HTTP status codes and error messages.
**Acceptance criteria:**
404 returned for non-existent resources
400 returned for invalid file types on image upload
Validation errors include Persian-language messages
Product response includes `detail` field on error

#### REQ-025: Product Response Enrichment
The system shall enrich product API responses with computed cost fields and related entity names.
**Acceptance criteria:**
Each product response includes: `material_cost`, `power_cost`, `downtime_cost`, `maintenance_cost`, `coloring_cost`, `overhead_cost`, `base_price`, `suggested_price`, `gross_margin`, `margin_pct`
Response includes `machine_name`, `material_name`, `material_color` from related entities
Computed fields are calculated on every read, not stored in the database

### 2.12 PWA Support

#### REQ-026: Progressive Web App
The system shall support installation as a Progressive Web App.
**Acceptance criteria:**
PWA manifest at `public/manifest.json` with: name "3DJAT", lang "fa", dir "rtl", display "standalone"
Theme color: `#6366f1`, background color: `#0f172a`
Icons: 192×192 and 512×512 PNG with "any maskable" purpose
Orientation: any
App is installable on mobile and desktop browsers

---

## 3. Non-Functional Requirements

#### REQ-100: RTL (Right-to-Left) Layout
The system shall render all UI text and layout in Persian/Farsi with right-to-left direction.
**Acceptance criteria:**
HTML `dir="rtl"` set on root element
All text content is in Persian
Layout is mirrored: sidebar on the right, text aligned right
Vazirmatn font loaded from Google Fonts
Persian numerals used for price formatting (`toLocaleString('fa-IR')`)
Sort functions use Persian locale (`localeCompare` with `'fa'`)

#### REQ-101: Dark Mode
The system shall provide a dark theme that reduces eye strain in low-light environments.
**Acceptance criteria:**
Dark theme uses CSS custom properties defined under `[data-theme="dark"]`
All background, text, border, and accent colors adapt to the selected theme
Theme transition is smooth (0.3s)
Theme preference persists across sessions via localStorage

#### REQ-102: Mobile Responsive
The system shall be fully functional on mobile devices (320px and above).
**Acceptance criteria:**
Product grid: 1 column on mobile, 2 on sm, 3 on lg
Machine cards: 1 on mobile, 2 on md, 3 on lg
Stat cards: 1 on mobile, 2 on sm, 4 on lg
Sidebar collapses on mobile with hamburger toggle
Forms and tables are scrollable horizontally where needed

#### REQ-103: Page Load Performance
The system shall load the initial page and display content within 2 seconds on standard connections.
**Acceptance criteria:**
Dashboard fetches stats and recent products in parallel via `Promise.all`
Products page fetches products, materials, machines, and categories in parallel
Settings cache avoids repeated DB queries
Stats cache has 60-second TTL
Vite dev server provides fast HMR; production build uses code splitting

#### REQ-104: Data Integrity
The system shall enforce data integrity at both the database and API levels.
**Acceptance criteria:**
Required fields enforced via SQLAlchemy NOT NULL constraints
Pydantic validators enforce: non-empty names, positive weights, positive print times, non-negative prices
Foreign key relationships between Products and Machines/Materials
Soft delete preserves referential integrity

#### REQ-105: Input Validation
The system shall validate all user inputs and return descriptive error messages.
**Acceptance criteria:**
Machine name cannot be empty
Machine power must be greater than 0
Material name cannot be empty
Material price cannot be negative
Product name cannot be empty
Product weight must be greater than 0
Product print time must be greater than 0
Image upload validates MIME type (JPEG, PNG, WebP, GIF only)
All validation error messages are in Persian

#### REQ-106: Usability — Loading States
The system shall display loading indicators during data fetches.
**Acceptance criteria:**
Persian "در حال بارگذاری..." text shown during loading
Spinner animation on delete actions (`Loader2` icon with `animate-spin`)
Save button shows "در حال ذخیره..." while saving
Image upload shows loading state during upload

---

## 4. Out of Scope

The following features are explicitly **not** part of this system:

- **User authentication/authorization** — No login, roles, or permissions
- **Multi-user support** — Single-user tool
- **Order management** — No customer orders or invoicing
- **Inventory tracking** — No material stock levels or reorder alerts
- **Reporting/exports** — No PDF/Excel export, no charts beyond the dashboard category bar
- **Real-time updates** — No WebSocket or Server-Sent Events
- **Database migrations** — No Alembic; schema created via `create_all()`
- **Automated testing** — No test suite in the current codebase
- **CI/CD pipeline** — No automated build/deploy configuration
- **Internationalization (i18n)** — Persian-only; no locale switching
- **Multi-language support** — UI is hardcoded in Persian
- **Print/quote generation** — No printable invoices or quote documents
- **Material unit conversion** — Prices are per-kg only
- **Batch operations** — No bulk product import/update UI (Excel import scripts exist but are not user-facing)
- **Version history/audit log** — No change tracking
- **Backup/restore** — No automated database backup mechanism
- **Search backend** — Client-side filtering only; no Elasticsearch/Meilisearch
- **Rate limiting** — No API rate limiting
- **Production CORS** — CORS is configured for development (allows all origins)
- **Authentication for uploads** — Image upload endpoints are unprotected
