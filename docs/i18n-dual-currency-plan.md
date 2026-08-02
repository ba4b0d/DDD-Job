# Internationalization (i18n), Multi-Currency & Global SEO Plan

## Overview
This document outlines the technical implementation plan for adding full English/Internationalization (i18n) support, European/US native dual-parameter cost pricing, and multi-region SEO (`hreflang`) for `spaghettiprints.ir`.

---

## 1. Dual Cost & Pricing Engine (European Formula)

Rather than using live currency exchange rates, the app will run native dual calculations using localized raw material, electricity, and labor parameters:

### Parameters Comparison
- **Material (PLA)**:
  - Iran (IRR): `2,600,000 IRR / kg`
  - Europe (EUR): `€23.00 / kg`
- **Electricity**:
  - Iran (IRR): `812 IRR / kWh`
  - Europe (EUR): `€0.35 / kWh`
- **Machine Purchase & Life**:
  - Iran (IRR): `94,000,000 IRR` / 5000 hrs
  - Europe (EUR): `€450.00` / 5000 hrs
- **Post-Processing / Labor**:
  - Iran (IRR): `150,000 IRR / hr`
  - Europe (EUR): `€15.00 / hr`

### Backend Changes (`backend/app/calculator.py`)
- Extend `calculate_product_costs_from_values()` to compute both IRR (Toman) and EUR base costs.
- Update `/api/v1/catalog` and `/api/v1/catalog/{id}` API responses to return dual pricing objects:
  ```json
  {
    "price_toman": 150000,
    "price_eur": 8.50,
    "price_usd": 9.20
  }
  ```

---

## 2. Router & URL Structure for Global SEO

To ensure Googlebot indexes both Farsi and English pages without triggering automated IP redirect penalties:

### Routes (`frontend/src/App.jsx`)
- Farsi (Default): `/` and `/catalog/{slug}`
- English: `/en/` and `/en/catalog/{slug}`

### `hreflang` Canonical Link Insertion (`frontend/src/lib/seo.js`)
On every page render, inject `rel="alternate"` links into `<head>`:
```html
<link rel="alternate" hreflang="fa" href="https://spaghettiprints.ir/catalog/bo001" />
<link rel="alternate" hreflang="en" href="https://spaghettiprints.ir/en/catalog/bo001" />
<link rel="alternate" hreflang="x-default" href="https://spaghettiprints.ir/catalog/bo001" />
```

### JSON-LD Structured Data
- Farsi page schema: `priceCurrency: "IRR"`
- English page schema: `priceCurrency: "EUR"`

---

## 3. Frontend i18n & Language / Currency Switcher

- Add a top navbar selector with region/currency toggles:
  - 🇮🇷 **تومان (IRR / Farsi)** - RTL layout
  - 🇪🇺 **Euro (€ / English)** - LTR layout
- Use `react-i18next` or a lightweight dictionary store for key UI elements:
  - Header links (Catalog, How to Order, Custom Print, Contact)
  - Customization badges and order buttons
