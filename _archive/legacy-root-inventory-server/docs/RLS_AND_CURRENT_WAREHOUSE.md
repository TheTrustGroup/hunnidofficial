# RLS and Current Warehouse (Phase 2)

## Your diagnostic result

- **admin@hunnidofficial.com**: two warehouses (Main Jeff, Hunnid Main) — admin can choose.
- **hcashier@hunnidofficial.com**: one warehouse (Hunnid Main).
- **jcashier@hunnidofficial.com**: one warehouse (Main Jeff).
- **meta_warehouse_id** is null for all — auth metadata is not set; the app uses `user_scopes` (and session) for warehouse.

---

## Two ways to “handle RLS”

### Option A: Use the API (recommended if you use API login only)

Your app logs in via `POST /api/auth/login` and uses a **Bearer token**, not Supabase Auth. The frontend Supabase client uses the **anon** key, so Supabase has no user identity and RLS would block reads.

**Steps:**

1. **Add an API endpoint** that returns the current warehouse using the Bearer token (see below).
2. **Change the frontend** so `useCurrentWarehouse` calls this API instead of Supabase.
3. **No RLS change needed** for the frontend reading `user_scopes` — the backend (service role) already reads it.

**Backend:** add `GET /api/auth/current-warehouse` that:

- Uses `requireAuth(req)`.
- Calls `getScopeForUser(auth.email)` (or `getSingleWarehouseIdForUser`).
- Returns `{ id, name }` (e.g. first warehouse, or single if only one).
- Frontend calls this with the same Bearer token as other API calls.

**Result:** Current warehouse works without giving the anon key access to `user_scopes`, and you don’t rely on Supabase JWT for this.

---

### Option B: Use RLS with a Supabase JWT

If you want the frontend to read `user_scopes` (and `warehouses`) **directly via Supabase** with the anon key, then Supabase must know the user. That means the Supabase client must have a **session** whose JWT contains the user’s **email**.

**Steps:**

1. **Apply the RLS migration**  
   Run (or deploy) the migration that enables RLS on `user_scopes` and `warehouses` and adds the policies (e.g. `20260307110000_rls_user_scopes_warehouses.sql`).  
   - `user_scopes`: `SELECT` only where `user_email` matches `auth.jwt()->>'email'`.  
   - `warehouses`: `SELECT` for `authenticated`.  
   - Both: `service_role` keeps full access.

2. **Give the Supabase client a JWT that includes the user**  
   One of:

   - **Supabase Auth**: If you move login to Supabase (e.g. `signInWithPassword`), the client gets a session and `auth.jwt()->>'email'` is set. Then RLS “just works.”
   - **Custom JWT**: After your API login, backend issues a **Supabase-compatible JWT** (same project JWT secret, claims like `sub`, `email`) and the frontend calls `supabase.auth.setSession({ access_token, refresh_token })` (or equivalent). Then RLS can use `auth.jwt()->>'email'`.

3. **Replication**  
   If you use Realtime on other tables, keep existing Realtime/RLS setup; the new policies only add rules for `user_scopes` and `warehouses`.

**Result:** The frontend can use `useCurrentWarehouse` with `supabase.from('user_scopes').select(...)` and RLS will restrict rows to the current user’s email.

---

## Summary

| Approach | When to use | What you do |
|----------|-------------|-------------|
| **A: API** | You stay on API login (Bearer token only). | Add `GET /api/auth/current-warehouse`, point `useCurrentWarehouse` at it. No RLS needed for anon. |
| **B: RLS** | You use (or will use) Supabase Auth or a Supabase JWT for the frontend. | Run the RLS migration, then ensure the Supabase client gets a session JWT that includes the user’s email. |

Your diagnostic shows real UUIDs and correct names; the only decision is whether the frontend gets the current warehouse from your **API** (Option A) or from **Supabase + RLS** (Option B).
