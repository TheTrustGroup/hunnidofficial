-- record_sale_impl: capture cost_price at time of sale for each line.
-- Requires sale_lines.cost_price (20260306110000_sale_lines_cost_price.sql).

CREATE OR REPLACE FUNCTION record_sale_impl(
  p_warehouse_id    uuid,
  p_lines           jsonb,
  p_subtotal        numeric,
  p_discount_pct    numeric,
  p_discount_amt    numeric,
  p_total           numeric,
  p_payment_method  text,
  p_customer_name   text DEFAULT NULL,
  p_sold_by         uuid DEFAULT NULL,
  p_sold_by_email   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id     uuid := gen_random_uuid();
  v_receipt_id  text;
  v_item_count  int  := 0;
  v_line        jsonb;
  v_product_id  uuid;
  v_size_code   text;
  v_qty         int;
  v_unit_price  numeric;
  v_line_total  numeric;
  v_name        text;
  v_sku         text;
  v_image_url   text;
  v_size_kind   text;
  v_updated     int;
  v_pid_raw     text;
  v_qty_raw     text;
  v_cost_price  numeric;
BEGIN
  IF p_lines IS NULL OR jsonb_typeof(p_lines) != 'array' OR (SELECT count(*) FROM jsonb_array_elements(p_lines)) = 0 THEN
    RAISE EXCEPTION 'INVALID_LINE: p_lines must be a non-empty JSON array';
  END IF;

  v_receipt_id := 'RCP-'
    || to_char(now(), 'YYYYMMDD')
    || '-'
    || lpad((nextval('receipt_seq') % 10000)::text, 4, '0');

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_pid_raw := COALESCE(v_line->>'productId', v_line->>'product_id');
    IF v_pid_raw IS NULL OR trim(v_pid_raw) = '' THEN
      RAISE EXCEPTION 'INVALID_LINE: each line must have productId or product_id';
    END IF;
    v_product_id := v_pid_raw::uuid;

    v_size_code  := NULLIF(trim(upper(COALESCE(v_line->>'sizeCode', v_line->>'size_code', ''))), '');
    v_qty_raw    := COALESCE(v_line->>'qty', v_line->>'quantity', '1');
    v_qty        := GREATEST(1, (v_qty_raw::int));
    v_unit_price := COALESCE((v_line->>'unitPrice')::numeric, (v_line->>'unit_price')::numeric, 0);
    v_line_total := COALESCE((v_line->>'lineTotal')::numeric, (v_line->>'line_total')::numeric, v_unit_price * v_qty);
    v_name       := COALESCE(v_line->>'name', 'Unknown');
    v_sku        := COALESCE(v_line->>'sku', v_line->>'product_sku', '');
    v_image_url  := NULLIF(trim(COALESCE(v_line->>'imageUrl', v_line->>'image_url', '')), '');
    v_item_count := v_item_count + v_qty;

    SELECT size_kind INTO v_size_kind
    FROM warehouse_products
    WHERE id = v_product_id;

    IF v_size_kind = 'sized' AND (v_size_code IS NULL OR trim(v_size_code) = '') THEN
      RAISE EXCEPTION 'INVALID_LINE: sized product % requires sizeCode', v_product_id;
    END IF;

    IF v_size_kind = 'sized' AND v_size_code IS NOT NULL THEN
      UPDATE warehouse_inventory_by_size
      SET quantity = quantity - v_qty, updated_at = now()
      WHERE warehouse_id = p_warehouse_id AND product_id = v_product_id
        AND upper(trim(size_code)) = v_size_code AND quantity >= v_qty;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: product % size % in warehouse % has insufficient quantity for deduct %',
          v_product_id, v_size_code, p_warehouse_id, v_qty;
      END IF;
      UPDATE warehouse_inventory
      SET quantity = (SELECT COALESCE(SUM(quantity), 0) FROM warehouse_inventory_by_size
                      WHERE warehouse_id = p_warehouse_id AND product_id = v_product_id),
          updated_at = now()
      WHERE warehouse_id = p_warehouse_id AND product_id = v_product_id;
    ELSE
      UPDATE warehouse_inventory
      SET quantity = quantity - v_qty, updated_at = now()
      WHERE warehouse_id = p_warehouse_id AND product_id = v_product_id AND quantity >= v_qty;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: product % in warehouse % has insufficient quantity for deduct %',
          v_product_id, p_warehouse_id, v_qty;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO sales (
    id, warehouse_id, customer_name, payment_method,
    subtotal, discount_pct, discount_amt, total,
    receipt_id, status, sold_by, sold_by_email, created_at
  ) VALUES (
    v_sale_id, p_warehouse_id, p_customer_name, p_payment_method,
    p_subtotal, p_discount_pct, p_discount_amt, p_total,
    v_receipt_id, 'completed', p_sold_by, NULLIF(trim(p_sold_by_email), ''), now()
  );

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_pid_raw   := COALESCE(v_line->>'productId', v_line->>'product_id');
    v_product_id := v_pid_raw::uuid;
    v_size_code  := NULLIF(trim(upper(COALESCE(v_line->>'sizeCode', v_line->>'size_code', ''))), '');
    v_qty_raw    := COALESCE(v_line->>'qty', v_line->>'quantity', '1');
    v_qty        := GREATEST(1, (v_qty_raw::int));
    v_unit_price := COALESCE((v_line->>'unitPrice')::numeric, (v_line->>'unit_price')::numeric, 0);
    v_line_total := COALESCE((v_line->>'lineTotal')::numeric, (v_line->>'line_total')::numeric, v_unit_price * v_qty);
    v_name       := COALESCE(v_line->>'name', 'Unknown');
    v_sku        := COALESCE(v_line->>'sku', v_line->>'product_sku', '');
    v_image_url  := NULLIF(trim(COALESCE(v_line->>'imageUrl', v_line->>'image_url', '')), '');

    SELECT COALESCE(cost_price, 0) INTO v_cost_price
    FROM warehouse_products
    WHERE id = v_product_id;

    INSERT INTO sale_lines (
      sale_id, product_id, size_code, name, sku,
      unit_price, qty, line_total, product_image_url, cost_price
    ) VALUES (
      v_sale_id, v_product_id, v_size_code, v_name, v_sku,
      v_unit_price, v_qty, v_line_total, v_image_url, v_cost_price
    );
  END LOOP;

  UPDATE sales SET item_count = v_item_count WHERE id = v_sale_id;

  RETURN jsonb_build_object(
    'id', v_sale_id, 'receiptId', v_receipt_id, 'total', p_total,
    'itemCount', v_item_count, 'status', 'completed', 'createdAt', now()
  );
END;
$$;

COMMENT ON FUNCTION record_sale_impl(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text) IS
  'Deducts stock and inserts sale + sale_lines with cost_price at time of sale for COGS.';
