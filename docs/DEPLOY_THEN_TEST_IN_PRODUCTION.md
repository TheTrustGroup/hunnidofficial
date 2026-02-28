# Deploy then test in production — exact order

Execute in this sequence. You will test in production after deploy. No local test required.

---

# Part A: Deploy

## A1. Code in GitHub

From your project root (folder that contains `World-Class Warehouse Inventory & Smart POS System` or `warehouse-pos`):

```bash
cd /Users/raregem.zillion/Desktop/HunnidOfficial
git add .
git status
git commit -m "Hunnid Official warehouse POS"
git branch -M main
git push -u origin https://github.com/TheTrustGroup/hunnidofficial.git main
```

Confirm at https://github.com/TheTrustGroup/hunnidofficial that the code is there. Do not commit `.env.local` or `.env` (must be in `.gitignore`).

---

## A2. Vercel — API project (inventory-server)

1. Go to https://vercel.com → **Add New** → **Project**.
2. **Import** repository: **TheTrustGroup/hunnidofficial**.
3. **Root Directory:** Click **Edit** → set to **`World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server`** (or **`warehouse-pos/inventory-server`** if your repo has that structure). Confirm.
4. **Before** clicking Deploy, open **Environment Variables** (or **Configure**). Add these for **Production** (and Preview if you use it):

   | Name | Value |
   |------|--------|
   | `SUPABASE_URL` | *(from Supabase Dashboard → Settings → API → Project URL)* |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(from Supabase → API → service_role key)* |
   | `SESSION_SECRET` | *(run `openssl rand -hex 24` and paste)* |
   | `ALLOWED_ADMIN_EMAILS` | `admin@hunnidofficial.com` |
   | `POS_PASSWORD_CASHIER_MAIN_STORE` | *(same password as jcashier in Supabase Auth)* |
   | `POS_PASSWORD_MAIN_TOWN` | *(same password as hcashier in Supabase Auth)* |
   | `CORS_ORIGINS` | `https://hunnid-official.vercel.app` *(placeholder; replace in A4 with real frontend URL)* |

5. Click **Deploy**. Wait until the deployment succeeds.
6. Copy the **production URL** (e.g. `https://hunnid-official-server.vercel.app`). You need it for A3.

---

## A3. Vercel — Frontend project (warehouse-pos)

1. **Add New** → **Project** → Import **TheTrustGroup/hunnidofficial** again (second project).
2. **Root Directory:** **`World-Class Warehouse Inventory & Smart POS System/warehouse-pos`** (or **`warehouse-pos`** if that is the app root in the repo).
3. **Before** Deploy, **Environment Variables** → add for **Production**:

   | Name | Value |
   |------|--------|
   | `VITE_API_BASE_URL` | *(exact API URL from A2 step 6 — no trailing slash)* |
   | `VITE_APP_NAME` | `Hunnid Official - Warehouse` *(optional)* |
   | `VITE_SUPER_ADMIN_EMAILS` | `admin@hunnidofficial.com` *(optional)* |

4. Click **Deploy**. Wait until it succeeds.
5. Copy the **frontend production URL** (e.g. `https://hunnid-official.vercel.app`).

---

## A4. CORS — update API and redeploy

1. Open the **API** project in Vercel → **Settings** → **Environment Variables**.
2. Edit **`CORS_ORIGINS`**: set value to the **exact** frontend URL from A3 step 5 (e.g. `https://hunnid-official.vercel.app`). If you will use a custom domain later, add it too: `https://hunnid-official.vercel.app,https://warehouse.hunnidofficial.com`.
3. **Deployments** → open the latest deployment → **⋯** → **Redeploy** (so the new CORS is used). Wait until redeploy finishes.

---

# Part B: Test in production

Use the **frontend** production URL from A3 step 5. Open it in a browser (incognito or logged-out if you want a clean session).

## B1. Admin login

1. Open the frontend URL.
2. Log in with **`admin@hunnidofficial.com`** and the password you set in **Supabase Auth** for that user.
3. **Pass:** You are redirected to the dashboard. No CORS or 401 errors in DevTools → Console. No “Server unreachable” or “Could not reach server” in the UI.

## B2. Warehouses and names

1. In the app (sidebar or warehouse selector), open the list of warehouses.
2. **Pass:** You see **Main Jeff** and **Hunnid Main** (not “Main Store” or “Main Town”).

## B3. POS — jcashier (Main Jeff)

1. Log out (or use an incognito window).
2. Log in with **`jcashier@hunnidofficial.com`** and the password that matches **`POS_PASSWORD_CASHIER_MAIN_STORE`** (the one you set in Vercel for the API project).
3. **Pass:** You land in POS. You are scoped to **Main Jeff** only (no warehouse picker or only Main Jeff). No 401/CORS in Console.

## B4. POS — hcashier (Hunnid Main)

1. Log out (or new incognito).
2. Log in with **`hcashier@hunnidofficial.com`** and the password that matches **`POS_PASSWORD_MAIN_TOWN`**.
3. **Pass:** You land in POS scoped to **Hunnid Main** only. No 401/CORS in Console.

## B5. Network check

1. With the app open, open DevTools → **Network**.
2. Trigger an API call (e.g. switch warehouse, load products, or open a page that fetches).
3. **Pass:** Requests go to the **API** URL you set in `VITE_API_BASE_URL`. Responses are **200** (or **401** where auth is required). No request blocked by CORS.

---

# Part C: After production test passes

- **Custom domain:** Add `warehouse.hunnidofficial.com` (and optionally `api.hunnidofficial.com`) in Vercel → Domains, then add the CNAME records at your DNS provider. After DNS works, set frontend `VITE_API_BASE_URL` to the API domain (if you use one) and add the frontend domain to API `CORS_ORIGINS`; redeploy both.
- **Ongoing:** Keep env vars only in Vercel (and Supabase). Do not commit `.env` or `.env.local`. Rotate `SESSION_SECRET` and Supabase keys if ever exposed.

---

# Checklist (in order)

- [ ] A1 — Code pushed to GitHub
- [ ] A2 — API project created; env vars set; deployed; API URL copied
- [ ] A3 — Frontend project created; `VITE_API_BASE_URL` = API URL; deployed; frontend URL copied
- [ ] A4 — `CORS_ORIGINS` updated to frontend URL; API redeployed
- [ ] B1 — Admin login works
- [ ] B2 — Main Jeff and Hunnid Main visible
- [ ] B3 — jcashier → Main Jeff only
- [ ] B4 — hcashier → Hunnid Main only
- [ ] B5 — Network: API URL and no CORS errors
