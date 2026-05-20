-- Data integrity: cost_price must be non-negative when set.
-- COGS and profit use this value; negative cost would corrupt reporting.
-- Idempotent: corrects existing bad data, then adds constraint.

-- 1. One-time correction: legacy or bad data
UPDATE sale_lines
SET cost_price = 0
WHERE cost_price IS NOT NULL AND cost_price < 0;

-- 2. Enforce going forward (NULL allowed for legacy rows; backfill sets from product)
ALTER TABLE sale_lines
  DROP CONSTRAINT IF EXISTS chk_sale_lines_cost_price_non_negative;

ALTER TABLE sale_lines
  ADD CONSTRAINT chk_sale_lines_cost_price_non_negative
  CHECK (cost_price IS NULL OR cost_price >= 0);

COMMENT ON CONSTRAINT chk_sale_lines_cost_price_non_negative ON sale_lines IS
  'Cost at time of sale must be >= 0. NULL allowed for legacy rows until backfilled.';
