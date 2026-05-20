-- Prevent true duplicates: same (name, color, sku) = one product.
-- Run AFTER merging existing true duplicates (phase2 query 10 returns 0 rows).
-- Same name with different color/SKU remains allowed (valid variants).

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_products_identity
  ON warehouse_products (
    lower(trim(name)),
    coalesce(trim(color), ''),
    coalesce(trim(sku), '')
  );

COMMENT ON INDEX idx_warehouse_products_identity IS
  'One product per (name, color, sku). Prevents duplicate creation; same name + different color/SKU allowed.';
