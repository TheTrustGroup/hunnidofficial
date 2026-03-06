# Step 5 — Migration Action Table (Step A)

**Diagnostic used:** You pasted the result of **diagnostic query 8 only** (RLS status on tables). That confirms these **15 tables** exist in Hunnid and have RLS enabled:

`durability_log`, `sale_lines`, `sales`, `size_codes`, `stock_movements`, `stores`, `sync_rejections`, `transaction_items`, `transactions`, `user_scopes`, `warehouse_inventory`, `warehouse_inventory_by_size`, `warehouse_products`, `warehouses`

**To turn "❌ ASSUMED MISSING" into "✅ SKIP" where the object already exists:** Run queries **1–4 and 6** from `inventory-server/supabase/scripts/audit_schema_hunnid.sql` in the Hunnid Supabase SQL Editor and paste the results. Then we can reclassify any migration whose object (trigger, view, function, index, column) already appears there.

---

## Migration action table

| # | MIGRATION | TYPE | CREATES (object name) | STATUS | ACTION |
|---|-----------|------|------------------------|--------|--------|
| 1 | 20260301000000_seed_size_codes_big_brand_full_catalog.sql | Seed | size_codes rows (XXS, 2XL–5XL, toddler, US/EU/UK) | ⚠️ PARTIAL | **Review** — Hunnid has size_codes (table exists). Run if you want extended catalog; safe INSERTs with ON CONFLICT. |
| 2 | 20260301100000_record_sale_insufficient_stock.sql | RPC | record_sale (behavior: insufficient stock) | ⚠️ PARTIAL | **Review** — Hunnid has record_sale (20260305120000, 20260304160000). Compare EDK vs Hunnid for insufficient-stock handling. |
| 3 | 20260301110000_performance_indexes.sql | Schema | idx_warehouse_inventory_*, idx_sales_*, idx_warehouse_products_* | ❌ ASSUMED MISSING | **Run** (or skip if indexes exist — need query 4). Use new timestamp after 20260306180000. |
| 4 | 20260301120000_receipt_seq.sql | Schema | sequence receipt_seq | ❌ ASSUMED MISSING | **Run** — record_sale uses it; if sequence exists, CREATE SEQUENCE IF NOT EXISTS is no-op. Low risk. |
| 5 | 20260301130000_sold_by_email.sql | Schema | sales.sold_by_email column + record_sale | ⚠️ PARTIAL | **Review** — Hunnid has 20250228170000_sales_sold_by_email. Column may exist; confirm with query 6. |
| 6 | 20260302110000_harden_security_definer_executes.sql | Schema | (security definer / search_path on functions) | ❌ ASSUMED MISSING | **Run** — hardening only. Need to inspect SQL to avoid overwriting Hunnid functions. |
| 7 | 20260302120000_statement_timeout_30s.sql | Schema | statement_timeout | ❌ ASSUMED MISSING | **Run** — session/role setting. Low risk. |
| 8 | 20260302153000_products_list_perf_indexes.sql | Schema | idx_warehouse_inventory_warehouse_id_product_id, idx_wibs_*, idx_size_codes_size_code, idx_warehouse_products_name | ❌ ASSUMED MISSING | **Run** — IF NOT EXISTS in EDK. Overlap with Hunnid 20260304120000_search_and_filter_indexes; may duplicate some indexes. |
| 9 | 20260302160000_role_statement_timeout_10s.sql | Schema | role timeout | ❌ ASSUMED MISSING | **Run** — Low risk. |
| 10 | 20260302170000_sales_orders_indexes_idle_timeout.sql | Schema | idx_sales_warehouse_created, idx_sales_warehouse_status, idx_sale_lines_*, idx_orders_warehouse_created | ❌ ASSUMED MISSING | **Run** — IF NOT EXISTS. Hunnid 20260304120000 has idx_sales_warehouse_created_at; check for duplicate names. |
| 11 | 20260303100000_size_codes_size_order.sql | Schema | size_codes.size_order column | ❌ ASSUMED MISSING | **Run** — ADD COLUMN. Confirm with query 6 if size_codes has size_order. |
| 12 | 20260303120000_user_scopes_user_email_index.sql | Schema | idx_user_scopes_user_email | ❌ ASSUMED MISSING | **Run** — CREATE INDEX IF NOT EXISTS. Low risk. |
| 13 | 20260303150000_seed_size_codes_kid_sizes.sql | Seed | size_codes rows (kid sizes) | ⚠️ PARTIAL | **Review** — Hunnid has size_codes. Safe seed; run if kid sizes missing. |
| 14 | 20260304100000_sales_payments_breakdown.sql | Schema | sales.payments_breakdown + record_sale | ⚠️ PARTIAL | **Review** — Hunnid has 20250228180000_sales_payment_mix_breakdown. Column name may differ; confirm with query 6. |
| 15 | 20260304110000_rls_all_business_tables.sql | Schema | Policies: service_role_warehouse_products, service_role_warehouse_inventory, … | ✅ LIKELY EXISTS | **Skip** — Your query 8 shows RLS enabled on all those tables. Policies may already exist; run query 1 or policy list to confirm. If missing, run. |
| 16 | 20260304120000_warehouse_inventory_stats_rpc.sql | RPC | get_warehouse_inventory_stats(uuid) | 🔴 TIMESTAMP CONFLICT | **New timestamp** — See Step B. Hunnid has 20260304120000_search_and_filter_indexes. Add EDK RPC as 20260307000001_warehouse_inventory_stats_rpc.sql. |
| 17 | 20260304130000_warehouse_inventory_stats_derive_qty.sql | RPC | get_warehouse_inventory_stats (derive qty from by_size) | ❌ ASSUMED MISSING | **Run** — Replaces/upgrades get_warehouse_inventory_stats. Run after 20260307000001 if you add that. |
| 18 | 20260304140000_reconcile_warehouse_inventory_from_sizes.sql | Schema | (reconcile function/script) | ❌ ASSUMED MISSING | **Run** — Reconcile logic. |
| 19 | 20260305120000_upsert_by_size_prevent_vanishing.sql | Schema | update_warehouse_product_atomic + CHECK(quantity>=0) | 🔴 TIMESTAMP CONFLICT | **New timestamp** — See Step B. Hunnid has 20260305120000_record_sale_harden_deduction. Add EDK as 20260307000002_upsert_by_size_prevent_vanishing.sql. |
| 20 | 20260305130000_sale_lines_cost_price_at_sale.sql | Schema | sale_lines.cost_price column | ⚠️ PARTIAL | **Review** — Hunnid has 20260306110000_sale_lines_cost_price.sql, 20260306120000_record_sale_cost_price. May already exist; confirm with query 6. |
| 21 | 20260305140000_record_sale_populate_cost_price.sql | RPC | record_sale (populate cost_price) | ⚠️ PARTIAL | **Review** — Hunnid has 20260306120000_record_sale_cost_price. Likely already covered. |
| 22 | 20260305150000_get_sales_report_rpc.sql | RPC | get_sales_report | ⚠️ PARTIAL | **Review** — Hunnid has 20260306150000_get_sales_report_rpc.sql. May be same or different; compare. |
| 23 | 20260305160000_seed_size_codes_complete_catalog.sql | Seed | size_codes rows + size_order | ⚠️ PARTIAL | **Review** — Safe seed. Run if catalog gaps. |
| 24 | 20260305170000_drop_record_sale_11_param_overload.sql | Schema | DROP overload of record_sale | ⚠️ PARTIAL | **Review** — Hunnid has 20260306180000_drop_record_sale_payments_breakdown_overload. Confirm overloads. |
| 25 | 20260305180000_sales_payment_method_check.sql | Schema | Check constraint on sales (payment_method) | ❌ ASSUMED MISSING | **Run** — Constraint. Low risk. |
| 26 | 20260305190000_void_sale_restore_stock.sql | RPC | void_sale(p_sale_id uuid) | ❌ ASSUMED MISSING | **Run** — Critical for void + stock restore. |
| 27 | 20260305200000_restore_stock_for_already_voided_sales.sql | Data/RPC | sales.stock_restored_at + void_sale update | ❌ ASSUMED MISSING | **Run** — One-off + function. Data-modifying; show rows affected before run. |
| 28 | 20260305210000_drop_void_sale_two_param_overload.sql | Schema | DROP overload | ❌ ASSUMED MISSING | **Run** — Only if void_sale has two-param overload. |
| 29 | 20260305220000_clear_sales_and_delivery_history.sql | RPC | clear_sales_and_delivery_history or similar | ❌ ASSUMED MISSING | **Run** — Admin RPC. |
| 30 | 20260305230000_clear_sales_history_rpc.sql | RPC | clear_sales_history() | ❌ ASSUMED MISSING | **Run** — Admin RPC. |
| 31 | 20260305240000_sync_warehouse_inventory_from_by_size_trigger.sql | Schema | sync_warehouse_inventory_from_by_size() + trigger_sync_warehouse_inventory_from_by_size | ❌ ASSUMED MISSING | **Run** — **CRITICAL.** total_quantity sync at DB level; prevents vanishing sizes. |
| 32 | 20260305250000_warehouse_dashboard_stats_view.sql | Schema | view warehouse_dashboard_stats | ❌ ASSUMED MISSING | **Run** — **CRITICAL.** Dashboard stats accuracy. |
| 33 | 20260305260000_realtime_publication_tables.sql | Schema | Realtime publication | ❌ ASSUMED MISSING | **Run** — If you use Realtime. |
| 34 | 20260305270000_storage_product_images_rls.sql | Schema | Storage policies (product images) | ❌ ASSUMED MISSING | **Run** — If you use storage for product images. |
| 35 | 20260305280000_receive_delivery_rpc.sql | RPC | receive_delivery(...) | ❌ ASSUMED MISSING | **Run** — **CRITICAL.** Atomic delivery stock updates. |
| 36 | 20260305290000_pg_cron_nightly_reconcile.sql | Schema | cron job | ❌ ASSUMED MISSING | **Run** — Only if pg_cron enabled. |
| 37 | 20260305300000_sales_customer_email_and_receipt.sql | Schema | sales.customer_email + record_sale | ❌ ASSUMED MISSING | **Run** — Column + RPC. Confirm column with query 6. |
| 38 | 20260305310000_warehouses_admin_email.sql | Schema | warehouses.admin_email | ❌ ASSUMED MISSING | **Run** — ADD COLUMN IF NOT EXISTS. Low-stock alert email. |
| 39 | 20260305320000_cron_low_stock_alert_8am.sql | Schema | cron job | ❌ ASSUMED MISSING | **Run** — Only if pg_cron enabled. |
| 40 | 20260305330000_sales_warehouse_created_index.sql | Schema | idx_sales_created_at_warehouse_id_desc + get_today_sales_by_warehouse | ❌ ASSUMED MISSING | **Run** — Index + function. Hunnid may have similar index; IF NOT EXISTS. |
| 41 | 20260305340000_realtime_anon_select.sql | Schema | anon_select_*_realtime policies | ❌ ASSUMED MISSING | **Run** — Only if using Realtime with anon. |

