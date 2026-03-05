-- ============================================================
-- BACKFILL: warehouse_inventory.quantity from warehouse_inventory_by_size
-- ============================================================
-- Purpose: (1) Set warehouse_inventory.quantity = SUM(by_size) per (warehouse_id, product_id).
--          (2) Insert missing warehouse_inventory rows where by_size has data but inv does not.
-- Use: After fixing by_size data or to resync totals (e.g. after query 6 or 9 in phase2_diagnostic_queries).
-- Safety: Single transaction. Idempotent. Rollback on error.
-- Run in Supabase SQL Editor. To roll back: ROLLBACK instead of COMMIT.
-- ============================================================

BEGIN;

-- Step 1: Update existing warehouse_inventory rows where total differs from sum(by_size)
UPDATE public.warehouse_inventory wi
SET
  quantity = COALESCE(s.tot, 0),
  updated_at = now()
FROM (
  SELECT warehouse_id, product_id, SUM(quantity)::int AS tot
  FROM public.warehouse_inventory_by_size
  GROUP BY warehouse_id, product_id
) s
WHERE wi.warehouse_id = s.warehouse_id AND wi.product_id = s.product_id
  AND wi.quantity IS DISTINCT FROM COALESCE(s.tot, 0);

-- Step 2: Insert missing (warehouse_id, product_id) from by_size; upsert to stay idempotent
INSERT INTO public.warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
SELECT warehouse_id, product_id, SUM(quantity)::int, now()
FROM public.warehouse_inventory_by_size
GROUP BY warehouse_id, product_id
ON CONFLICT (warehouse_id, product_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = EXCLUDED.updated_at;

-- Verification: for sized products, warehouse_inventory.quantity should equal sum(by_size)
-- (Run query 6 or 9 in phase2_diagnostic_queries.sql after COMMIT to confirm 0 rows.)

COMMIT;
-- To abort: ROLLBACK;
