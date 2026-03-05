# Phase 2 — Forensic Audit Report
## Warehouse Inventory & POS — warehouse.hunnidofficial.com

**Stack:** Vite + React (warehouse-pos/) · Next.js API (inventory-server/) · Supabase (PostgreSQL + RLS)

**Audit completed:** Phase 1 codebase read and trace. No code or data changed. Diagnostic SQL below is for you to run in Supabase SQL Editor; results will inform final restoration steps.

---

## DELIVERIES INVESTIGATION

### A. Data model (no separate `deliveries` table)

- **Deliveries are sales** with delivery tracking columns on the **`sales`** table.
- **Schema (sales table, delivery-related):**
  - `delivery_status` text NOT NULL DEFAULT 'delivered' — values: `'delivered' | 'pending' | 'dispatched' | 'cancelled'`
  - `recipient_name`, `recipient_phone`, `delivery_address`, `delivery_notes` text
  - `expected_date` date, `delivered_at` timestamptz, `delivered_by` text
  - Plus standard sale columns: `id`, `warehouse_id`, `receipt_id`, `customer_name`, `payment_method`, `subtotal`, `discount_pct`, `discount_amt`, `total`, `item_count`, `status`, `sold_by`, `sold_by_email`, `created_at`, `voided_at`, `voided_by`, etc.

### B. API that fetches “deliveries”

- **Route:** `GET /api/sales` (inventory-server/app/api/sales/route.ts).
- **Exact Supabase query when Deliveries page loads:**
  - From `sales` with embedded `sale_lines`, ordered by `created_at` desc.
  - Filters applied:
    - `warehouse_id` = value from query param when provided.
    - **When `pending=true`:** `delivery_status IN ('pending', 'dispatched', 'cancelled')` — i.e. **delivered sales are excluded**.
    - When `include_voided=true`, voided sales are included; otherwise `voided_at IS NULL`.
    - Optional `from`/`to` when provided (Deliveries page does not send these).

- **Frontend call (DeliveriesPage):**
  - URL: `${base}/api/sales?limit=200&pending=true&include_voided=true` and `warehouse_id=${currentWarehouseId}` when set.
  - Response: `setDeliveries((json.data ?? []) as Delivery[])`.

### C. Component and empty-state condition

- **Component:** `warehouse-pos/src/pages/DeliveriesPage.tsx` (list from state `deliveries`, filtered by `filter` and `search`).
- **Exact condition for empty state:**
  - `!loading && !error && filtered.length === 0`
  - Message shown:
    - If search active: **"No results"** / "Try a different search"
    - If filter === `'cancelled'`: **"No cancelled deliveries"** / "Cancelled deliveries will appear here"
    - Otherwise: **"No pending deliveries"** / "Deliveries scheduled from the POS will appear here"

So the UI text is **"No pending deliveries"** (not literally "No deliveries scheduled yet"); behavior is the same: the list is empty when there are no rows in the filtered set.

### D. Root cause of “missing deliveries history”

- **By design, the Deliveries page only shows non-delivered sales.**  
  It calls the API with **`pending=true`**, and the API restricts to `delivery_status IN ('pending', 'dispatched', 'cancelled')`. **Sales that have been marked “delivered” are never returned** for this view.
- So:
  - **“Deliveries history has vanished”** = once deliveries are marked delivered, they disappear from this page because the page is intended as a **pending/dispatched/cancelled** queue, not a full history.
  - **“No deliveries scheduled yet”** (or “No pending deliveries”) appears when there are no pending/dispatched/cancelled sales for the selected warehouse (or when the list is empty for other reasons below).

Additional possibilities that can make the list empty even when pending exist:

1. **Wrong or missing `warehouse_id`**  
   If `currentWarehouseId` is empty or not in scope, the API may use `allowedIds` from user scope. If the user’s scope doesn’t include the warehouse where the sales live, or if `warehouse_id` is sent and doesn’t match, those sales won’t appear.

