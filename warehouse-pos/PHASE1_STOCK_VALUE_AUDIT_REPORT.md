# Phase 1 — Forensic Audit Report: Stock Value & Unit Count Inflation

**Scope:** Warehouse Inventory & POS at warehouse.hunnidofficial.com  
**Audit date:** 2025-03-04  
**Instruction:** Find every source of inflation; do not change code until Phase 3 is approved.

---

## 1. HOW IS TOTAL STOCK VALUE CALCULATED?

### 1.1 Server-side (API: GET /api/dashboard)

There are **two** backend implementations in the repo. Which one is deployed determines behaviour.

#### A. Root `inventory-server/` (inflation source)

| Item | Detail |
|------|--------|
| **Location** | `inventory-server/lib/data/dashboardStats.ts` |
| **Lines** | 86–137 (`getDashboardStats`), specifically 98–108, 114 |
| **Formula** | `totalStockValue += qty * price` where `price = p.sellingPrice ?? 0` |
| **Price used** | **selling_price** (wrong for “cost of stock”) |
| **Quantity source** | Current live from DB: `getProductQty(p)` — sized = sum of `quantityBySize[].quantity`, else `p.quantity` from `warehouse_inventory` |
| **Double-count?** | No. One quantity per product (either sum of sizes or single `quantity`). |
| **Deleted/archived/zero** | No soft-delete in schema; hard-delete only. Zero-stock products are included in the loop (they add 0 to value). |
| **Other warehouses** | No. `getWarehouseProducts(warehouseId, …)` restricts by `warehouse_id`. |
| **Category summary** | Same file: `categorySummary[cat].value += qty * price` with **selling_price** (inflated). |
| **totalUnits** | **Not returned** by this server. `DashboardStatsResult` has no `totalUnits`. |

#### B. Warehouse-POS backend `warehouse-pos/inventory-server/` (cost-correct but capped)

| Item | Detail |
|------|--------|
| **Location** | `warehouse-pos/inventory-server/lib/data/dashboardStats.ts` |
| **Lines** | 99–114, 118–121, 136–138 |
| **Formula** | `totalStockValue += qty * price` where `price = (cost > 0 ? cost : 0)`, `cost = p.costPrice ?? 0` |
| **Price used** | **cost_price** (correct). Null/zero cost → 0. |
| **Quantity source** | Same as A: live from DB via `getProductQty(p)`. |
| **Double-count?** | No. |
| **totalUnits** | Returned: `totalUnits += qty` in loop; included in response. |
| **Category summary** | Uses cost: `categorySummary[cat].value += qty * (cost > 0 ? cost : 0)`. |

**Critical cap:** In **both** backends, `getDashboardStats` calls:

- `getWarehouseProducts(warehouseId, { limit: PRODUCTS_LIMIT })` with `PRODUCTS_LIMIT = 2000`.

But in **both** copies of `warehouseProducts.ts`:

- **Location:** `inventory-server/lib/data/warehouseProducts.ts` and `warehouse-pos/inventory-server/lib/data/warehouseProducts.ts`
- **Line:** 104  
- **Code:** `const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);`

So the dashboard **never** sees more than **100 products**. Stats (totalStockValue, totalUnits, totalProducts, low/out counts, categorySummary) are computed from the **first 100 products** (by name order only; no offset used for dashboard). If the deployed backend is the root one, value is also inflated by **selling_price**.

### 1.2 Client-side (Dashboard page)

| Item | Detail |
|------|--------|
| **Location** | `warehouse-pos/src/pages/DashboardPage.tsx` |
| **Lines** | 244–246, 294–296, 387–388 |
| **Formula** | Dashboard does **not** compute totals. It calls `GET /api/dashboard` and uses `data.totalStockValue` (and optionally `data.totalUnits`) as returned. |
| **Price** | Whatever the API used (selling_price if root server, cost if warehouse-pos server). |
| **Stale/cached** | No. Each load replaces state: `setDashboard(data)`. |

### 1.3 Client-side (Inventory page — local stats)

