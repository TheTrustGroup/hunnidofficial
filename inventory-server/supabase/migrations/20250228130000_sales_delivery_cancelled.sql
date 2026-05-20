-- Adds 'cancelled' to delivery_status. Run after 20250228120000_sales_void_columns.sql.

ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_delivery_status_check;

ALTER TABLE sales
  ADD CONSTRAINT sales_delivery_status_check
  CHECK (delivery_status IN ('delivered', 'pending', 'dispatched', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_sales_delivery_cancelled
  ON sales (warehouse_id, created_at DESC)
  WHERE delivery_status = 'cancelled';
