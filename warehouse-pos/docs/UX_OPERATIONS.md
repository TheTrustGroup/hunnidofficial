# UI/UX & operational excellence (Section 4)

## Implemented

### 1. **409 Insufficient stock — clear cashier feedback**

- **Backend:** POST /api/sales returns **409** when `record_sale` raises `INSUFFICIENT_STOCK` (e.g. two cashiers sold the last unit; one succeeds, the other gets 409).
- **Frontend (POSPage):**
  - On 409 / message containing `INSUFFICIENT_STOCK`, the POS shows: *"Insufficient stock for one or more items. Reduce quantity or remove items and try again."*
  - Cart is **preserved** (no clear); cashier can reduce qty or remove the line and tap Charge again.
  - Generic *"Sale failed to sync — check connection…"* is shown only when the failure is **not** insufficient stock (e.g. network error).
- **errorMessages.ts:** `getUserFriendlyMessage()` maps `insufficient_stock` / `insufficient stock` to the same message for use in POS.tsx and other flows.

### 2. **Network / sync failure (existing)**

- If POST /api/sales fails for other reasons (timeout, 5xx, connection): cart is preserved, toast says to check connection and try again. No local stock deduction so UI stays in sync with server when they retry.

---

## POS flow (current)

- **Charge:** Tap payment (Cash/MoMo/Card) → POST /api/sales → on success: cart cleared, success screen + receipt. On 409: cart kept, insufficient-stock toast. On network error: cart kept, sync-fail toast.
- **Loading:** `charging` state disables the charge button and shows loading during the request.
- **New sale:** Clears result and cart; triggers product re-fetch so stock is ground truth.

---

## Known limitation: cart lost on browser crash

- **Cart is client-only.** If the browser crashes or the tab is closed before the cashier taps Charge, the current cart is lost. There is no server-side draft or recovery.
- **Optional improvement:** Persist cart to `localStorage` (e.g. keyed by session or warehouse) and restore on POS load; or document as accepted risk.

---

## Recommendations (not implemented)

- **Barcode/QR:** No scanner integration in codebase. For fast lookup, add a barcode input or hardware scanner that sets search or adds product by code (e.g. `warehouse_products.barcode`).
- **Keyboard shortcuts:** No global shortcuts (e.g. F2 = new sale, F4 = focus search). Add in POSPage or a wrapper (e.g. `useEffect` with `keydown`).
- **Offline POS:** Current flow requires API for POST /api/sales. Offline queue (enqueuePosEvent) exists in POSContext for a different path; POSPage uses direct POST. For true offline sales, queue sale events when offline and sync when back online (with conflict handling).
- **Mobile/tablet:** Layout is responsive; test on target devices for touch targets and readability. No dedicated “tablet” layout.
