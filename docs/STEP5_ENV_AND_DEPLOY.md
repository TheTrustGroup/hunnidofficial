# Step 5 & 6: Environment variables and deployment

**Rule:** Set env vars **before** (or during) the first deploy. Never deploy then add vars later for the first time—the API will fail without `SUPABASE_URL` / `SESSION_SECRET`, and the frontend needs `VITE_API_BASE_URL` at build time. Order below: create projects → set vars → deploy.

Execute in this exact order. Do not set production secrets in the repo; use your host’s env UI (e.g. Vercel).

---

## 5.1 Get Supabase values

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **ttmlclllzvydhggevkmu**.
2. **Settings** → **API**.
3. Copy and store securely:
   - **Project URL** → use for `SUPABASE_URL` and (frontend) `VITE_SUPABASE_URL`.
   - **anon public** → use for `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`.
   - **service_role** → use for `SUPABASE_SERVICE_ROLE_KEY` only on the **backend**; never in the frontend.

---

## 5.2 Backend (inventory-server) env vars

**Where:** Vercel → project for **inventory-server** (or your API host) → **Settings** → **Environment Variables**.  
Apply to **Production** (and Preview if you use preview envs).

| Name | Value | Required |
|------|--------|----------|
| `SUPABASE_URL` | Supabase Project URL from 5.1 | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key from 5.1 | Yes |
| `SESSION_SECRET` | New secret, e.g. `openssl rand -hex 24`; min 16 chars; do not reuse from other apps | Yes |
| `ALLOWED_ADMIN_EMAILS` | `admin@hunnidofficial.com` | Yes |
| `POS_PASSWORD_CASHIER_MAIN_STORE` | Same password you set for `jcashier@hunnidofficial.com` in Supabase Auth | Yes |
| `POS_PASSWORD_MAIN_TOWN` | Same password you set for `hcashier@hunnidofficial.com` in Supabase Auth | Yes |
| `CORS_ORIGINS` or `ALLOWED_ORIGINS` | For first deploy: `https://<your-frontend>.vercel.app` (replace with the frontend Vercel URL after you create that project). After adding custom domain: also add `https://warehouse.hunnidofficial.com` | Yes |
| `FRONTEND_ORIGIN` | `https://warehouse.hunnidofficial.com` (optional if CORS_ORIGINS is set) | Optional |

After adding or changing any variable, **redeploy** the API so the new values are used.

---

## 5.3 Frontend (warehouse-pos) env vars

**Where:** Vercel → project for **warehouse-pos** (frontend) → **Settings** → **Environment Variables**.  
Apply to **Production** (and Preview if needed).

**Important:** `VITE_API_BASE_URL` must be the **API** base URL (your inventory-server deployment), **not** the frontend URL.

| Name | Value | Required |
|------|--------|----------|
| `VITE_API_BASE_URL` | Full API base URL, no trailing slash, e.g. `https://hunnid-official-server.vercel.app` or `https://api.hunnidofficial.com` | Yes |
| `VITE_APP_NAME` | `Hunnid Official - Warehouse` | Optional |
| `VITE_SUPER_ADMIN_EMAILS` | `admin@hunnidofficial.com` (optional; client-side admin fallback) | Optional |
| `VITE_SUPABASE_URL` | Supabase Project URL (if the frontend uses Supabase client) | If used |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (if the frontend uses Supabase client) | If used |

After adding or changing any variable, **redeploy** the frontend.

---

## 6.1 Deploy order

1. **Deploy API first**  
   - Connect GitHub repo to a Vercel project.  
   - **Root Directory:** set to `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server` (or `warehouse-pos/inventory-server` if repo root is warehouse-pos).  
   - Set all backend env vars from 5.2.  
   - Deploy. Note the deployment URL (e.g. `https://hunnid-official-server.vercel.app`).

2. **Deploy frontend**  
   - Connect the same repo to a second Vercel project (or use the same repo with a different root).  
   - **Root Directory:** `World-Class Warehouse Inventory & Smart POS System/warehouse-pos` (or `warehouse-pos`).  
   - Set `VITE_API_BASE_URL` to the **exact** API URL from step 1 (no trailing slash).  
   - Set other frontend vars from 5.3.  
   - Deploy.

3. **Custom domains (do after app works on .vercel.app)**  
   - **Frontend:** Vercel → frontend project → **Settings** → **Domains** → **Add** → `warehouse.hunnidofficial.com`. Vercel will show a target (e.g. `cname.vercel-dns.com` or an A record).  
   - **API (optional):** Same → API project → **Domains** → add `api.hunnidofficial.com` if you want a short API URL.  
   - **DNS:** At your registrar (where you bought hunnidofficial.com), add the record Vercel shows:  
     - For `warehouse.hunnidofficial.com`: usually a **CNAME** to the value Vercel gives (e.g. `cname.vercel-dns.com`).  
     - For `api.hunnidofficial.com`: same, CNAME to the API project’s target.  
   - Wait for DNS to propagate (minutes to 48h). Then in frontend env set `VITE_API_BASE_URL` to `https://api.hunnidofficial.com` (if you added that domain) and redeploy; in backend `CORS_ORIGINS` add `https://warehouse.hunnidofficial.com` and redeploy. No code changes needed for domains—only Vercel + DNS.

---

## 6.2 Smoke test (in order)

1. Open the frontend URL (e.g. `https://warehouse.hunnidofficial.com` or the Vercel default).
2. **Login as admin:** `admin@hunnidofficial.com` + password you set in Supabase Auth. Expect redirect to dashboard; no CORS or 401 in console.
3. **Warehouse selector:** Should show **Main Jeff** and **Hunnid Main** (not "Main Store" / "Main Town").
4. **Login as jcashier:** `jcashier@hunnidofficial.com` + `POS_PASSWORD_CASHIER_MAIN_STORE` value. Expect POS for **Main Jeff** only; no warehouse picker.
5. **Login as hcashier:** `hcashier@hunnidofficial.com` + `POS_PASSWORD_MAIN_TOWN` value. Expect POS for **Hunnid Main** only.
6. **Network:** In DevTools → Network, confirm API requests go to `VITE_API_BASE_URL` and return 200 (or 401 for unauthenticated); no CORS errors.

---

## Checklist

- [ ] Supabase: Project URL and keys copied (5.1).
- [ ] Backend env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ALLOWED_ADMIN_EMAILS`, `POS_PASSWORD_*`, `CORS_ORIGINS` (5.2).
- [ ] API deployed; URL noted (6.1 step 1).
- [ ] Frontend env: `VITE_API_BASE_URL` = API URL only (5.3, 6.1 step 2).
- [ ] Frontend deployed (6.1 step 2).
- [ ] Smoke test: admin, jcashier, hcashier, warehouse names Main Jeff / Hunnid Main (6.2).
