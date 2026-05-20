-- Idempotent POS sale replay: client event id from offline outbox (Idempotency-Key header).

ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_event_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_client_event_id
  ON sales (client_event_id)
  WHERE client_event_id IS NOT NULL;

COMMENT ON COLUMN sales.client_event_id IS 'Client UUID from offline POS queue; duplicate POST /api/sales returns same sale.';
