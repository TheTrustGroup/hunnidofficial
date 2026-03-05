# Deploy (in order)

## Inventory build error (fix applied)

If **hunnidofficial** deployments show **Error**:

1. **Do not** run `vercel` from inside `warehouse-pos/` while linked to hunnidofficial — that project expects the Next.js app in `inventory-server/`, so the build fails with "No Next.js detected".
2. ESLint during build can fail on Vercel; `next.config.js` is set to `eslint: { ignoreDuringBuilds: true }` so the API build completes.
3. In Vercel, open the failed deployment → **Building** tab to see the exact error.
4. Deploy the API only from **repo root** (see below).

## 1. API (hunnidofficial)

- **Project:** hunnidofficial (Root Directory = `inventory-server`).
- **From repo root:**
  ```bash
  cd /Users/raregem.zillion/Desktop/HunnidOfficial
  vercel --prod --yes
  ```
- Production URL: your api.hunnidofficial.com (or the project’s production domain).

---

## 2. Frontend (warehouse POS) — “hasn’t triggered in a while”

The frontend is a **Vite** app in `warehouse-pos/`. It does **not** deploy when you push if only **hunnidofficial** is connected (that project builds `inventory-server` only). To have the frontend trigger on every push:

- Create a **second** Vercel project for the warehouse UI (e.g. **hunnid-warehouse**).
- Connect the **same** Git repo and set **Root Directory** to `warehouse-pos`.
- Then every push to the connected branch will trigger **both** projects: API (inventory-server) and frontend (warehouse-pos).

Details below.

**Option A – Same repo, second project (recommended)**

1. In Vercel: **Add New Project** → import the same repo.
2. Name it e.g. **hunnid-warehouse** (or warehouse.hunnidofficial.com).
3. **Root Directory:** set to `warehouse-pos`. Leave framework on **Vite**.
4. Save and deploy. For later deploys, either push to the connected branch or run:
   ```bash
   cd /Users/raregem.zillion/Desktop/HunnidOfficial
   vercel --prod --yes
   ```
   and choose the **warehouse** project when prompted (or link this repo root to the warehouse project and use that for frontend deploys).

**Option B – Deploy from `warehouse-pos` with its own project**

1. Create a new Vercel project for the frontend (e.g. **hunnid-warehouse**).
2. **Root Directory:** leave empty.
3. From your machine:
   ```bash
   cd /Users/raregem.zillion/Desktop/HunnidOfficial/warehouse-pos
   vercel link
   ```
   Select the new warehouse project (not hunnidofficial).
4. Then:
   ```bash
   vercel --prod --yes
   ```

Set the warehouse app’s env (e.g. `VITE_API_URL`) to your API URL if needed.

---

## 3. Idempotent void_sale (Supabase, once)

See **inventory-server/supabase/scripts/RUNBOOK_void_sale_idempotent.md**. Run the SQL script once in the Supabase SQL Editor so the API’s void flow is idempotent and returns 200 when a sale is already voided.

---

## 4. Legacy GET /api/sales

The legacy fallback intentionally does **not** select `voided_at`/`voided_by` so DBs without those columns still work. Voided sales are still returned; they appear with `voidedAt: null` in legacy mode. No code change needed.
