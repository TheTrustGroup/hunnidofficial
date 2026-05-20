-- Align get_warehouse_stats with product list: count products that have inventory in
-- either warehouse_inventory OR warehouse_inventory_by_size (same as GET /api/products).
-- Fixes mismatch where Dashboard showed fewer products than Inventory page / app.

create or replace function get_warehouse_stats(p_warehouse_id uuid)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total_skus int;
  v_total_units bigint;
  v_total_stock_value numeric(14,2);
  v_low_stock_count int;
  v_out_of_stock_count int;
begin
  -- total_skus = same product set as product list (union of inv and by_size)
  select count(distinct pid)::int into v_total_skus
  from (
    select product_id as pid from warehouse_inventory where warehouse_id = p_warehouse_id
    union
    select product_id from warehouse_inventory_by_size where warehouse_id = p_warehouse_id
  ) u;

  -- units, stock value, low/out counts from warehouse_inventory (canonical quantity per product)
  select
    coalesce(sum(wi.quantity), 0)::bigint,
    coalesce(sum(wi.quantity * greatest(0, coalesce(wp.cost_price, 0))), 0)::numeric(14,2),
    count(*) filter (where wi.quantity > 0 and wi.quantity <= coalesce(wp.reorder_level, 0))::int,
    count(*) filter (where wi.quantity = 0)::int
  into v_total_units, v_total_stock_value, v_low_stock_count, v_out_of_stock_count
  from warehouse_inventory wi
  join warehouse_products wp on wp.id = wi.product_id
  where wi.warehouse_id = p_warehouse_id;

  return json_build_object(
    'total_units', coalesce(v_total_units, 0),
    'total_stock_value', coalesce(v_total_stock_value, 0),
    'total_skus', coalesce(v_total_skus, 0),
    'low_stock_count', coalesce(v_low_stock_count, 0),
    'out_of_stock_count', coalesce(v_out_of_stock_count, 0)
  );
end;
$$;

comment on function get_warehouse_stats(uuid) is 'Warehouse totals. total_skus = products in warehouse_inventory OR warehouse_inventory_by_size (matches product list).';
