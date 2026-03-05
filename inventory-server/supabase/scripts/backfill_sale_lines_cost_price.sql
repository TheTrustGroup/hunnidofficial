-- Backfill sale_lines.cost_price from current warehouse_products.cost_price.
-- Run after 20260306110000_sale_lines_cost_price.sql.
-- Legacy rows: cost is best estimate (current product cost). Use for COGS; flag in reports if needed.

UPDATE sale_lines sl
SET cost_price = COALESCE(wp.cost_price, 0)
FROM warehouse_products wp
WHERE wp.id = sl.product_id
  AND sl.cost_price IS NULL;
