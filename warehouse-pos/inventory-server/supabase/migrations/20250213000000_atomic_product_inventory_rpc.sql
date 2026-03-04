-- Atomic product + inventory writes. Prevents partial commits (product without inventory or orphaned by_size rows).
-- Create product + inventory + optional by_size in one transaction.
create or replace function create_warehouse_product_atomic(
  p_id uuid,
  p_warehouse_id uuid,
  p_row jsonb,
  p_quantity int default 0,
  p_quantity_by_size jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_product_id uuid;
  v_qty int;
  v_entry jsonb;
  v_size_code text;
  v_size_qty int;
begin
  v_product_id := coalesce((p_row->>'id')::uuid, p_id);
  if v_product_id is null then
    v_product_id := gen_random_uuid();
  end if;

  insert into warehouse_products (
    id, sku, barcode, name, description, category, tags,
    cost_price, selling_price, reorder_level, location, supplier, images, expiry_date,
    created_by, created_at, updated_at, version, size_kind
  ) values (
    v_product_id,
    coalesce(nullif(trim(p_row->>'sku'), ''), v_product_id::text),
    coalesce(trim(p_row->>'barcode'), ''),
    coalesce(nullif(trim(p_row->>'name'), ''), ''),
    coalesce(p_row->>'description', ''),
    coalesce(p_row->>'category', ''),
    coalesce(p_row->'tags', '[]'::jsonb),
    (coalesce((p_row->>'cost_price')::decimal, (p_row->>'costPrice')::decimal, 0)),
    (coalesce((p_row->>'selling_price')::decimal, (p_row->>'sellingPrice')::decimal, 0)),
    (coalesce((p_row->>'reorder_level')::int, (p_row->>'reorderLevel')::int, 0)),
    coalesce(p_row->'location', '{"warehouse":"","aisle":"","rack":"","bin":""}'::jsonb),
    coalesce(p_row->'supplier', '{"name":"","contact":"","email":""}'::jsonb),
    coalesce(p_row->'images', '[]'::jsonb),
    coalesce((p_row->>'expiry_date')::timestamptz, (p_row->>'expiryDate')::timestamptz),
    coalesce(p_row->>'created_by', p_row->>'createdBy', ''),
    coalesce((p_row->>'created_at')::timestamptz, (p_row->>'createdAt')::timestamptz, now()),
    now(),
    coalesce((p_row->>'version')::int, 0),
    case when jsonb_array_length(p_quantity_by_size) > 0 then 'sized'
         else coalesce(lower(nullif(trim(p_row->>'size_kind'), '')), lower(nullif(trim(p_row->>'sizeKind'), '')), 'na') end
  );

  if jsonb_array_length(p_quantity_by_size) > 0 then
    v_qty := 0;
    for v_entry in select * from jsonb_array_elements(p_quantity_by_size)
    loop
      v_size_code := upper(nullif(trim(replace(v_entry->>'sizeCode', ' ', '')), ''));
      if v_size_code is null then v_size_code := 'NA'; end if;
      v_size_qty := greatest(0, floor((v_entry->>'quantity')::numeric));
      v_qty := v_qty + v_size_qty;
      insert into warehouse_inventory_by_size (warehouse_id, product_id, size_code, quantity, updated_at)
      values (p_warehouse_id, v_product_id, v_size_code, v_size_qty, now())
      on conflict (warehouse_id, product_id, size_code) do update set quantity = excluded.quantity, updated_at = excluded.updated_at;
    end loop;
  else
    v_qty := greatest(0, coalesce(p_quantity, 0));
  end if;

  insert into warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
  values (p_warehouse_id, v_product_id, v_qty, now())
  on conflict (warehouse_id, product_id) do update set quantity = excluded.quantity, updated_at = excluded.updated_at;

  return (select to_jsonb(wp) from warehouse_products wp where wp.id = v_product_id);
end;
$$;
