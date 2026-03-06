# Step 5 — Migrations (EDK → Hunnid DB)

After syncing code (Steps 1–4), ensure the Hunnid Supabase database has any schema and catalog improvements from EDK. This doc lists EDK migrations that Hunnid may not have and how to apply them safely.

## Current state

- **Hunnid** `inventory-server/supabase/migrations/` already includes migrations through `20260306180000_drop_record_sale_payments_breakdown_overload.sql`, plus Hunnid-specific ones (e.g. `20250213000001_atomic_product_inventory_rpc_update.sql`).
- **EDK** has a different path from 20260301 onward: many migrations with timestamps in the 20260301–2026030534 range that Hunnid does not have by the same filename; Hunnid has a different set (20260304*, 20260305* one file, 20260306*).

## EDK migrations from 20260301 onward not in Hunnid (by name)

| Migration | Type | Notes |
|-----------|------|--------|
| 20260301000000_seed_size_codes_big_brand_full_catalog.sql | Seed | Size codes only (XXS, 2XL–5XL, toddler, US/EU/UK footwear). No brand data. Safe to run. |
| 20260301100000_record_sale_insufficient_stock.sql | Schema/RPC | record_sale behavior. |
| 20260301110000_performance_indexes.sql | Schema | Indexes. |
| 20260301120000_receipt_seq.sql | Schema | Receipt sequence. |
| 20260301130000_sold_by_email.sql | Schema | sold_by_email column/usage. |
| 20260302110000_harden_security_definer_executes.sql | Schema | Security. |
| 20260302120000_statement_timeout_30s.sql | Schema | Timeouts. |
| 20260302153000_products_list_perf_indexes.sql | Schema | Product list indexes. |
| 20260302160000_role_statement_timeout_10s.sql | Schema | Timeouts. |
| 20260302170000_sales_orders_indexes_idle_timeout.sql | Schema | Indexes. |
| 20260303100000_size_codes_size_order.sql | Schema | size_codes.sort_order. |
| 20260303120000_user_scopes_user_email_index.sql | Schema | Index. |
| 20260303150000_seed_size_codes_kid_sizes.sql | Seed | Size codes. Safe. |
| 20260304100000_sales_payments_breakdown.sql | Schema | Sales/payments. |
| 20260304110000_rls_all_business_tables.sql | Schema | RLS policies. |
| 20260304120000_warehouse_inventory_stats_rpc.sql | RPC | **Hunnid has 20260304120000_search_and_filter_indexes.sql** — different. Do not overwrite. |
| 20260304130000_warehouse_inventory_stats_derive_qty.sql | Schema/RPC | Stats. |
| 20260304140000_reconcile_warehouse_inventory_from_sizes.sql | Schema | Reconcile. |
| 20260305120000_upsert_by_size_prevent_vanishing.sql | Schema | **Hunnid has 20260305120000_record_sale_harden_deduction.sql** — different. Do not overwrite. |
| 20260305130000_sale_lines_cost_price_at_sale.sql | Schema | sale_lines cost. |
| 20260305140000_record_sale_populate_cost_price.sql | RPC | record_sale. |
| 20260305150000_get_sales_report_rpc.sql | RPC | Report. |
| 20260305160000_seed_size_codes_complete_catalog.sql | Seed | Size codes. Safe. |
| 20260305170000_drop_record_sale_11_param_overload.sql | Schema | Drop overload. |
| 20260305180000_sales_payment_method_check.sql | Schema | Check constraint. |
| 20260305190000_void_sale_restore_stock.sql | RPC | void_sale. |
| 20260305200000_restore_stock_for_already_voided_sales.sql | Data/RPC | One-off fix. |
| 20260305210000_drop_void_sale_two_param_overload.sql | Schema | Drop overload. |
| 20260305220000_clear_sales_and_delivery_history.sql | RPC | Admin. |
| 20260305230000_clear_sales_history_rpc.sql | RPC | Admin. |
| 20260305240000_sync_warehouse_inventory_from_by_size_trigger.sql | Schema | Trigger. |
| 20260305250000_warehouse_dashboard_stats_view.sql | Schema | View. |
| 20260305260000_realtime_publication_tables.sql | Schema | Realtime. |
| 20260305270000_storage_product_images_rls.sql | Schema | Storage RLS. |
| 20260305280000_receive_delivery_rpc.sql | RPC | Deliveries. |
| 20260305290000_pg_cron_nightly_reconcile.sql | Schema | pg_cron. |
| 20260305300000_sales_customer_email_and_receipt.sql | Schema | Sales columns. |
| 20260305310000_warehouses_admin_email.sql | Schema | warehouses.admin_email (low-stock alert). |
| 20260305320000_cron_low_stock_alert_8am.sql | Schema | pg_cron. |
| 20260305330000_sales_warehouse_created_index.sql | Schema | Index. |
| 20260305340000_realtime_anon_select.sql | Schema | Realtime. |

## Timestamp conflicts (do not overwrite Hunnid files)

- **20260304120000** — Hunnid: `search_and_filter_indexes`; EDK: `warehouse_inventory_stats_rpc`. Keep Hunnid; if you need EDK’s stats RPC, add it under a new timestamp (e.g. 20260306190000).
- **20260305120000** — Hunnid: `record_sale_harden_deduction`; EDK: `upsert_by_size_prevent_vanishing`. Keep Hunnid; if you need EDK’s upsert fix, add it under a new timestamp.

## Recommended approach

1. **Back up** the Hunnid Supabase database (or use a staging project) before applying new migrations.
2. **Decide scope**  
   - If you only need specific features (e.g. realtime, low-stock alert, dashboard stats), apply only those EDK migrations (or their SQL) under **new** timestamps after `20260306180000` so they run after existing Hunnid migrations.
3. **Apply in order**  
   - From EDK, copy the `.sql` files you need into `inventory-server/supabase/migrations/` with timestamps **after** `20260306180000` (e.g. `20260306190000_...`, `20260306200000_...`) so they run in the desired order and do not conflict with existing Hunnid migrations.
   - Then run `npx supabase db push` from `inventory-server/` (with Hunnid Supabase project linked), or run the SQL in the Supabase SQL Editor in the same order.
4. **Seeds**  
   - `20260301000000`, `20260303150000`, `20260305160000` are size-code seeds only (no brand). Safe to run as-is or under new timestamps.

## Quick reference: run all EDK 20260301+ SQL in order (optional)

If you want to bring Hunnid in line with EDK schema and are okay resolving any duplicate objects (e.g. RPCs or indexes that already exist under different names in Hunnid):

1. From the EDK repo, copy the list of migration files from `20260301000000` through `20260305340000` (excluding the two that conflict with Hunnid filenames above).
2. Run each file’s contents in the Supabase SQL Editor against the Hunnid project, in timestamp order. Skip or adapt any that fail because the object already exists (e.g. Hunnid may already have equivalent logic from 20260306* migrations).

Step 5 complete. See SYNC_LOG.md for the audit trail.
