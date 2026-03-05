# Run once: idempotent void_sale (two params)

## Why

The API calls `void_sale(p_sale_id, p_voided_by)`. If your DB has an older one-param or different signature, or you want idempotent behavior (already-voided → no error, no double restore), run this script once.

## Steps

1. Open **Supabase Dashboard** → your project (Hunnid Official) → **SQL Editor**.
2. Open `inventory-server/supabase/scripts/void_sale_idempotent_two_param.sql` in your editor.
3. Copy the entire file contents and paste into the SQL Editor.
4. Click **Run**.
5. Confirm no errors. The function `void_sale(uuid, text)` is now replaced; existing calls from the API will use it.

## Result

- Void flow returns 200 with `alreadyVoided: true` when the sale is already voided (no 409).
- Stock is restored once; re-voiding the same sale is a no-op.
- Sales list shows voided sales with full line items when `include_voided=true`.

No need to run again unless you intentionally change the function.
