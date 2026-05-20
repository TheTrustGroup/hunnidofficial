-- Performance: index for GET /api/products default order (ORDER BY name).
-- List queries use .order('name'); this supports index scan instead of sort.

CREATE INDEX IF NOT EXISTS idx_warehouse_products_name
  ON warehouse_products(name);

COMMENT ON INDEX idx_warehouse_products_name IS 'Default product list order (GET /api/products).';
