# Sales API (canonical)

## POS checkout and offline replay

| Method | Path | RPC | Purpose |
|--------|------|-----|---------|
| POST | `/api/sales` | `record_sale` | Atomic sale + stock deduction |
| GET | `/api/sales` | — | List sales (history, deliveries) |

Idempotency: header `Idempotency-Key` or body `clientEventId` (UUID). Enforced in `record_sale` before stock deduction (`p_client_event_id`).

## Legacy (deprecated)

| Method | Path | Status |
|--------|------|--------|
| POST | `/api/transactions` | **410** unless `ALLOW_LEGACY_TRANSACTION_POST=true` |
| GET | `/api/transactions` | Read-only; admin/scoped reporting of old `transactions` rows |

Do not point new clients at `process_sale` / `transactions`. The frontend POS and IndexedDB outbox use `/api/sales` only.

## Sunset legacy POST

See [LEGACY_TRANSACTIONS_SUNSET.md](./LEGACY_TRANSACTIONS_SUNSET.md) for how to verify Vercel logs and remove `ALLOW_LEGACY_TRANSACTION_POST`.
