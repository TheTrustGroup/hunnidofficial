# Architecture & prioritized improvement roadmap

Single reference for stack, current capabilities, gaps, and the improvement plan (Sections 1–5). **Do not implement from this doc without confirming with the product owner.**

---

## Current architecture

| Layer | Tech | Notes |
|-------|------|--------|
| **Frontend** | Vite + React, React Router | SPA; lazy routes; Dexie/IndexedDB when offline enabled. |
| **API** | Next.js (inventory-server) | App router; server-side auth (session + Supabase JWT); service_role Supabase client. |
| **DB** | Supabase (PostgreSQL) | RLS on sales/sale_lines; rest bypassed via service_role. Warehouses, stores, user_scopes, warehouse_products, warehouse_inventory, sales, sale_lines. |
| **Auth** | Session JWT + Supabase Auth | Role from email (env ALLOWED_ADMIN_EMAILS) or user_metadata; scope from user_scopes table. |
| **Deploy** | Vercel (or similar) | Frontend and API as separate projects; env per project. |

---

## Current capabilities (as of audit)

- **Onboarding:** New warehouse = insert store + warehouse + user_scopes + Auth users; see `docs/ONBOARDING_NEW_WAREHOUSE.md`. No UI wizard; SQL + Dashboard.
- **Multi-currency / multi-tax:** Not implemented. Currency is fixed (GH₵ in receipts and reports). No tax rules engine or region-specific tax.
- **Reporting:** Reports page uses GET /api/sales (from, to, warehouse_id); sales report, inventory report, date range, export CSV. Dashboard: today’s sales, stock value, low/out-of-stock counts via /api/dashboard. No embedded BI or external analytics.
- **Receipts:** Digital: in-app receipt view and print (browser print dialog); `printReceipt.ts` formats for Ghana (GH₵, Africa/Accra). No direct thermal printer API; user prints via OS.
- **Webhooks / integrations:** None. No outbound webhooks (e.g. on sale or stock change), no Shopify/accounting connectors. Sync is client→server only.
- **Versioning / deploy:** Git; CI at repo root `.github/workflows/ci.yml` (frontend: lint + test + build; backend: lint + build). Frontend: `npm run ci`, `test:e2e` = Playwright. Backend: `test:health`, `test:smoke` (run with server up). Deploy is manual (e.g. Vercel git push or dashboard).
- **Tests:** Frontend: Vitest (unit + integration); Playwright (e2e). ~15 test files. Backend: no unit/integration tests; health check only.

---

## Prioritized improvement roadmap

### CRITICAL — Security or data integrity; fix before next client onboard

| # | Problem | Risk if unaddressed | Approach | Effort |
|---|--------|---------------------|----------|--------|
| 1 | Cashiers could post sales/deductions for any warehouse (body.warehouseId not checked against scope). | Cross-warehouse data mix; compliance. | **Done.** Scope enforced in POST /api/sales and POST /api/inventory/deduct via getEffectiveWarehouseId; getScopeForUser reads user_scopes. | — |
| 2 | record_sale allowed oversell (no conditional deduct). | Negative stock; two cashiers sell last unit. | **Done.** Migration 20250228150000_record_sale_atomic_stock.sql: deduct only where quantity >= qty; raise INSUFFICIENT_STOCK; API returns 409. | — |
| 3 | record_sale executable by anon. | If anon key leaks, unauthenticated sales. | **Done.** Migration 20250228140000_revoke_record_sale_anon.sql revokes EXECUTE from anon. | — |
| 4 | GET /api/test public. | Info leak. | **Done.** Requires auth; use GET /api/health for unauthenticated checks. | — |
| 5 | Manual sale fallback (POST /api/sales) not atomic. | Partial sale + partial deduction on failure. | **Documented.** Prefer record_sale RPC; fallback only when RPC missing. Optional: replace fallback with single RPC that does same steps in one transaction. | Small |

---

### IMPORTANT — Robustness and UX for daily operations

