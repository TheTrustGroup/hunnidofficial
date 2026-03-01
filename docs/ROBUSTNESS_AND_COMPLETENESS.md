# Robustness, Performance & Completeness — Senior Engineer Recommendations

**Goal:** Leave room for no failure. Wiring correct, auth enforced, errors handled, performance acceptable, and a clear path to end-to-end completeness.

**Repo:** `warehouse-pos` (frontend at root, API in `inventory-server/`).

---

## 1. Wiring — Status

### 1.1 Frontend → API

All critical flows have a matching backend route:

- **Auth:** `/api/auth/login`, `/api/auth/user`, `/admin/api/login`, `/admin/api/me`, `/admin/api/logout` — implemented and protected where intended.
- **Data:** `/api/warehouses`, `/api/products`, `/api/sales` (GET/POST/PATCH), `/api/sales/void`, `/api/dashboard`, `/api/dashboard/today-by-warehouse`, `/api/size-codes`, `/api/transactions`, `/api/sync-rejections`, `/api/user-scopes`, `/api/stores`, `/api/upload/product-image` — implemented.
- **Orders:** **GET** `/api/orders` returns `{ data: [] }`. **POST** (create), **PATCH** (update, assign-driver, deliver, fail, cancel) **do not exist**. The Orders UI will get **404** for create/update/delivery/cancel. See §5.

### 1.2 Auth — Fixed (Critical)

**Issue:** Five routes did not `await` `requireAuth` / `requireAdmin` / `requirePosRole`, so the guard was skipped and any caller could hit them unauthenticated.

**Fixed in code:**

- `inventory-server/app/api/orders/route.ts` — `await requireAuth(request)`
- `inventory-server/app/api/inventory/deduct/route.ts` — `await requirePosRole(request)`
- `inventory-server/app/api/stock-movements/route.ts` — `await requireAdmin(request)`
- `inventory-server/app/api/sync-rejections/route.ts` — `await requireAdmin(request)`
- `inventory-server/app/api/sync-rejections/[id]/void/route.ts` — `await requireAdmin(_request)`

**Verification:** Every route that uses `requireAuth`, `requireAdmin`, or `requirePosRole` must assign the result with `await`. Grep for `requireAuth(`, `requireAdmin(`, `requirePosRole(` and confirm the call is `const auth = await require...`.

### 1.3 CORS and env

- **Middleware** (`inventory-server/middleware.ts`): uses **`CORS_ORIGINS`** (comma-separated), or `FRONTEND_ORIGIN` / `VERCEL_URL` when unset. OPTIONS handled for `/api/` and `/admin/api/`.
- **Per-route** (`inventory-server/lib/cors.ts`): uses **`ALLOWED_ORIGINS`** and **`ALLOWED_ORIGIN_SUFFIXES`** (not `CORS_ORIGINS`). Many routes attach these headers to responses.

**Recommendation:** In production set **`CORS_ORIGINS`** (middleware) to your frontend origin(s), e.g. `https://warehouse.hunnidofficial.com`. If you use `lib/cors.ts` defaults, they already include `warehouse.hunnidofficial.com` and `.vercel.app`; for strict control set **`ALLOWED_ORIGINS`** to match. Document in one place: “Production API env: set CORS_ORIGINS and ALLOWED_ORIGINS to the same value(s).”

---

## 2. Robustness — Prevent Errors and Failures

### 2.1 Done

- **Auth bypass:** Fixed as above; all protected routes now await the auth guard.
- **GET /api/sales 500:** Legacy fallback when DB lacks delivery/void columns; production 500 body is generic; errors logged server-side.
- **Health env check:** `GET /api/health` returns 503 when `SUPABASE_URL` or Supabase key is missing.
- **Route-level try/catch:** Dashboard, today-by-warehouse, warehouses, stores, size-codes, stock-movements, sync-rejections already wrap data access in try/catch and return JSON errors.

### 2.2 Recommended (High Impact)

1. **Idempotency for POST /api/sales**  
   **Risk:** Double submit or retry creates duplicate sales and double stock deduction.  
   **Action:** Accept optional `Idempotency-Key` header (or `idempotencyKey` in body). Before calling `record_sale`, check a small table or cache (e.g. `idempotency_keys(key, sale_id, created_at)` with TTL). If key exists and is recent, return the existing sale response (200/201) instead of creating again.  
   **Files:** `inventory-server/app/api/sales/route.ts` (POST), optional migration for `idempotency_keys` table.

