/**
 * User-friendly error messages and error classification.
 * Use for toasts and error boundaries so users see clear, actionable text instead of raw errors.
 */

/** Default when no known pattern matches — never show raw API/DB text. */
export const GENERIC_USER_ERROR = 'Something went wrong. Please try again.';

/** POS checkout — keep short and cart-focused. */
export const INVENTORY_ERRORS = {
  productArchivedBecauseSold:
    'Removed from inventory. Sales history is kept, so this product is hidden from POS and the catalog.',
  productRemoved: 'Product removed.',
} as const;

export const POS_ERRORS = {
  insufficientStock:
    'Insufficient stock for one or more items. Reduce quantity or remove items and try again.',
  sessionExpired: 'Your session expired. Please sign in again.',
  serviceUnavailable: 'Checkout is temporarily unavailable. Try again in a moment or contact support.',
  warehouseAccess: "You don't have access to record sales for this warehouse.",
  syncFailed: "We couldn't complete this sale. Check your connection and try again. Your cart is still here.",
  offlineSaveFailed: "We couldn't save this sale on this device. Check storage and try again.",
  tooManyLines: 'Too many items in one sale. Split into smaller sales and try again.',
  invalidSale: 'Some sale details look wrong. Check the warehouse and try again.',
} as const;

function looksLikeInternalError(msg: string): boolean {
  const str = msg.toLowerCase();
  return (
    /size_code|warehouse_inventory|violates (foreign key|check)|null value in column|postgres|supabase|rpc\b|migration|\.ts\b|\.js\b| at \w+\./i.test(
      msg
    ) ||
    /invalid products response|unexpected token|zod|schema|json parse|http \d{3}:/i.test(str) ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(msg) ||
    str.includes('failed to create warehouse inventory') ||
    str.includes('failed to update warehouse inventory') ||
    str.includes('enforce_size_rules')
  );
}