| Item | Detail |
|------|--------|
| **Location** | `warehouse-pos/src/pages/InventoryPage.tsx` |
| **Lines** | 54–71 (`computeStats`), 356 (`stats = useMemo(() => computeStats(products), [products])`), 826–840 (display) |
| **Formula** | `totalValue += qty * price` with `price = cost > 0 ? cost : 0`, `cost = p.costPrice ?? 0`. So **cost-only**, correct. |
| **Quantity** | `getProductQty(p)`: sized = sum of `quantityBySize[].quantity`, else `p.quantity`. |
| **Double-count?** | No. |
| **Stale/partial?** | **Yes.** `products` is the **paginated/filtered** list in state (e.g. first 50, or filtered subset). So when **no filter**, displayed “Stock value” and “total units” use either: (a) `warehouseStats` from API if present, or (b) `stats` from current `products`. API from root server does **not** return `totalUnits`, so Inventory falls back to `stats.totalUnits` = sum over current page(s) only → **undercount** until all pages loaded. |

### 1.4 Reports (inventory report)

| Item | Detail |
|------|--------|
| **Location** | `warehouse-pos/src/services/reportService.ts` |
| **Lines** | 258–266, 305–310 |
| **Formula** | `totalStockValue = realProducts.reduce((sum, p) => sum + getProductQty(p) * (cost(p) > 0 ? cost(p) : 0), 0)`. **Cost-only.** |
| **Products** | `realProducts` = products passed in (from report fetch, e.g. limit 2000). So report value can be **undercount** if catalog > 2000. |

### 1.5 Client-side dashboardStats (unused by Dashboard page)

| Item | Detail |
|------|--------|
| **Location** | `warehouse-pos/src/lib/dashboardStats.ts` (and `src/lib/dashboardStats.ts` at repo root) |
| **Lines** | 32 (warehouse-pos: `(cost(p) > 0 ? cost(p) : 0)`), 32 (root: `cost(p)` which can be 0) |
| **Usage** | Dashboard page uses **API only**; it does **not** call `computeDashboardStats`. So these files do **not** affect the displayed dashboard totals. |

---

## 2. HOW IS UNIT COUNT CALCULATED?

### 2.1 Server (dashboard API)

- **Root server:** Does **not** compute or return `totalUnits`. So frontend cannot show warehouse-wide unit count from API.
- **Warehouse-pos server:** In `warehouse-pos/inventory-server/lib/data/dashboardStats.ts`, `totalUnits += qty` in the same loop as stock value (line 113), one `qty` per product from `getProductQty(p)`. Same 100-product cap applies.

### 2.2 Quantity per product (no double-count in formula)

- **Source:** For each product, quantity is **either**:
  - Sum of `warehouse_inventory_by_size.quantity` for that product/warehouse (when `sizeKind === 'sized'` and sizes exist), **or**
  - `warehouse_inventory.quantity` for that product/warehouse.
- **Location:** `warehouse-pos/inventory-server/lib/data/warehouseProducts.ts` (and root equivalent) lines 210–216: `quantity = isSized ? sizes.reduce(...) : invMap[...]`. So **one** quantity per product; no double-count between size rows and total.

### 2.3 After a sale (deduction)

- Sales go through `record_sale` (Supabase). That RPC updates:
  - `warehouse_inventory_by_size` (per-size quantities) and
  - `warehouse_inventory.quantity` (total) in one transaction.
- So both are updated; dashboard and list then refetch. They use the **same** derived quantity (sum of sizes or total from `warehouse_inventory`), not both summed together. So **no double-count** from sale flow.

### 2.4 After manual edit (Inventory page)

- Save calls PUT `/api/products`; backend updates `warehouse_inventory` and `warehouse_inventory_by_size`. List/dashboard get quantity the same way as above. No double-count.

### 2.5 Inventory page “total units” display

- **Location:** `warehouse-pos/src/pages/InventoryPage.tsx` lines 828, 839–840.
- **Logic:** `hasFilter ? stats.totalUnits : (warehouseStats?.totalUnits ?? stats.totalUnits)`.
- **Issue:** If API does **not** return `totalUnits` (root server), `warehouseStats?.totalUnits` is undefined → always `stats.totalUnits` = sum over **current** `products` (paginated/filtered). So with no filter and only first page loaded, “total units” = sum of first 50 products → **undercount**. With filter, it’s correctly “filtered list only”.

