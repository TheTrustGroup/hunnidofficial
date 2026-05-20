-- Root cause of "sized product; size_code must not be OS" on create:
-- trigger backfill_by_size_from_inv_when_empty (drift prevention) inserts OS when
-- warehouse_inventory gets quantity but has no by_size rows. For size_kind = 'sized',
-- OS is forbidden (enforce_size_rules). Only na/one_size products may auto-backfill OS.

create or replace function public.backfill_by_size_from_inv_when_empty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sk text;
begin
  select coalesce(wp.size_kind, 'na') into sk
  from public.warehouse_products wp
  where wp.id = new.product_id;

  if sk = 'sized' then
    return new;
  end if;

  if new.quantity > 0 and not exists (
    select 1 from public.warehouse_inventory_by_size w
    where w.warehouse_id = new.warehouse_id and w.product_id = new.product_id
  ) then
    insert into public.warehouse_inventory_by_size (warehouse_id, product_id, size_code, quantity, updated_at)
    values (new.warehouse_id, new.product_id, 'OS', new.quantity, now())
    on conflict (warehouse_id, product_id, size_code)
    do update set quantity = excluded.quantity, updated_at = excluded.updated_at;
  end if;
  return new;
end;
$$;

comment on function public.backfill_by_size_from_inv_when_empty() is
  'When warehouse_inventory has qty but no by_size rows, insert OS only for na/one_size products; never for sized (enforce_size_rules).';
