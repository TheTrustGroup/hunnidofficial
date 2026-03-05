-- ============================================================
-- PHASE 2 DIAGNOSTIC QUERIES
-- Run in Supabase Dashboard → SQL Editor.
-- READ-ONLY. Do not modify data.
--
-- PRODUCT IDENTITY: Same name is valid when color (or SKU) differs
-- (e.g. "Adidas Gazelle" Red vs Black). Duplicate = same name
-- AND same color AND same SKU. See docs/DATA_INTEGRITY.md.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- DELIVERIES (sales with delivery_status)
-- ─────────────────────────────────────────────────────────────

-- 1. Count by delivery_status
SELECT
  delivery_status,
  COUNT(*) AS count,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM sales
GROUP BY delivery_status
ORDER BY delivery_status;

-- 2. Per warehouse: counts and status mix
SELECT
  warehouse_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE delivery_status = 'pending')    AS pending,
  COUNT(*) FILTER (WHERE delivery_status = 'dispatched') AS dispatched,
  COUNT(*) FILTER (WHERE delivery_status = 'cancelled')  AS cancelled,
  COUNT(*) FILTER (WHERE delivery_status = 'delivered')  AS delivered,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM sales
GROUP BY warehouse_id;

-- 3. How many rows would the Deliveries page show? (pending=true filter)
-- Uncomment the last line and set a real warehouse_id to scope.
SELECT COUNT(*) AS deliveries_page_count
FROM sales
WHERE delivery_status IN ('pending', 'dispatched', 'cancelled')
  AND (voided_at IS NULL OR true);
  -- AND warehouse_id = '00000000-0000-0000-0000-000000000001';

-- ─────────────────────────────────────────────────────────────
-- SIZES (warehouse_inventory_by_size vs warehouse_inventory)
-- ─────────────────────────────────────────────────────────────

-- 4. Sample products — inventory, size rows, color, SKU (same name + different color = valid variant)
SELECT
  wp.id,
  wp.name,
  wp.sku,
  wp.color,
  wp.size_kind,
  wi.warehouse_id,
  wi.quantity AS inventory_total,
  COUNT(wbs.size_code) AS size_rows_in_db
FROM warehouse_products wp
LEFT JOIN warehouse_inventory         wi ON wi.product_id = wp.id
LEFT JOIN warehouse_inventory_by_size wbs ON wbs.product_id = wp.id
  AND (wi.warehouse_id IS NULL OR wbs.warehouse_id = wi.warehouse_id)
GROUP BY wp.id, wp.name, wp.sku, wp.color, wp.size_kind, wi.warehouse_id, wi.quantity
ORDER BY wp.name, wp.color NULLS LAST, wp.sku
LIMIT 10;

-- 5. Sized products with ZERO size records (problem)
SELECT
  wp.id,
  wp.name,
  wp.size_kind,
  wi.warehouse_id,
  wi.quantity AS total_qty,
  'NO SIZE ROWS — needs fix' AS diagnosis
FROM warehouse_products wp
LEFT JOIN warehouse_inventory         wi ON wi.product_id = wp.id
LEFT JOIN warehouse_inventory_by_size wbs ON wbs.product_id = wp.id
  AND (wi.warehouse_id IS NULL OR wbs.warehouse_id = wi.warehouse_id)
WHERE wp.size_kind = 'sized'
  AND wbs.size_code IS NULL
ORDER BY wp.name;

-- 6. Phantom stock: warehouse_inventory.quantity != SUM(sizes)
SELECT
  wp.id,
  wp.name,
  wi.quantity AS stored_total,
  COALESCE(SUM(wis.quantity), 0)::bigint AS actual_from_sizes,
  (wi.quantity - COALESCE(SUM(wis.quantity), 0)) AS phantom_units
FROM warehouse_products wp
JOIN warehouse_inventory wi ON wi.product_id = wp.id
LEFT JOIN warehouse_inventory_by_size wis
  ON wis.warehouse_id = wi.warehouse_id AND wis.product_id = wp.id
WHERE wp.size_kind = 'sized'
GROUP BY wp.id, wp.name, wi.quantity
HAVING wi.quantity != COALESCE(SUM(wis.quantity), 0)
ORDER BY phantom_units DESC;

-- 7. Size records with negative or NULL quantity
SELECT wis.*, wp.name AS product_name
FROM warehouse_inventory_by_size wis
JOIN warehouse_products wp ON wp.id = wis.product_id
WHERE wis.quantity < 0 OR wis.quantity IS NULL;

-- 8. Orphaned size records (no parent product)
SELECT wis.*
FROM warehouse_inventory_by_size wis
LEFT JOIN warehouse_products wp ON wp.id = wis.product_id
WHERE wp.id IS NULL;

-- 9. Inventory total out of sync with sum of sizes (alternate form)
SELECT
  wp.id,
  wp.name,
  wp.size_kind,
  wi.warehouse_id,
  wi.quantity AS inventory_total,
  SUM(wbs.quantity) AS sum_of_sizes,
  'Inventory total out of sync with sizes' AS diagnosis
FROM warehouse_products wp
JOIN warehouse_inventory         wi ON wi.product_id = wp.id
JOIN warehouse_inventory_by_size wbs ON wbs.product_id = wp.id AND wbs.warehouse_id = wi.warehouse_id
WHERE wp.size_kind = 'sized'
GROUP BY wp.id, wp.name, wp.size_kind, wi.warehouse_id, wi.quantity
HAVING wi.quantity != SUM(wbs.quantity);

-- ─────────────────────────────────────────────────────────────
-- PRODUCT IDENTITY — true duplicates only (same name + same color + same SKU)
-- Same name with different color/SKU = valid variant; do not flag.
-- ─────────────────────────────────────────────────────────────

-- 10. Potential true duplicates: identical (name, color, sku)
SELECT
  trim(lower(wp.name))     AS name_norm,
  coalesce(trim(wp.color), '') AS color,
  coalesce(trim(wp.sku), '')  AS sku,
  count(*)                 AS product_count,
  array_agg(wp.id ORDER BY wp.created_at) AS product_ids,
  array_agg(wp.name ORDER BY wp.created_at) AS names_raw
FROM warehouse_products wp
GROUP BY trim(lower(wp.name)), coalesce(trim(wp.color), ''), coalesce(trim(wp.sku), '')
HAVING count(*) > 1
ORDER BY product_count DESC;
