# User-facing errors and trust

**Goal:** Operators see calm, actionable language. Raw Postgres, trigger names, UUIDs, and stack traces never reach the UI.

## Architecture (two layers)

1. **API (`inventory-server/lib/safeError.ts`)** — `toSafeError()` maps known failures to a short `message` in JSON. This is the **source of truth** for what the client may display verbatim.
2. **App (`src/lib/errorMessages.ts`)** — `getUserFriendlyMessage()` maps `Error.message`, HTTP text, and legacy strings to the same tone. Use it for **every** toast, modal, and error boundary.

When you add a new business rule or DB constraint, **update both** (and this table below).

## Tone guidelines

- **Lead with what happened** in plain language, not the system component (“Couldn’t save stock” not “warehouse_inventory insert failed”).
- **One clear action** when possible: refresh, retry, fix a field, or contact admin.
- **No blame** — avoid “Invalid request”; prefer “We couldn’t save this product. Check sizes and quantities, then try again.”
- **No internals** — never show `size_codes`, `enforce_size_rules`, `Supabase`, column names, or SQL.
- **Optional second line** for support: “If this keeps happening, refresh the page or contact support.”

## Recommended copy patterns (inventory / products)

| Situation | Suggested banner / toast |
|-----------|---------------------------|
| Network / offline | “Connection problem. Check your network and try again.” |
| Timeout | “This is taking too long. Check your connection and try again.” |
| Session expired | “Your session expired. Please sign in again.” |
| Permission | “You don’t have permission to do that.” |
| Conflict / edited elsewhere | “This item was updated elsewhere. Refresh the list and try again.” |
| Stock by size / catalog mismatch | “We couldn’t save stock by size. Use sizes from your catalog (not One size), with at least one quantity greater than zero.” |
| Warehouse total out of sync (generic) | “We couldn’t update stock totals. Try again. If it continues, refresh the page.” |
| SKU duplicate | “A product with this SKU already exists. Change the SKU or edit the existing product.” |
| Unknown server error | “Something went wrong on our side. Please try again in a moment.” |

## Preventing trust-breaking regressions

1. **Triggers that touch inventory** — Document in `SUPABASE_BRIEFING.md`. Any new trigger on `warehouse_inventory` or `warehouse_inventory_by_size` must be checked against `warehouse_products.size_kind` when `OS` is involved.
2. **Migrations** — Ship fixes that touch inventory in the same release as the API that depends on them; note coupling in the migration comment.
3. **API contract** — Product create/update routes should always return `{ message: toSafeError(err) }` (or equivalent) on 4xx/5xx, never raw `err.message` from the DB driver.
4. **Manual smoke** — After inventory migrations: create a **multiple sizes** product with mixed zero and positive quantities; confirm save succeeds.
