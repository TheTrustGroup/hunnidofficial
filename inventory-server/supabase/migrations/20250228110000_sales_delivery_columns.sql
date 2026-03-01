-- Adds delivery tracking to sales. Safe to run multiple times (IF NOT EXISTS).
-- GET /api/sales expects these columns; without them the route uses legacy fallback.

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS delivery_status   text    NOT NULL DEFAULT 'delivered',
  ADD COLUMN IF NOT EXISTS recipient_name    text,
  ADD COLUMN IF NOT EXISTS recipient_phone   text,
  ADD COLUMN IF NOT EXISTS delivery_address  text,
  ADD COLUMN IF NOT EXISTS delivery_notes    text,
  ADD COLUMN IF NOT EXISTS expected_date     date,
  ADD COLUMN IF NOT EXISTS delivered_at      timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_by      text;

UPDATE sales
SET delivery_status = 'delivered'
WHERE delivery_status IS NULL OR delivery_status = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_delivery_status_check'
  ) THEN
    ALTER TABLE sales
      ADD CONSTRAINT sales_delivery_status_check
      CHECK (delivery_status IN ('delivered', 'pending', 'dispatched'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_delivery_status
  ON sales (warehouse_id, delivery_status, expected_date)
  WHERE delivery_status IN ('pending', 'dispatched');

CREATE INDEX IF NOT EXISTS idx_sales_created_at
  ON sales (warehouse_id, created_at DESC);
