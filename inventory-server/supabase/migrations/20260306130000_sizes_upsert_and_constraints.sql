-- Data integrity: (1) UPSERT by-size rows instead of DELETE+INSERT so partial payloads
-- do not wipe existing sizes; (2) enforce quantity >= 0 at DB level.
-- See docs/DATA_INTEGRITY.md (Sizes UPSERT).

-- 1. One-time correction: clamp any negative quantities to 0 so constraint can be added
update warehouse_inventory_by_size set quantity = 0 where quantity < 0;
update warehouse_inventory set quantity = 0 where quantity < 0;

-- 2. Constraint: no negative quantity going forward (idempotent: drop then add)
alter table warehouse_inventory_by_size
  drop constraint if exists chk_warehouse_inventory_by_size_quantity_non_negative;
alter table warehouse_inventory_by_size
  add constraint chk_warehouse_inventory_by_size_quantity_non_negative
  check (quantity >= 0);

alter table warehouse_inventory
  drop constraint if exists chk_warehouse_inventory_quantity_non_negative;
alter table warehouse_inventory
  add constraint chk_warehouse_inventory_quantity_non_negative
  check (quantity >= 0);

-- 3. Replace update_warehouse_product_atomic by-size block with UPSERT semantics:
--    - Payload size in list -> INSERT ... ON CONFLICT DO UPDATE (upsert).
--    - Payload size not in list -> DELETE only those size_codes not in payload.
--    - Empty array -> DELETE all by-size rows for (warehouse_id, product_id).
create or replace function update_warehouse_product_atomic(
  p_id uuid,
  p_warehouse_id uuid,
  p_row jsonb,
  p_current_version int,
  p_quantity int default null,
  p_quantity_by_size jsonb default null
)
returns jsonb
language plpgsql
as $$
declare
  v_updated int;
  v_qty int;
  v_entry jsonb;
  v_size_code text;
  v_size_qty int;
  v_size_codes text[] := '{}';
begin
  update warehouse_products set
    sku = coalesce(nullif(trim(p_row->>'sku'), ''), sku),
    barcode = coalesce(trim(p_row->>'barcode'), barcode),
    name = coalesce(nullif(trim(p_row->>'name'), ''), name),
    description = coalesce(p_row->>'description', description),
    category = coalesce(p_row->>'category', category),
    tags = coalesce(p_row->'tags', tags),
    cost_price = coalesce((p_row->>'cost_price')::decimal, (p_row->>'costPrice')::decimal, cost_price),
    selling_price = coalesce((p_row->>'selling_price')::decimal, (p_row->>'sellingPrice')::decimal, selling_price),
    reorder_level = coalesce((p_row->>'reorder_level')::int, (p_row->>'reorderLevel')::int, reorder_level),
    location = coalesce(p_row->'location', location),
    supplier = coalesce(p_row->'supplier', supplier),
    images = coalesce(p_row->'images', images),
    expiry_date = coalesce((p_row->>'expiry_date')::timestamptz, (p_row->>'expiryDate')::timestamptz, expiry_date),
    updated_at = now(),
    version = p_current_version + 1,
    size_kind = coalesce(lower(nullif(trim(p_row->>'size_kind'), '')), lower(nullif(trim(p_row->>'sizeKind'), '')), size_kind)
  where id = p_id and version = p_current_version;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Product was updated by someone else. Please refresh and try again.';
  end if;

  if p_quantity_by_size is not null then
    v_qty := 0;
    if jsonb_array_length(p_quantity_by_size) > 0 then
      for v_entry in select * from jsonb_array_elements(p_quantity_by_size)
      loop
        v_size_code := upper(nullif(trim(replace(v_entry->>'sizeCode', ' ', '')), ''));
        if v_size_code is null then v_size_code := 'NA'; end if;
        v_size_qty := greatest(0, floor((v_entry->>'quantity')::numeric));
        v_qty := v_qty + v_size_qty;
        v_size_codes := array_append(v_size_codes, v_size_code);
        insert into warehouse_inventory_by_size (warehouse_id, product_id, size_code, quantity, updated_at)
        values (p_warehouse_id, p_id, v_size_code, v_size_qty, now())
        on conflict (warehouse_id, product_id, size_code)
        do update set quantity = excluded.quantity, updated_at = excluded.updated_at;
      end loop;
      delete from warehouse_inventory_by_size
      where warehouse_id = p_warehouse_id and product_id = p_id
        and size_code <> all(v_size_codes);
    else
      delete from warehouse_inventory_by_size where warehouse_id = p_warehouse_id and product_id = p_id;
      if p_quantity is not null then
        v_qty := greatest(0, p_quantity);
      end if;
    end if;
    insert into warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
    values (p_warehouse_id, p_id, greatest(0, v_qty), now())
    on conflict (warehouse_id, product_id) do update set quantity = excluded.quantity, updated_at = excluded.updated_at;
  elsif p_quantity is not null then
    insert into warehouse_inventory (warehouse_id, product_id, quantity, updated_at)
    values (p_warehouse_id, p_id, greatest(0, p_quantity), now())
    on conflict (warehouse_id, product_id) do update set quantity = excluded.quantity, updated_at = excluded.updated_at;
  end if;

  return (select to_jsonb(wp) from warehouse_products wp where wp.id = p_id);
end;
$$;