2. **Legacy fallback when DB is missing columns**  
   If the database is missing delivery columns (`delivery_status`, `recipient_name`, etc.), the route falls back to `getSalesLegacy()`. The legacy path **does not** filter by `delivery_status` (it doesn’t select that column), so it returns all sales in range. In that case the list would not be “empty” due to status; it could still be empty due to warehouse/scope or date.

3. **Optimistic removal on “Mark delivered”**  
   When a user marks a delivery as delivered, the frontend removes it from the list immediately:  
   `setDeliveries(prev => prev.filter(d => d.id !== saleId))`. So that delivery “disappears” from the UI by design; it is not shown again because the next fetch still uses `pending=true`.

### E. Diagnostic queries (run in Supabase SQL Editor)

Use these to see actual data status. **Do not modify data.**

```sql
-- How many sales exist total, and how many per delivery_status?
SELECT
  delivery_status,
  COUNT(*) AS count,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM sales
GROUP BY delivery_status
ORDER BY delivery_status;

-- Per warehouse: counts and status mix
SELECT
  warehouse_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE delivery_status = 'pending')   AS pending,
  COUNT(*) FILTER (WHERE delivery_status = 'dispatched')  AS dispatched,
  COUNT(*) FILTER (WHERE delivery_status = 'cancelled')   AS cancelled,
  COUNT(*) FILTER (WHERE delivery_status = 'delivered')    AS delivered,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM sales
GROUP BY warehouse_id;

-- Exact filter the Deliveries page uses (pending=true): how many rows?
-- Replace '<WAREHOUSE_ID>' with a real warehouse uuid, or remove the AND to see total.
SELECT COUNT(*) AS deliveries_page_count
FROM sales
WHERE delivery_status IN ('pending', 'dispatched', 'cancelled')
  AND (voided_at IS NULL OR true)  -- include_voided=true
  -- AND warehouse_id = '<WAREHOUSE_ID>'
;
```

### F. Data status and restoration plan

- **Data status:**  
  Sales (and thus “deliveries”) live in the **`sales`** table. Nothing in the code deletes them when marking delivered; they are only **filtered out** of the Deliveries view by the API when `pending=true`.

- **Restoration plan (visibility, not data restore):**
  1. **If the goal is to see “delivery history” (including delivered):**
     - Add a way to fetch sales with **all** delivery statuses (e.g. a “History” tab or a query param like `pending=false` or `delivery_status=all`).
     - Backend: when that param is set, do **not** apply `delivery_status IN ('pending', 'dispatched', 'cancelled')` (and optionally order by `created_at` desc, limit 200).
     - Frontend: show delivered (and optionally cancelled) in a separate list or tab so “Deliveries” = queue + history.
  2. **If the goal is only to fix “pending list is empty” when there are pending sales:**
     - Verify `warehouse_id` is passed correctly from the frontend (DeliveriesPageRoute passes `currentWarehouseId`).
     - Verify user scope includes that warehouse (GET /api/sales uses `getScopeForUser` and filters by `allowedWarehouseIds` when not unrestricted).
     - Run the diagnostic queries above and confirm that for the warehouse in use, there are rows with `delivery_status IN ('pending', 'dispatched', 'cancelled')`; if they exist, the fix is ensuring the same `warehouse_id` and scope are used in the API call.
  3. **No SQL “restoration” of sales is needed** unless sales rows were actually deleted (e.g. by a bug elsewhere). If they were soft-deleted by a flag not used in this codebase, run the diagnostics first and then we can add a targeted “un-delete” if required.

---

## VANISHING SIZES INVESTIGATION

### A. Write paths that touch product/size data