2. **Standardize API error shape**  
   Use one shape for all 4xx/5xx JSON responses, e.g. `{ error: string }` or `{ error: string, code?: string }`. Some routes return `{ message }`, others `{ error }`. Update handlers to use the chosen shape and document it so the frontend can show user-friendly messages consistently.  
   **Files:** All `app/api/**/route.ts` that return error JSON; frontend `src/lib/api.ts` or error handlers that parse `res.json()`.

3. **Production 500 logging**  
   Ensure every route that catches an exception logs it (e.g. `console.error` or your logging provider) with request id/path so production logs are searchable. Hide internal details from the response body in production (already done for GET /api/sales).

### 2.3 Optional

- **Request timeouts:** Consider a global or per-route timeout for heavy DB queries (e.g. GET /api/sales with large date range) to avoid hanging connections.
- **Input validation:** Validate query/body (e.g. UUIDs for `warehouse_id`, numeric limits) and return 400 with a clear `error` message instead of letting DB or code throw.

---

## 3. Performance and Loading

### 3.1 Backend

- **GET /api/sales:** Limit cap 500, offset supported. No cursor; large date ranges still bounded by limit.
- **GET /api/products:** Backend allows up to 2000 per request; frontend often requests 1000. Acceptable; document max page size if clients need it.
- **No N+1:** Sales and products use a single query with relations or batched lookups; no per-row DB calls in the hot path.

### 3.2 Frontend

- **Dashboard:** Two requests (dashboard stats + today-by-warehouse) can be fired in **parallel** (e.g. two `fetch` in one effect, or `Promise.all`) to reduce time to first meaningful paint.
- **Size codes:** Fetched when opening the product form; not cached. Consider caching by `warehouse_id` in context or a small store (e.g. React Query or a module-level cache with TTL) to avoid repeated calls when opening the form multiple times.
- **Loading states:** Key pages (Dashboard, Inventory, POS, Sales history) have loading/error state; adding **skeleton placeholders** for lists improves perceived performance.

### 3.3 Optional

- **Warehouses:** Cached in context and localStorage; no TTL. If you need fresh list after admin changes, add a short TTL or a “Refresh” that invalidates cache.
- **Largest chunks:** Reports and some index bundles are large; consider code-splitting or lazy loading for heavy report views.

---

## 4. Completeness — What’s Left for End-to-End

### 4.1 Migrations (Required for Current Features)

Migrations in `inventory-server/supabase/migrations/` must be run in **timestamp order** on the Supabase project used by the API. **`docs/MIGRATIONS_TO_RUN.md`** is outdated and does not include sales, delivery, void, or color.

**Include at least these (in order):**

- All migrations listed in the current `MIGRATIONS_TO_RUN.md` (e.g. 20250204000000 through 20250213100000 and any others it references).
- **Sales and delivery/void:**  
  - `20250222120000_sales_and_record_sale.sql`  
  - `20250222130000_master_sql_v2.sql` (if used)  
  - `20250222140000_drop_record_sale_v1_overload.sql`  
  - `20250222150000_record_sale_single_overload.sql`  
  - `20250228100000_add_warehouse_products_color.sql`  
  - `20250228110000_sales_delivery_columns.sql`  
  - `20250228120000_sales_void_columns.sql`  
  - `20250228130000_sales_delivery_cancelled.sql`
- Plus any consolidation/cleanup migrations (e.g. 20250222100000, 20250222110000) and others that these depend on.

**Action:** Update `docs/MIGRATIONS_TO_RUN.md` (or create `inventory-server/docs/MIGRATIONS_FULL_ORDER.md`) with the **full ordered list** of migration filenames and a one-line description so a fresh project can run them in sequence without guesswork.

### 4.2 Seeds and Bootstrap

- **Seeds** live in `inventory-server/supabase/scripts/` (e.g. `seed_stores_warehouses_dc_maintown.sql`, `seed_super_admin_scope.sql`). They are not part of the migration runner; run manually in Supabase SQL Editor after migrations.
- **Gap:** No single “bootstrap from zero” runbook that says: (1) run migrations in this order, (2) run these seed scripts in this order, (3) create Auth users (admin, cashiers) and set env.

**Action:** Add a **BOOTSTRAP.md** (or section in this doc) with exact steps: migrations list, seed scripts list, Auth user creation, and required env vars for API and frontend. That gives a single path to “app works end-to-end.”

