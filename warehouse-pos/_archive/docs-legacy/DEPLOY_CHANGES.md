# How to deploy changes (API + frontend)

You have **two Vercel projects** for Hunnid Official:

| Project              | What it is     | Domain                      | Deploys when        |
|----------------------|----------------|-----------------------------|----------------------|
| **hunnidofficial**   | Backend API    | `api.hunnidofficial.com`    | You push to `main`   |
| **hunnidofficial-mb6h** | Frontend UI | `warehouse.hunnidofficial.com` | You push to `main` |

Both are connected to Git and set to **deploy on push to the main branch**.

---

## Deploying your changes (simple flow)

1. **Make your code changes** (API in `inventory-server/`, frontend in `src/`, etc.).

2. **Commit and push to `main`:**
   ```bash
   cd "World-Class Warehouse Inventory & Smart POS System/warehouse-pos"
   git add -A
   git status
   git commit -m "Your short description of the change"
   git push origin main
   ```

3. **Vercel does the rest:**
   - The **API** project (hunnidofficial) builds from its root (e.g. `inventory-server`) and deploys to api.hunnidofficial.com.
   - The **Frontend** project (hunnidofficial-mb6h) builds from its root and deploys to warehouse.hunnidofficial.com.

One push to `main` can trigger both deployments if both projects are linked to the same repo (with different Root Directories in Vercel).

---

## If you only changed one side

- **Only API** (e.g. `inventory-server/`): push to `main` → only the API project will rebuild (Vercel still runs both builds, but the frontend build will be unchanged).
- **Only frontend** (e.g. `src/`, `index.html`): push to `main` → only the frontend project will have meaningful changes.

You don’t have to do anything different; just push. Each project builds from its own Root Directory.

---

## Check that the right repo is linked

- **hunnidofficial** (API): Vercel → Project **hunnidofficial** → **Settings** → **Git** → confirm repo + **Root Directory** (e.g. `inventory-server` or `.../warehouse-pos/inventory-server`).
- **hunnidofficial-mb6h** (frontend): Same → **Settings** → **Git** → confirm repo + **Root Directory** (e.g. `warehouse-pos` or the folder that contains the frontend).

---

## Summary

**To deploy:** commit your changes, then **push to the main branch**. No need to run `vercel` from the CLI for normal deploys; Git push is enough.
