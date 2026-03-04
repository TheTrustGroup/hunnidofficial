# Backend performance (Section 3)

## Indexing

| Table / use | Indexes |
|-------------|--------|
| **warehouse_products** | `name` (list order), `lower(name)` (search), `category`, `sku`, `updated_at desc` |
| **warehouse_inventory** | `warehouse_id`, `product_id`, composite `(warehouse_id, product_id)` |
| **warehouse_inventory_by_size** | `warehouse_id`, `product_id`, composite |
| **sales** | `(warehouse_id, created_at desc)`, `(warehouse_id, delivery_status, expected_date)`, `(warehouse_id, created_at)` where delivery_status = 'cancelled' |
| **sale_lines** | `sale_id` |
| **transactions** | `warehouse_id`, `created_at desc`, `transaction_number`, `store_id`, `pos_id`, `operator_id` |
| **stock_movements** | `transaction_id`, `(warehouse_id, product_id)`, `created_at desc` |
| **user_scopes** | `user_email`, `store_id`, `warehouse_id` |

Migration `20250228160000_warehouse_products_name_index.sql` adds `idx_warehouse_products_name` for the default product list `ORDER BY name`.

---

## Pagination and limits

| Endpoint | Default limit | Max limit | Notes |
|----------|----------------|-----------|--------|
| GET /api/products | 500 | 2000 | `limit`, `offset`; `count: 'exact'` for total (can be costly at very large N) |
| GET /api/sales | 100 | 500 | `limit`, `offset`; response `total` = length of current page |
| GET /api/transactions | — | — | Uses `limit`/`offset` from query; Cache-Control 60s |
| GET /api/stock-movements | 100 | 500 | Enforced in `listStockMovements` |

---

## Response caching

- **GET /api/products** (list): `Cache-Control: private, max-age=60`
- **GET /api/sales** (list): `Cache-Control: private, max-age=60`
- **GET /api/transactions**: already `Cache-Control: private, max-age=60`

Private = not cached by shared proxies; browser may cache for 60s per user.

---

## Realtime

- No Supabase Realtime subscriptions are used in this server or in the frontend for inventory/sales. No subscription leak risk.
- Frontend `subscribeToLogs` (DebugPanel) is in-memory only, not Supabase.

---

## Image / assets

- Product images: stored in Supabase Storage (`product-images`). Resize/compress is frontend; backend serves URLs. No server-side image processing.

---

## Applying the index migration

From `inventory-server`:

```bash
npx supabase db push
```

Or run `supabase/migrations/20250228160000_warehouse_products_name_index.sql` in the Supabase SQL Editor.
