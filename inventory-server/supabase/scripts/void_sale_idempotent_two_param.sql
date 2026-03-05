-- void_sale: idempotent, two params (API sends p_sale_id + p_voided_by).
-- Sets voided_at/voided_by so GET /api/sales and frontend show "Voided" correctly.
-- Restore stock from sale_lines (sized and non-sized). Safe to run when already voided (no-op).
CREATE OR REPLACE FUNCTION void_sale(p_sale_id uuid, p_voided_by text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_warehouse_id uuid;
  v_voided_at   timestamptz := now();
  v_line        record;
  v_size_kind   text;
BEGIN
  SELECT warehouse_id INTO v_warehouse_id
  FROM sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_NOT_FOUND: sale % does not exist', p_sale_id;
  END IF;

  IF EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND voided_at IS NOT NULL) THEN
    RETURN;  /* idempotent: already voided */
  END IF;

  FOR v_line IN
    SELECT sl.product_id, sl.size_code, sl.qty
    FROM sale_lines sl
    WHERE sl.sale_id = p_sale_id
  LOOP
    SELECT size_kind INTO v_size_kind
    FROM warehouse_products WHERE id = v_line.product_id;

    IF v_size_kind = 'sized' AND v_line.size_code IS NOT NULL AND trim(v_line.size_code) <> '' THEN
      UPDATE warehouse_inventory_by_size
      SET quantity = quantity + v_line.qty, updated_at = v_voided_at
      WHERE warehouse_id = v_warehouse_id
        AND product_id = v_line.product_id
        AND upper(trim(size_code)) = upper(trim(v_line.size_code));

      UPDATE warehouse_inventory
      SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) FROM warehouse_inventory_by_size
        WHERE warehouse_id = v_warehouse_id AND product_id = v_line.product_id
      ), updated_at = v_voided_at
      WHERE warehouse_id = v_warehouse_id AND product_id = v_line.product_id;
    ELSE
      UPDATE warehouse_inventory
      SET quantity = quantity + v_line.qty, updated_at = v_voided_at
      WHERE warehouse_id = v_warehouse_id AND product_id = v_line.product_id;
    END IF;
  END LOOP;

  UPDATE sales
  SET voided_at = v_voided_at,
      voided_by = NULLIF(trim(p_voided_by), '')
  WHERE id = p_sale_id;
END;
$$;

COMMENT ON FUNCTION void_sale(uuid, text) IS 'Void a sale: restore stock and set voided_at/voided_by. Idempotent if already voided.';
REVOKE ALL ON FUNCTION void_sale(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION void_sale(uuid, text) TO service_role;