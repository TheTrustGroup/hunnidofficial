import { describe, expect, it } from 'vitest';
import { sanitizeSaleLineImageUrl } from './saleLineImage';

describe('sanitizeSaleLineImageUrl', () => {
  it('allows short https storage URLs', () => {
    const url = 'https://example.supabase.co/storage/v1/object/public/product-images/a.jpg';
    expect(sanitizeSaleLineImageUrl(url)).toBe(url);
  });

  it('rejects data URLs and oversized strings', () => {
    expect(sanitizeSaleLineImageUrl('data:image/png;base64,abc')).toBeNull();
    expect(sanitizeSaleLineImageUrl('x'.repeat(3000))).toBeNull();
    expect(sanitizeSaleLineImageUrl('ftp://x.com/a.jpg')).toBeNull();
  });
});
