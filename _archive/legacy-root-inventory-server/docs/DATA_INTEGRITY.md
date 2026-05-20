# Data integrity (Section 2)

## Product identity and duplicates

**Canonical rule:** Products are **not** uniquely identified by name alone. The same product name can appear for different variants (e.g. **different colors**: "Adidas Gazelle" in Red vs Black). Treat as **one product per** `(name, color, sku)` for duplicate detection.

- **Same name + different color (or different SKU):** Valid. Do not merge or flag as duplicate.
- **Same name + same color + same SKU:** Potential true duplicate; investigate (merge or de-duplicate only after confirming).
- **Schema:** `warehouse_products.name`, `warehouse_products.color` (nullable), `warehouse_products.sku`. Use `color` and `sku` in list/pos and in any duplicate checks.

Diagnostics that look for "duplicate products" must use **(name, color, sku)** (or at least name + color). See `supabase/scripts/phase2_diagnostic_queries.sql` — query 10 flags only potential true duplicates (same name, same color, same SKU).

### Duplicate prevention (constraint)

- **Migration:** `20260306100000_unique_product_identity.sql`
- **Index:** `idx_warehouse_products_identity` UNIQUE on `(lower(trim(name)), coalesce(trim(color), ''), coalesce(trim(sku), ''))`.
- **Effect:** Inserts/updates that would create a second row with the same normalized (name, color, sku) fail with a unique violation. Same name with different color or SKU remains allowed.
- **Prerequisite:** Run **after** merging existing true duplicates (query 10 returns 0 rows). If the migration fails, run the merge script first, then re-run the migration.
- **API:** Ensure POST/PUT product endpoints return a clear response (e.g. 409 Conflict) when the unique constraint is violated, so the client can show "A product with this name, color, and SKU already exists."

### Merge procedure (true duplicates)

**Preferred (all groups in one go):**

1. **Detect:** Run query 10 in `supabase/scripts/phase2_diagnostic_queries.sql`. Any row with `product_count > 1` is a duplicate group.
2. **Merge all:** Run `supabase/scripts/merge_all_true_duplicates.sql`. It finds every duplicate group, keeps the oldest product (by `created_at`) as keeper, and merges all others into it. It updates every table that references `warehouse_products.id`: `transaction_items`, `stock_movements`, `warehouse_inventory`, `warehouse_inventory_by_size`, `sale_lines`, then deletes the duplicate product. No hardcoded IDs. Script is in a single transaction; use `ROLLBACK` to abort.
3. **Verify:** Re-run query 10; expect 0 rows.
4. **Apply constraint:** Run migration `20260306100000_unique_product_identity.sql` (or `npx supabase db push`). If it fails with "Key ... is duplicated", more duplicates exist — run step 2 again (e.g. new data was added), then step 4 again.

**Alternative (specific pairs only):** Use `merge_true_duplicates_dry_run.sql` then `merge_true_duplicates.sql` with a hand-edited `VALUES` list when you only want to merge certain pairs.

---

## Implemented

### 1. Atomic sale and no oversell (record_sale)

- **Migration:** `20250228150000_record_sale_atomic_stock.sql`
- **Behaviour:** `record_sale` now:
  1. Deducts stock for every line using **conditional updates** (`WHERE quantity >= v_qty`). If any line would go negative, it raises `INSUFFICIENT_STOCK` and the whole transaction rolls back.
  2. Inserts the sale and sale_lines only after all deductions succeed.
- **Concurrency:** Two cashiers selling the last unit: one succeeds, the other gets `INSUFFICIENT_STOCK` and can retry or show “Insufficient stock” (API returns 409).
- **API:** POST /api/sales returns **409** when the RPC raises INSUFFICIENT_STOCK so the client can show a clear message.

### 4. Sizes UPSERT and non-negative quantity

- **Migration:** `20260306130000_sizes_upsert_and_constraints.sql`
- **Problem:** Product update previously did DELETE all `warehouse_inventory_by_size` rows then INSERT from payload. Sending a partial or empty size list wiped existing sizes (root cause of "sizes/details disappearing").
- **Behaviour (RPC and API):**
  - **Payload null/undefined (sizes not sent):** Do not change `warehouse_inventory_by_size`; only sync `warehouse_inventory.quantity` when needed.
  - **Payload empty array:** Delete all by-size rows for that (warehouse, product).
  - **Payload non-empty:** UPSERT each (warehouse_id, product_id, size_code) with quantity; then DELETE only rows whose size_code is **not** in the payload. Sizes not mentioned are left unchanged; sizes in the payload are updated or inserted.
- **Constraints:** `chk_warehouse_inventory_by_size_quantity_non_negative` and `chk_warehouse_inventory_quantity_non_negative` enforce `quantity >= 0`. Migration one-time corrects any existing negative values to 0 before adding constraints.
- **Reconciliation:** If `warehouse_inventory.quantity` has drifted from `SUM(warehouse_inventory_by_size.quantity)` (phase2 diagnostic query 6), run `supabase/scripts/backfill_warehouse_inventory_from_by_size.sql` to resync totals from by_size.

### 5. Quantity drift prevention (inv ↔ by_size)

