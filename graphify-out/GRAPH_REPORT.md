# Graph Report - .  (2026-08-10)

## Corpus Check
- Large corpus: 179 files · ~2,003,215 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1208 nodes · 2507 edges · 92 communities (71 shown, 21 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 89 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Collections & Pydantic Schemas
- Auth & User Management
- Product Upload/Slicing Scripts
- Docs, CI & Deployment Config
- Core App, DB & Routers
- Admin Pages & API Client
- Orders & Settings Cache
- Blog & Image Processing
- Calculator & Stats
- Public Catalog & SEO
- Categories & Collections UI
- Auth Tests
- Public Pages & SEO Lib
- Models, Seed & Import
- Telegram Order Bot
- Frontend Routing & Auth Shell
- Orders UI & Shamsi Dates
- ESLint Config
- Calculator UI & Constants
- Collections & Bulk Actions
- Smoke Tests
- Product Form & Image Upload
- Dashboard & Machines UI
- Materials UI & Validation
- Customers & Price Display
- Settings & Branding API
- Backup & Restore
- Materials API
- PWA Manifest
- Frontend Dev Dependencies
- Frontend Dependencies
- Categories API
- Custom Orders API
- Products Tests
- Audit Logging
- Product Dimensions & Images
- Machines API
- Materials Tests
- Legacy Importer
- Products API
- Contact & Channels
- Login & Brand Layout
- Public Product Detail
- Cost Calculation Service
- Product Repository
- Categories Tests
- Catalog Frontend & SEO
- Error Boundary
- App Lifespan & Slugify
- Frontend Scripts
- Audit Logs UI
- App Screenshots
- Settings Tests
- Frontend Package Meta
- Dynamic Branding
- Settings Cache
- Customers API
- PWA Assets (Hero & Icon)
- README SVGs
- Audit Logs API
- Not Found Page
- Docker Entrypoint
- Tech Stack Docs
- Deploy Script
- i18n Dual Currency Plan
- jest-dom Testing Dep
- testing-library React Dep
- React Types Dep
- Vite Dep
- Vite React Plugin
- Service Worker (PWA)
- DB Migration Script
- WAL Backup Script
- Frontend Build Script
- Gitea Deploy Script
- Gitea Release Script
- Vite Deps Cache
- Dark Admin Design Tokens
- Telegram Bot (README)

## God Nodes (most connected - your core abstractions)
1. `Product` - 31 edges
2. `invalidate_stats()` - 31 edges
3. `formatPrice()` - 27 edges
4. `useSEO()` - 26 edges
5. `Base` - 22 edges
6. `get_settings_dict()` - 21 edges
7. `ProductRepository` - 19 edges
8. `get_db()` - 18 edges
9. `Machine` - 18 edges
10. `Material` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Real-time Cost Engine` --semantically_similar_to--> `Cost Calculation Formula`  [INFERRED] [semantically similar]
  README.md → design.md
- `Tech Stack Overview (CLAUDE.md)` --semantically_similar_to--> `Tech Stack (README)`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `Native Persian / RTL UI` --semantically_similar_to--> `Persian RTL Document Shell`  [INFERRED] [semantically similar]
  README.md → frontend/index.html
- `Dual Cost Engine (IRR/EUR)` --semantically_similar_to--> `Base Price Definition`  [INFERRED] [semantically similar]
  docs/i18n-dual-currency-plan.md → requirements.md
- `CI Workflow (GitHub Actions)` --conceptually_related_to--> `Out of Scope (SRS v1.1)`  [AMBIGUOUS]
  .github/workflows/ci.yml → requirements.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cost Calculation Pipeline** — design_costformula, readme_costengine, requirements_suggestedprice [INFERRED 0.85]
- **Persian RTL UI System** — frontend_index_rtlhtml, docs_penpot_ui_redesign_rtllayout, requirements_rtl, readme_rtlui [INFERRED 0.85]
- **Deployment & Build Stack** — docker_compose, scripts_readme_nginxspa, _github_workflows_ci [INFERRED 0.75]
- **Admin Panel Screens** — screenshots_dashboard_dashboardscreen, screenshots_orders_ordersscreen, screenshots_products_productsscreen, screenshots_calculator_calculatorscreen [INFERRED 0.85]
- **Pricing Workflow Screens** — screenshots_calculator_calculatorscreen, screenshots_products_productsscreen, screenshots_orders_ordersscreen [INFERRED 0.75]
- **3D Print Shop Platform Screens** — screenshots_catalog_catalogscreen, screenshots_blog_blogscreen, screenshots_dashboard_dashboardscreen, screenshots_orders_ordersscreen, screenshots_products_productsscreen, screenshots_calculator_calculatorscreen [INFERRED 0.65]
- **README Marketing Asset Set** — assets_readme_hero_herobanner, assets_readme_blog_cms_blogcmsadmin, assets_readme_section_screenshots_screenshotssectionheader [INFERRED 0.85]
- **Catalog Hero Banner Asset Group** — frontend_public_cataloghero_jpg_herobanner, frontend_public_cataloghero_webp_herobanner [INFERRED 0.95]
- **PWA App Icon Set** — frontend_public_icon_192_pwaicon, frontend_public_icon_512_pwaicon [INFERRED 0.95]

## Communities (92 total, 21 thin omitted)

### Community 0 - "Collections & Pydantic Schemas"
Cohesion: 0.06
Nodes (48): Collection, _collection_dict(), create_collection(), delete_collection(), get_collection(), get_collection_by_slug(), list_all_collections(), list_collections() (+40 more)

### Community 1 - "Auth & User Management"
Cohesion: 0.07
Nodes (53): User, change_my_password(), change_password(), ChangePasswordRequest, _clear_auth_cookie(), create_token(), create_user(), CreateUserRequest (+45 more)

### Community 2 - "Product Upload/Slicing Scripts"
Cohesion: 0.06
Nodes (49): Path, find_products(), main(), parse_hms(), parse_summary(), 2h 1m' / '38 min' / '20 min' → seconds., Return list of (category_name, product_folder). Supports two layouts:…, Extract weight/time/bbox/images from upload_product.py --dry output. (+41 more)

### Community 3 - "Docs, CI & Deployment Config"
Cohesion: 0.05
Nodes (49): CI Workflow (GitHub Actions), CI Backend Pytest Job, CI Frontend Build Job, Backend Runtime Dependencies, Backend Dev/Test Dependencies, Dev/Prod Dependency Separation, pytest Test Stack, FastAPI Framework (+41 more)

### Community 4 - "Core App, DB & Routers"
Cohesion: 0.10
Nodes (34): get_db(), _migrate_orders(), Add new columns to orders table if they don't exist (SQLite-safe)., FastAPI dependency to get a database session., health(), get, 3DJAT 3D Printing Product Pricing API FastAPI application with CORS, SQLite,…, root() (+26 more)

### Community 5 - "Admin Pages & API Client"
Cohesion: 0.07
Nodes (30): AdminBlog, CustomOrders, Settings, UsersPage, api, changePassword(), createBlogPost(), createUser() (+22 more)

### Community 6 - "Orders & Settings Cache"
Cohesion: 0.12
Nodes (36): get_settings_dict(), Session, Return all settings as { key: value } dict, cached for 60s. Returns a deep copy…, Order, OrderItem, Minimal shop order board — not accounting., Line item within an order — supports multi-product orders., create_order() (+28 more)

### Community 7 - "Blog & Image Processing"
Cohesion: 0.09
Nodes (32): Convert a blog title (Persian/English) to a URL-safe slug preserving Farsi…, main(), optimize_file(), CLI tool to compress and optimize all existing product images to WebP format.…, Optimize image file to WebP. Returns new filename or None., admin_create_post(), admin_delete_post(), admin_list_posts() (+24 more)

### Community 8 - "Calculator & Stats"
Cohesion: 0.09
Nodes (31): calculate_product_costs_from_values(), Pure calculation — no DB queries. All values are passed in. Parameters…, get_stats(), _insights(), _order_ops_stats(), get, Session, Top-selling products, most-viewed products, orders-by-status, revenue-by-month. (+23 more)

### Community 9 - "Public Catalog & SEO"
Cohesion: 0.13
Nodes (30): calculate_product_costs_from_dicts(), Calculate costs using pre-fetched material/machine ORM objects and a cached…, ProductView, Increments when a public product page is viewed (for 'most viewed' dashboard)., _catalog_product(), get_catalog(), get_catalog_categories(), get_catalog_collections() (+22 more)

### Community 10 - "Categories & Collections UI"
Cohesion: 0.13
Nodes (24): Categories, Collections, FilterBar(), Modal(), SearchBar(), bulkProductAction(), createCategory(), createCollection() (+16 more)

### Community 11 - "Auth Tests"
Cohesion: 0.07
Nodes (27): Authentication & user management tests., Admin can change another user's password., A token within REFRESH_WINDOW_HOURS of expiry should be refreshable., An expired token should be rejected by /refresh., A token not yet within the refresh window should return 400., Tokens should have a 24-hour expiry (not 7 days)., Wrong password returns 401., Non-existent user returns 401. (+19 more)

### Community 12 - "Public Pages & SEO Lib"
Cohesion: 0.15
Nodes (20): BlogList, BlogPostDetail, getBlogPostBySlug(), getBlogPosts(), submitCustomOrder(), buildWebSiteJsonLd(), clearCanonical(), setCanonical() (+12 more)

### Community 13 - "Models, Seed & Import"
Cohesion: 0.15
Nodes (21): Base, import_excel(), parse_time(), Convert H:MM:SS or MM:SS string to decimal hours., Safely convert value to float., Safely convert value to string., Import data from Excel file., safe_float() (+13 more)

### Community 14 - "Telegram Order Bot"
Cohesion: 0.18
Nodes (24): _answer_callback(), _calc_product_price(), get_telegram_config(), _handle_backup(), _handle_callback_query(), _handle_orders_list(), _handle_start(), _handle_stats() (+16 more)

### Community 15 - "Frontend Routing & Auth Shell"
Cohesion: 0.12
Nodes (18): CustomOrder, HowToOrder, Orders, Privacy, ProductDetail, Products, ProtectedRoute(), Terms (+10 more)

### Community 16 - "Orders UI & Shamsi Dates"
Cohesion: 0.17
Nodes (22): ShamsiDateField(), toLatinDigits(), toPickerValue(), createOrder(), deleteOrder(), exportOrdersCsv(), getOrders(), getOrderStatuses() (+14 more)

### Community 17 - "ESLint Config"
Cohesion: 0.09
Nodes (22): jsx, env, browser, es2022, node, extends, parserOptions, ecmaFeatures (+14 more)

### Community 18 - "Calculator UI & Constants"
Cohesion: 0.15
Nodes (17): Calculator, FormField(), inputGroupStyle, labelStyle, getMachines(), getMaterials(), DEBOUNCE_DELAY, DEBOUNCE_DELAY_CALC (+9 more)

### Community 19 - "Collections & Bulk Actions"
Cohesion: 0.15
Nodes (20): ProductCollection, Many-to-many junction: Product ↔ Collection, bulk_product_action(), BulkProductAction, delete_product(), delete_product_image_by_id(), permanent_delete_product(), BaseModel (+12 more)

### Community 20 - "Smoke Tests"
Cohesion: 0.10
Nodes (19): Smoke tests — minimal end-to-end health checks that verify the FastAPI app…, Light sanity check: list endpoint with auth returns active products., GET / returns service name + version (no auth required)., GET /health returns 200 with a status payload (liveness probe)., GET /openapi.json returns the generated OpenAPI 3.1 schema., GET /docs returns the Swagger UI HTML (200, text/html)., GET /api/v1/catalog is unauthenticated and returns the active product list., GET /api/v1/catalog/categories is unauthenticated and returns a list. (+11 more)

### Community 21 - "Product Form & Image Upload"
Cohesion: 0.22
Nodes (16): MultiImageUpload(), ProductForm(), validateAll(), validateFieldProduct(), useProductCalculation(), calculate(), deleteProduct(), deleteProductImage() (+8 more)

### Community 22 - "Dashboard & Machines UI"
Cohesion: 0.14
Nodes (13): Dashboard, Machines, useApiWithAbort(), createMachine(), deleteMachine(), getProducts(), getSettings(), getStats() (+5 more)

### Community 23 - "Materials UI & Validation"
Cohesion: 0.13
Nodes (15): Materials, createMaterial(), deleteMaterial(), getMaterialsAll(), permanentDeleteMaterial(), setDefaultMaterial(), updateMaterial(), SCHEMAS (+7 more)

### Community 24 - "Customers & Price Display"
Cohesion: 0.19
Nodes (12): Customers, COST_COLORS, COST_LABELS, CostBreakdown(), PriceDisplay(), getCustomers(), formatNumber(), formatPrice() (+4 more)

### Community 25 - "Settings & Branding API"
Cohesion: 0.14
Nodes (17): get_all_settings(), get_public_settings(), _is_valid_image_header(), get, limit, post, put, Request (+9 more)

### Community 26 - "Backup & Restore"
Cohesion: 0.17
Nodes (16): export_database_backup(), import_database_backup(), list_local_backups(), push_backup_to_gdrive(), get, post, Session, UploadFile (+8 more)

### Community 27 - "Materials API"
Cohesion: 0.20
Nodes (16): create_material(), delete_material(), get_active_materials(), get_all_materials(), permanent_delete_material(), delete, get, post (+8 more)

### Community 28 - "PWA Manifest"
Cohesion: 0.12
Nodes (15): background_color, categories, description, dir, display, icons, lang, name (+7 more)

### Community 29 - "Frontend Dev Dependencies"
Cohesion: 0.13
Nodes (15): autoprefixer, devDependencies, autoprefixer, jsdom, postcss, tailwindcss, @testing-library/user-event, @types/react-dom (+7 more)

### Community 30 - "Frontend Dependencies"
Cohesion: 0.13
Nodes (15): axios, dependencies, axios, jalaali-js, lucide-react, react, react-dom, react-multi-date-picker (+7 more)

### Community 31 - "Categories API"
Cohesion: 0.16
Nodes (15): _build_tree(), _cat_dict(), create_category(), delete_category(), list_all_categories_flat(), list_categories(), delete, get (+7 more)

### Community 32 - "Custom Orders API"
Cohesion: 0.17
Nodes (15): create_custom_order(), delete_request(), list_requests(), delete, get, limit, post, put (+7 more)

### Community 33 - "Products Tests"
Cohesion: 0.14
Nodes (13): Product CRUD API tests., GET /products with valid token returns a list., POST /products creates a product and returns 201., GET /products/{id} returns a single product., PUT /products/{id} updates fields., GET /products without token returns 401 or 403., DELETE /products/{id} soft-deletes (sets is_active=False)., test_create_product() (+5 more)

### Community 34 - "Audit Logging"
Cohesion: 0.23
Nodes (11): log(), log_user(), Session, Lightweight audit logging — record who changed what., Log with the requesting user's username from the auth dict., Append an audit entry. Best-effort: never raises., AuditLog, Who changed what — products, orders, settings, collections. (+3 more)

### Community 35 - "Product Dimensions & Images"
Cohesion: 0.17
Nodes (13): ProductImage, extract_dimensions(), _extract_dimensions_from_3mf(), _extract_dimensions_from_stl(), import_products(), post, UploadFile, Import products from .xlsx or .csv file. Returns summary of… (+5 more)

### Community 36 - "Machines API"
Cohesion: 0.21
Nodes (13): create_machine(), delete_machine(), get_active_machines(), get_all_machines(), delete, get, post, put (+5 more)

### Community 37 - "Materials Tests"
Cohesion: 0.17
Nodes (11): Material CRUD API tests., POST /materials creates a new material., POST /materials with duplicate name returns 400., PUT /materials/{id} updates fields., DELETE /materials/{id} soft-deletes (is_active=False)., GET /materials returns seeded materials., test_create_duplicate_material(), test_create_material() (+3 more)

### Community 38 - "Legacy Importer"
Cohesion: 0.25
Nodes (10): build_final_mapping(), determine_category(), main(), parse_print_time_hours(), Import remaining products from the Excel file into the 3DJAT database. Reads…, Convert timedelta to hours (float)., Strip product ID prefix like 'KE001. ' from product name. Returns…, Determine category from product ID prefix. (+2 more)

### Community 39 - "Products API"
Cohesion: 0.24
Nodes (11): _enrich_product(), export_products(), get_active_products(), get_all_products(), get_product(), get, Return ALL products including inactive, with computed costs., Return only active products with computed costs. (+3 more)

### Community 40 - "Contact & Channels"
Cohesion: 0.29
Nodes (8): Contact, getContact(), CHANNELS, CONTACT, displayChannels(), Contact(), ICONS, mergeChannels()

### Community 41 - "Login & Brand Layout"
Cohesion: 0.25
Nodes (5): Login, BrandLogo(), CatalogLayout(), getCatalogCategories(), Login()

### Community 42 - "Public Product Detail"
Cohesion: 0.29
Nodes (8): PublicProductDetail, getCatalogProduct(), getCatalogProductBySlug(), absoluteUrl(), buildBreadcrumbJsonLd(), buildProductJsonLd(), displayName(), PublicProductDetail()

### Community 43 - "Cost Calculation Service"
Cohesion: 0.20
Nodes (10): calculate_product_costs(), _get_setting(), Session, Calculate full cost breakdown for a product. Uses cached settings; queries DB…, Retrieve a single setting value from DB (legacy helper)., limit, Request, Calculate costs without creating a product. (+2 more)

### Community 44 - "Product Repository"
Cohesion: 0.24
Nodes (3): ProductRepository, Session, Search active products by name, product_id, category, or notes.

### Community 45 - "Categories Tests"
Cohesion: 0.20
Nodes (9): Category CRUD API tests., POST /categories creates a new category., PUT /categories/{id} updates a category., DELETE /categories/{id} removes a category., GET /categories returns a list of categories (requires auth)., test_create_category(), test_delete_category(), test_list_categories() (+1 more)

### Community 46 - "Catalog Frontend & SEO"
Cohesion: 0.36
Nodes (8): Catalog, getCatalog(), getCatalogCollections(), buildOrganizationJsonLd(), Catalog(), displayName(), isWithinDays(), telegramShareUrl()

### Community 48 - "App Lifespan & Slugify"
Cohesion: 0.22
Nodes (7): lifespan(), Create tables and seed data on first run., Convert a product name (Persian/English) to a URL-safe slug preserving Farsi…, _ensure_default_admin(), Create default admin if no users exist., populate_seo_descriptions(), Database migration & auto-seeder script for product SEO descriptions.…

### Community 49 - "Frontend Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, preview, test, test:watch

### Community 50 - "Audit Logs UI"
Cohesion: 0.40
Nodes (5): AuditLogs, getAuditLogs(), ACTION_COLORS, ACTION_LABELS, AuditLogs()

### Community 51 - "App Screenshots"
Cohesion: 0.73
Nodes (6): Blog / 3D Printing News Listing Screen, Admin Price Calculator Screen, Public Product Catalog Screen, Admin Dashboard Screen, Orders Management Screen, Products CRUD Management Screen

### Community 52 - "Settings Tests"
Cohesion: 0.40
Nodes (4): PUT /settings bulk-updates settings., GET /settings returns all settings as a dict., test_get_settings(), test_update_settings()

### Community 53 - "Frontend Package Meta"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 55 - "Settings Cache"
Cohesion: 0.50
Nodes (3): invalidate_settings_cache(), Simple in-memory settings cache with 60-second TTL. Avoids repeated DB queries…, Force cache miss on next call.

### Community 56 - "Customers API"
Cohesion: 0.50
Nodes (4): list_customers(), get, Session, Group orders by normalized contact to build a customer list.

### Community 57 - "PWA Assets (Hero & Icon)"
Cohesion: 0.50
Nodes (4): Catalog Hero Banner (JPEG), Catalog Hero Banner (WebP), PWA App Icon (192px), PWA App Icon (512px)

### Community 58 - "README SVGs"
Cohesion: 1.00
Nodes (3): Blog CMS Admin Screen Mockup, README Hero Banner (Spaghetti 3D Print Pricing), Screenshots Section Header Banner

### Community 59 - "Audit Logs API"
Cohesion: 0.67
Nodes (3): list_audit_logs(), get, Session

## Ambiguous Edges - Review These
- `CI Workflow (GitHub Actions)` → `Out of Scope (SRS v1.1)`  [AMBIGUOUS]
  requirements.md · relation: conceptually_related_to
- `Hardened Security & RBAC` → `Out of Scope (SRS v1.1)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **110 isolated node(s):** `type`, `entrypoint.sh script`, `deploy.sh script`, `root`, `eslint:recommended` (+105 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CI Workflow (GitHub Actions)` and `Out of Scope (SRS v1.1)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Hardened Security & RBAC` and `Out of Scope (SRS v1.1)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Are the 3 inferred relationships involving `Product` (e.g. with `Base` and `ProductRepository`) actually correct?**
  _`Product` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `type`, `entrypoint.sh script`, `deploy.sh script` to the rest of the system?**
  _110 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Collections & Pydantic Schemas` be split into smaller, more focused modules?**
  _Cohesion score 0.06153846153846154 - nodes in this community are weakly interconnected._
- **Should `Auth & User Management` be split into smaller, more focused modules?**
  _Cohesion score 0.07012987012987013 - nodes in this community are weakly interconnected._
- **Should `Product Upload/Slicing Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.06259426847662142 - nodes in this community are weakly interconnected._