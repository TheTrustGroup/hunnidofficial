# Sunset: POST /api/transactions (legacy)

## What “turn off ALLOW_LEGACY_TRANSACTION_POST” means

The API only accepts **legacy** checkout POSTs when this Vercel env var is set **exactly** to `true`:

| Setting | POST /api/transactions |
|---------|-------------------------|
| Unset or any other value | **410 Gone** — `code: USE_SALES_API` |
| `ALLOW_LEGACY_TRANSACTION_POST=true` | Allowed — writes to old `transactions` table via `process_sale` |

**Turning it off** = delete the variable (or change it to `false`) on the **inventory-server** Vercel project, then **redeploy**. You are not changing app code; you close the old door so every client must use **`POST /api/sales`**.

The current Hunnid frontend and offline queue already use `/api/sales`. You enabled `true` only while checking that nothing else still hits the legacy path.

## How to confirm nothing still uses legacy POST

1. **Run normal business** for a few days (POS sales, offline replay if enabled).
2. In **Vercel → API project → Logs**, search:
   - `legacy_transactions_post` — each hit is a real legacy sale (should be **zero** for app-only use).
   - `legacy_transactions_rejected` — clients got 410 (good after you turn the flag off).
3. Optional: Supabase SQL — compare recent rows:
   ```sql
   -- New POS path (last 7 days)
   SELECT count(*) FROM sales WHERE created_at > now() - interval '7 days';
   -- Legacy path (last 7 days) — should stop growing after sunset
   SELECT count(*) FROM transactions WHERE created_at > now() - interval '7 days';
   ```

When `legacy_transactions_post` does not appear in logs and `transactions` row count stops increasing, you are safe to turn the flag off.

## Turn off (production)

1. Vercel → project with Root Directory **`inventory-server`**
2. **Settings → Environment Variables**
3. Delete **`ALLOW_LEGACY_TRANSACTION_POST`** (or set to `false` for all environments)
4. **Redeploy** production

## If something breaks after turn-off

- Symptom: 410 responses on `POST /api/transactions`
- Fix: update that client to `POST /api/sales`, or temporarily set `ALLOW_LEGACY_TRANSACTION_POST=true` again while you fix it

See [SALES_API.md](./SALES_API.md) for the canonical contract.
