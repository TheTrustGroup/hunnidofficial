-- Complete EU shoe range for Main Jeff (sneakers/shoes): EU22.5 through EU47.
-- Adds missing: EU22.5, EU23.5–EU29.5, EU47. (EU30.5–EU46.5 and full sizes exist from earlier migrations.)
-- Works whether the table has size_order or sort_order.

do $$
declare
  order_col text;
begin
  select case
    when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'size_codes' and column_name = 'sort_order')
    then 'sort_order'
    else 'size_order'
  end into order_col;

  execute format(
    'insert into size_codes (size_code, size_label, %I) values
      (''EU22.5'', ''EU 22.5'', 69),
      (''EU23.5'', ''EU 23.5'', 71), (''EU24.5'', ''EU 24.5'', 73), (''EU25.5'', ''EU 25.5'', 75),
      (''EU26.5'', ''EU 26.5'', 77), (''EU27.5'', ''EU 27.5'', 79), (''EU28.5'', ''EU 28.5'', 81),
      (''EU29.5'', ''EU 29.5'', 83),
      (''EU47'', ''EU 47'', 103)
    on conflict (size_code) do nothing',
    order_col
  );
end $$;
