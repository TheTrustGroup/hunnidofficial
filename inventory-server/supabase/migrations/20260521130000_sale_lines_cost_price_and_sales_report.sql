-- sale_lines.cost_price for COGS/profit reports; get_sales_report RPC for GET /api/reports/sales.

ALTER TABLE sale_lines
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2);

COMMENT ON COLUMN sale_lines.cost_price IS 'Cost per unit at time of sale; NULL uses warehouse_products.cost_price in reports.';

CREATE OR REPLACE FUNCTION get_sales_report(
  p_from timestamptz,
  p_to timestamptz,
  p_warehouse_id uuid DEFAULT NULL,
  p_include_voided boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue numeric := 0;
  v_cogs numeric := 0;
  v_transaction_count bigint := 0;
  v_total_items_sold bigint := 0;
  v_voided_count bigint := 0;
  v_top jsonb;
  v_by_day jsonb;
  v_by_cat jsonb;
BEGIN
  SELECT
    coalesce(sum(sl.line_total), 0),
    coalesce(sum((coalesce(sl.cost_price, wp.cost_price, 0) * sl.qty)), 0),
    (SELECT count(distinct s.id)::bigint FROM sales s
     WHERE s.created_at >= p_from AND s.created_at <= p_to
       AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
       AND (p_include_voided OR s.voided_at IS NULL)),
    coalesce(sum(sl.qty), 0)::bigint
  INTO v_revenue, v_cogs, v_transaction_count, v_total_items_sold
  FROM sale_lines sl
  JOIN sales s ON s.id = sl.sale_id
  LEFT JOIN warehouse_products wp ON wp.id = sl.product_id
  WHERE s.created_at >= p_from AND s.created_at <= p_to
    AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
    AND (p_include_voided OR s.voided_at IS NULL);

  IF p_include_voided THEN
    SELECT count(*) FILTER (WHERE s.voided_at IS NOT NULL)::bigint INTO v_voided_count
    FROM sales s
    WHERE s.created_at >= p_from AND s.created_at <= p_to
      AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id);
  END IF;

  SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_top
  FROM (
    SELECT jsonb_build_object(
      'product_id', sl.product_id,
      'product_name', max(sl.name),
      'quantity_sold', sum(sl.qty)::bigint,
      'revenue', sum(sl.line_total)
    ) AS t
    FROM sale_lines sl
    JOIN sales s ON s.id = sl.sale_id
    WHERE s.created_at >= p_from AND s.created_at <= p_to
      AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
      AND (p_include_voided OR s.voided_at IS NULL)
    GROUP BY sl.product_id
    ORDER BY sum(sl.qty) DESC
    LIMIT 10
  ) x;

  SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_by_day
  FROM (
    SELECT jsonb_build_object(
      'date', to_char(date_trunc('day', s.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
      'revenue', sum(s.total),
      'transactions', count(*)::bigint
    ) AS t
    FROM sales s
    WHERE s.created_at >= p_from AND s.created_at <= p_to
      AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
      AND (p_include_voided OR s.voided_at IS NULL)
    GROUP BY date_trunc('day', s.created_at)
    ORDER BY date_trunc('day', s.created_at)
  ) x;

  SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_by_cat
  FROM (
    SELECT jsonb_build_object(
      'category', coalesce(nullif(trim(wp.category), ''), 'Uncategorised'),
      'revenue', sum(sl.line_total),
      'quantity', sum(sl.qty)::bigint
    ) AS t
    FROM sale_lines sl
    JOIN sales s ON s.id = sl.sale_id
    LEFT JOIN warehouse_products wp ON wp.id = sl.product_id
    WHERE s.created_at >= p_from AND s.created_at <= p_to
      AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
      AND (p_include_voided OR s.voided_at IS NULL)
    GROUP BY coalesce(nullif(trim(wp.category), ''), 'Uncategorised')
    ORDER BY sum(sl.line_total) DESC
  ) x;

  RETURN jsonb_build_object(
    'revenue', v_revenue,
    'cogs', v_cogs,
    'profit', v_revenue - v_cogs,
    'transaction_count', v_transaction_count,
    'total_items_sold', v_total_items_sold,
    'average_order_value', CASE WHEN v_transaction_count > 0 THEN v_revenue / v_transaction_count ELSE 0 END,
    'total_voided', v_voided_count,
    'top_products', v_top,
    'sales_by_day', v_by_day,
    'sales_by_category', v_by_cat
  );
END;
$$;

COMMENT ON FUNCTION get_sales_report(timestamptz, timestamptz, uuid, boolean) IS
  'Aggregated sales report from sales/sale_lines. Used by GET /api/reports/sales.';

GRANT EXECUTE ON FUNCTION get_sales_report(timestamptz, timestamptz, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_report(timestamptz, timestamptz, uuid, boolean) TO service_role;
