-- Drop redundant non-unique index; warehouses_code_key unique index already covers code lookups.
DROP INDEX IF EXISTS public.idx_warehouses_code;
