-- RPC: get_sales_report — SQL aggregations for reports using sale_lines.cost_price (COGS at time of sale).
-- Used by GET /api/reports/sales. Excludes voided sales unless p_include_voided = true.

create or replace function get_sales_report(
  p_from timestamptz,
  p_to timestamptz,
  p_warehouse_id uuid default null,
  p_include_voided boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revenue numeric := 0;
  v_cogs numeric := 0;
  v_transaction_count bigint := 0;
  v_total_items_sold bigint := 0;
  v_voided_count bigint := 0;
  v_top jsonb;
  v_by_day jsonb;
  v_by_cat jsonb;
begin
  -- Revenue, COGS, counts from sale_lines (single source: same filter for all)
  select
    coalesce(sum(sl.line_total), 0),
    coalesce(sum((coalesce(sl.cost_price, 0) * sl.qty)), 0),
    (select count(distinct s.id)::bigint from sales s
     where s.created_at >= p_from and s.created_at <= p_to
       and (p_warehouse_id is null or s.warehouse_id = p_warehouse_id)
       and (p_include_voided or s.voided_at is null)),
    coalesce(sum(sl.qty), 0)::bigint
  into v_revenue, v_cogs, v_transaction_count, v_total_items_sold
  from sale_lines sl
  join sales s on s.id = sl.sale_id
  where s.created_at >= p_from and s.created_at <= p_to
    and (p_warehouse_id is null or s.warehouse_id = p_warehouse_id)
    and (p_include_voided or s.voided_at is null);

  if p_include_voided then
    select count(*) filter (where s.voided_at is not null)::bigint into v_voided_count
    from sales s
    where s.created_at >= p_from and s.created_at <= p_to
      and (p_warehouse_id is null or s.warehouse_id = p_warehouse_id);
  end if;

  -- Top selling products
  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_top
  from (
    select jsonb_build_object(
      'product_id', sl.product_id,
      'product_name', max(sl.name),
      'quantity_sold', sum(sl.qty)::bigint,
      'revenue', sum(sl.line_total)
    ) as t
    from sale_lines sl
    join sales s on s.id = sl.sale_id
    where s.created_at >= p_from and s.created_at <= p_to
      and (p_warehouse_id is null or s.warehouse_id = p_warehouse_id)
      and (p_include_voided or s.voided_at is null)
    group by sl.product_id
    order by sum(sl.qty) desc
    limit 10
  ) x;

  -- Sales by day
  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_by_day
  from (
    select jsonb_build_object(
      'date', to_char(date_trunc('day', s.created_at) at time zone 'UTC', 'YYYY-MM-DD'),
      'revenue', sum(s.total),
      'transactions', count(*)::bigint
    ) as t
    from sales s
    where s.created_at >= p_from and s.created_at <= p_to
      and (p_warehouse_id is null or s.warehouse_id = p_warehouse_id)
      and (p_include_voided or s.voided_at is null)
    group by date_trunc('day', s.created_at)
    order by date_trunc('day', s.created_at)
  ) x;

  -- Sales by category
  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_by_cat
  from (
    select jsonb_build_object(
      'category', coalesce(nullif(trim(wp.category), ''), 'Uncategorised'),
      'revenue', sum(sl.line_total),
      'quantity', sum(sl.qty)::bigint
    ) as t
    from sale_lines sl
    join sales s on s.id = sl.sale_id
    left join warehouse_products wp on wp.id = sl.product_id
    where s.created_at >= p_from and s.created_at <= p_to
      and (p_warehouse_id is null or s.warehouse_id = p_warehouse_id)
      and (p_include_voided or s.voided_at is null)
    group by coalesce(nullif(trim(wp.category), ''), 'Uncategorised')
    order by sum(sl.line_total) desc
  ) x;

  return jsonb_build_object(
    'revenue', v_revenue,
    'cogs', v_cogs,
    'profit', v_revenue - v_cogs,
    'transaction_count', v_transaction_count,
    'total_items_sold', v_total_items_sold,
    'average_order_value', case when v_transaction_count > 0 then v_revenue / v_transaction_count else 0 end,
    'total_voided', v_voided_count,
    'top_products', v_top,
    'sales_by_day', v_by_day,
    'sales_by_category', v_by_cat
  );
end;
$$;

comment on function get_sales_report is 'Aggregated sales report: revenue, COGS (from sale_lines.cost_price), profit, AOV, top products, by day, by category. Used by GET /api/reports/sales.';
