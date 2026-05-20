-- Phase 1 Rebirth: Fix total_quantity drift and ensure warehouse_inventory rows exist.
-- Run this in Supabase SQL Editor after deploying the get_warehouse_products_page RPC.
-- Safe to run multiple times.

-- 1. Fix total_quantity drift on warehouse_products (if table has total_quantity column).
--    Skip this block if warehouse_products has no total_quantity column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'warehouse_products' AND column_name = 'total_quantity'
  ) THEN
    UPDATE warehouse_products wp
    SET total_quantity = (
      SELECT COALESCE(SUM(wis.quantity), 0)
      FROM warehouse_inventory_by_size wis
      WHERE wis.product_id = wp.id
        AND wis.warehouse_id = wp.warehouse_id
    )
    WHERE wp.total_quantity IS DISTINCT FROM (
      SELECT COALESCE(SUM(wis.quantity), 0)
      FROM warehouse_inventory_by_size wis
      WHERE wis.product_id = wp.id
        AND wis.warehouse_id = wp.warehouse_id
    );
  END IF;
END $$;

-- 2. Fix warehouse_inventory.quantity drift from sum of warehouse_inventory_by_size.
--    (Hunnid schema: warehouse_products has no warehouse_id; warehouse_inventory is per (warehouse_id, product_id).)
UPDATE warehouse_inventory wi
SET quantity = sub.sum_qty
FROM (
  SELECT warehouse_id, product_id, COALESCE(SUM(quantity), 0)::int AS sum_qty
  FROM warehouse_inventory_by_size
  GROUP BY warehouse_id, product_id
) sub
WHERE wi.warehouse_id = sub.warehouse_id
  AND wi.product_id = sub.product_id
  AND wi.quantity IS DISTINCT FROM sub.sum_qty;

-- 3. Add missing warehouse_inventory rows for any product that has by_size rows but no summary row.
INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
SELECT wis.warehouse_id, wis.product_id, COALESCE(SUM(wis.quantity), 0)::int, now()
FROM warehouse_inventory_by_size wis
LEFT JOIN warehouse_inventory wi
  ON wi.warehouse_id = wis.warehouse_id AND wi.product_id = wis.product_id
WHERE wi.warehouse_id IS NULL
GROUP BY wis.warehouse_id, wis.product_id
ON CONFLICT (warehouse_id, product_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = EXCLUDED.updated_at;
