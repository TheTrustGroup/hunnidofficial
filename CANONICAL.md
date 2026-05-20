# Canonical codebase layout

**Single app root:** `warehouse-pos/`

| Path | Purpose |
|------|---------|
| `warehouse-pos/src/` | React frontend (Vite) |
| `inventory-server/` | Next.js API + Supabase (repo root — Vercel Root Directory) |
| `inventory-server/supabase/migrations/` | Database migrations |

## Deprecated (archived)

Duplicate trees were moved to `_archive/` so work only happens under `warehouse-pos/`:

- `_archive/legacy-root-src/` — former repo-root `src/`
- `_archive/legacy-root-inventory-server/` — former repo-root `inventory-server/`
- `_archive/World-Class-Warehouse-Inventory-Smart-POS-System/` — nested copy

Git history for those paths is preserved via `git mv`.

## Vercel (API project)

**Root Directory:** `inventory-server` (real folder at repo root).

**Frontend** project: Root Directory = `warehouse-pos` (or repo root with root `vercel.json` pointing at `warehouse-pos/dist`).

## User browser data (not lost)

On next app load, `runClientDataMigration()` in `warehouse-pos/src/lib/clientDataMigration.ts`:

1. Copies legacy `warehouse_products` into `warehouse_products_<warehouseId>` when per-warehouse keys are empty.
2. Copies `offline_transactions` from localStorage into IndexedDB sale queue (localStorage is **not** deleted).
3. Sets `hunnid_client_data_migration_v2` when complete.

POS sales that fail due to network/503 are queued in IndexedDB (`warehouse-pos` DB, `pos_event_queue` store) and replayed with `Idempotency-Key` when online.

## Sales (single write path)

- **POS + offline replay:** `POST /api/sales` → `record_sale` (see `inventory-server/docs/SALES_API.md`).
- **Legacy:** `POST /api/transactions` returns **410** in production (`ALLOW_LEGACY_TRANSACTION_POST` must stay unset). See `inventory-server/docs/LEGACY_TRANSACTIONS_SUNSET.md`.
- **Reports:** `GET /api/reports/sales` (SQL via `get_sales_report` RPC). Reports UI does not use browser `localStorage` `transactions` when logged in.

## PWA

- `warehouse-pos/public/manifest.json` — `display: standalone`, installable from home screen.
- `warehouse-pos/public/service-worker.js` — static assets only; bump `CACHE_VERSION` on each production deploy.
- Register SW in production via `src/serviceWorkerRegistration.js` (wired from `main.tsx`).

## Run commands

Always from `warehouse-pos/`:

```bash
cd warehouse-pos && npm install && npm run dev
cd inventory-server && npm install && npm run dev
```

Or from repo root (delegates):

```bash
npm run dev
```