| # | Problem | Risk if unaddressed | Approach | Effort |
|---|--------|---------------------|----------|--------|
| 6 | 409 insufficient-stock showed generic “sale failed to sync”. | Cashiers think it’s network and retry blindly. | **Done.** POS shows “Insufficient stock… Reduce quantity or remove items”; cart preserved; errorMessages.ts maps message. | — |
| 7 | No audit of who recorded a sale (sold_by often null). | Hard to attribute errors or disputes. | **Done.** Migration 20250228170000_sales_sold_by_email.sql adds sold_by_email; record_sale and POST /api/sales set it from session email. | — |
| 8 | No backup runbook for Supabase. | Data loss or long RTO. | **Done.** docs/BACKUP_RUNBOOK.md: enable PITR, restore steps, verify. | — |
| 9 | In-progress sale lost on browser crash. | Cart is client-only; no server draft. | **Documented.** docs/UX_OPERATIONS.md: known limitation; optional improvement = persist cart to localStorage. | — |
| 10 | Backend has no automated tests. | Regressions on auth, scope, record_sale. | **Done.** scripts/smoke-api.mjs: GET /api/health (200/ok), GET /api/test (401). npm run test:smoke (run with server up). CI runs lint + build. | — |

---

### ENHANCEMENT — Performance, analytics, future-proofing

| # | Problem | Benefit | Approach | Effort |
|---|--------|---------|----------|--------|
| 11 | Product list ORDER BY name not indexed. | Slow list at scale. | **Done.** Migration 20250228160000_warehouse_products_name_index.sql. | — |
| 12 | List endpoints no short cache. | Extra load on repeated visits. | **Done.** GET /api/products and GET /api/sales list: Cache-Control private, max-age=60. | — |
| 13 | No CI pipeline in repo. | Broken main, unrepeatable deploys. | **Done.** CI at repo root `.github/workflows/ci.yml` (paths: `World-Class.../warehouse-pos`): frontend lint + test + build; backend lint + build (on push/PR to main). | — |
| 14 | Multi-currency / multi-tax. | Expand to other regions. | Add currency and tax config per store/warehouse or tenant; receipts and reports use it; DB schema for currency_code and tax rules. | Large |
| 15 | Webhooks (e.g. on sale). | Integrate accounting or e‑commerce. | Add webhook table + job that POSTs to configured URLs on sale/void; retries and idempotency. | Medium |
| 16 | Barcode/scanner for POS. | Faster product lookup. | Add barcode input or hardware scanner; search/add by warehouse_products.barcode. | Small–medium |
| 17 | Keyboard shortcuts (new sale, focus search). | Faster power users. | Add keydown handler in POS (e.g. F2 = new sale, F4 = focus search). | Small |

---

## Deployment verification (before next client)

- **Migrations:** Apply all migrations in order (e.g. from `inventory-server`: `npx supabase db push`). Full list: `docs/STEP3_MIGRATIONS_AND_SEEDS.md` §3.3 (includes 20250228140000–20250228170000: anon revoke, atomic record_sale, name index, sold_by_email).
- **user_scopes:** Populate for each cashier/manager per warehouse; see `docs/ONBOARDING_NEW_WAREHOUSE.md`.
- **CI:** Single workflow at repo root `.github/workflows/ci.yml`; paths under `World-Class.../warehouse-pos`. Push to `main` or open PR to run.

---

## Doc index (audit deliverables)

| Doc | Content |
|-----|--------|
| `inventory-server/RBAC_AUDIT_AND_ENFORCEMENT.md` | Security Phase 6: scope, anon revoke, /api/test. |
| `inventory-server/docs/DATA_INTEGRITY.md` | Atomic record_sale, manual fallback, audit/backup notes. |
| `inventory-server/docs/PERFORMANCE.md` | Indexes, pagination limits, cache, realtime. |
| `docs/UX_OPERATIONS.md` | 409 handling, POS flow, recommendations. |
| `docs/ONBOARDING_NEW_WAREHOUSE.md` | Runbook: new store + warehouse + scopes + auth. |
| `docs/STEP3_MIGRATIONS_AND_SEEDS.md` | Full migration order (§3.3) and seed scripts. |
| `docs/BACKUP_RUNBOOK.md` | Supabase backup, PITR, restore steps. |
| `docs/ARCHITECTURE_AND_ROADMAP.md` | This file. |

---

## Confirmation before implementation

For any item above that is **not** marked **Done**, confirm with the product owner before writing code. Effort is approximate (small / medium / large).
