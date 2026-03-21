/**
 * Supabase Storage public URLs → Image Transform API (resize on the fly).
 * Requires Supabase Pro for /render/image. Set VITE_SUPABASE_IMAGE_TRANSFORMS=false to disable.
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */

export type ProductImageSize = 'thumb' | 'medium' | 'full';

const SIZE_PARAMS: Record<ProductImageSize, { width: number; height: number }> = {
  thumb: { width: 150, height: 150 },
  medium: { width: 400, height: 400 },
  full: { width: 1200, height: 1200 },
};

/** Supabase public object URL segment; rewritten to render/image for transforms. */
const OBJECT_PUBLIC = '/storage/v1/object/public/';

function transformsDisabled(): boolean {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env != null) {
      return import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORMS === 'false';
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Returns a display URL: data URLs unchanged; Supabase public object URLs become
 * render URLs with width/height/resize=cover; other HTTP(S) URLs unchanged.
 */
export function getProductImageUrl(url: string, size: ProductImageSize = 'thumb'): string {
  if (typeof url !== 'string' || !url.trim()) return url;
  const u = url.trim();
  if (u.startsWith('data:')) return u;
  if (transformsDisabled() || !u.includes(OBJECT_PUBLIC)) return u;

  const qMark = u.indexOf('?');
  const base = qMark >= 0 ? u.slice(0, qMark) : u;
  const transformed = base.replace(OBJECT_PUBLIC, '/storage/v1/render/image/public/');
  if (transformed === base) return u;

  const { width, height } = SIZE_PARAMS[size];
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    resize: 'cover',
  });
  const sep = transformed.includes('?') ? '&' : '?';
  return `${transformed}${sep}${params.toString()}`;
}