| Operation | Tables touched | Behavior |
|-----------|----------------|----------|
| **Add new product with sizes** | `warehouse_products`, `warehouse_inventory`, `warehouse_inventory_by_size` | RPC `create_warehouse_product_atomic` or legacy insert; sizes inserted per row. |
| **Edit existing product** | Same | **PUT/PATCH /api/products/:id** → RPC `update_warehouse_product_atomic` or fallback `manualUpdate`. |
| **Edit product sizes/quantities** | Same | Same as edit: RPC receives `p_quantity_by_size` (JSON array of `{ sizeCode, quantity }`). |
| **Complete a POS sale** | `warehouse_inventory_by_size`, `warehouse_inventory`, `sales`, `sale_lines` | `record_sale` RPC: deducts from `warehouse_inventory_by_size` (sized) or `warehouse_inventory` (non-sized), then syncs `warehouse_inventory.quantity` from sum of sizes for sized products. |
| **Receive a delivery** | (No “receive delivery” flow found that adds stock in the repo; orders/deliveries are sales with status. Stock addition would be a separate flow if it exists.) | N/A in current codebase. |
| **Manual stock adjustment** | Same as edit | Via product edit (sizes/quantity) through the same update path. |

### B. Destructive pattern: DELETE + INSERT on sizes

- **RPC `update_warehouse_product_atomic`** (20250219000000_fix_update_atomic_empty_by_size_quantity.sql):
  - When `p_quantity_by_size IS NOT NULL` it runs:
    - `DELETE FROM warehouse_inventory_by_size WHERE warehouse_id = p_warehouse_id AND product_id = p_id`
    - Then inserts one row per entry in `p_quantity_by_size`, or if the array is empty uses `p_quantity` for `warehouse_inventory` only.
  - So **every time the API sends a non-null size list, all existing size rows for that product/warehouse are deleted and replaced** by the list in the request.

- **Fallback `manualUpdate`** (products route):
  - When `sizeRows !== null`: same pattern — `DELETE FROM warehouse_inventory_by_size WHERE ...` then `INSERT` of `sizeRows`. If `sizeRows` is `[]`, this **wipes all sizes** for that product/warehouse.

- **Legacy `updateWarehouseProduct`** (lib/data/warehouseProducts.ts):
  - Unconditionally: `warehouse_inventory_by_size.delete().eq('product_id', productId).eq('warehouse_id', warehouseId)`, then deletes `warehouse_inventory` row, then inserts new `warehouse_inventory` and new size rows. Full **DELETE + INSERT**; any failure or incomplete payload after the delete can leave sizes missing.

So the **root cause of sizes “vanishing”** is the **DELETE + INSERT** pattern: if the frontend (or any client) sends an **incomplete** list of sizes (e.g. only one size when the product has three), or an empty list when it should preserve, the backend deletes all and writes only what was sent, so other sizes disappear. The API does preserve sizes when it receives **no** size list for a sized product (`sizesToWrite = null` and RPC is called with `p_quantity_by_size` null). So the critical risk is **incomplete or wrong `quantityBySize` in the edit payload**.

### C. Diagnostic queries (run in Supabase; adjust if your schema differs)

```sql
-- Products with zero size records (sized products should have rows in warehouse_inventory_by_size)
SELECT
  wp.id,
  wp.name,
  wp.size_kind,
  wi.warehouse_id,
  wi.quantity AS total_quantity,
  COUNT(wis.size_code) AS size_record_count
FROM warehouse_products wp
LEFT JOIN warehouse_inventory wi ON wi.product_id = wp.id
LEFT JOIN warehouse_inventory_by_size wis ON wis.product_id = wp.id AND (wi.warehouse_id IS NULL OR wis.warehouse_id = wi.warehouse_id)
GROUP BY wp.id, wp.name, wp.size_kind, wi.warehouse_id, wi.quantity
HAVING wp.size_kind = 'sized' AND COUNT(wis.size_code) = 0
ORDER BY wp.name;

-- Products where total_quantity != sum of sizes (phantom stock or drift)
SELECT
  wp.id,
  wp.name,
  wi.quantity AS stored_total,
  COALESCE(SUM(wis.quantity), 0)::bigint AS actual_from_sizes,
  (wi.quantity - COALESCE(SUM(wis.quantity), 0)) AS phantom_units
FROM warehouse_products wp
JOIN warehouse_inventory wi ON wi.product_id = wp.id
LEFT JOIN warehouse_inventory_by_size wis ON wis.warehouse_id = wi.warehouse_id AND wis.product_id = wp.id
WHERE wp.size_kind = 'sized'
GROUP BY wp.id, wp.name, wi.quantity
HAVING wi.quantity != COALESCE(SUM(wis.quantity), 0)
ORDER BY phantom_units DESC;

-- Size records with negative or NULL quantity
SELECT wis.*, wp.name AS product_name
FROM warehouse_inventory_by_size wis
JOIN warehouse_products wp ON wp.id = wis.product_id
WHERE wis.quantity < 0 OR wis.quantity IS NULL;

-- Orphaned size records (no parent product)
SELECT wis.*
FROM warehouse_inventory_by_size wis
LEFT JOIN warehouse_products wp ON wp.id = wis.product_id
WHERE wp.id IS NULL;
```