---

## Summary by status

| Status | Count | Meaning |
|--------|-------|--------|
| ✅ LIKELY EXISTS | 1 | RLS policies — query 8 suggests RLS on all business tables; confirm with policy list. |
| ⚠️ PARTIAL | 11 | Hunnid has equivalent or same-name object; compare or confirm with queries 1–4, 6 before run. |
| 🔴 TIMESTAMP CONFLICT | 2 | Keep Hunnid files; add EDK version under new timestamps (Step B). |
| ❌ ASSUMED MISSING | 27 | Run (with new timestamps where needed) unless diagnostics show object exists. |

---

## Step B — Resolve timestamp conflicts

**CONFLICT 1:** Hunnid `20260304120000_search_and_filter_indexes` | EDK `20260304120000_warehouse_inventory_stats_rpc`

- **Resolution:** Keep Hunnid’s migration unchanged. EDK’s RPC added under new timestamp.
- **New file in Hunnid repo:** `inventory-server/supabase/migrations/20260307000001_warehouse_inventory_stats_rpc.sql`
- **Creates:** `get_warehouse_inventory_stats(p_warehouse_id uuid)` (TABLE return). Does **not** duplicate Hunnid’s `get_warehouse_stats(uuid)` (different name, returns json). Safe to run.

**CONFLICT 2:** Hunnid `20260305120000_record_sale_harden_deduction` | EDK `20260305120000_upsert_by_size_prevent_vanishing`

