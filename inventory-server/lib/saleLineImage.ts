/** Max length for persisted sale line image URLs (storage/CDN links only). */
export const SALE_LINE_IMAGE_URL_MAX_LEN = 2048;

/**
 * Only persist http(s) storage URLs on sale_lines. Reject data: blobs and oversized strings
 * that exhaust Postgres I/O and PostgREST payload limits.
 */
export function sanitizeSaleLineImageUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (trimmed.length > SALE_LINE_IMAGE_URL_MAX_LEN) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:')) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

/** Strip bloated stored values when serializing sales for list/history APIs. */
export function saleLineImageUrlForResponse(url: string | null | undefined): string | null {
  return sanitizeSaleLineImageUrl(url);
}
