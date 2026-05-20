-- Add half sizes (e.g. EU 38.5, 8.5) so products can use .5 sizes.
-- Trigger enforce_size_rules requires size_code to exist in size_codes.
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
      (''EU38.5'', ''EU 38.5'', 94), (''EU39.5'', ''EU 39.5'', 95), (''EU40.5'', ''EU 40.5'', 96),
      (''EU41.5'', ''EU 41.5'', 97), (''EU42.5'', ''EU 42.5'', 98), (''EU43.5'', ''EU 43.5'', 99),
      (''EU44.5'', ''EU 44.5'', 100), (''EU45.5'', ''EU 45.5'', 101), (''EU46.5'', ''EU 46.5'', 102)
    on conflict (size_code) do nothing',
    order_col
  );

  execute format(
    'insert into size_codes (size_code, size_label, %I) values
      (''7.5'', ''7.5'', 71), (''8.5'', ''8.5'', 73), (''9.5'', ''9.5'', 75),
      (''10.5'', ''10.5'', 77), (''11.5'', ''11.5'', 79), (''12.5'', ''12.5'', 81)
    on conflict (size_code) do nothing',
    order_col
  );

  -- EU kids half sizes (EU30–EU37 range)
  execute format(
    'insert into size_codes (size_code, size_label, %I) values
      (''EU30.5'', ''EU 30.5'', 155), (''EU31.5'', ''EU 31.5'', 165), (''EU32.5'', ''EU 32.5'', 175),
      (''EU33.5'', ''EU 33.5'', 185), (''EU34.5'', ''EU 34.5'', 195), (''EU35.5'', ''EU 35.5'', 205),
      (''EU36.5'', ''EU 36.5'', 215), (''EU37.5'', ''EU 37.5'', 225)
    on conflict (size_code) do nothing',
    order_col
  );

  -- Additional US half sizes (smaller and larger)
  execute format(
    'insert into size_codes (size_code, size_label, %I) values
      (''5.5'', ''5.5'', 65), (''6.5'', ''6.5'', 67), (''13.5'', ''13.5'', 83)
    on conflict (size_code) do nothing',
    order_col
  );
end $$;
