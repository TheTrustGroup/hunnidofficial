/**
 * Classify POS /api/sales failures for queue-vs-block behavior.
 */

export function isRetryableSaleError(message: string, status?: number): boolean {
  const msg = message.toLowerCase();
  if (status === 409 || msg.includes('insufficient_stock') || msg.includes('insufficient stock')) {
    return false;
  }
  if (status === 401 || status === 403 || status === 400) return false;
  if (status != null && status >= 500) return true;
  if (msg.includes('too many line items')) return false;
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('abort') ||
    msg.includes('timeout') ||
    msg.includes('unavailable') ||
    msg.includes('failed to fetch') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504')
  ) {
    return true;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return false;
}
