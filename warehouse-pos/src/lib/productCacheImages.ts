/**
 * Keep warehouse product cache under localStorage quota — never persist multi‑100KB base64 blobs.
 */
import type { Product } from '../types';
import { isBase64, isStorageUrl } from './imageUpload';

/** Max data-URL length to persist in warehouse list cache (matches list_product_display_images SQL cap). */
const MAX_DATA_URL_CACHE_LEN = 320_000;

export function imagesForLocalCache(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter((x): x is string => {
    if (typeof x !== 'string' || x.length === 0) return false;
    if (isBase64(x)) return x.length <= MAX_DATA_URL_CACHE_LEN;
    return isStorageUrl(x) || x.startsWith('http://') || x.startsWith('https://');
  });
}

/** Strip heavy base64 from products before writing warehouse_products_* cache keys. */
export function stripHeavyImagesForCache(products: Product[]): Product[] {
  return products.map((p) => {
    const slim = imagesForLocalCache(p.images);
    if (slim.length > 0) return { ...p, images: slim };
    if (!Array.isArray(p.images) || p.images.length === 0) return p;
    return { ...p, images: [] };
  });
}
