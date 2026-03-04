# RBAC Audit & Backend Enforcement

## Phase 1 — What Was Broken (CRITICAL)

- **Roles were not enforced on the backend.** Every user received `role: 'admin'` from login and `/me`/`user` routes.
- **Non-admin users could call admin APIs.** No server-side checks; any caller could mutate products, bulk delete, etc.
- **Role was never trusted from the client** (good) but the server **always returned admin** (bad). Cashier accounts effectively had full access.

## Phase 2 — Role Responsibilities

| Role    | Access |
|---------|--------|
| **Admin** | Full: inventory CRUD, users, settings, reports, POS, orders. |
| **Cashier** | POS only: view products, create sales, view/update orders. **NO**: users, settings, reports, inventory editing, dashboard. |
| **Manager** | Operations + limited overrides (see frontend `types/permissions.ts`). |
| **Viewer** | Read-only reports/orders (no mutations). |

Defined in code: `inventory-server/lib/auth/roles.ts` and frontend `src/types/permissions.ts`.

## Phase 3 — Backend Enforcement (Done)

- **Session:** Login sets a signed cookie (`warehouse_session`). Role is derived **server-side** from email:
  - If email is in `ALLOWED_ADMIN_EMAILS` (env) → `admin`
  - Else email prefix (e.g. `cashier@...` → `cashier`). Default `viewer`.
- **Protected routes:**
  - **Admin-only (403 if not admin):** All `admin/api/*` (me, products, products/[id], products/bulk), `api/products` POST/PUT/DELETE, `api/products/bulk` DELETE.
  - **Authenticated (401 if no session):** `api/products` GET, `api/products/[id]` GET, `api/warehouses` GET, `api/warehouses/[id]` GET, `admin/api/me`, `api/auth/user`.
  - **POS role (403 if not admin/manager/cashier):** `api/inventory/deduct` POST, `api/transactions` POST, `api/sales` POST.
- **Unauthorized attempts:** Return 403 and log (path, method, email, role) via `[RBAC] Unauthorized ...` in server logs.

## Phase 4 — UI

- Frontend already gates by `hasPermission()` and `ProtectedRoute`. Once backend returns the correct role (e.g. cashier), the UI shows only allowed nav and pages. **No UI-only protection:** backend is the authority.

## Phase 5 — Verification

1. **Cashier login:** Use `jcashier@hunnidofficial.com` (and shared password). Expect: sidebar shows only POS, Orders, Inventory (view). No Dashboard, Reports, Users, Settings.
2. **Direct API:** As cashier, `GET /api/products` with session cookie → 200. `POST /api/products` or `DELETE /api/products/bulk` → 403.
3. **Admin:** Put your admin email in `ALLOWED_ADMIN_EMAILS`. Login → full access; admin APIs return 200.

## Env (inventory-server)

- **SESSION_SECRET** — Required in production (min 16 chars). Signs session cookie.
- **ALLOWED_ADMIN_EMAILS** — Comma-separated emails that get admin role (e.g. `you@hunnidofficial.com`). **Set this so your admin account stays admin.** Others get role from email prefix (e.g. `jcashier@hunnidofficial.com` → cashier).

## Confirmation

- Admin access is **impossible** without an admin role: session is signed; role is derived server-side from email; admin routes call `requireAdmin()` and return 403 + log when role is not admin.

---

## Phase 6 — Warehouse scope & security hardening (Mar 2025)

### What changed

1. **User scope from DB** — `getScopeForUser()` now reads from the `user_scopes` table (and still respects env `ALLOWED_WAREHOUSE_IDS` if set). Cashiers are restricted to warehouses they are assigned to.
2. **POST /api/sales** — Uses `getEffectiveWarehouseId()`: the warehouse in the request must be one the user is allowed to use. Admins/super_admins can use any warehouse; others only those in their scope.
3. **POST /api/inventory/deduct** — Same: warehouse is validated against user scope. 403 if the warehouse is not allowed.
4. **Manager can use POS** — `requirePosRole` now allows `admin`, `manager`, and `cashier` (manager was previously blocked on the backend).
5. **Super admin scope** — `isAdmin()` now includes `super_admin` so super admins always have unrestricted warehouse access.
6. **record_sale RPC** — Migration `20250228140000_revoke_record_sale_anon.sql` revokes `EXECUTE` from `anon`; only `authenticated` and `service_role` can call it.
7. **GET /api/test** — Now requires authentication (401 if no session). Use **GET /api/health** for unauthenticated health checks.

### What you must do

- **Ensure every cashier/manager has at least one row in `user_scopes`** (per store/warehouse they may use). If a cashier has no rows, they will get **400** (“warehouseId is required and must be a warehouse you are allowed to use”) when posting a sale or deduction. Run your existing seed scripts (e.g. `seed_stores_warehouses_dc_maintown.sql`, `seed_super_admin_scope.sql`) or add rows via **Settings → User Management** (or PUT /api/user-scopes) so each user has the correct store_id + warehouse_id.
- **Apply the new migration** — Run `supabase db push` (or apply `20250228140000_revoke_record_sale_anon.sql` in the SQL Editor) so `record_sale` is no longer executable by `anon`.
- **Health checks** — If anything was calling **GET /api/test** without auth (e.g. uptime monitor), switch it to **GET /api/health** (no auth required).
