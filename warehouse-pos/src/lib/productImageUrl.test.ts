import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProductImageUrl } from './productImageUrl';

describe('getProductImageUrl', () => {
  const sample =
    'https://abc123.supabase.co/storage/v1/object/public/product-images/foo/bar.jpg';

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_IMAGE_TRANSFORMS', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns data URLs unchanged', () => {
    const data = 'data:image/png;base64,xxx';
    expect(getProductImageUrl(data, 'thumb')).toBe(data);
  });

  it('rewrites Supabase public object URL to render URL with size params', () => {
    const out = getProductImageUrl(sample, 'thumb');
    expect(out).toContain('/storage/v1/render/image/public/');
    expect(out).toContain('product-images/foo/bar.jpg');
    expect(out).toContain('width=150');
    expect(out).toContain('height=150');
    expect(out).toContain('resize=cover');
  });

  it('uses medium dimensions for medium size', () => {
    const out = getProductImageUrl(sample, 'medium');
    expect(out).toContain('width=400');
    expect(out).toContain('height=400');
  });

  it('uses full dimensions for full size', () => {
    const out = getProductImageUrl(sample, 'full');
    expect(out).toContain('width=1200');
    expect(out).toContain('height=1200');
  });

  it('leaves non-Supabase HTTP URLs unchanged', () => {
    const u = 'https://cdn.example.com/p.jpg';
    expect(getProductImageUrl(u, 'thumb')).toBe(u);
  });

  it('skips transform when VITE_SUPABASE_IMAGE_TRANSFORMS is false', () => {
    vi.stubEnv('VITE_SUPABASE_IMAGE_TRANSFORMS', 'false');
    expect(getProductImageUrl(sample, 'thumb')).toBe(sample);
  });
});
