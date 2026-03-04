# Supabase scripts

Run in Supabase SQL Editor unless noted.

## Model: one warehouse per location

- **Main Jeff location:** one warehouse only — name **Main Jeff**, code **MAIN** (DC removed).
- **Hunnid Main:** one store + one warehouse, code **MAINTOWN**. **Clothing only** — nothing from Main Jeff should appear here. Sales, deliveries, and inventory are strictly scoped by warehouse; users scoped to Hunnid Main cannot see Main Jeff data (enforced in GET /api/sales and user_scopes).

- **Seed:** `seed_stores_warehouses_dc_maintown.sql` — idempotent; creates Main Jeff (store + MAIN warehouse) and Hunnid Main (store + MAINTOWN warehouse).
- **Consolidation:** Migration `20250222110000_consolidate_main_store_remove_dc.sql` merges DC inventory into MAIN and removes DC. Run once if you had DC.
- **Orphan cleanup:** Migration `20250222100000_clean_orphans_after_main_town_merge.sql` removes inventory/user_scopes for deleted warehouse IDs.

### Rollback (DC consolidation)

There is no safe rollback for `20250222110000_consolidate_main_store_remove_dc.sql` after it has run: DC rows and inventory are deleted and merged into MAIN. If you must re-create DC for testing, re-insert a warehouse with code `DC` and link it to the Main Jeff store; the app will still exclude DC from the warehouse list (see `getWarehouses` and `WarehouseContext`).

## Scripts

| Script | Purpose |
|--------|--------|
| `seed_stores_warehouses_dc_maintown.sql` | Seed Main Jeff (store + MAIN warehouse) and Hunnid Main (store + MAINTOWN). Safe to run multiple times. |
| `verify_user_scopes.sql` | Verify user_scopes: one row per cashier, correct store/warehouse. Run after seed. |
| `backfill_sized_products_missing_size_rows.sql` | Backfill `warehouse_inventory_by_size` for sized products missing size rows. |
| `setup.sql` | Schema/setup (tables, RPC). See project docs. |

## Verification after seed

Run `verify_user_scopes.sql`. Expected:

- `jcashier@hunnidofficial.com` → store **Main Jeff**, warehouse **Main Jeff** (code MAIN)
- `hcashier@hunnidofficial.com` → store **Hunnid Main**, warehouse **Hunnid Main** (code MAINTOWN)
