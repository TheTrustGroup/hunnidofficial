-- One-time: seed Hunnid Main inventory from Main Jeff (177 products). Safe to re-run (upsert).
-- Main Jeff: 00000000-0000-0000-0000-000000000001
-- Hunnid Main: 99aa0b7b-a93d-4b5d-8b10-2854ed2da59f

INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
SELECT
  '99aa0b7b-a93d-4b5d-8b10-2854ed2da59f'::uuid,
  product_id,
  quantity,
  COALESCE(updated_at, now())
FROM warehouse_inventory
WHERE warehouse_id = '00000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (warehouse_id, product_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = EXCLUDED.updated_at;

INSERT INTO warehouse_inventory_by_size (warehouse_id, product_id, size_code, quantity, updated_at)
SELECT
  '99aa0b7b-a93d-4b5d-8b10-2854ed2da59f'::uuid,
  product_id,
  size_code,
  quantity,
  COALESCE(updated_at, now())
FROM warehouse_inventory_by_size
WHERE warehouse_id = '00000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (warehouse_id, product_id, size_code) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = EXCLUDED.updated_at;