- **Resolution:** Keep Hunnid’s migration unchanged. EDK’s upsert logic added under new timestamp.
- **New file in Hunnid repo:** `inventory-server/supabase/migrations/20260307000002_upsert_by_size_prevent_vanishing.sql`
- **Creates:** CHECK(quantity >= 0) on `warehouse_inventory_by_size` and `warehouse_inventory` (idempotent); `CREATE OR REPLACE` for `update_warehouse_product_atomic(...)`. Replaces existing function with UPSERT-by-size behavior; no duplicate object.

Both new migration files have been created in the Hunnid repo. Review the SQL in those files before running.

---

## Step C — Approved run order (for Hunnid DB)

Run **only after** you confirm backup (Step D). One migration at a time: show SQL → you approve → run → verify → log.

**Priority = CRITICAL first, then HIGH, then the rest in timestamp order.** Optional/review items are listed but can be skipped or run later.

### RUN ORDER (critical / high first)

| Order | Migration file | Type | Creates | Depends on | Risk | SQL preview |
|-------|----------------|------|---------|------------|------|--------------|
| 1 | 20260307000001_warehouse_inventory_stats_rpc.sql | RPC | get_warehouse_inventory_stats(uuid) | — | Low | CREATE OR REPLACE FUNCTION get_warehouse_inventory_stats... |
| 2 | 20260307000002_upsert_by_size_prevent_vanishing.sql | Schema/RPC | CHECK constraints + update_warehouse_product_atomic | — | Medium | DO $$ ... CHECK(quantity>=0); CREATE OR REPLACE FUNCTION update_warehouse_product_atomic... |
| 3 | (EDK) 20260305240000_sync_warehouse_inventory_from_by_size_trigger.sql | Trigger | sync_warehouse_inventory_from_by_size() + trigger | — | Low | CREATE OR REPLACE FUNCTION sync_warehouse_inventory_from_by_size() ... CREATE TRIGGER trigger_sync_... |
| 4 | (EDK) 20260305250000_warehouse_dashboard_stats_view.sql | View | warehouse_dashboard_stats | — | Low | CREATE OR REPLACE VIEW warehouse_dashboard_stats AS ... |
| 5 | (EDK) 20260305280000_receive_delivery_rpc.sql | RPC | receive_delivery(uuid,uuid,jsonb) | Trigger from #3 | Low | CREATE OR REPLACE FUNCTION receive_delivery(...) ... |
| 6 | (EDK) 20260301120000_receipt_seq.sql | Schema | sequence receipt_seq | — | Low | CREATE SEQUENCE IF NOT EXISTS receipt_seq; |
| 7 | (EDK) 20260305310000_warehouses_admin_email.sql | Schema | warehouses.admin_email | — | Low | ALTER TABLE warehouses ADD COLUMN admin_email text; (IF NOT EXISTS) |
| 8 | (EDK) 20260304110000_rls_all_business_tables.sql | Schema | service_role policies | — | Low | CREATE POLICY "service_role_warehouse_products" ... (only if missing) |
| 9+ | Remaining EDK migrations (indexes, timeouts, seeds, void_sale, etc.) | Various | See action table | Various | Low–Medium | Run in EDK timestamp order after above; skip any that fail with "already exists". |