### 4.3 Orders Feature

- **Current state:** Orders UI (OrderContext) calls POST /api/orders (create), PATCH /api/orders/:id, assign-driver, deliver, fail, cancel. Backend only implements GET (returns `[]`), POST deduct, POST return-stock.
- **Options:**  
  - **A.** Implement full orders API (create, update, assign-driver, deliver, fail, cancel) so the Orders page works end-to-end.  
  - **B.** If orders are out of scope for this app, hide or disable the Orders nav and related UI so users don’t hit 404.  
  - **C.** Keep GET returning `[]` and document that “Orders management is read-only / not implemented; create/update return 404.”

**Recommendation:** Choose A or B and document it. If A, add the routes and match the frontend contract (request/response shapes). If B, hide the Orders entry point and any “Create order” actions.

---

## 5. Single Env Checklist (Production)

Use this as the single source of truth for “what must be set so the app and API work.”

**API (inventory-server, e.g. Vercel project “inventory-server”):**

| Variable | Required | Notes |
|----------|----------|--------|
| `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` | Yes | Prefer service role for server. |
| `SESSION_SECRET` or `JWT_SECRET` | Yes (min 16 chars) | For login/session; without it login returns 503. |
| `CORS_ORIGINS` | Yes (recommended) | Comma-separated frontend origin(s), e.g. `https://warehouse.hunnidofficial.com`. |
| `ALLOWED_ORIGINS` | Optional | If set, should match CORS_ORIGINS for per-route CORS. |
| `ALLOWED_ADMIN_EMAILS` / `SUPER_ADMIN_EMAILS` | Optional | Override default admin list. |
| `FRONTEND_ORIGIN` | Optional | Fallback when CORS_ORIGINS unset (middleware). |

**Frontend (e.g. Vercel project “hunnidofficial-mb6h”):**

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_API_BASE_URL` | Yes | API base URL, no trailing slash (e.g. `https://api.hunnidofficial.com` or `https://inventory-server-iota.vercel.app`). |
| `VITE_SUPER_ADMIN_EMAILS` | Optional | Client-side admin fallback. |
| Others (e.g. `VITE_APP_NAME`, `VITE_HELP_URL`) | Optional | Per feature. |

---

## 6. Prioritized Action List (No Room for Failure)

**P0 — Must do**

1. **Deploy auth fix.** The five `await` fixes are in code; deploy the API so production enforces auth on orders, inventory/deduct, stock-movements, sync-rejections.
2. **Run sales/delivery/void migrations** on production Supabase if not already done (see §4.1). Without them, GET /api/sales uses legacy path; run them for full behavior.
3. **Set production env** per §5: `SUPABASE_URL`, Supabase key, `SESSION_SECRET`/`JWT_SECRET`, `CORS_ORIGINS`. Verify with `GET /api/health` (200 and `status: ok`).

**P1 — Should do**

4. **Update migrations doc** with full ordered list including sales, delivery, void, color (§4.1).
5. **Add bootstrap runbook** (§4.2): migrations order + seeds + Auth users + env.
6. **Resolve Orders** (§4.3): either implement create/update/delivery/cancel or hide/disable Orders UI and document.
7. **Idempotency for POST /api/sales** (§2.2) to prevent duplicate sales on retry/double-submit.
8. **Standardize API error shape** (§2.2) and ensure frontend shows user-facing messages.

**P2 — Nice to have**

9. **Dashboard:** Parallelize dashboard + today-by-warehouse requests.
10. **Size codes:** Cache by warehouse to avoid repeated requests.
11. **Loading:** Skeleton placeholders for main lists.
12. **CORS:** Document that `CORS_ORIGINS` (middleware) and `ALLOWED_ORIGINS` (cors.ts) should match in production.

---

## 7. Summary

- **Wiring:** All critical API calls have a backend route except Orders create/update/delivery/cancel. Auth is now enforced on all protected routes after the five `await` fixes.
- **Robustness:** Auth bypass fixed; health check and GET /api/sales legacy path reduce production failures. Add idempotency for POST /api/sales and standardize error shape for consistency.
- **Performance:** Backend limits and no N+1 are in place; frontend can gain from parallel dashboard requests and size-codes caching.
- **Completeness:** Update migrations doc, add a bootstrap runbook, and either implement or hide Orders so the app is clearly “complete” for the scope you support.

Following the P0 list and then P1 will get you to a robust, end-to-end working app with minimal room for failure.
