-- ============================================================
-- MERGE ALL TRUE DUPLICATES (dynamic)
-- Finds every (name, color, sku) group with count > 1 and merges
-- all but the oldest product into the oldest (keeper).
-- Run in Supabase SQL Editor. Then run migration
-- 20260306100000_unique_product_identity.sql.
-- ============================================================

BEGIN;

DO $$
DECLARE
  grp           record;
  keeper_uuid   uuid;
  duplicate_uuid uuid;
  i             int;
BEGIN
  FOR grp IN
    SELECT
      array_agg(wp.id ORDER BY wp.created_at NULLS LAST, wp.id) AS ids
    FROM warehouse_products wp
    GROUP BY trim(lower(wp.name)), coalesce(trim(wp.color), ''), coalesce(trim(wp.sku), '')
    HAVING count(*) > 1
  LOOP
    keeper_uuid := grp.ids[1];

    FOR i IN 2 .. array_length(grp.ids, 1)
    LOOP
      duplicate_uuid := grp.ids[i];

      IF NOT EXISTS (SELECT 1 FROM warehouse_products WHERE id = keeper_uuid) THEN
        RAISE NOTICE 'Keeper % missing; skipping duplicate %', keeper_uuid, duplicate_uuid;
        CONTINUE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM warehouse_products WHERE id = duplicate_uuid) THEN
        RAISE NOTICE 'Duplicate % already removed; skipping', duplicate_uuid;
        CONTINUE;
      END IF;

      -- 1. Merge warehouse_inventory
      INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
      SELECT warehouse_id, keeper_uuid, quantity, now()
      FROM warehouse_inventory
      WHERE product_id = duplicate_uuid
      ON CONFLICT (warehouse_id, product_id)
      DO UPDATE SET
        quantity = warehouse_inventory.quantity + EXCLUDED.quantity,
        updated_at = EXCLUDED.updated_at;

      -- 2. Merge warehouse_inventory_by_size
      INSERT INTO warehouse_inventory_by_size (warehouse_id, product_id, size_code, quantity, updated_at)
      SELECT warehouse_id, keeper_uuid, size_code, quantity, now()
      FROM warehouse_inventory_by_size
      WHERE product_id = duplicate_uuid
      ON CONFLICT (warehouse_id, product_id, size_code)
      DO UPDATE SET
        quantity = warehouse_inventory_by_size.quantity + EXCLUDED.quantity,
        updated_at = EXCLUDED.updated_at;

      -- 3. Sync warehouse_inventory from sum(by_size) for keeper if sized
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

      -- 5. Remove duplicate's rows
      DELETE FROM warehouse_inventory_by_size WHERE product_id = duplicate_uuid;
      DELETE FROM warehouse_inventory WHERE product_id = duplicate_uuid;
      DELETE FROM warehouse_products WHERE id = duplicate_uuid;

      RAISE NOTICE 'Merged % into keeper %', duplicate_uuid, keeper_uuid;
    END LOOP;
  END LOOP;
END;
$$;

COMMIT;

-- Then run: phase2_diagnostic_queries.sql query 10 (expect 0 rows)
-- Then run: 20260306100000_unique_product_identity.sql