---

## 3. WHAT TRIGGERS A RECALCULATION?

| Trigger | Location | Recalculates from | Replace or merge |
|--------|----------|-------------------|------------------|
| Initial load (Dashboard) | `DashboardPage.tsx` useEffect `[warehouseId, loadData]` | API `GET /api/dashboard` | **Replace:** `setDashboard(data)` |
| Initial load (Inventory) | `InventoryPage.tsx` useEffect on `warehouseId` | Products API + dashboard API for `warehouseStats` | **Replace:** `setProducts(...)`, `setWarehouseStats(...)` |
| `INVENTORY_UPDATED_EVENT` (Dashboard) | `DashboardPage.tsx` ~267–272 | Same API `loadData(warehouseId)` | **Replace:** `setDashboard(data)` |
| `INVENTORY_UPDATED_EVENT` (Inventory) | `InventoryPage.tsx` ~559–566 | `loadWarehouseStats()` + `loadProducts(0, false, true)` | **Replace:** `setWarehouseStats(...)`, `setProducts(...)` (not append) |
| Tab visibility (Dashboard) | `DashboardPage.tsx` ~275–282 | Same API `loadData(warehouseId)` | **Replace:** `setDashboard(data)` |
| Tab visibility (Inventory) | `InventoryPage.tsx` ~588–594 | `loadProducts(0, false, true)` only (no `loadWarehouseStats`) | **Replace:** `setProducts(...)` |
| Polling (Inventory) | `InventoryPage.tsx` ~504–509, 30s interval | `loadProducts(0, false, true)` when visible | **Replace** |
| Add/Edit product (Inventory) | `InventoryPage.tsx` ~709–711, 745–746 | After save: `loadWarehouseStats()` + `notifyInventoryUpdated()` | **Replace** (stats) + event triggers other pages |

**Refetch adding to existing number:** No. All updates use **replace** (setDashboard, setWarehouseStats, setProducts with full new list or merged-by-id for “load more”). No code path was found that **adds** a new total to a previous total.

---

## 4. THE VISIBILITY REFETCH

### 4.1 Dashboard

- **Location:** `warehouse-pos/src/pages/DashboardPage.tsx` lines 275–282.
- **Code:**
  - `const onVisible = () => { if (document.visibilityState === 'visible') loadData(warehouseId); };`
  - `document.addEventListener('visibilitychange', onVisible);`
  - Cleanup: `removeEventListener('visibilitychange', onVisible)` in useEffect return.
- **Can it fire multiple times on one focus?** Yes. Every time the tab becomes visible, `loadData(warehouseId)` runs. No debounce. Rapid tab switches can start multiple in-flight requests.
- **Race:** When a response arrives, it does `setDashboard(data)`. So the **last** response wins. That can briefly show **stale** (e.g. higher) numbers if an older request completes after a newer one. Not “summing two responses”, but possible **temporal** wrong value.
- **Duplicate listeners?** No. Listener is added once per effect run; dependency is `[warehouseId, loadData]`. Cleanup removes it. So no accumulation of listeners.

### 4.2 Inventory

- **Location:** `warehouse-pos/src/pages/InventoryPage.tsx` lines 588–594.
- **Code:** `onVisible` only runs if `didInitialLoad.current` and `document.visibilityState === 'visible'` and `!modalOpenRef.current`; then `loadProducts(0, false, true)`.
- Same idea: no debounce; multiple visibility events can trigger multiple fetches. State is **replaced**, not summed. Listener is cleaned up on unmount/warehouse change.

---

## 5. notifyInventoryUpdated AND ITS LISTENERS

### 5.1 Implementation

- **Location:** `warehouse-pos/src/lib/inventoryEvents.ts` lines 5–11.
- **Code:** `window.dispatchEvent(new CustomEvent(INVENTORY_UPDATED_EVENT))`. Fires once per call; no debounce or coalescing.

