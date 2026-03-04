# Test then deploy — exact order

Do **Part 1 (local test)** first. If it passes, do **Part 2 (deploy)**. Then do **Part 3 (production smoke test)**.

---

# Part 1: Local test

## 1.1 Backend env (inventory-server)

Ensure `inventory-server/.env.local` exists and has (use your real Supabase and passwords):

- `SUPABASE_URL` = your Supabase project URL  
- `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service_role key  
- `SESSION_SECRET` = at least 16 chars (e.g. `openssl rand -hex 24`)  
- `ALLOWED_ADMIN_EMAILS` = `admin@hunnidofficial.com`  
- `POS_PASSWORD_CASHIER_MAIN_STORE` = same as jcashier in Supabase Auth  
- `POS_PASSWORD_MAIN_TOWN` = same as hcashier in Supabase Auth  

CORS for local dev: default allows `http://localhost:5173`; no need to set for local.

## 1.2 Frontend env (local API)

Ensure `warehouse-pos/.env.local` has the **local** API URL so the app talks to your machine, not production:

- `VITE_API_BASE_URL=http://localhost:3001`  
- No trailing slash.

(For production deploy you will set this in Vercel to the real API URL.)

## 1.3 Install dependencies

```bash
cd "World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server"
npm ci
cd ..
npm ci
```

## 1.4 Start API (terminal 1)

```bash
cd "World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server"
npm run dev
```

Leave running. Expect: "Ready on http://localhost:3001" (or similar).

## 1.5 Start frontend (terminal 2)

```bash
cd "World-Class Warehouse Inventory & Smart POS System/warehouse-pos"
npm run dev
```

Leave running. Expect: "Local: http://localhost:5173" (or similar).

## 1.6 Manual test in browser

1. Open **http://localhost:5173**.  
2. **Admin:** Log in with `admin@hunnidofficial.com` and the password you set in Supabase Auth.  
   - Expect: redirect to dashboard; no CORS or 401 in DevTools Console.  
3. **Warehouses:** Confirm the app shows **Main Jeff** and **Hunnid Main** (not "Main Store" / "Main Town").  
4. **POS jcashier:** Log out, log in as `jcashier@hunnidofficial.com` with `POS_PASSWORD_CASHIER_MAIN_STORE` value.  
   - Expect: POS for **Main Jeff** only.  
5. **POS hcashier:** Log out, log in as `hcashier@hunnidofficial.com` with `POS_PASSWORD_MAIN_TOWN` value.  
   - Expect: POS for **Hunnid Main** only.  
6. **Network:** In DevTools → Network, confirm requests go to `http://localhost:3001` and return 200 (or 401 where expected).

If any step fails, fix before deploying.

---

# Part 2: Deploy

## 2.1 Commit and push (if not already)

From project root (e.g. `HunnidOfficial`):

```bash
git add .
git status
git commit -m "Hunnid Official warehouse POS — ready for deploy"
git push origin main
```

Confirm at GitHub that the repo has the latest code. Ensure `.env.local` and `.env` are **not** committed (they should be in `.gitignore`).

## 2.2 Vercel — API project

1. Vercel → **Add New** → **Project** → Import **TheTrustGroup/hunnidofficial**.  
2. **Root Directory:** `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server` (or `warehouse-pos/inventory-server` if that’s the path in your repo).  
3. **Before** deploying, **Settings** → **Environment Variables** → add (Production):

   - `SUPABASE_URL`  
   - `SUPABASE_SERVICE_ROLE_KEY`  
   - `SESSION_SECRET` (new value, e.g. `openssl rand -hex 24`)  
   - `ALLOWED_ADMIN_EMAILS` = `admin@hunnidofficial.com`  
   - `POS_PASSWORD_CASHIER_MAIN_STORE`  
   - `POS_PASSWORD_MAIN_TOWN`  
   - `CORS_ORIGINS` = `https://<frontend-url>.vercel.app` (placeholder; use real frontend URL in 2.4)

4. **Deploy.** Copy the **production URL** (e.g. `https://hunnid-official-server.vercel.app`).

## 2.3 Vercel — Frontend project

1. Vercel → **Add New** → **Project** → Import same repo **TheTrustGroup/hunnidofficial**.  
2. **Root Directory:** `World-Class Warehouse Inventory & Smart POS System/warehouse-pos` (or repo root if the app is at root).  
3. **Before** deploying, **Settings** → **Environment Variables** → add (Production):

   - `VITE_API_BASE_URL` = **exact API URL from 2.2** (no trailing slash)  
   - Optionally: `VITE_APP_NAME` = `Hunnid Official - Warehouse`, `VITE_SUPER_ADMIN_EMAILS` = `admin@hunnidofficial.com`

4. **Deploy.** Copy the **production URL** (e.g. `https://hunnid-official.vercel.app`).

## 2.4 CORS and redeploy API

1. API project → **Settings** → **Environment Variables** → edit `CORS_ORIGINS`: set to the **real** frontend URL from 2.3 (e.g. `https://hunnid-official.vercel.app`). Add `https://warehouse.hunnidofficial.com` if you will use that domain later.  
2. API project → **Deployments** → … on latest → **Redeploy** (so new CORS is used).

---

# Part 3: Production smoke test

1. Open the **frontend** production URL (from 2.3).  
2. **Admin:** Log in with `admin@hunnidofficial.com` + Supabase Auth password. Expect dashboard, no CORS/401.  
3. **Warehouses:** UI shows **Main Jeff** and **Hunnid Main**.  
4. **jcashier:** Log in with `jcashier@hunnidofficial.com` + `POS_PASSWORD_CASHIER_MAIN_STORE` value. Expect Main Jeff POS only.  
5. **hcashier:** Log in with `hcashier@hunnidofficial.com` + `POS_PASSWORD_MAIN_TOWN` value. Expect Hunnid Main POS only.  
6. **Network:** Requests go to the API URL you set in `VITE_API_BASE_URL`; no CORS errors.

After Part 3 passes, you can add custom domains (Vercel + DNS) and update `VITE_API_BASE_URL` / `CORS_ORIGINS` as in STEP5_ENV_AND_DEPLOY.md.
