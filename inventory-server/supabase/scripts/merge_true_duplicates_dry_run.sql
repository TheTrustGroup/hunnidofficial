-- ============================================================
-- DRY RUN: Merge impact for true duplicate pairs
-- READ-ONLY. Run before merge_true_duplicates.sql.
-- Shows inventory, size rows, and sale_lines that will be merged.
-- ============================================================

WITH pairs AS (
  SELECT * FROM (VALUES
    ('aa4f267e-286b-4e73-a837-b895fcc3e25a'::uuid, 'cf6d6db0-fef6-4782-a2ca-0504af057276'::uuid),
    ('14591a03-9662-497f-a7e9-6887211df878'::uuid, 'a2a5ce1c-fe34-4fbb-9ba5-2cc67bc5652c'::uuid)
  ) AS t(keeper_id, duplicate_id)
),
impact AS (
  SELECT
    p.keeper_id,
    p.duplicate_id,
    wp.name,
    wp.sku,
    wp.color,
    (SELECT count(*) FROM warehouse_inventory WHERE product_id = p.duplicate_id) AS wi_rows,
    (SELECT coalesce(sum(quantity), 0) FROM warehouse_inventory WHERE product_id = p.duplicate_id) AS wi_qty_total,
    (SELECT count(*) FROM warehouse_inventory_by_size WHERE product_id = p.duplicate_id) AS wibs_rows,
    (SELECT coalesce(sum(quantity), 0) FROM warehouse_inventory_by_size WHERE product_id = p.duplicate_id) AS wibs_qty_total,
    (SELECT count(*) FROM sale_lines WHERE product_id = p.duplicate_id) AS sale_lines_count
  FROM pairs p
  JOIN warehouse_products wp ON wp.id = p.duplicate_id
)
SELECT
  keeper_id,
  duplicate_id,
  name,
  sku,
  color,
  wi_rows,
  wi_qty_total::bigint AS wi_qty_total,
  wibs_rows,
  wibs_qty_total::bigint AS wibs_qty_total,
  sale_lines_count
FROM impact
ORDER BY name;
