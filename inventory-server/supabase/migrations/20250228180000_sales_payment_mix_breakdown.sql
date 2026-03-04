-- Optional mix payment breakdown when payment_method = 'Mix'.
-- JSON shape: { "cash": number, "momo": number, "card": number } (sum should equal total).

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_mix_breakdown jsonb;

COMMENT ON COLUMN sales.payment_mix_breakdown IS 'When payment_method is Mix: { cash, momo, card } amounts that sum to total.';
