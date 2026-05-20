-- OPTIONAL (deferred): heavy view replaced by API join path in warehouseProducts.ts (6290738+).
-- Do not run in SQL Editor if you see statement timeout — not required for production.
--
-- If you later want a DB view for reporting only, use a simple shape without per-row subqueries:
-- CREATE OR REPLACE VIEW v_products_inventory_simple AS
-- SELECT wi.warehouse_id, wp.*, wi.quantity
-- FROM warehouse_inventory wi
-- JOIN warehouse_products wp ON wp.id = wi.product_id;

SELECT 1 AS migration_noop;
