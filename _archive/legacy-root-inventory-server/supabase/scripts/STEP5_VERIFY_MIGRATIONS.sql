/*
  Run in Hunnid Supabase SQL Editor after STEP5_RUN_MIGRATIONS_IN_ORDER.sql.
  Each query should return 1 row if the migration was applied.
  Copy and run ONE block at a time (do not copy lines starting with - or this comment).
*/

SELECT 'get_warehouse_inventory_stats' AS object_type, proname AS name
FROM pg_proc WHERE proname = 'get_warehouse_inventory_stats';

SELECT 'sync_warehouse_inventory_from_by_size' AS object_type, proname AS name
FROM pg_proc WHERE proname = 'sync_warehouse_inventory_from_by_size';

SELECT 'trigger_sync_warehouse_inventory_from_by_size' AS object_type, trigger_name AS name
FROM information_schema.triggers WHERE trigger_name = 'trigger_sync_warehouse_inventory_from_by_size';

SELECT 'warehouse_dashboard_stats' AS object_type, viewname AS name
FROM pg_views WHERE viewname = 'warehouse_dashboard_stats';

SELECT 'receive_delivery' AS object_type, proname AS name
FROM pg_proc WHERE proname = 'receive_delivery';

SELECT 'warehouses.admin_email' AS object_type, column_name AS name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'warehouses' AND column_name = 'admin_email';
