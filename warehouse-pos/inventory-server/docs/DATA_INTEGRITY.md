# Data integrity (Section 2)

## Implemented

### 1. Atomic sale and no oversell (record_sale)

- **Migration:** `20250228150000_record_sale_atomic_stock.sql`
- **Behaviour:** `record_sale` now:
  1. Deducts stock for every line using **conditional updates** (`WHERE quantity >= v_qty`). If any line would go negative, it raises `INSUFFICIENT_STOCK` and the whole transaction rolls back.
  2. Inserts the sale and sale_lines only after all deductions succeed.
- **Concurrency:** Two cashiers selling the last unit: one succeeds, the other gets `INSUFFICIENT_STOCK` and can retry or show “Insufficient stock” (API returns 409).
- **API:** POST /api/sales returns **409** when the RPC raises INSUFFICIENT_STOCK so the client can show a clear message.

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
