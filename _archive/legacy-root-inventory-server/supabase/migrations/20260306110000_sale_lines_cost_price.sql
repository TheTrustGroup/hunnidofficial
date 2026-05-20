-- Add cost_price to sale_lines so COGS and profit use cost at time of sale.
-- Nullable for existing rows; record_sale will set it for new sales.

ALTER TABLE sale_lines
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2);

COMMENT ON COLUMN sale_lines.cost_price IS 'Cost per unit at time of sale; used for COGS and profit. NULL for legacy rows (backfill or treat as 0).';