### 5.2 Call sites (who fires the event)

| Call site | File | When |
|-----------|------|------|
| POS sale completed | `warehouse-pos/src/pages/POSPage.tsx` ~370 | After record_sale succeeds and sale result is set. **Once per sale.** |
| Order deduct | `warehouse-pos/src/contexts/OrderContext.tsx` ~146 | After `POST /api/orders/deduct` and `refreshProducts()`. **Once per deduct.** |
| Order return stock | `warehouse-pos/src/contexts/OrderContext.tsx` ~158 | After `POST /api/orders/return-stock` and `refreshProducts()`. **Once per return.** |
| Inventory edit save | `warehouse-pos/src/pages/InventoryPage.tsx` ~711 | After PUT product success. **Once per save.** |
| Inventory add save | `warehouse-pos/src/pages/InventoryPage.tsx` ~746 | After POST product success. **Once per add.** |

So one user action (one sale, one deduct, one return, one save) triggers **one** `notifyInventoryUpdated()` call. No duplicate fire for the same action from these call sites.

### 5.3 Listeners (who reacts)

| Listener | File | Action on event |
|----------|------|------------------|
| Dashboard | `DashboardPage.tsx` ~270 | `loadData(warehouseId)` → fetch dashboard API → `setDashboard(data)` → **replace** |
| Inventory | `InventoryPage.tsx` ~560 | `loadWarehouseStats()` + `loadProducts(0, false, true)` → **replace** stats and product list |

Both listeners **replace** state with fresh data; neither merges or adds to previous totals. So the event itself does **not** cause numeric inflation by accumulation.

---

## 6. WAREHOUSE STATS QUERY

- **There is no dedicated “warehouse stats” SQL query.** Stats are computed in **JavaScript** on the server by:
  1. Calling `getWarehouseProducts(warehouseId, { limit: PRODUCTS_LIMIT })` (effectively **capped at 100** in both codebases).
  2. Iterating the returned array and summing `qty * price` (and `qty` for totalUnits in warehouse-pos server).
- **Exact “query”:** Two Supabase reads:
  - Products: `warehouse_products` with `in('id', warehouseProductIds)`, ordered by name, `.range(0, limit - 1)` (limit 100).
  - Then for those product IDs: `warehouse_inventory` (product_id, quantity) and `warehouse_inventory_by_size` (product_id, size_code, quantity) for the warehouse.
- **Result:** Totals are **not** a single `SUM()` in the DB. They are **sums over at most 100 products**. If the warehouse has more than 100 products, totals are **undercount**. If the deployed server is the root one, value is also **inflated** by using selling_price.
- **Oscillation:** If the product list or order changed between refetches (e.g. new product added), the “first 100” can change, so the displayed total can jump. No evidence of “partial list then corrected upward” as a designed path; the cap itself causes **ceiling** at 100 products.

---

## 7. COST PRICE ACCURACY

- **Schema:** `warehouse_products.cost_price` is `decimal(12,2) not null default 0`. So it can be 0 but not null in DB. In TypeScript, `row.cost_price` is normalized to `Number(row.cost_price ?? 0)`.
- **Root server dashboardStats:** Does **not** use cost_price for stock value; it uses **selling_price**. So even if cost_price is set, total stock value is inflated.
- **Warehouse-pos server dashboardStats:** Uses `cost = p.costPrice ?? 0` and `price = cost > 0 ? cost : 0`. Null/undefined/0 → 0 contribution; no selling_price fallback.
- **Inventory page computeStats:** Same as warehouse-pos server: cost-only, zero for missing/zero cost.
- **reportService:** Cost-only; `cost(p) > 0 ? cost(p) : 0`.
- **Selling price as fallback:** Only in the **root** `inventory-server` dashboard stats (selling_price used for value). That is the main inflation source, not a “fallback” for null cost.

---

## 8. DELETED OR DUPLICATE PRODUCTS

