-- Seed: Main Jeff (store + one warehouse "Main Jeff", code MAIN); Hunnid Main (store + warehouse).
-- Post-merge: one Hunnid Main; one warehouse for Main Jeff location (MAIN only; DC removed).
-- POS logins (see POS_CREDENTIALS.md):
--   Main Jeff:  jcashier@hunnidofficial.com
--   Hunnid Main: hcashier@hunnidofficial.com
-- Run in Supabase SQL Editor. Safe to run multiple times.

-- 1. Ensure store "Main Jeff" exists
INSERT INTO stores (id, name, status, created_at, updated_at)
SELECT gen_random_uuid(), 'Main Jeff', 'active', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = 'Main Jeff');

-- 2. Warehouse "Main Jeff" (code MAIN) — single warehouse for Main Jeff location
INSERT INTO warehouses (id, name, code, created_at, updated_at)
SELECT gen_random_uuid(), 'Main Jeff', 'MAIN', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code = 'MAIN');

UPDATE warehouses
SET store_id = (SELECT id FROM stores WHERE name = 'Main Jeff' LIMIT 1)
WHERE code = 'MAIN';

-- 3. Store "Hunnid Main"
INSERT INTO stores (id, name, status, created_at, updated_at)
SELECT gen_random_uuid(), 'Hunnid Main', 'active', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = 'Hunnid Main');

-- 4. Warehouse "Hunnid Main" (code MAINTOWN)
INSERT INTO warehouses (id, name, code, created_at, updated_at)
SELECT gen_random_uuid(), 'Hunnid Main', 'MAINTOWN', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code = 'MAINTOWN');

UPDATE warehouses
SET store_id = (SELECT id FROM stores WHERE name = 'Hunnid Main' LIMIT 1)
WHERE code = 'MAINTOWN';

-- 5. User scope: Main Jeff POS — jcashier@hunnidofficial.com (warehouse MAIN only)
INSERT INTO user_scopes (user_email, store_id, warehouse_id, created_at)
SELECT
  'jcashier@hunnidofficial.com',
  s.id,
  w.id,
  now()
FROM stores s
JOIN warehouses w ON w.store_id = s.id AND w.code = 'MAIN'
WHERE s.name = 'Main Jeff'
  AND NOT EXISTS (
    SELECT 1 FROM user_scopes us
    WHERE us.user_email = 'jcashier@hunnidofficial.com'
      AND us.warehouse_id = w.id
  );

-- 6. User scope: Hunnid Main POS — hcashier@hunnidofficial.com
INSERT INTO user_scopes (user_email, store_id, warehouse_id, created_at)
SELECT
  'hcashier@hunnidofficial.com',
  s.id,
  w.id,
  now()
FROM stores s
JOIN warehouses w ON w.code = 'MAINTOWN' AND w.store_id = s.id
WHERE s.name = 'Hunnid Main'
  AND NOT EXISTS (
    SELECT 1 FROM user_scopes us
    WHERE us.user_email = 'hcashier@hunnidofficial.com'
      AND us.warehouse_id = w.id
  );

-- 7. Enforce display names: warehouse name must match POS location (Main Jeff / Hunnid Main)
UPDATE warehouses SET name = 'Main Jeff' WHERE code = 'MAIN';
UPDATE warehouses SET name = 'Hunnid Main' WHERE code = 'MAINTOWN';
