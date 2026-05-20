# Deploy API (inventory-server) — right project

Deploy **only from this folder** (`inventory-server/`). This app is the **backend API** (Next.js); it must be a **separate Vercel project** from the frontend.

## Target project

| What | Value |
|------|--------|
| **App** | Backend API (Next.js) — `/api/sales`, `/api/products`, `/api/warehouses`, etc. |
| **Vercel Root Directory** | `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server` (or your repo path to this folder) |
| **Production URL** | `https://api.hunnidofficial.com` and/or `https://<project>.vercel.app` (e.g. `hunnid-official-server`) |
| **Not** | The frontend project (warehouse UI). That one has a different root and builds the React app. |

## Ensure you’re linked to the API project

1. **From this directory** (`inventory-server/`):
   ```bash
   cd "World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server"
   vercel link
   ```
2. When prompted:
   - **Set up and deploy?** — Yes.
   - **Which scope?** — Choose the team/account that owns the API (e.g. TheTrustGroup or your user).
   - **Link to existing project?** — **Yes**.
   - **What’s the name of your existing project?** — Choose the **API** project (the one whose root is this folder), e.g. `hunnid-official-server` or the name you gave the API project. **Do not** pick the frontend project.
3. This creates `.vercel/project.json` (gitignored). Future `vercel` commands from this folder use that project.

## Verify link (optional)

```bash
# From inventory-server/
vercel project ls
# Pick the API project if you have to relink.

cat .vercel/project.json
# Should show "projectId" and "orgId" for the API project.
```

## Clean build and deploy

```bash
cd "World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server"
rm -rf .next
npm run build
vercel --prod
```

## After deploy — sanity check

```bash
curl -s https://api.hunnidofficial.com/api/health
# Expect: {"status":"ok",...} or similar (200).
```

If you use a different API URL (e.g. `https://hunnid-official-server.vercel.app`), use that in the curl and in the frontend `VITE_API_BASE_URL`.