- **Soft-delete:** No `is_deleted`, `archived`, or `deleted_at` in `warehouse_products` or inventory tables. Products are hard-deleted; once deleted they are not in the list, so they are excluded from stats.
- **Duplicate rows in list:** `getWarehouseProducts` returns one row per product id (`.range(offset, offset + limit - 1)` on the product list; inventory joined by product_id). So no duplicate product ids in the array that is summed. No join that would duplicate a product in the dashboard stats loop.

---

# PHASE 2 — FINDINGS SUMMARY

## Per-source summary

### Inflation source 1 — Stock value uses selling_price (root server only)

- **Location:** `inventory-server/lib/data/dashboardStats.ts` lines 106, 114.
- **Root cause:** `totalStockValue` and `categorySummary[cat].value` use `price = p.sellingPrice ?? 0` instead of cost.
- **Impact:** Stock value is **inflated** whenever selling price > cost (typical). Proportional to catalog and margin.
- **Fix:** Use `cost_price` only; treat null/0 cost as 0 (as in warehouse-pos server version).

### Inflation source 2 — Dashboard stats capped at 100 products

- **Location:** `inventory-server/lib/data/warehouseProducts.ts` and `warehouse-pos/inventory-server/lib/data/warehouseProducts.ts` line 104: `limit = Math.min(..., 100)`.
- **Root cause:** Dashboard requests 2000 products but list is capped at 100, so stats are computed from first 100 products only.
- **Impact:** If warehouse has >100 products: **undercount** (total value, total units, total products, low/out counts). Can also cause **apparent** inconsistency (e.g. “total products” = 100 while list shows more after load more).
- **Fix:** Either remove/cap the limit for the dashboard call only (e.g. allow up to 2000 for stats), or (preferred) compute totals in the DB with a single SUM query and stop summing over the product list in JS.

### Inflation source 3 — totalUnits missing from API (root server)

- **Location:** `inventory-server/lib/data/dashboardStats.ts`: `DashboardStatsResult` and return object have no `totalUnits`.
- **Root cause:** Only the warehouse-pos copy of the server returns `totalUnits`.
- **Impact:** Inventory page uses `warehouseStats?.totalUnits ?? stats.totalUnits`. When API doesn’t send `totalUnits`, it shows sum over **current** `products` (paginated) → **undercount** until all pages loaded.
- **Fix:** Return `totalUnits` from dashboard API (and compute it from DB or from full catalog, not from capped 100-product list).

### Not inflation but robustness

- **Visibility refetch:** No debounce; multiple tab focus can cause multiple requests. Last response wins; no summing. Adding a 5s debounce and “replace only” keeps behaviour correct and reduces load.
- **notifyInventoryUpdated:** Single fire per action; listeners replace state. No change needed for inflation; optional to document “single fire” as a rule for future changes.

---

## Summary: Why the numbers are wrong

**The stock value / unit count is inflated or wrong because:**

1. **If the deployed backend is the root `inventory-server`:** Total stock value (and category breakdown) is **inflated** because the server uses **selling_price** instead of **cost_price**. That is the main cause of “slightly inflated” stock value.

2. **Both server copies** compute dashboard stats from a product list that is **capped at 100 products** by `getWarehouseProducts`. So for warehouses with more than 100 products, **total stock value, total units, and total products are undercounted**, and the number can change when the “first 100” set changes.

3. **If the root server is deployed,** it does **not** return **totalUnits**. The Inventory page then falls back to the sum over the **current page(s)** of products in memory, so “total units” (and when used, stock value) can be **undercount** until the user has loaded all pages or the API is fixed to return warehouse-wide totals from the DB.

**Recommended direction for Phase 3:** Use a **single server-side aggregation** (SQL SUM over `warehouse_inventory` / `warehouse_inventory_by_size` and `warehouse_products.cost_price`) for total units and total stock value; return these from the dashboard API; use **cost_price only** and treat null/0 as 0; ensure one source of truth (DB), replace-not-merge on the client, and fix the visibility refetch (e.g. debounce) and any duplicate-event rules as specified in your Phase 3 checklist.

---

*End of Phase 1 report. No code was changed. Awaiting approval before Phase 3.*
