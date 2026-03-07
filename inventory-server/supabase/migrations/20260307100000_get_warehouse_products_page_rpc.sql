-- Phase 1 Rebirth: product list with quantity_by_size and total_quantity built in SQL (LEFT JOIN).
-- warehouse_products has no warehouse_id; we restrict to products that have inventory at this warehouse.

CREATE OR REPLACE FUNCTION get_warehouse_products_page(
  p_warehouse_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_q text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_size_code text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_low_stock boolean DEFAULT FALSE,
  p_out_of_stock boolean DEFAULT FALSE
)
RETURNS TABLE(total_count bigint, page_data jsonb)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total bigint;
  v_data jsonb;
BEGIN
  WITH warehouse_product_ids AS (
    SELECT product_id AS id
    FROM warehouse_inventory
    WHERE warehouse_id = p_warehouse_id
    UNION
    SELECT product_id AS id
    FROM warehouse_inventory_by_size
    WHERE warehouse_id = p_warehouse_id
  ),
  products_at_warehouse AS (
    SELECT wp.id, wp.sku, wp.barcode, wp.name, wp.description, wp.category, wp.color,
           wp.size_kind, wp.selling_price, wp.cost_price, wp.reorder_level,
           wp.location, wp.supplier, wp.tags, wp.images, wp.version, wp.created_at, wp.updated_at
    FROM warehouse_products wp
    INNER JOIN warehouse_product_ids wpi ON wpi.id = wp.id
    WHERE (p_q IS NULL OR p_q = '' OR wp.name ILIKE '%' || p_q || '%' OR wp.sku ILIKE '%' || p_q || '%' OR wp.barcode ILIKE '%' || p_q || '%')
      AND (p_category IS NULL OR p_category = '' OR wp.category = p_category)
      AND (p_color IS NULL OR (p_color = 'Uncategorized' AND wp.color IS NULL) OR wp.color ILIKE p_color)
      AND (p_size_code IS NULL OR p_size_code = '' OR wp.id IN (
            SELECT product_id FROM warehouse_inventory_by_size
            WHERE warehouse_id = p_warehouse_id AND size_code = p_size_code
          ))
  ),
  with_sizes AS (
    SELECT
      p.id, p.sku, p.barcode, p.name, p.description, p.category, p.color, p.size_kind,
      p.selling_price, p.cost_price, p.reorder_level, p.location, p.supplier, p.tags, p.images,
      p.version, p.created_at, p.updated_at,
      COALESCE(
        jsonb_object_agg(wis.size_code, wis.quantity::int) FILTER (WHERE wis.size_code IS NOT NULL),
        '{}'::jsonb
      ) AS quantity_by_size,
      COALESCE(SUM(wis.quantity), 0)::int AS total_quantity
    FROM products_at_warehouse p
    LEFT JOIN warehouse_inventory_by_size wis
      ON wis.product_id = p.id AND wis.warehouse_id = p_warehouse_id
    GROUP BY p.id, p.sku, p.barcode, p.name, p.description, p.category, p.color, p.size_kind,
             p.selling_price, p.cost_price, p.reorder_level, p.location, p.supplier, p.tags, p.images,
             p.version, p.created_at, p.updated_at
  ),
  filtered AS (
    SELECT *
    FROM with_sizes
    WHERE (NOT p_low_stock OR total_quantity <= reorder_level)
      AND (NOT p_out_of_stock OR total_quantity > 0)
  )
  SELECT
    (SELECT count(*)::bigint FROM filtered),
    (SELECT coalesce(jsonb_agg(row_to_json(f)::jsonb), '[]'::jsonb)
     FROM (
       SELECT * FROM filtered
       ORDER BY name ASC
       LIMIT p_limit OFFSET p_offset
     ) f)
  INTO v_total, v_data;

  total_count := v_total;
  page_data := v_data;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION get_warehouse_products_page IS 'List products for a warehouse with quantity_by_size and total_quantity built in SQL (Phase 1 rebirth).';
