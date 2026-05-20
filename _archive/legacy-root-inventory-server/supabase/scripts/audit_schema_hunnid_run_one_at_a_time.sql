-- ============================================================
-- RUN EACH QUERY BELOW SEPARATELY IN SUPABASE SQL EDITOR
-- Copy one block, paste, Run. Then copy the next block.
-- ============================================================

-- ----------  QUERY 1: Triggers  ----------
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;


-- ----------  QUERY 2: Views  ----------
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;


-- ----------  QUERY 3: Functions/RPCs  ----------
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;


-- ----------  QUERY 4: Indexes  ----------
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ----------  QUERY 5: Constraints (optional)  ----------
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name;


-- ----------  QUERY 6: Columns on key tables  ----------
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'sales',
    'sale_lines',
    'warehouse_products',
    'warehouse_inventory',
    'warehouse_inventory_by_size',
    'deliveries',
    'users',
    'warehouses'
  )
ORDER BY table_name, ordinal_position;
