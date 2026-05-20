# Deploy runbook

## Status

- **Build:** ✅ Verified (`npm run build` succeeds in `warehouse-pos`).
- **Deploy:** Blocked until Vercel CLI is logged in (token invalid/expired).

---

## 1. Log in to Vercel (one-time or after expiry)

In a terminal:

```bash
vercel login
```

Follow the browser or token prompt. Then confirm:

```bash
vercel whoami
```

---

## 2. Deploy

From the **warehouse-pos** directory (repo root for the app):

```bash
cd "/Users/raregem.zillion/Desktop/HunnidOfficial/World-Class Warehouse Inventory & Smart POS System/warehouse-pos"

# Frontend only (Vite app)
./deploy_vercel.sh
```

Or deploy **frontend and API** in one go:

```bash
./deploy_vercel.sh --both
```

Manual equivalent:

```bash
# Frontend
npm run build
vercel --prod --yes

# API (if you use a separate Vercel project for inventory-server)
cd inventory-server && vercel --prod --yes
```

---

## 3. Environment and projects

| App   | Root directory              | Env vars (Vercel dashboard) |
|-------|-----------------------------|------------------------------|
| Frontend | `warehouse-pos`          | `VITE_API_BASE_URL` = API URL (no trailing slash) |
| API   | `warehouse-pos/inventory-server` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS` |

After the first API deploy, set `VITE_API_BASE_URL` on the frontend project and redeploy the frontend so the app talks to the correct API.

---

## 4. Verify

- Frontend: open the production URL from the Vercel dashboard or CLI output.
- API: e.g. `https://<api-host>/api/health` (or your health route).
- Login page: confirm new Hunnid logo and branding.
