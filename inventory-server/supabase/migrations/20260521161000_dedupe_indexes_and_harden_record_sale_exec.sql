-- Remove redundant duplicate indexes and add missing FK coverage.
-- This reduces write overhead while keeping query paths indexed.

DROP INDEX IF EXISTS public.idx_sales_created_at;
DROP INDEX IF EXISTS public.idx_sales_warehouse_created;

DROP INDEX IF EXISTS public.idx_warehouse_inventory_product;
DROP INDEX IF EXISTS public.idx_warehouse_inventory_warehouse;

DROP INDEX IF EXISTS public.idx_warehouse_inventory_by_size_product;
DROP INDEX IF EXISTS public.idx_warehouse_inventory_by_size_warehouse;

DROP INDEX IF EXISTS public.idx_transactions_idempotency_key;

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id
  ON public.stock_movements(product_id);

CREATE INDEX IF NOT EXISTS idx_sync_rejections_store_id
  ON public.sync_rejections(store_id);

CREATE INDEX IF NOT EXISTS idx_sync_rejections_warehouse_id
  ON public.sync_rejections(warehouse_id);

CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id
  ON public.transaction_items(product_id);

-- Prevent unauthenticated direct RPC access for money-critical functions.
REVOKE EXECUTE ON FUNCTION public.record_sale(
  uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text, uuid
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.record_sale_impl(
  uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text, uuid
) FROM anon;