### D. Disappearance triggers (summary)

- **Scheduled job / cron:** None found that clean up inventory.
- **Cascade delete:** `warehouse_inventory_by_size` has `ON DELETE CASCADE` from `warehouse_products(id)`. Deleting a product removes its size rows; normal updates do not delete products.
- **RLS:** No RLS found that hides rows over time by condition.
- **Reconciliation overwriting sizes:** Only in `record_sale`, which syncs `warehouse_inventory.quantity` from the sum of `warehouse_inventory_by_size` for that product/warehouse; it does not delete or insert size rows except indirectly by sale deduction.

So the only identified trigger for sizes vanishing is **edit product** with an incomplete or empty size list (DELETE + INSERT).

### E. Fix plan (for Phase 3, after approval)

1. **Write path:** Prefer **UPSERT** (INSERT ... ON CONFLICT (warehouse_id, product_id, size_code) DO UPDATE) for `warehouse_inventory_by_size` instead of DELETE + INSERT; only delete a size row when the user explicitly removes that size (e.g. size no longer in the payload and a clear “remove size” policy).
2. **total_quantity sync:** After any size quantity change, recalculate `warehouse_inventory.quantity` as SUM of sizes (in DB trigger or same RPC); keep doing this in the DB.
3. **Constraints:** Add `quantity >= 0` and NOT NULL on `size_code` / `product_id` (and any other critical columns) where missing.
4. **Reconciliation migration:** One-time fix for products where `warehouse_inventory.quantity != SUM(warehouse_inventory_by_size.quantity)`; show SQL before running.

---

## REPORTS AND FINANCIALS

### A. Current reports implementation

- **Reports page:** `warehouse-pos/src/pages/Reports.tsx`.
- **Data source:** Sales from **GET /api/sales** (via `fetchSalesAsTransactions`), then **all metrics computed in JavaScript** in `reportService.ts` (`generateSalesReport`, `generateInventoryReport`).
- **No dedicated reports API:** No server-side aggregation (SUM/COUNT/AVG in SQL) for revenue, COGS, or profit; everything is derived from the fetched sales + product list in the client.

### B. Metrics currently shown (and how they are computed)

| Metric | Calculation | Where | Correct? |
|--------|-------------|--------|-----------|
| Total Revenue | Sum of `t.total` over non-voided completed transactions in range | reportService (JS) | Yes for revenue. |
| Total Profit | Per line: `(item.unitPrice - product.costPrice) * item.quantity` using **current** product cost | reportService (JS) | **No** — uses current cost, not cost at time of sale. |
| Total Transactions | Count of transactions in range (voided included in count, excluded from revenue) | reportService (JS) | Yes. |
| Total Voided | Count of voided in range | reportService (JS) | Yes. |
| Total Items Sold | Sum of item quantities, non-voided | reportService (JS) | Yes. |
| Average Order Value | totalRevenue / totalTransactions (with zero check) | reportService (JS) | Yes. |
| Profit Margin % | (totalProfit / totalRevenue) * 100, 1 decimal | SalesMetrics (JS) | Formula correct; profit is wrong because cost is current. |
| Top Selling Products | By quantity and revenue from line items (JS) | reportService (JS) | Revenue correct; profit/cost-based metrics wrong. |
| Sales by Category | Revenue/quantity by product category (JS) | reportService (JS) | Same cost caveat. |
| Sales by Day | Revenue and transaction count per day (JS) | reportService (JS) | Yes. |
| Inventory: totalStockValue | Sum of qty × cost (cost only; 0 if no cost) | reportService (JS) | Correct for current stock at cost. |
| Inventory: low/out of stock | From product list (JS) | reportService (JS) | Depends on product list and quantity/sizes being correct. |