**Notes:**

- **#3–5** are not in the Hunnid repo as files; copy SQL from EDK repo or run from EDK migration file contents in Supabase SQL Editor. Order matters: trigger before receive_delivery.
- **#8:** Only run if policies are missing (check with `SELECT policyname FROM pg_policies WHERE tablename = 'warehouse_products';` etc.).
- **Seeds (20260301*, 20260303150000, 20260305160000):** Safe to run; use IF NOT EXISTS / ON CONFLICT where applicable.
- **void_sale, get_sales_report, clear_sales_history:** Run EDK versions only if Hunnid doesn’t already have equivalent (confirm with query 3).

### SKIP LIST (do not run)

- **20260304120000** — Keep Hunnid’s `search_and_filter_indexes`; EDK version applied as 20260307000001.
- **20260305120000** — Keep Hunnid’s `record_sale_harden_deduction`; EDK version applied as 20260307000002.
- Any migration whose object **already exists** in Hunnid (verify with queries 1–4, 6 from `audit_schema_hunnid.sql` before running).

---

## Step D — Backup first (run before ANY migration)

**Option 1 — Supabase Dashboard**

1. Supabase Dashboard → Hunnid project → **Settings** → **Database** → **Backups**.
2. Click **Create backup** or confirm a recent automatic backup (e.g. within last 24 hours).
3. Note or screenshot that the backup exists.

**Option 2 — Manual snapshot (counts)**

Run in Hunnid Supabase SQL Editor and **save the results**:

```sql
SELECT 'sales' AS tbl, COUNT(*) FROM sales
UNION ALL SELECT 'warehouse_products', COUNT(*) FROM warehouse_products
UNION ALL SELECT 'warehouse_inventory_by_size', COUNT(*) FROM warehouse_inventory_by_size
UNION ALL SELECT 'deliveries', COUNT(*) FROM deliveries;
```

(If `deliveries` does not exist, omit that line or use a different table you care about.)

After **all** migrations, run the same query again. Counts for existing tables should match (unless a migration intentionally truncates or migrates data). If any count drops unexpectedly, stop and investigate.

**Confirm backup or snapshot before proceeding to Step E.**

---

## Step E — Apply one at a time (after you approve run order)

For each migration in the approved run order:

1. Show the **full SQL** again.
2. Confirm: *"This will run on **HUNNID** project. Connected to: [your Hunnid Supabase project URL]."*
3. Wait for your **"run it"**.
4. Execute in Supabase SQL Editor.
5. Report result: success message or full error.
6. Run verification query (e.g. `SELECT proname FROM pg_proc WHERE proname = 'get_warehouse_inventory_stats';` for RPCs).
7. Log in SYNC_LOG.md: `[STEP 5] Migration [name] — applied ✅`
8. Proceed to next only after your confirmation.

**If any migration fails:** Stop. Do not continue. Show full error, what the migration was doing, and propose a fix or skip; wait for your decision.
