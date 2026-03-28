import { describe, expect, it } from 'vitest';
import {
  isPlaceholderOneSizeCode,
  normalizeQuantityBySizeForPersist,
  sanitizeQuantityBySizeForApi,
} from './sizeCode';

describe('isPlaceholderOneSizeCode', () => {
  it('matches all supported one-size placeholders', () => {
    expect(isPlaceholderOneSizeCode('OS')).toBe(true);
    expect(isPlaceholderOneSizeCode('onesize')).toBe(true);
    expect(isPlaceholderOneSizeCode('ONE_SIZE')).toBe(true);
    expect(isPlaceholderOneSizeCode('O/S')).toBe(true);
    expect(isPlaceholderOneSizeCode('NA')).toBe(true);
  });

  it('does not match real sized codes', () => {
    expect(isPlaceholderOneSizeCode('EU40')).toBe(false);
    expect(isPlaceholderOneSizeCode('M')).toBe(false);
    expect(isPlaceholderOneSizeCode('S')).toBe(false);
  });
});

describe('sanitizeQuantityBySizeForApi', () => {
  it('removes placeholders and empty rows; uppercases codes', () => {
    expect(
      sanitizeQuantityBySizeForApi([
        { sizeCode: 'OS', quantity: 5 },
        { sizeCode: 'NA', quantity: 3 },
        { sizeCode: 'eu40', quantity: 2 },
        { sizeCode: '', quantity: 1 },
      ])
    ).toEqual([{ sizeCode: 'EU40', quantity: 2 }]);
  });

  it('treats OS with zero-width characters as placeholder', () => {
    expect(isPlaceholderOneSizeCode('O\u200bS')).toBe(true);
    expect(sanitizeQuantityBySizeForApi([{ sizeCode: 'O\u200bS', quantity: 1 }, { sizeCode: 'EU40', quantity: 2 }])).toEqual([
      { sizeCode: 'EU40', quantity: 2 },
    ]);
  });

  it('returns [] for non-array input', () => {
    expect(sanitizeQuantityBySizeForApi(undefined)).toEqual([]);
  });
});

describe('normalizeQuantityBySizeForPersist', () => {
  it('merges duplicate EU spellings into one catalog key', () => {
    expect(
      normalizeQuantityBySizeForPersist([
        { sizeCode: 'EU 36.5', quantity: 1 },
        { sizeCode: 'EU36.5', quantity: 2 },
      ])
    ).toEqual([{ sizeCode: 'EU36.5', quantity: 3 }]);
  });

  it('drops placeholders and optional zero-qty for create', () => {
    expect(
      normalizeQuantityBySizeForPersist(
        [
          { sizeCode: 'OS', quantity: 1 },
          { sizeCode: 'EU40', quantity: 0 },
          { sizeCode: 'EU41', quantity: 2 },
        ],
        { requirePositiveQuantity: true }
      )
    ).toEqual([{ sizeCode: 'EU41', quantity: 2 }]);
  });
});
