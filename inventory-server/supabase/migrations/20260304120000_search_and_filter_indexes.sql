-- Search and filter indexes for product list, inventory lookups, and sales list.
-- All indexes use IF NOT EXISTS so the migration is safe to run on existing DBs.

-- warehouse_products: search by sku/barcode and order by name (list + search)
CREATE INDEX IF NOT EXISTS idx_warehouse_products_sku ON warehouse_products(sku);
CREATE INDEX IF NOT EXISTS idx_warehouse_products_barcode ON warehouse_products(barcode);

-- warehouse_inventory: filter by warehouse and lookup by product (list products at warehouse, stock deduction)
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_warehouse_id ON warehouse_inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_product_id ON warehouse_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_warehouse_product ON warehouse_inventory(warehouse_id, product_id);

-- warehouse_inventory_by_size: filter by warehouse/product/size (list, stock by size, record_sale deduction)
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_by_size_warehouse_id ON warehouse_inventory_by_size(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_by_size_product_id ON warehouse_inventory_by_size(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_by_size_warehouse_product ON warehouse_inventory_by_size(warehouse_id, product_id);

-- sales: list by warehouse and by date (GET /api/sales with warehouse_id, from, to, order by created_at desc)
CREATE INDEX IF NOT EXISTS idx_sales_warehouse_id ON sales(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_warehouse_created_at ON sales(warehouse_id, created_at DESC);
