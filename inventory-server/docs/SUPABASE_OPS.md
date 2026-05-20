# Supabase operations (scale and security)

## Connection pooling (recommended for Vercel)

Serverless functions open many short-lived DB connections. Use Supabase **connection pooling**:

1. Supabase Dashboard → **Project Settings → Database**
2. Copy **Connection string → Transaction mode** (port **6543**, pooler host)
3. On Vercel **inventory-server** project, set (if you move to direct Postgres later):
   - `DATABASE_URL` = pooled URI (optional; current app uses Supabase JS + service role, which already goes through Supabase API)

For high traffic, prefer:

- **Service role** only on the API server (never in the browser)
- Keep **`record_sale`** as the single write path for checkout
- Indexes already added: `idx_sales_warehouse_created_active`, `idx_sale_lines_product_id`

## Security model today

| Layer | What enforces access |
|-------|----------------------|
| API (`inventory-server`) | Session auth, `user_scopes`, `getEffectiveWarehouseId` |
| Postgres RLS | Partial — `sales` / `sale_lines` policies exist; most inventory tables rely on API + service role |

**Do not** expose the Supabase anon key to the browser for inventory mutations. The React app should call **`VITE_API_BASE_URL`** only.

## RLS hardening (future phase)

Full warehouse-scoped RLS on `warehouse_products` / `warehouse_inventory` requires:

- Policies tied to `user_scopes` and JWT claims
- Regression tests for POS, inventory CRUD, and reports

Until then, scope checks in API routes remain the source of truth. See `getScopeForUser` / `resolveUserScope` in `lib/auth/scope.ts` and `lib/data/userScopes.ts`.

## Migrations

Apply new files under `supabase/migrations/` via Supabase CLI or Dashboard SQL, in timestamp order. Production project: **HunnidOfficial**.
