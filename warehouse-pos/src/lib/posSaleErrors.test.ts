import { describe, it, expect } from 'vitest';
import { isRetryableSaleError } from './posSaleErrors';

describe('isRetryableSaleError', () => {
  it('blocks insufficient stock', () => {
    expect(isRetryableSaleError('INSUFFICIENT_STOCK', 409)).toBe(false);
  });

  it('allows network-style failures', () => {
    expect(isRetryableSaleError('Failed to fetch', undefined)).toBe(true);
    expect(isRetryableSaleError('Service unavailable', 503)).toBe(true);
  });

  it('blocks auth errors', () => {
    expect(isRetryableSaleError('Unauthorized', 401)).toBe(false);
  });
});
