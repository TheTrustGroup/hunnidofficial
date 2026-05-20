-- Phase 2 Rebirth: Confirm every user points to a real warehouse UUID.
-- Run in Supabase SQL Editor. Hunnid uses user_scopes.user_email (no user_id).

SELECT
  u.email,
  us.warehouse_id,
  w.name AS warehouse_name,
  w.code AS warehouse_code,
  u.raw_user_meta_data->>'warehouseId' AS meta_warehouse_id
FROM auth.users u
LEFT JOIN user_scopes us ON us.user_email = LOWER(TRIM(u.email))
LEFT JOIN warehouses w ON w.id = us.warehouse_id
ORDER BY u.email;
