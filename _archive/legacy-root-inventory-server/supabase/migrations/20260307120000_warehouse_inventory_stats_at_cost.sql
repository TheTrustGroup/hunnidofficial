-- Add stock_value_at_cost to get_warehouse_inventory_stats for Reports: Stock value (at cost), Potential profit in stock.
-- total_stock_value remains at selling price; new column is at cost.
-- Must DROP first because return type (OUT parameters) changed.

DROP FUNCTION IF EXISTS get_warehouse_inventory_stats(uuid);

CREATE FUNCTION get_warehouse_inventory_stats(p_warehouse_id uuid)
RETURNS TABLE (
  stock_value_at_cost numeric,
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
      wp.cost_price,
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
    COALESCE(SUM(qty * cost_price), 0),
    COALESCE(SUM(qty * selling_price), 0),
    COUNT(*)::bigint,
    COALESCE(SUM(qty), 0)::bigint,
    COUNT(*) FILTER (WHERE qty > 0 AND qty <= reorder_level)::bigint,
    COUNT(*) FILTER (WHERE qty = 0)::bigint
  FROM with_qty;
$$;

COMMENT ON FUNCTION get_warehouse_inventory_stats(uuid) IS
  'Returns one row: stock_value_at_cost (qty*cost_price), total_stock_value (qty*selling_price), total_products, total_units, low_stock_count, out_of_stock_count. Used for dashboard and Reports inventory metrics.';
