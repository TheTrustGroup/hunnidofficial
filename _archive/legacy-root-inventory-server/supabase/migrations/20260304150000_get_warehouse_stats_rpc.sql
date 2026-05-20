-- Single source of truth for warehouse totals: total_units, total_stock_value, total_skus, low_stock_count, out_of_stock_count.
-- Used by GET /api/dashboard so totals are never computed from a capped product list in JS.
-- Unit count and stock value come from warehouse_inventory only (one row per product per warehouse).

create or replace function get_warehouse_stats(p_warehouse_id uuid)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_result json;
begin
  select json_build_object(
    'total_units', coalesce(sum(wi.quantity), 0)::bigint,
    'total_stock_value', coalesce(sum(
      wi.quantity * greatest(0, coalesce(wp.cost_price, 0))
    ), 0)::numeric(14,2),
    'total_skus', count(*)::int,
    'low_stock_count', count(*) filter (
      where wi.quantity > 0 and wi.quantity <= coalesce(wp.reorder_level, 0)
    )::int,
    'out_of_stock_count', count(*) filter (where wi.quantity = 0)::int
  ) into v_result
  from warehouse_inventory wi
  join warehouse_products wp on wp.id = wi.product_id
  where wi.warehouse_id = p_warehouse_id;

  return coalesce(v_result, json_build_object(
    'total_units', 0,
    'total_stock_value', 0,
    'total_skus', 0,
    'low_stock_count', 0,
    'out_of_stock_count', 0
  ));
end;
$$;

comment on function get_warehouse_stats(uuid) is 'Returns warehouse-level totals from DB (single source of truth). Cost-only for stock value; null/0 cost contributes 0.';
