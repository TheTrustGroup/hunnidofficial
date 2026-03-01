# Deploy and fix GET /api/sales 500 — runbook (in order)

Execute these steps **in this order** as a senior engineer.

---

## Step 1: Deploy the change

1. Ensure `inventory-server` builds:
   ```bash
   cd inventory-server && npm run build
   ```
2. Deploy to production (e.g. api.hunnidofficial.com):
   - **Vercel:** push to the connected branch or run `vercel --prod` from `inventory-server`.
   - **Other:** build artifact and start with `npm run start` (or your process manager), ensuring the same code that built is deployed.

---

## Step 2: Confirm production env

1. Call the health endpoint:
   ```bash
   curl -s https://api.hunnidofficial.com/api/health
   ```
2. Expect one of:
   - `{"status":"ok", ...}` and HTTP 200 → Supabase env is set; proceed to Step 3.
   - `{"status":"degraded","env":"SUPABASE_URL or Supabase key missing", ...}` and HTTP 503 → set env on the host:
     - `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) — must be non-empty.
     - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`.
   Then redeploy/restart and repeat the curl until you get `"status":"ok"`.

---

## Step 3: Inspect production logs

1. Reproduce the request: open the app (Dashboard or Sales), so the client calls `GET /api/sales` with `warehouse_id`, `from`, `to`, `limit`.
2. In your hosting logs (Vercel → Project → Logs, or your server logs), search for:
   - `[GET /api/sales]` — every sales GET log line.
   - `[GET /api/sales] DB missing columns, using legacy:` → schema missing delivery/void columns; legacy path is used (200). Proceed to Step 4 to fix schema.
   - `[GET /api/sales]` followed by an error message → note the exact message (e.g. RLS, timeout, or other DB error) and fix that cause.

---

## Step 4: Fix production schema (recommended)

So GET /api/sales uses the full path (delivery/void support and correct filtering), run the sales schema migrations on the **same** Supabase project used by the API.

**Option A — Supabase Dashboard (SQL Editor)**  
Run in this order, one script per run:

1. `supabase/migrations/20250228110000_sales_delivery_columns.sql`
2. `supabase/migrations/20250228120000_sales_void_columns.sql`
3. `supabase/migrations/20250228130000_sales_delivery_cancelled.sql`

**Option B — Supabase CLI**  
From `inventory-server`:

```bash
npx supabase db push
```

(or your usual migration command against the production DB URL).

After migrations, the next GET /api/sales will use the main path; you should no longer see `DB missing columns, using legacy` in logs.

---

## Step 5 (optional): Dev-only error in response

In non-production, GET /api/sales already returns the real error message in the JSON body on 500. In production the body is `{ "error": "Internal error" }`; details are only in server logs (Step 3).