- **Migration:** `20260308100000_drift_prevention_triggers.sql`
- **Problem:** `warehouse_inventory.quantity` can get out of sync with `SUM(warehouse_inventory_by_size.quantity)`, or a product can have quantity only in `warehouse_inventory` with no `warehouse_inventory_by_size` rows. That causes wrong total stock value or the UI not showing quantity (views/API use “by_size when present, else inv”).
- **Behaviour (two triggers):**
  1. **Sync inv from by_size:** On every INSERT/UPDATE/DELETE on `warehouse_inventory_by_size`, set `warehouse_inventory.quantity` = sum of by_size for that (warehouse_id, product_id). So by_size is the source of truth when it has rows.
  2. **Backfill by_size from inv:** On INSERT or UPDATE of `warehouse_inventory.quantity`, if quantity > 0 and there are no `warehouse_inventory_by_size` rows for that (warehouse_id, product_id), insert one row with size_code `'OS'` and that quantity. So “inv-only” state does not persist; UI and views see the quantity.
- **Prerequisite:** Size code `'OS'` must exist in `size_codes` (seed migrations).
- **Fix existing drift:** Run `FIX_DRIFT_BACKFILL_BY_SIZE_FROM_INV.sql` (inv has qty but no by_size) and/or `RECALCULATE_STOCK_VALUE_AND_FIX_DRIFT.sql` (sync inv from by_size), then verify with `VERIFY_TOTAL_STOCK_VALUE.sql` section 4.

### 6. Cost at time of sale (sale_lines.cost_price)

- **Migrations:** `20260306110000_sale_lines_cost_price.sql` (add column), `20260306120000_record_sale_cost_price.sql` (record_sale_impl sets it per line), `20260306170000_sale_lines_cost_price_constraint.sql` (CHECK cost_price >= 0 when not NULL).
- **Behaviour:** Each sale line stores `cost_price` from the product at sale time. COGS and profit in reports must use `sale_lines.cost_price`, not current product cost. Negative cost is forbidden at the DB level.
- **Backfill:** Run `supabase/scripts/backfill_sale_lines_cost_price.sql` once after adding the column. Script is transactional and idempotent; to abort, use `ROLLBACK` instead of `COMMIT`.
- **GET /api/sales:** Returns `costPrice` per line when the column exists.
- **GET /api/reports/sales:** Aggregated sales report from SQL (RPC `get_sales_report`): revenue, COGS (from `sale_lines.cost_price`), profit, AOV, top products, sales by day, by category. Query params: `from`, `to`, `warehouse_id`, `include_voided`. Reports UI prefers this endpoint when authenticated so profit and COGS are correct.

### 2. Other atomic paths

- **process_sale_deductions** (POST /api/inventory/deduct, orders): Uses `deduct_warehouse_inventory` with `WHERE quantity >= p_amount`; raises on insufficient stock. All lines in one transaction.
- **process_sale** (POST /api/transactions): Single RPC: insert transaction + items + deduct + stock_movements. Idempotency key supported to avoid double deduction on retry.

### 3. Manual sale fallback (POST /api/sales)

- Used only when `record_sale` is missing (e.g. wrong DB or RPC not deployed).
- **Not atomic:** Inserts sale and lines, then deducts per line. If a deduction fails mid-loop, the sale and some lines can exist without full stock deduction.
- **Recommendation:** Fix and use the `record_sale` RPC so the fallback is never used. See comment in `app/api/sales/route.ts` above `manualSaleFallback`.

---

## Audit and operations (recommendations)

- **Sales audit:** Each sale is stored in `sales` and `sale_lines` with `created_at`. `sold_by_email` (text) is set from the session when recording a sale (migration 20250228170000_sales_sold_by_email.sql). `voided_by` (text) is set when voiding.
- **Stock movements:** The `process_sale` path writes to `stock_movements`; the `record_sale` path does not. For a single audit model you could add a trigger or extra step to append to a movements table from `sale_lines` if needed.
- **Backups:** Use Supabase project backups (scheduled PITR / daily). No application-level backup is implemented in this repo.
- **Failed / in-progress sales:** If the browser crashes or the connection drops after the client sent the request but before the response, the server either committed the sale (then the sale exists; idempotency or “find my last sale” would need to be added to avoid double-charge) or did not (client can retry). No draft/pending basket is persisted server-side.

---

## Applying the migration

From `inventory-server`:

```bash
npx supabase db push
```

Or run the SQL in `supabase/migrations/20250228150000_record_sale_atomic_stock.sql` in the Supabase SQL Editor.

## Scripts: run order and safety

- **Backfills** (`supabase/scripts/`): Each backfill runs in a single transaction. To roll back, run the script and before it completes replace `COMMIT` with `ROLLBACK` in the script, or run in a session where you issue `ROLLBACK` after the script (if the script leaves the transaction open). Prefer running backfills during a maintenance window; verify with the suggested diagnostic queries afterward.
  - `backfill_sale_lines_cost_price.sql`: After `20260306110000_sale_lines_cost_price.sql`. Idempotent (only updates rows where `cost_price IS NULL`).
  - `backfill_warehouse_inventory_from_by_size.sql`: After fixing or resyncing by_size data (e.g. following phase2 query 6/9). Idempotent.
- **Merge** (`merge_all_true_duplicates.sql`): Run only after confirming true duplicates (phase2 query 10). Updates all FKs pointing to `warehouse_products` (including `transaction_items`, `stock_movements`) before deleting; skips those tables if they do not exist. Single transaction; use `ROLLBACK` to abort. Then run migration `20260306100000_unique_product_identity.sql`.
