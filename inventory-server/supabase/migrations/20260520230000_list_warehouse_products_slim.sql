-- List RPC: omit images/json blobs (500KB+ per row) so GET /api/products finishes in <3s.

CREATE OR REPLACE FUNCTION public.list_warehouse_products_page(
  p_warehouse_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_q text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_size_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_rows json;
  v_null uuid := '00000000-0000-0000-0000-000000000000';
  v_lim int := greatest(1, least(coalesce(p_limit, 50), 250));
  v_off int := greatest(0, coalesce(p_offset, 0));
BEGIN
  IF p_warehouse_id IS NULL OR p_warehouse_id = v_null THEN
    RETURN json_build_object('total', 0, 'data', '[]'::json);
  END IF;

  WITH scoped AS (
    SELECT wi.product_id, wi.quantity
    FROM warehouse_inventory wi
    INNER JOIN warehouse_products wp ON wp.id = wi.product_id
    WHERE wi.warehouse_id = p_warehouse_id
      AND (
        p_q IS NULL OR btrim(p_q) = ''
        OR wp.name ILIKE '%' || p_q || '%'
        OR wp.sku ILIKE '%' || p_q || '%'
        OR COALESCE(wp.barcode, '') ILIKE '%' || p_q || '%'
      )
      AND (p_category IS NULL OR btrim(p_category) = '' OR wp.category = p_category)
      AND (
        p_color IS NULL OR btrim(p_color) = ''
        OR (lower(btrim(p_color)) = 'uncategorized' AND wp.color IS NULL)
        OR wp.color ILIKE p_color
      )
      AND (
        p_size_code IS NULL OR btrim(p_size_code) = ''
        OR EXISTS (
          SELECT 1
          FROM warehouse_inventory_by_size wibs
          WHERE wibs.warehouse_id = p_warehouse_id
            AND wibs.product_id = wi.product_id
            AND wibs.size_code = p_size_code
        )
      )
  ),
  counted AS (SELECT count(*)::int AS c FROM scoped),
  paged AS (
    SELECT s.product_id, s.quantity
    FROM scoped s
    INNER JOIN warehouse_products wp ON wp.id = s.product_id
    ORDER BY wp.name ASC
    LIMIT v_lim
    OFFSET v_off
  )
  SELECT
    (SELECT c FROM counted),
    (
      SELECT coalesce(
        json_agg(
          json_build_object(
            'id', wp.id,
            'sku', wp.sku,
            'barcode', wp.barcode,
            'name', wp.name,
            'category', wp.category,
            'color', wp.color,
            'size_kind', wp.size_kind,
            'selling_price', wp.selling_price,
            'cost_price', wp.cost_price,
            'reorder_level', wp.reorder_level,
            'version', wp.version,
            'created_at', wp.created_at,
            'updated_at', wp.updated_at,
            'inv_quantity', p.quantity
          )
          ORDER BY wp.name
        ),
        '[]'::json
      )
      FROM paged p
      INNER JOIN warehouse_products wp ON wp.id = p.product_id
    )
  INTO v_total, v_rows;

  RETURN json_build_object('total', coalesce(v_total, 0), 'data', coalesce(v_rows, '[]'::json));
END;
$$;