### C. Cost price at time of sale

- **sale_lines** table (from migrations): columns include `sale_id`, `product_id`, `size_code`, `name`, `sku`, `unit_price`, `qty`, `line_total`, `product_image_url`. **There is no `cost_price` or `cost_price_at_time_of_sale` on `sale_lines`.**
- **record_sale** RPC: inserts into `sale_lines` only the above; it does **not** read or store product cost.
- So **historical profit and COGS are not accurate** when product cost changes: the app uses **current** `product.costPrice` for past sales.

**Schema gap:** Add `cost_price` (or `cost_price_at_time_of_sale`) to `sale_lines`, populate it in `record_sale` from `warehouse_products.cost_price` at sale time, and use it for all COGS/profit calculations. For older sales without the column, either backfill from current cost (and flag in UI as estimated) or leave as NULL and treat as 0 in COGS.

### D. Complete financial model vs current state

| Required metric | Formula | Exists? | Notes |
|-----------------|---------|--------|--------|
| Gross Revenue | SUM(selling_price × qty) per line, period | Yes | As sum of line totals / sale total. |
| Total Units Sold | SUM(quantity_sold) | Yes | totalItemsSold. |
| Average Order Value | Revenue / # completed sales | Yes | averageOrderValue. |
| Number of Transactions | COUNT(completed sales) | Yes | totalTransactions. |
| Total COGS | SUM(cost_price × qty) at **time of sale** | No (wrong) | Uses current cost; need cost on sale_lines. |
| Average Cost Per Unit Sold | COGS / Units Sold | No | Depends on COGS. |
| Gross Profit | Revenue − COGS | Partial | Implemented but wrong (current cost). |
| Gross Profit Margin % | (Gross Profit / Revenue) × 100 | Partial | Same. |
| Net Profit (excl. operating costs) | = Gross Profit for now | Same as above | Label and clarity needed. |
| Current Stock Value (at cost) | SUM(cost × current_quantity) | Yes | totalStockValue (cost only). |
| Current Stock Value (at selling) | SUM(selling_price × current_quantity) | Not in spec | Can add. |
| Potential Gross Profit (stock) | Selling value − Cost value | Not in spec | Can add. |
| Total SKUs / units / out of stock / low stock | From inventory | Partially | Dashboard/stats RPC exists; reports use product list. |
| Period comparisons (vs last period) | Revenue/profit/units delta % | No | Missing. |
| Top 5 by revenue / units / margin / slowest | From line-level data | Partially | Top by quantity/revenue exist; margin/slowest need correct cost. |
| Period filters (Today, Week, Month, etc.) | Date filter on sales | Partial | Only custom range in UI; no preset tabs. |
| Sales history table (paginated, expandable, CSV) | List sales + lines | Partial | Sales history exists elsewhere; reports don’t implement full spec. |

### E. Rebuild scope (for Phase 3, after approval)

