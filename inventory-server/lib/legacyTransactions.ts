/**
 * Legacy `transactions` table + POST /api/transactions (process_sale RPC).
 * POS and offline replay must use POST /api/sales (record_sale) only.
 */

/** When false (default), POST /api/transactions returns 410. Set ALLOW_LEGACY_TRANSACTION_POST=true only for migration tooling. */
export function isLegacyTransactionPostAllowed(): boolean {
  return process.env.ALLOW_LEGACY_TRANSACTION_POST === 'true';
}
