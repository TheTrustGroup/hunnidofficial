import { describe, expect, it } from 'vitest';
import { isPlaceholderOneSizeCode } from './sizeCode';

describe('isPlaceholderOneSizeCode', () => {
  it('matches all supported one-size placeholders', () => {
    expect(isPlaceholderOneSizeCode('OS')).toBe(true);
    expect(isPlaceholderOneSizeCode('onesize')).toBe(true);
    expect(isPlaceholderOneSizeCode('ONE_SIZE')).toBe(true);
    expect(isPlaceholderOneSizeCode('O/S')).toBe(true);
  });

  it('does not match real sized codes', () => {
    expect(isPlaceholderOneSizeCode('EU40')).toBe(false);
    expect(isPlaceholderOneSizeCode('M')).toBe(false);
    expect(isPlaceholderOneSizeCode('S')).toBe(false);
  });
});
