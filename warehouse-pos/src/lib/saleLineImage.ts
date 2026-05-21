import {
  EMPTY_IMAGE_DATA_URL,
  getSafeProductImageUrlSized,
  isAllowedProductStorageUrl,
  productImageUrlWithoutTransform,
} from './imageUpload';

const MAX_LEN = 2048;

/** http(s) Storage URL safe to persist on sale_lines (never data: blobs). */
export function persistableSaleLineImageUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const trimmed = String(url).trim();
  if (!trimmed || trimmed.length > MAX_LEN) return null;
  if (trimmed.toLowerCase().startsWith('data:')) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  const normalized = productImageUrlWithoutTransform(trimmed);
  if (isAllowedProductStorageUrl(normalized)) return normalized;
  if (isAllowedProductStorageUrl(trimmed)) return productImageUrlWithoutTransform(trimmed);
  return null;
}

/**
 * Cart / receipt: prefer a persistable Storage URL; fall back to display URL (may be data: for in-session UI).
 */
export function resolveCartLineImageUrl(images: string[] | undefined): string | null {
  const first = images?.[0];
  if (!first?.trim()) return null;
  const persist = persistableSaleLineImageUrl(first);
  if (persist) return persist;
  const sized = getSafeProductImageUrlSized(first, 'thumb');
  if (!sized || sized === EMPTY_IMAGE_DATA_URL) return null;
  return persistableSaleLineImageUrl(sized) ?? sized;
}
