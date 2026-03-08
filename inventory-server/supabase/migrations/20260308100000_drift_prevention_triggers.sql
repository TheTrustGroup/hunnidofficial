-- Drift prevention: keep warehouse_inventory and warehouse_inventory_by_size in sync so
-- total stock value and UI quantity stay correct. Safe to run multiple times (CREATE OR REPLACE / DROP IF EXISTS).
--
-- 1. When by_size changes → sync warehouse_inventory.quantity = sum(by_size).
-- 2. When warehouse_inventory gets quantity but has no by_size rows → backfill one row 'OS' (One Size).
-- Prerequisite: size code 'OS' exists in size_codes (seed in 20250211000000 or 20250228190000).

-- ── 1. Sync warehouse_inventory from warehouse_inventory_by_size ──
CREATE OR REPLACE FUNCTION sync_warehouse_inventory_from_by_size()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_warehouse_id uuid;
  v_product_id   uuid;
  v_quantity    int;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_warehouse_id := NEW.warehouse_id;
    v_product_id   := NEW.product_id;
    SELECT COALESCE(SUM(quantity), 0)::int INTO v_quantity
    FROM warehouse_inventory_by_size
    WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id;
    INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
    VALUES (v_warehouse_id, v_product_id, v_quantity, now())
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = EXCLUDED.updated_at;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND (OLD.warehouse_id IS DISTINCT FROM NEW.warehouse_id OR OLD.product_id IS DISTINCT FROM NEW.product_id OR TG_OP = 'DELETE') THEN
    v_warehouse_id := OLD.warehouse_id;
    v_product_id   := OLD.product_id;
    SELECT COALESCE(SUM(quantity), 0)::int INTO v_quantity
    FROM warehouse_inventory_by_size
    WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id;
    INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
    VALUES (v_warehouse_id, v_product_id, v_quantity, now())
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = EXCLUDED.updated_at;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION sync_warehouse_inventory_from_by_size() IS 'Trigger: sync warehouse_inventory.quantity from SUM(warehouse_inventory_by_size.quantity) for affected (warehouse_id, product_id).';

REVOKE ALL ON FUNCTION public.sync_warehouse_inventory_from_by_size() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_warehouse_inventory_from_by_size() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_warehouse_inventory_from_by_size() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_warehouse_inventory_from_by_size() TO service_role;

DROP TRIGGER IF EXISTS trigger_sync_warehouse_inventory_from_by_size ON warehouse_inventory_by_size;
CREATE TRIGGER trigger_sync_warehouse_inventory_from_by_size
  AFTER INSERT OR UPDATE OR DELETE
  ON warehouse_inventory_by_size
  FOR EACH ROW
  EXECUTE FUNCTION sync_warehouse_inventory_from_by_size();

-- ── 2. Backfill by_size when inv has quantity but no by_size rows ──
CREATE OR REPLACE FUNCTION backfill_by_size_from_inv_when_empty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quantity > 0 AND NOT EXISTS (
    SELECT 1 FROM warehouse_inventory_by_size
    WHERE warehouse_id = NEW.warehouse_id AND product_id = NEW.product_id
  ) THEN
    INSERT INTO warehouse_inventory_by_size (warehouse_id, product_id, size_code, quantity, updated_at)
    VALUES (NEW.warehouse_id, NEW.product_id, 'OS', NEW.quantity, now())
    ON CONFLICT (warehouse_id, product_id, size_code)
    DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = EXCLUDED.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION backfill_by_size_from_inv_when_empty() IS 'Trigger: when warehouse_inventory has qty but no by_size rows, insert one OS row so both sources match and UI shows quantity.';

REVOKE ALL ON FUNCTION public.backfill_by_size_from_inv_when_empty() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_by_size_from_inv_when_empty() TO service_role;

DROP TRIGGER IF EXISTS trigger_backfill_by_size_from_inv ON warehouse_inventory;
CREATE TRIGGER trigger_backfill_by_size_from_inv
  AFTER INSERT OR UPDATE OF quantity
  ON warehouse_inventory
  FOR EACH ROW
  EXECUTE FUNCTION backfill_by_size_from_inv_when_empty();
