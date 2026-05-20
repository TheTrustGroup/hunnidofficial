-- Recalculate stock value and fix quantity drift
-- Run in Supabase SQL Editor when dashboard figures look wrong (e.g. total stock value shot up).
-- Safe to run multiple times.
--
-- Dashboard "Total Stock Value" = sum(qty × selling_price). If it looks wrong:
-- - Run this script to fix quantity drift (steps 1–2), then use "Recalculate stats" on the dashboard.
-- - Check that selling_price on products is correct (not 100× or wrong currency).
--
-- 1. Fix warehouse_inventory.quantity to match sum of warehouse_inventory_by_size (removes drift).
-- 2. Add missing warehouse_inventory rows for products that have by_size but no summary row.
-- 3. Show current stats from get_warehouse_inventory_stats for each warehouse (verify totals).

-- ── Step 1: Sync warehouse_inventory.quantity from warehouse_inventory_by_size ──
UPDATE warehouse_inventory wi
SET quantity = sub.sum_qty,
    updated_at = now()
FROM (
  SELECT warehouse_id, product_id, COALESCE(SUM(quantity), 0)::int AS sum_qty
  FROM warehouse_inventory_by_size
  GROUP BY warehouse_id, product_id
) sub
WHERE wi.warehouse_id = sub.warehouse_id
  AND wi.product_id = sub.product_id
  AND wi.quantity IS DISTINCT FROM sub.sum_qty;

-- ── Step 2: Insert missing warehouse_inventory rows (product has by_size but no inv row) ──
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

-- ── Step 3: Show current stats per warehouse (verify totals) ──
SELECT
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  s.stock_value_at_cost,
  s.total_stock_value,
  s.total_products,
  s.total_units,
  s.low_stock_count,
  s.out_of_stock_count
FROM warehouses w
CROSS JOIN LATERAL get_warehouse_inventory_stats(w.id) AS s
ORDER BY w.name;

-- Single warehouse: SELECT * FROM get_warehouse_inventory_stats('YOUR_WAREHOUSE_ID'::uuid);