/**
 * Map known error patterns to short, user-friendly messages.
 * Add new mappings here as you discover recurring errors.
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error == null) return GENERIC_USER_ERROR;

  const msg = error instanceof Error ? error.message : String(error);
  const str = msg.toLowerCase();

  // Network / connectivity
  if (str.includes('failed to fetch') || str.includes('network error') || str.includes('load failed')) {
    return 'Connection problem. Check your network and try again.';
  }
  if (str.includes('timeout') || str.includes('timed out') || str.includes('vite_api_base_url')) {
    return 'This is taking too long. Check your connection and try again.';
  }
  if (str.includes('server is temporarily unavailable') || str.includes('circuit')) {
    return 'Server is temporarily unavailable. Using last saved data. Try again in a moment.';
  }

  // HTTP status (often embedded in thrown Error.message)
  if (str.includes('401') || str.includes('unauthorized')) {
    return 'Your session expired. Please sign in again.';
  }
  if (str.includes('403') || str.includes('forbidden')) {
    return "You don't have permission to do that.";
  }
  if (str.includes('404') || str.includes('not found')) {
    return 'The requested item was not found.';
  }
  if (
    str.includes('sale_lines_product_id_fkey') ||
    (str.includes('sale_lines') && str.includes('foreign key')) ||
    str.includes('sales history')
  ) {
    return INVENTORY_ERRORS.productArchivedBecauseSold;
  }
  if (str.includes('insufficient_stock') || str.includes('insufficient stock')) {
    return POS_ERRORS.insufficientStock;
  }
  if (str.includes('409') || str.includes('conflict') || str.includes('someone else') || str.includes('modified by')) {
    return 'This was changed elsewhere. Please refresh and try again.';
  }
  if (str.includes('422') || str.includes('validation')) {
    return 'We could not save this. Check required fields and sizes, then try again.';
  }
  if (str.includes('429') || str.includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (str.includes('503') || str.includes('unavailable') || str.includes('sale processing unavailable')) {
    return POS_ERRORS.serviceUnavailable;
  }
  if (str.includes('500') || str.includes('502') || str.includes('504')) {
    return 'Something went wrong on our side. Please try again in a moment.';
  }

  // Chunk / module load failures (stale deploy, CDN cache, network)
  if (
    str.includes('importing a module script failed') ||
    str.includes('loading chunk') ||
    str.includes('failed to fetch dynamically imported module') ||
    str.includes('error loading dynamically imported module')
  ) {
    return 'A new version may be available or a file failed to load. Refresh the page to continue.';
  }

  // Abort (user navigated away or cancelled)
  if (str.includes('abort')) {
    return 'Request was cancelled.';
  }

  // Storage
  if (str.includes('quota') || str.includes('storage')) {
    return 'Storage is full. Free some space or clear old data and try again.';
  }

  // Auth
  if (str.includes('invalid credentials') || str.includes('wrong password')) {
    return 'Invalid email or password. Please try again.';
  }
  if (str.includes('login') && (str.includes('fail') || str.includes('error'))) {
    return 'Login failed. Check your details and try again.';
  }

  // Products list / API contract
  if (str.includes('invalid products response')) {
    return "We couldn't load products. Refresh the page or try again.";
  }

  // Sales / POS
  if (str.includes('too many line items')) {
    return POS_ERRORS.tooManyLines;
  }
  if (str.includes('invalid line items')) {
    return 'Some items in the sale are invalid. Check products and sizes, then try again.';
  }
  if (str.includes('sale failed to sync') || str.includes('failed to sync')) {
    return POS_ERRORS.syncFailed;
  }
  if (str.includes('invalid response') && str.includes('sale')) {
    return POS_ERRORS.syncFailed;
  }
  if (str.includes('deduction failed') || str.includes('return stock failed') || str.includes('transaction failed')) {
    return GENERIC_USER_ERROR;
  }

  // Postgres / API inventory (never show raw trigger text to end users)
  if (/greater than 0 for at least one size|quantity greater than 0 for at least one size/i.test(msg)) {
    return 'For multiple sizes, enter a quantity of at least 1 for one or more sizes before saving.';
  }
  if (/size_code must not be os\b/i.test(msg)) {
    return 'Multiple sizes cannot include One size (OS). Scroll the full list, remove any OS row or switch to One size mode, then save.';
  }
  if (/does not exist in public\.size_codes/i.test(msg)) {
    return 'One or more sizes are not in your catalog. Pick sizes from the list or ask an admin to add them.';
  }
  if (
    /failed to (create|update) (warehouse )?inventory|failed to (create|update) inventory by size/i.test(msg) &&
    (/size_code|size_kind|product [0-9a-f-]{36}/i.test(msg) || str.includes('sized'))
  ) {
    return 'We could not save stock for this product. Use sizes from your catalog (not One size), then try again.';
  }
  if (/could not update stock totals|could not save stock by size/i.test(str)) {
    return 'We could not update stock. Please try again or refresh the page.';
  }
  if (/sku already exists|duplicate.*sku/i.test(str)) {
    return 'A product with this SKU already exists. Change the SKU or edit the existing product.';
  }

  // Product / inventory
  if (str.includes('saved locally') || str.includes('add_product_saved_locally')) {
    return 'Product was saved on this device. Sync when online to save to server.';
  }
  if (str.includes('delete') && str.includes('fail')) {
    return 'Could not delete. Try again or refresh the list.';
  }
  if (str.includes('sync') && str.includes('fail')) {
    return 'Sync failed. You can try again when the connection is stable.';
  }
  if (str.includes('failed to load') && (str.includes('order') || str.includes('deliver') || str.includes('sales') || str.includes('dashboard'))) {
    return 'Could not load this page. Check your connection and try again.';
  }
  if (str.includes('void failed')) {
    return 'Could not void this sale. Try again or refresh the list.';
  }

  // Never pass through obvious server/DB internals
  if (looksLikeInternalError(msg)) {
    return GENERIC_USER_ERROR;
  }

  // Form validation (Zod / local validators)
  if (
    msg.length <= 160 &&
    !looksLikeInternalError(msg) &&
    (str.includes('required') || str.includes('must be') || str.includes('invalid email') || str.includes('check your'))
  ) {
    return msg;
  }

  // Short, already user-facing API messages from toSafeError (allowlist-style)
  if (
    msg.length <= 160 &&
    !str.includes('http ') &&
    (str.startsWith('we ') ||
      str.startsWith("you ") ||
      str.startsWith('your ') ||
      str.startsWith('insufficient ') ||
      str.startsWith('a product ') ||
      str.startsWith('sale ') ||
      str.startsWith('connection ') ||
      str.startsWith('something went wrong') ||
      str.startsWith('too many ') ||
      str.startsWith('please ') ||
      str.startsWith('session ') ||
      str.startsWith('required field'))
  ) {
    return msg;
  }

  return GENERIC_USER_ERROR;
}

/**
 * Whether the error is typically retryable (network, timeout, 5xx).
 */
export function isRetryableError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (msg.includes('abort') || msg.includes('cancel')) return false;
  if (msg.includes('401') || msg.includes('403') || msg.includes('404') || msg.includes('422')) return false;
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout')) return true;
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) return true;
  if (msg.includes('429') || msg.includes('temporarily unavailable')) return true;
  return false;
}
