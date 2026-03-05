/**
 * Sanitize errors before sending to the client. Never expose Postgres/Supabase
 * internals, stack traces, or raw error.message to the API response.
 */

function getMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}

/**
 * Return a short, user-safe error message for API responses.
 * For known business/constraint codes, returns a clear message; otherwise
 * returns a generic message so we never leak DB or stack details.
 */
export function toSafeError(err: unknown): string {
  const msg = getMessage(err).toLowerCase();
  if (msg.includes('insufficient_stock') || msg.includes('insufficient stock')) {
    return 'Insufficient stock for one or more items. Reduce quantity or remove items and try again.';
  }
  if (msg.includes('invalid_line')) return 'Invalid line items. Ensure each product has an ID; sized products must include size.';
  if (msg.includes('sale_not_found')) return 'Sale not found.';
  if (msg.includes('sale_already_voided')) return 'Sale is already voided.';
  if (msg.includes('duplicate') && (msg.includes('sku') || msg.includes('unique'))) {
    return 'A product with this SKU already exists.';
  }
  if (msg.includes('not null') || msg.includes('violates not-null')) {
    return 'Required field is missing. Check your input and try again.';
  }
  return 'Something went wrong. Please try again.';
}
