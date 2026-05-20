# Canonical codebase layout

**Single app root:** `warehouse-pos/`

| Path | Purpose |
|------|---------|
| `warehouse-pos/src/` | React frontend (Vite) |
| `warehouse-pos/inventory-server/` | Next.js API + Supabase |
| `warehouse-pos/inventory-server/supabase/migrations/` | Database migrations |

## Deprecated (archived)

Duplicate trees were moved to `_archive/` so work only happens under `warehouse-pos/`:

- `_archive/legacy-root-src/` — former repo-root `src/`
- `_archive/legacy-root-inventory-server/` — former repo-root `inventory-server/`
- `_archive/World-Class-Warehouse-Inventory-Smart-POS-System/` — nested copy

Git history for those paths is preserved via `git mv`.

## Vercel (API project)

The repo root has a **symlink** `inventory-server` → `warehouse-pos/inventory-server` so Vercel projects that still use Root Directory `inventory-server` build successfully after consolidation.

Preferred dashboard setting: Root Directory = `warehouse-pos/inventory-server` (symlink then optional).

## User browser data (not lost)

On next app load, `runClientDataMigration()` in `warehouse-pos/src/lib/clientDataMigration.ts`:

1. Copies legacy `warehouse_products` into `warehouse_products_<warehouseId>` when per-warehouse keys are empty.
2. Copies `offline_transactions` from localStorage into IndexedDB sale queue (localStorage is **not** deleted).
3. Sets `hunnid_client_data_migration_v2` when complete.

POS sales that fail due to network/503 are queued in IndexedDB (`warehouse-pos` DB, `pos_event_queue` store) and replayed with `Idempotency-Key` when online.

## Run commands

Always from `warehouse-pos/`:

```bash
cd warehouse-pos && npm install && npm run dev
cd warehouse-pos/inventory-server && npm install && npm run dev
```

Or from repo root (delegates):

```bash
npm run dev
```
