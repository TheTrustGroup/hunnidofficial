-- ============================================================
-- BACKFILL: sale_lines.cost_price from warehouse_products.cost_price
-- ============================================================
-- Prerequisite: Migration 20260306110000_sale_lines_cost_price.sql applied.
-- Purpose: Set cost_price for existing sale_lines where NULL (legacy rows).
--          Uses current product cost as best estimate; reports may flag "legacy" if needed.
-- Safety: Single transaction. Rollback on error. Idempotent (only updates WHERE cost_price IS NULL).
-- Run in Supabase SQL Editor. To roll back: do not COMMIT; use ROLLBACK instead.
-- ============================================================

BEGIN;

-- Pre-count: rows that will be updated (informational)
DO $$
DECLARE
  v_count bigint;
BEGIN
  SELECT count(*) INTO v_count
  FROM sale_lines sl
  JOIN warehouse_products wp ON wp.id = sl.product_id
  WHERE sl.cost_price IS NULL;
  RAISE NOTICE 'Rows to update (sale_lines with NULL cost_price and known product): %', v_count;
END;
$$;

-- Backfill
UPDATE sale_lines sl
SET cost_price = COALESCE(wp.cost_price, 0)
FROM warehouse_products wp
WHERE wp.id = sl.product_id
  AND sl.cost_price IS NULL;

-- Verification: expect 0 rows with NULL cost_price where product exists
DO $$
DECLARE
  v_remaining bigint;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM sale_lines sl
  JOIN warehouse_products wp ON wp.id = sl.product_id
  WHERE sl.cost_price IS NULL;
  IF v_remaining > 0 THEN
    RAISE WARNING 'Verification: % sale_lines still have NULL cost_price (product exists).', v_remaining;
  ELSE
    RAISE NOTICE 'Verification: all sale_lines with known product now have cost_price set.';
  END IF;
END;
$$;

COMMIT;
-- To abort instead: ROLLBACK;