1. **Schema:** Add `cost_price` to `sale_lines`; migration + backfill strategy; update `record_sale` to set it.
2. **Reports API:** New endpoint(s) that compute revenue, COGS, profit, margin, AOV, etc. in **SQL** (SUM/COUNT/AVG) with period and warehouse filter; exclude voided/cancelled where appropriate.
3. **Reports UI:** Period selector (Today, Week, Month, Last month, 3/6 months, Year, Custom); key metrics row (Revenue, COGS, Gross Profit, Net Profit); inventory snapshot (stock at cost, at selling, potential profit); revenue (and optionally COGS) chart; top products table; sales history table with expandable lines and CSV export; alerts (out of stock, low stock, no cost price).
4. **Accuracy rules:** Store money in smallest unit if desired (or document decimal precision); divide-by-zero checks; NULL cost = 0 for COGS; exclude voided/refunded from revenue/profit; compute in SQL, not by pulling all sales into JS.

---

## CROSS-CUTTING WIRING AUDIT

- **After a delivery is “received” (marked delivered):**  
  Only `delivery_status` (and `delivered_at` / `delivered_by`) are updated on the `sales` row. There is **no “receive delivery” flow** in the repo that adds stock to inventory; deliveries here are **outbound** (sales to be delivered). So “receive delivery” in the sense of “inbound stock” would be a different feature. For **marking a sale as delivered:** inventory was already deducted at sale time; dashboard and reports will reflect that; the delivery disappears from the Deliveries list by design (see above).

- **After a sale:**  
  `record_sale` deducts from `warehouse_inventory_by_size` or `warehouse_inventory` and syncs `warehouse_inventory.quantity` for sized products. Dashboard uses `get_warehouse_stats` and product list; reports use GET /api/sales. So inventory decreases and reports include the sale once it’s in the API response.

- **After editing a product:**  
  Prices and sizes are updated in DB. **Future** sales use the new price/cost; **historical** sales do not (sale_lines store unit_price but not cost_price), so reports that use current product cost for old sales will remain wrong until cost at time of sale is stored and used.

---

## PRIORITY ORDER FOR FIXES

| Priority | Item | Effort (rough) |
|----------|------|----------------|
| P0 — Data loss / visibility | Deliveries “history” visible: add History tab or param to include delivered (and optionally fix warehouse/scope if needed). | Small |
| P0 | Sale_lines cost at time of sale: add column, migration, backfill strategy, update record_sale. | Medium |
| P1 — Broken core flows | Sizes: change product update from DELETE+INSERT to UPSERT for sizes; keep total_quantity sync in DB; add constraints; reconciliation migration. | Medium |
| P1 | Reports: new API that computes revenue/COGS/profit in SQL; use cost at time of sale when available. | Medium |
| P2 — Missing features | Reports UI: full spec (period selector, key metrics, inventory snapshot, chart, top products, sales history table, alerts). | Large |
| P2 | Period presets and period-over-period comparison. | Small–medium |
| P3 — Enhancements | Stock value at selling price; potential profit in stock; CSV export and mobile polish. | Small–medium |

---

## PRODUCT IDENTITY (canonical)

**Same product name with different colors (or SKUs) is valid** — e.g. "Adidas Gazelle" Red vs Black are distinct products. Do not treat as duplicates. True duplicate = same `(name, color, sku)`. See `inventory-server/docs/DATA_INTEGRITY.md` and diagnostic query 10 in `phase2_diagnostic_queries.sql`.

---

## DIAGNOSTIC QUERIES — SUMMARY

Run in **Supabase SQL Editor** (read-only except where noted):

1. **Deliveries:** Sales by `delivery_status` and by `warehouse_id`; count with same filter as Deliveries page (`delivery_status IN ('pending','dispatched','cancelled')`).
2. **Sizes:** Products with `size_kind = 'sized'` and 0 size rows; products where `warehouse_inventory.quantity != SUM(warehouse_inventory_by_size.quantity)`; negative/NULL quantities; orphaned size rows.
3. **Duplicates:** Query 10 flags only potential **true** duplicates (same name + same color + same SKU). Same name + different color = valid variant.

After you run these and share results (or confirm “no problem rows”), Phase 3 can proceed in the order you specified: restore deliveries visibility → fix sizes write path → add cost_price to sale_lines → rebuild reports API → rebuild reports UI → cross-cutting verification.

---

**Awaiting your approval before Phase 3 (no code or DB changes have been made).**
