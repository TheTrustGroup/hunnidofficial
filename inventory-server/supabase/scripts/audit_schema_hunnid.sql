-- Audit: See exactly what schema Hunnid already has
-- Run in Hunnid Supabase SQL Editor before planning migrations.
-- Use output to compare: what it needs vs what it already has.

-- 1. All existing triggers
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 2. All existing views
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- 3. All existing functions/RPCs
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;

-- 4. All existing indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. All existing constraints
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

-- 6. All columns on key tables
-- (e.g. confirms if cost_price on sale_lines exists)
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

-- 7. pg_cron jobs (optional: only if pg_cron extension is enabled)
-- If you have pg_cron, run this separately in SQL Editor:
--   SELECT jobname, schedule, command, active FROM cron.job ORDER BY jobname;

-- 8. RLS status on all tables
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
