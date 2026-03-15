# POS Location Optimization

## Wiring audit (single source of truth)

| Concern | Implementation | Status |
|--------|----------------|--------|
| **Warehouse for POS** | `WarehouseContext`: `effectiveWarehouseId` = `boundWarehouseId` \|\| `currentWarehouseId`. POS page uses `currentWarehouse` (context) → local `warehouse` in sync. | ✓ |
| **Product load** | POS runs `loadProducts(warehouse.id)` when `!sessionOpen && warehouse?.id`. Bound: session closed immediately; `currentWarehouse` from `KNOWN_WAREHOUSE_NAMES` so id is correct on first paint. | ✓ |
| **Sales / Reports / Deliveries** | All use `currentWarehouseId` from context; API calls pass `warehouse_id`. Bound users see only their location. | ✓ |
| **Inventory hidden at POS** | Sidebar filters out Inventory when `isWarehouseBoundToSession`; CASHIER has no `INVENTORY.VIEW`; `/inventory` redirects to `/pos` when bound. | ✓ |
| **API base URL** | Single `API_BASE_URL` from `lib/api.ts` (VITE_API_BASE_URL); all routes use it. Production build fails if unset. | ✓ |
| **Auth → warehouse binding** | Login response /me sets `user.warehouseId` for POS emails; `AuthContext` fallback uses `getDefaultWarehouseIdForPosEmail`. `WarehouseContext` reads `auth?.user?.warehouseId` → `boundWarehouseId`. | ✓ |

## What’s in place

- **Reports open for POS:** Reports route is gated by permission only (`VIEW_SALES` / `VIEW_INVENTORY` / `VIEW_PROFIT`). Cashiers with `VIEW_SALES` can open Reports without being redirected.
- **Reports per location:** Sales data is requested with `warehouse_id` from `WarehouseContext`. At POS locations (bound session), that is the location’s warehouse so Reports show that location only. The Reports page shows “Reporting for: {location name}” when bound.
- **Cashiers see Sales only:** On Reports, the Inventory Report tab is shown only to users with `REPORTS.VIEW_INVENTORY` (managers/admins). Cashiers see only the Sales Report tab.
- **Fast start at POS:** When `isWarehouseBoundToSession` is true (Main Store or Main Town cashier), the session screen is skipped and the product grid loads immediately.
- **Faster first load at POS locations:** When the session is bound to a warehouse, `/api/warehouses` is not fetched; `isLoading` is set false immediately so POS can load products without waiting. Display uses `KNOWN_WAREHOUSE_NAMES` for location name.

## Senior-engineer recommendations

1. **Keep API scoped by warehouse:** Ensure `GET /api/sales` and any report APIs respect `warehouse_id` and, for bound POS users, that the backend restricts data to the user’s `warehouseId` when provided.
2. **Product list:** POS already loads products by `warehouse_id`; InventoryContext caches per warehouse. No change needed unless you add more warehouses.
3. **Offline:** For unreliable networks, consider keeping a small offline cache of products per location (e.g. last N products or last sync) so POS stays usable; balance with staleness.
4. **Reports performance:** Sales report uses a 2000-item limit; for very high volume, add date-range guidance or pagination on the server.
5. **Session UX:** Bound POS has no session picker; optional “Start day” or “Shift” label (non-blocking) could be added later for audit without adding a modal.

## Large cart (bulk checkout) support

- **POST /api/sales** uses `maxDuration = 60` (inventory-server) so checkouts with 70+ line items can complete. If the deployment platform caps function duration lower (e.g. 15s on some plans), increase the platform limit or document the cap and set the client timeout in POSPage above it so users see "Taking longer than usual" instead of an early abort.
- **Client timeout:** POS uses 65_000 ms so the request is not aborted before the server (60s) can respond. On timeout, the toast shows: "Sale took too long (many items). Try again or split into smaller sales."

## POS UI minimalism (sleek, one-path flow)

- **Size picker (sized products):** Single path only. No global "Quantity" when product has sizes; no per-row "Add" buttons. Rows: checkbox + size + stock; when selected, compact − qty +. One sticky "Add to cart" at bottom (always visible; disabled with "Select sizes above" when nothing selected). One line of copy: "Select sizes and quantity, then tap Add to cart." Layout: scrollable body + sticky footer so the CTA never scrolls away.
- **Non-sized products:** Single quantity control + one "Add to cart" button with price; no size list.

**Optional future polish (from UX review):**

- **Header vs sidebar:** Warehouse/location ("Main Jeff") appears in both sidebar and POS header; consider showing only in header on POS to reduce duplication.
- **Categories:** Normalize or merge duplicate labels (e.g. "Sneaker" vs "Sneakers") in category filters so one canonical label per category.
- **SCAN prominence:** Consider integrating scan as secondary to search (e.g. icon in search bar) for a calmer header.
- **Product cards:** Consider hiding full size breakdown (EU40:3, EU41:4…) on the card and revealing in the size picker on tap for a cleaner grid.

## Optimizations applied

- **Skip `/api/warehouses` when bound:** At POS locations (Main Store / Main Town), the app no longer waits for the warehouse list; it sets `isLoading` false and uses `KNOWN_WAREHOUSE_NAMES` for the location label. POS product load can start as soon as auth is ready.
- **Product load guard:** POS only calls `loadProducts` when `warehouse?.id` is truthy; on API failure, state is set to `[]` and the empty state offers “Retry loading products.”
