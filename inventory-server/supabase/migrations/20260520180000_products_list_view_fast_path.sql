-- Fast warehouse-scoped product list: one row per (warehouse, product) for GET /api/products.
-- Includes products that only exist in warehouse_inventory_by_size (union), not only warehouse_inventory.

CREATE OR REPLACE VIEW v_products_inventory AS
WITH warehouse_product_keys AS (
  SELECT warehouse_id, product_id FROM warehouse_inventory
  UNION
  SELECT warehouse_id, product_id FROM warehouse_inventory_by_size
)
SELECT
  wp.id,
  wpk.warehouse_id,
  wp.sku,
  wp.barcode,
  wp.name,
  wp.description,
  wp.category,
  wp.color,
  wp.size_kind AS "sizeKind",
  wp.selling_price AS "sellingPrice",
  wp.cost_price AS "costPrice",
  wp.reorder_level AS "reorderLevel",
  wp.location,
  wp.supplier,
  wp.tags,
  wp.images,
  wp.version,
  wp.created_at AS "createdAt",
  wp.updated_at AS "updatedAt",
  COALESCE(wi.quantity, 0) AS quantity,
  (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'sizeCode', upper(trim(wbs.size_code)),
          'sizeLabel', COALESCE(sc.size_label, upper(trim(wbs.size_code))),
          'quantity', wbs.quantity
        )
        ORDER BY wbs.size_code
      ),
      '[]'::jsonb
    )
    FROM warehouse_inventory_by_size wbs
    LEFT JOIN size_codes sc ON sc.size_code = wbs.size_code
    WHERE wbs.warehouse_id = wpk.warehouse_id
      AND wbs.product_id = wp.id
  ) AS "quantityBySize"
FROM warehouse_product_keys wpk
JOIN warehouse_products wp ON wp.id = wpk.product_id
LEFT JOIN warehouse_inventory wi
  ON wi.warehouse_id = wpk.warehouse_id AND wi.product_id = wp.id;

COMMENT ON VIEW v_products_inventory IS 'Paginated product list per warehouse; used by GET /api/products fast path.';
