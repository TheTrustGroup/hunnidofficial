# Inventory lifecycle and authoritative data store

## Source of truth (production)

| Layer | Role |
|--------|------|
| **Supabase Postgres** (`warehouse_products`, `warehouse_inventory`, `warehouse_inventory_by_size`, `sales`, `sale_lines`) | Canonical data |
| **`api.hunnidofficial.com`** (`inventory-server/`) | All reads/writes for warehouse app |
| **`warehouse.hunnidofficial.com`** (`warehouse-pos/`) | UI only; never writes to DB directly |

Env: `VITE_API_BASE_URL` must point at the inventory API for every production build.

## Write path (add / update product)

1. `InventoryPage` → `InventoryContext.addProduct` / `updateProduct`
2. `POST` or `PUT` → `/api/products` (fallback `/admin/api/products` only on 404)
3. `inventory-server` → Supabase (`warehouse_products` + inventory tables)
4. Images: prefer `POST /api/upload/product-image` → Storage bucket `product-images`; URLs stored in `warehouse_products.images[]`

## Read path (inventory list)

1. `GET /api/products?warehouse_id=…&view=list` (paginated, slim list + size map + one display image)
2. `parseProductsResponse` → `InventoryContext` state
3. Client cache `warehouse_products_<warehouseId>` — **no base64** (Storage/http URLs only)
4. Sidecar `product_images_v1` — optional per-product image override when API omits images

## POS sales

1. `POST /api/sales` with `Idempotency-Key` (offline queue uses `event_id`)
2. `record_sale` RPC — atomic stock deduction + receipt id
3. Offline: IndexedDB `pos_sale_events` → `syncPendingPosSales()` on online / app load

## Client caches (not authoritative)

- `warehouse_products_*` — list fallback, slim images
- `product_images_v1` — display helper
- IndexedDB — offline product mirror + sale outbox (when `VITE_OFFLINE_ENABLED` or sale outbox default on)

## Warehouse IDs

Legacy placeholder `00000000-0000-0000-0000-000000000002` is remapped in API (`resolveWarehouseId`) and client (`warehouseIdRemap.ts`). Canonical Main Jeff: `00000000-0000-0000-0000-000000000001`.
