/*
  Copy by LINE NUMBERS only. Do not copy this comment block into Supabase.
  Section 1: lines 8-64   Section 2: lines 65-173   Section 3: lines 174-224
  Section 4: lines 225-267   Section 5: lines 268-313   Section 6: lines 314-326
*/

CREATE OR REPLACE FUNCTION get_warehouse_inventory_stats(p_warehouse_id uuid)
RETURNS TABLE (
  total_stock_value numeric,
  total_products bigint,
  total_units bigint,
  low_stock_count bigint,
  out_of_stock_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH products_in_warehouse AS (
    SELECT DISTINCT product_id FROM (
      SELECT product_id FROM warehouse_inventory WHERE warehouse_id = p_warehouse_id
      UNION
      SELECT product_id FROM warehouse_inventory_by_size WHERE warehouse_id = p_warehouse_id
    ) t
  ),
  inv AS (
    SELECT product_id, quantity
    FROM warehouse_inventory
    WHERE warehouse_id = p_warehouse_id
  ),
  by_size AS (
    SELECT product_id, SUM(quantity) AS qty
    FROM warehouse_inventory_by_size
    WHERE warehouse_id = p_warehouse_id
    GROUP BY product_id
  ),
  with_qty AS (
    SELECT
      p.product_id,
      wp.selling_price,
      COALESCE(wp.reorder_level, 0) AS reorder_level,
      COALESCE(
        CASE
          WHEN wp.size_kind = 'sized' AND bs.qty IS NOT NULL THEN bs.qty
          ELSE inv.quantity
        END,
        0
      )::numeric AS qty
    FROM products_in_warehouse p
    JOIN warehouse_products wp ON wp.id = p.product_id
    LEFT JOIN inv ON inv.product_id = p.product_id
    LEFT JOIN by_size bs ON bs.product_id = p.product_id
  )
  SELECT
    COALESCE(SUM(qty * selling_price), 0),
    COUNT(*)::bigint,
    COALESCE(SUM(qty), 0)::bigint,
    COUNT(*) FILTER (WHERE qty > 0 AND qty <= reorder_level)::bigint,
    COUNT(*) FILTER (WHERE qty = 0)::bigint
  FROM with_qty;
$$;

COMMENT ON FUNCTION get_warehouse_inventory_stats(uuid) IS
  'Returns one row: total_stock_value (qty * selling_price), total_products, total_units, low_stock_count, out_of_stock_count for the warehouse. Used for dashboard and inventory stats accuracy.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'warehouse_inventory_by_size'::regclass
      AND conname = 'warehouse_inventory_by_size_quantity_nonneg'
  ) THEN
    ALTER TABLE warehouse_inventory_by_size
      ADD CONSTRAINT warehouse_inventory_by_size_quantity_nonneg CHECK (quantity >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'warehouse_inventory'::regclass
      AND conname = 'warehouse_inventory_quantity_nonneg'
  ) THEN
    ALTER TABLE warehouse_inventory
      ADD CONSTRAINT warehouse_inventory_quantity_nonneg CHECK (quantity >= 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_warehouse_product_atomic(
  p_id uuid,
  p_warehouse_id uuid,
  p_row jsonb,
  p_current_version int,
  p_quantity int default null,
  p_quantity_by_size jsonb default null
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated int;
  v_qty int;
  v_entry jsonb;
  v_size_code text;
  v_size_qty int;
  v_payload_codes text[];
BEGIN
  UPDATE warehouse_products SET
    sku = coalesce(nullif(trim(p_row->>'sku'), ''), sku),
    barcode = coalesce(trim(p_row->>'barcode'), barcode),
    name = coalesce(nullif(trim(p_row->>'name'), ''), name),
    description = coalesce(p_row->>'description', description),
    category = coalesce(p_row->>'category', category),
    tags = coalesce(p_row->'tags', tags),
    cost_price = coalesce((p_row->>'cost_price')::decimal, (p_row->>'costPrice')::decimal, cost_price),
    selling_price = coalesce((p_row->>'selling_price')::decimal, (p_row->>'sellingPrice')::decimal, selling_price),
    reorder_level = coalesce((p_row->>'reorder_level')::int, (p_row->>'reorderLevel')::int, reorder_level),
    location = coalesce(p_row->'location', location),
    supplier = coalesce(p_row->'supplier', supplier),
    images = coalesce(p_row->'images', images),
    expiry_date = coalesce((p_row->>'expiry_date')::timestamptz, (p_row->>'expiryDate')::timestamptz, expiry_date),
    updated_at = now(),
    version = p_current_version + 1,
    size_kind = coalesce(lower(nullif(trim(p_row->>'size_kind'), '')), lower(nullif(trim(p_row->>'sizeKind'), '')), size_kind)
  WHERE id = p_id AND version = p_current_version;

  GET DIAGNOSTICS v_updated = row_count;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Product was updated by someone else. Please refresh and try again.';
  END IF;

  IF p_quantity_by_size IS NOT NULL THEN
    IF jsonb_array_length(p_quantity_by_size) > 0 THEN
      SELECT array_agg(DISTINCT code) INTO v_payload_codes
      FROM (
        SELECT CASE
          WHEN nullif(trim(replace(e->>'sizeCode', ' ', '')), '') IS NULL THEN 'NA'
          ELSE upper(nullif(trim(replace(e->>'sizeCode', ' ', '')), ''))
        END AS code
        FROM jsonb_array_elements(p_quantity_by_size) e
      ) sub;
      IF v_payload_codes IS NOT NULL AND array_length(v_payload_codes, 1) > 0 THEN
        DELETE FROM warehouse_inventory_by_size
        WHERE warehouse_id = p_warehouse_id AND product_id = p_id
          AND size_code != ALL(v_payload_codes);
      END IF;
      v_qty := 0;
      FOR v_entry IN SELECT * FROM jsonb_array_elements(p_quantity_by_size)
      LOOP
        v_size_code := upper(nullif(trim(replace(v_entry->>'sizeCode', ' ', '')), ''));
        IF v_size_code IS NULL OR v_size_code = '' THEN v_size_code := 'NA'; END IF;
        v_size_qty := greatest(0, floor((v_entry->>'quantity')::numeric));
        v_qty := v_qty + v_size_qty;
        INSERT INTO warehouse_inventory_by_size (warehouse_id, product_id, size_code, quantity, updated_at)
        VALUES (p_warehouse_id, p_id, v_size_code, v_size_qty, now())
        ON CONFLICT (warehouse_id, product_id, size_code)
        DO UPDATE SET quantity = excluded.quantity, updated_at = excluded.updated_at;
      END LOOP;
    ELSE
      DELETE FROM warehouse_inventory_by_size WHERE warehouse_id = p_warehouse_id AND product_id = p_id;
      v_qty := greatest(0, coalesce(p_quantity, 0));
    END IF;
    INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
    VALUES (p_warehouse_id, p_id, greatest(0, v_qty), now())
    ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity = excluded.quantity, updated_at = excluded.updated_at;
  ELSIF p_quantity IS NOT NULL THEN
    INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
    VALUES (p_warehouse_id, p_id, greatest(0, p_quantity), now())
    ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity = excluded.quantity, updated_at = excluded.updated_at;
  END IF;

  RETURN (SELECT to_jsonb(wp) FROM warehouse_products wp WHERE wp.id = p_id);
END;
$$;

COMMENT ON FUNCTION update_warehouse_product_atomic(uuid, uuid, jsonb, int, int, jsonb) IS
  'Atomic update: product (version check) + inventory. By-size: UPSERT payload sizes, delete only explicitly removed; prevents vanishing sizes.';

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

DROP TRIGGER IF EXISTS trigger_sync_warehouse_inventory_from_by_size ON warehouse_inventory_by_size;
CREATE TRIGGER trigger_sync_warehouse_inventory_from_by_size
  AFTER INSERT OR UPDATE OR DELETE
  ON warehouse_inventory_by_size
  FOR EACH ROW
  EXECUTE FUNCTION sync_warehouse_inventory_from_by_size();

CREATE OR REPLACE VIEW warehouse_dashboard_stats AS
WITH products_per_warehouse AS (
  SELECT DISTINCT warehouse_id, product_id
  FROM (
    SELECT warehouse_id, product_id FROM warehouse_inventory
    UNION
    SELECT warehouse_id, product_id FROM warehouse_inventory_by_size
  ) t
),
inv AS (
  SELECT warehouse_id, product_id, quantity
  FROM warehouse_inventory
),
by_size AS (
  SELECT warehouse_id, product_id, SUM(quantity) AS qty
  FROM warehouse_inventory_by_size
  GROUP BY warehouse_id, product_id
),
with_qty AS (
  SELECT
    p.warehouse_id,
    p.product_id,
    wp.selling_price,
    wp.cost_price,
    COALESCE(wp.reorder_level, 0) AS reorder_level,
    COALESCE(bs.qty, inv.quantity, 0)::numeric AS qty
  FROM products_per_warehouse p
  JOIN warehouse_products wp ON wp.id = p.product_id
  LEFT JOIN inv ON inv.warehouse_id = p.warehouse_id AND inv.product_id = p.product_id
  LEFT JOIN by_size bs ON bs.warehouse_id = p.warehouse_id AND bs.product_id = p.product_id
)
SELECT
  warehouse_id,
  COUNT(*)::bigint AS total_products,
  COALESCE(SUM(qty), 0)::bigint AS total_units,
  COALESCE(SUM(qty * cost_price), 0)::numeric AS stock_value_at_cost,
  COALESCE(SUM(qty * selling_price), 0)::numeric AS total_stock_value,
  COUNT(*) FILTER (WHERE qty = 0)::bigint AS out_of_stock_count,
  COUNT(*) FILTER (WHERE qty > 0 AND qty <= reorder_level)::bigint AS low_stock_count
FROM with_qty
GROUP BY warehouse_id;

CREATE OR REPLACE FUNCTION receive_delivery(
  p_warehouse_id uuid,
  p_received_by uuid,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item     jsonb;
  v_product  uuid;
  v_size     text;
  v_qty      int;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', true, 'rows_affected', 0);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product := (v_item->>'product_id')::uuid;
    v_size    := nullif(trim(v_item->>'size_code'), '');
    v_qty     := greatest(0, (v_item->>'quantity')::int);
    IF v_size IS NULL THEN
      v_size := 'NA';
    END IF;

    INSERT INTO warehouse_inventory_by_size (warehouse_id, product_id, size_code, quantity, updated_at)
    VALUES (p_warehouse_id, v_product, v_size, v_qty, now())
    ON CONFLICT (warehouse_id, product_id, size_code)
    DO UPDATE SET
      quantity   = warehouse_inventory_by_size.quantity + v_qty,
      updated_at = now();
  END LOOP;

  RETURN jsonb_build_object('success', true, 'rows_affected', jsonb_array_length(p_items));
END;
$$;

REVOKE ALL ON FUNCTION receive_delivery(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION receive_delivery(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION receive_delivery(uuid, uuid, jsonb) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'warehouses' AND column_name = 'admin_email'
  ) THEN
    ALTER TABLE warehouses ADD COLUMN admin_email text;
  END IF;
END $$;

COMMENT ON COLUMN warehouses.admin_email IS 'Optional email for daily low-stock alerts (8am). If null, no alert is sent for this warehouse unless LOW_STOCK_ALERT_EMAIL fallback is set.';
