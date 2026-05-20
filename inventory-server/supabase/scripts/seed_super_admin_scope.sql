-- Add Super Admin (and any admin emails) to user_scopes so POST /api/sales succeeds.
-- Without scope, getEffectiveWarehouseId returns null when body.warehouseId is empty → 400 "warehouseId is required and must be in your scope".
-- Run in Supabase SQL Editor after verify_user_scopes.sql. Safe to run multiple times (uses NOT EXISTS).

-- 1. Main Jeff (MAIN): grant admin@ and any other admin emails
INSERT INTO user_scopes (user_email, store_id, warehouse_id, created_at)
SELECT
  'admin@hunnidofficial.com',
  s.id,
  w.id,
  now()
FROM stores s
JOIN warehouses w ON w.store_id = s.id AND w.code = 'MAIN'
WHERE s.name = 'Main Jeff'
  AND NOT EXISTS (
    SELECT 1 FROM user_scopes us
    WHERE us.user_email = 'admin@hunnidofficial.com'
      AND us.warehouse_id = w.id
  );

-- 2. Hunnid Main (MAINTOWN): same user so they can use both warehouses from the dropdown
INSERT INTO user_scopes (user_email, store_id, warehouse_id, created_at)
SELECT
  'admin@hunnidofficial.com',
  s.id,
  w.id,
  now()
FROM stores s
JOIN warehouses w ON w.store_id = s.id AND w.code = 'MAINTOWN'
WHERE s.name = 'Hunnid Main'
  AND NOT EXISTS (
    SELECT 1 FROM user_scopes us
    WHERE us.user_email = 'admin@hunnidofficial.com'
      AND us.warehouse_id = w.id
  );
