-- ============================================================
-- MERGE TRUE DUPLICATES (same name, same color, same SKU)
-- Run in Supabase SQL Editor. REVIEW AND RUN MANUALLY.
-- Prefer: run in staging first, or ensure backups/PITR are available.
--
-- Merges the duplicate product INTO the keeper (first ID). Keeps
-- sales history, inventory, and size rows; removes the duplicate row.
--
-- Duplicates to merge (from query 10):
--   1. Airforce 1 low / Cream / SKU-K3HKREMC-HEAPZ
--      keeper: aa4f267e-286b-4e73-a837-b895fcc3e25a
--      duplicate: cf6d6db0-fef6-4782-a2ca-0504af057276
--   2. Wallabies Leather Low / White / SKU-PF0Y9H50-GG3R2
--      keeper: 14591a03-9662-497f-a7e9-6887211df878
--      duplicate: a2a5ce1c-fe34-4fbb-9ba5-2cc67bc5652c
--
-- To swap keeper/duplicate, exchange the UUIDs in the pairs below.
-- ============================================================

BEGIN;

DO $$
DECLARE
  keeper_uuid    uuid;
  duplicate_uuid uuid;
  pair           record;
BEGIN
  FOR pair IN
    SELECT * FROM (VALUES
      ('aa4f267e-286b-4e73-a837-b895fcc3e25a'::uuid, 'cf6d6db0-fef6-4782-a2ca-0504af057276'::uuid),
      ('14591a03-9662-497f-a7e9-6887211df878'::uuid, 'a2a5ce1c-fe34-4fbb-9ba5-2cc67bc5652c'::uuid)
    ) AS t(keeper_id, duplicate_id)
  LOOP
    keeper_uuid   := pair.keeper_id;
    duplicate_uuid := pair.duplicate_id;

    -- Skip if keeper missing (e.g. already deleted or wrong ID); don't fail the whole script
    IF NOT EXISTS (SELECT 1 FROM warehouse_products WHERE id = keeper_uuid) THEN
      IF EXISTS (SELECT 1 FROM warehouse_products WHERE id = duplicate_uuid) THEN
        RAISE NOTICE 'Keeper % does not exist; duplicate % is the only record (no merge needed)', keeper_uuid, duplicate_uuid;
      ELSE
        RAISE NOTICE 'Both keeper % and duplicate % missing; skipping', keeper_uuid, duplicate_uuid;
      END IF;
      CONTINUE;
    END IF;

    -- Idempotent: skip if duplicate already removed
    IF NOT EXISTS (SELECT 1 FROM warehouse_products WHERE id = duplicate_uuid) THEN
      RAISE NOTICE 'Duplicate % already removed; skipping', duplicate_uuid;
      CONTINUE;
    END IF;

    -- 1. Merge warehouse_inventory: add duplicate's quantity into keeper (per warehouse)
    INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
    SELECT warehouse_id, keeper_uuid, quantity, now()
    FROM warehouse_inventory
    WHERE product_id = duplicate_uuid
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET
      quantity = warehouse_inventory.quantity + EXCLUDED.quantity,
      updated_at = EXCLUDED.updated_at;

    -- 2. Merge warehouse_inventory_by_size: add duplicate's size rows into keeper
    INSERT INTO warehouse_inventory_by_size (warehouse_id, product_id, size_code, quantity, updated_at)
    SELECT warehouse_id, keeper_uuid, size_code, quantity, now()
    FROM warehouse_inventory_by_size
    WHERE product_id = duplicate_uuid
    ON CONFLICT (warehouse_id, product_id, size_code)
    DO UPDATE SET
      quantity = warehouse_inventory_by_size.quantity + EXCLUDED.quantity,
      updated_at = EXCLUDED.updated_at;

    -- 3. Sync warehouse_inventory.quantity from sum(by_size) for keeper if product is sized
    UPDATE warehouse_inventory wi
    SET quantity = (
      SELECT COALESCE(SUM(wis.quantity), 0)::int
      FROM warehouse_inventory_by_size wis
      WHERE wis.warehouse_id = wi.warehouse_id AND wis.product_id = wi.product_id
    ),
    updated_at = now()
    WHERE wi.product_id = keeper_uuid
      AND EXISTS (
        SELECT 1 FROM warehouse_products wp
        WHERE wp.id = keeper_uuid AND wp.size_kind = 'sized'
      );

    -- 4. Point sale_lines to keeper
    UPDATE sale_lines SET product_id = keeper_uuid WHERE product_id = duplicate_uuid;

    -- 5. Remove duplicate's inventory rows (before deleting product)
    DELETE FROM warehouse_inventory_by_size WHERE product_id = duplicate_uuid;
    DELETE FROM warehouse_inventory WHERE product_id = duplicate_uuid;

    -- 6. Remove duplicate product row
    DELETE FROM warehouse_products WHERE id = duplicate_uuid;

    RAISE NOTICE 'Merged duplicate % into keeper %', duplicate_uuid, keeper_uuid;
  END LOOP;
END;
$$;

COMMIT;

-- After running: re-run query 10 in phase2_diagnostic_queries.sql to confirm 0 true duplicates.
