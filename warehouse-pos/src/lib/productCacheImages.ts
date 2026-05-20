/**
 * Keep warehouse product cache under localStorage quota — never persist multi‑100KB base64 blobs.
 */
import type { Product } from '../types';
import { isBase64, isStorageUrl } from './imageUpload';

export function imagesForLocalCache(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter(
    (x): x is string =>
      typeof x === 'string' &&
      x.length > 0 &&
      !isBase64(x) &&
      (isStorageUrl(x) || x.startsWith('http://') || x.startsWith('https://'))
  );
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
