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
  if (msg.includes('sale_not_found')) return 'Sale not found.';
  if (msg.includes('sale_already_voided')) return 'Sale is already voided.';
  if (msg.includes('duplicate') && (msg.includes('sku') || msg.includes('unique'))) {
    return 'A product with this SKU already exists.';
  }
  if (msg.includes('not null') || msg.includes('violates not-null')) {
    return 'Required field is missing. Check your input and try again.';
  }
  // Product inventory / size rules (Postgres trigger enforce_size_rules, FK to size_codes)
  if (/size_code must not be os\b/.test(msg)) {
    return 'Multiple sizes cannot use One size (OS). Remove any OS row or switch to One size mode, then save.';
  }
  if (/does not exist in public\.size_codes/.test(msg) || /size_code .* does not exist in public\.size_codes/.test(msg)) {
    return 'One or more sizes are not in your catalog. Pick codes from the list or ask an admin to add them.';
  }
  if (/failed to create inventory by size:/i.test(msg) || /failed to update inventory by size:/i.test(msg)) {
    return 'Could not save stock by size. Use catalog sizes (not One size/OS), EU codes like EU36.5 without extra spaces, and at least one positive quantity.';
  }
  if (/failed to create warehouse inventory:/i.test(msg) || /failed to update warehouse inventory:/i.test(msg)) {
    return 'Could not save warehouse stock. Try again or refresh the page.';
  }
  return 'Something went wrong. Please try again.';
}
