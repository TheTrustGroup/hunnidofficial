-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor) to fix:
--   "column warehouse_products.color does not exist"
-- Project: ttmlclllzvydhggevkmu (Hunnid Official). Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE warehouse_products
  ADD COLUMN IF NOT EXISTS color text;

COMMENT ON COLUMN warehouse_products.color IS 'Product color for filter/search (e.g. Red, Black, White).';
