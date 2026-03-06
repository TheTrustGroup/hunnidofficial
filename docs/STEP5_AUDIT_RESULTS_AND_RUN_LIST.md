# Step 5 — Audit Results & Final Run List

Based on your diagnostic results (queries 1–6 + RLS), here is what Hunnid **already has** vs what we **run**.

---

## What Hunnid already has (SKIP these)

| Category | You have | So we SKIP |
|----------|----------|------------|
| **Triggers** | `trg_enforce_size_rules` on warehouse_inventory_by_size | — |
| **Views** | `v_products_inventory` | — |
| **Functions** | `get_warehouse_stats`, `get_sales_report`, `record_sale` (text + impl), `update_warehouse_product_atomic`, `void_sale`, `get_products_with_sizes`, etc. | EDK migrations that only recreate these (we may still add *new* functions or replace with improved versions where planned) |
| **Indexes** | idx_sales_warehouse_created_at, idx_sale_lines_sale_id, idx_user_scopes_user_email, idx_warehouse_inventory_warehouse_product, idx_warehouse_products_sku/barcode/name/category, idx_size_codes_order, many others | Extra EDK index migrations that create the same or equivalent indexes |
| **Constraints** | sale_lines: `chk_sale_lines_cost_price_non_negative`; warehouse_inventory: `chk_warehouse_inventory_quantity_non_negative` | EDK CHECK(quantity>=0) for warehouse_inventory (by_size may still need one — see below) |
| **Columns** | sales: sold_by_email, payment_mix_breakdown; sale_lines: cost_price; size_codes: size_order (from constraints) | EDK migrations that only add these columns |

---

## What Hunnid is missing (RUN these)

| # | What to run | Creates | Why |
|---|-------------|--------|-----|
| 1 | **20260307000001_warehouse_inventory_stats_rpc.sql** (already in repo) | `get_warehouse_inventory_stats(uuid)` | You have `get_warehouse_stats`; this one derives from by_size for accuracy. Different name → no conflict. |
| 2 | **20260307000002_upsert_by_size_prevent_vanishing.sql** (already in repo) | CHECK(quantity>=0) on **warehouse_inventory_by_size** (if missing) + **replace** `update_warehouse_product_atomic` with UPSERT logic | You have the function but not the “prevent vanishing sizes” behavior. Constraint list has no `warehouse_inventory_by_size_quantity_nonneg`; migration adds it idempotently. |
| 3 | **sync_warehouse_inventory_from_by_size trigger** (from EDK) | Function `sync_warehouse_inventory_from_by_size()` + trigger on `warehouse_inventory_by_size` | You have no such trigger. Keeps `warehouse_inventory.quantity` in sync with sum of by_size. **Critical.** |
| 4 | **warehouse_dashboard_stats view** (from EDK) | View `warehouse_dashboard_stats` | You only have `v_products_inventory`. This view gives one row per warehouse with totals. |
| 5 | **receive_delivery RPC** (from EDK) | `receive_delivery(uuid, uuid, jsonb)` | Not in your function list. Atomic delivery receive. |
| 6 | **warehouses.admin_email** (from EDK) | Column `warehouses.admin_email` | Not in your warehouses columns. For low-stock alert email. |
| 7 | **sales.customer_email** (optional) | Column + record_sale usage | Not in your sales columns. Optional for receipts. |

You do **not** have:
- Trigger: `trigger_sync_warehouse_inventory_from_by_size`
- View: `warehouse_dashboard_stats`
- Function: `get_warehouse_inventory_stats` (you have `get_warehouse_stats`)
- Function: `receive_delivery`
- Column: `warehouses.admin_email`
- Constraint on `warehouse_inventory_by_size`: quantity >= 0 (migration adds it if missing)

---

## Recommended run order (after backup)

Run in this order, one at a time, in **Hunnid** Supabase SQL Editor:

1. **20260307000001_warehouse_inventory_stats_rpc.sql**  
   - File: `inventory-server/supabase/migrations/20260307000001_warehouse_inventory_stats_rpc.sql`  
   - Creates: `get_warehouse_inventory_stats(uuid)`  
   - Risk: Low.

2. **20260307000002_upsert_by_size_prevent_vanishing.sql**  
   - File: `inventory-server/supabase/migrations/20260307000002_upsert_by_size_prevent_vanishing.sql`  
   - Creates: CHECK on by_size (if missing) + replaces `update_warehouse_product_atomic`.  
   - Risk: Low (idempotent / CREATE OR REPLACE).

3. **EDK: sync_warehouse_inventory_from_by_size trigger**  
   - Copy SQL from EDK: `20260305240000_sync_warehouse_inventory_from_by_size_trigger.sql`.  
   - Creates: function + trigger.  
   - Risk: Low.

4. **EDK: warehouse_dashboard_stats view**  
   - Copy SQL from EDK: `20260305250000_warehouse_dashboard_stats_view.sql`.  
   - Creates: view `warehouse_dashboard_stats`.  
   - Risk: Low.

5. **EDK: receive_delivery RPC**  
   - Copy SQL from EDK: `20260305280000_receive_delivery_rpc.sql`.  
   - Creates: `receive_delivery(uuid, uuid, jsonb)`.  
   - Risk: Low.

6. **EDK: warehouses.admin_email**  
   - Copy SQL from EDK: `20260305310000_warehouses_admin_email.sql`.  
   - Creates: column `warehouses.admin_email` (IF NOT EXISTS).  
   - Risk: Low.

Optional later (if you want them):
- receipt_seq (if record_sale uses it and you get errors; you may already have it).
- sales.customer_email + record_sale changes (EDK 20260305300000).
- RLS policies for service_role (only if your API needs them and they’re missing).
- pg_cron jobs (only if pg_cron is enabled).

---

## Summary

- **Skip:** Any migration that only adds objects you already have (indexes, columns, policies you’ve seen in the audit).
- **Run (in order):**  
  1 and 2 from your repo (the two new conflict-resolution migrations),  
  then 3–6 from EDK (trigger, view, receive_delivery, warehouses.admin_email).

Confirm backup (Dashboard or count snapshot), then we can go through each migration one by one and run them.

---

## App usage (after migrations)

- **Dashboard:** `inventory-server/lib/data/dashboardStats.ts` already uses **warehouse_dashboard_stats** view first, then **get_warehouse_inventory_stats** RPC as fallback. No code change needed; GET /api/dashboard will use the new objects automatically.
- **receive_delivery:** The RPC is available for when you add a "receive delivery" flow (e.g. POST /api/deliveries/receive that calls `receive_delivery(p_warehouse_id, p_received_by, p_items)` with `p_items` as `[{ product_id, size_code, quantity }]`). DeliveriesPage currently lists pending/dispatched deliveries; wiring a "Mark as received" action to this RPC would update stock atomically.
