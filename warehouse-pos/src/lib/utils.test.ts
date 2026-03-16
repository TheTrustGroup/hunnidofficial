import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  calculateTotal,
  calculatePercentageChange,
  generateTransactionNumber,
  getCategoryDisplay,
  toTitleCase,
  getDeduplicatedCategoryOptions,
  colorMatchesFilter,
  getLocationDisplay,
  normalizeProductLocation,
} from './utils';

describe('formatCurrency', () => {
  it('formats positive number as GHS', () => {
    expect(formatCurrency(100)).toMatch(/₵|100/);
    expect(formatCurrency(0.5)).toMatch(/0\.50/);
  });
  it('returns ₵0.00 for 0, null, undefined, NaN', () => {
    expect(formatCurrency(0)).toContain('0');
    expect(formatCurrency(null)).toContain('0');
    expect(formatCurrency(undefined)).toContain('0');
    expect(formatCurrency(NaN)).toContain('0');
  });
});

describe('calculateTotal', () => {
  it('returns 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });
  it('sums unitPrice * quantity with 2 decimal precision', () => {
    expect(calculateTotal([{ unitPrice: 10, quantity: 2 }])).toBe(20);
    expect(calculateTotal([{ unitPrice: 10.99, quantity: 2 }])).toBe(21.98);
    expect(calculateTotal([{ unitPrice: 1, quantity: 1 }, { unitPrice: 2, quantity: 3 }])).toBe(7);
  });
});

describe('calculatePercentageChange', () => {
  it('returns 100 when previous is 0 and current > 0', () => {
    expect(calculatePercentageChange(10, 0)).toBe(100);
  });
  it('returns 0 when previous is 0 and current is 0', () => {
    expect(calculatePercentageChange(0, 0)).toBe(0);
  });
  it('computes percentage change correctly', () => {
    expect(calculatePercentageChange(110, 100)).toBe(10);
    expect(calculatePercentageChange(90, 100)).toBe(-10);
  });
});

describe('generateTransactionNumber', () => {
  it('starts with TXN- and has date + random part', () => {
    const n = generateTransactionNumber();
    expect(n).toMatch(/^TXN-\d{6}-[A-Z0-9]+$/);
  });
});

describe('getCategoryDisplay', () => {
  it('returns string category as-is', () => {
    expect(getCategoryDisplay('Electronics')).toBe('Electronics');
  });
  it('returns name from object', () => {
    expect(getCategoryDisplay({ name: 'Electronics' })).toBe('Electronics');
  });
  it('returns empty string for null/undefined', () => {
    expect(getCategoryDisplay(null)).toBe('');
    expect(getCategoryDisplay(undefined)).toBe('');
  });
});

describe('colorMatchesFilter', () => {
  it('matches case-insensitively', () => {
    expect(colorMatchesFilter('Black', 'Black')).toBe(true);
    expect(colorMatchesFilter('black', 'Black')).toBe(true);
    expect(colorMatchesFilter('BLACK', 'Black')).toBe(true);
    expect(colorMatchesFilter('Black', 'black')).toBe(true);
  });
  it('matches Gray and Grey as same', () => {
    expect(colorMatchesFilter('Gray', 'Grey')).toBe(true);
    expect(colorMatchesFilter('Grey', 'Gray')).toBe(true);
    expect(colorMatchesFilter('grey', 'Gray')).toBe(true);
  });
  it('returns false for empty product color when filter is set', () => {
    expect(colorMatchesFilter(null, 'Black')).toBe(false);
    expect(colorMatchesFilter('', 'Black')).toBe(false);
    expect(colorMatchesFilter('  ', 'Black')).toBe(false);
  });
  it('returns false for mismatch', () => {
    expect(colorMatchesFilter('Red', 'Black')).toBe(false);
    expect(colorMatchesFilter('Black', 'Red')).toBe(false);
  });
});

describe('toTitleCase', () => {
  it('title-cases a single word', () => {
    expect(toTitleCase('slippers')).toBe('Slippers');
    expect(toTitleCase('SNEAKERS')).toBe('Sneakers');
  });
  it('returns trimmed string', () => {
    expect(toTitleCase('  red  ')).toBe('Red');
  });
  it('returns empty for empty/whitespace', () => {
    expect(toTitleCase('')).toBe('');
    expect(toTitleCase('   ')).toBe('');
  });
});

describe('getDeduplicatedCategoryOptions', () => {
  it('dedupes case-insensitively and returns value + title-case label', () => {
    const opts = getDeduplicatedCategoryOptions(['Slipper', 'slippers', 'Slippers', 'Sneakers']);
    // "slipper" and "slippers" are different keys, so we get 3 entries
    expect(opts).toHaveLength(3);
    const slipper = opts.find((o) => o.label === 'Slipper');
    const slippers = opts.find((o) => o.label === 'Slippers');
    const sneakers = opts.find((o) => o.label === 'Sneakers');
    expect(slipper?.value).toBe('Slipper');
    expect(slippers?.value).toBe('slippers'); // first occurrence for that key
    expect(sneakers?.value).toBe('Sneakers');
  });
  it('sorts Uncategorized last', () => {
    const opts = getDeduplicatedCategoryOptions(['Uncategorized', 'A', 'B']);
    expect(opts.map((o) => o.label)).toEqual(['A', 'B', 'Uncategorized']);
  });
});

describe('getLocationDisplay', () => {
  it('returns — for null/undefined', () => {
    expect(getLocationDisplay(null)).toBe('—');
    expect(getLocationDisplay(undefined)).toBe('—');
  });
  it('joins aisle, rack, bin', () => {
    expect(getLocationDisplay({ aisle: 'A', rack: '1', bin: '2' })).toBe('A-1-2');
  });
});

describe('normalizeProductLocation', () => {
  it('fills missing location with default warehouse', () => {
    const out = normalizeProductLocation({ name: 'P' } as { location?: unknown });
    expect(out.location).toEqual({ warehouse: 'Main Jeff', aisle: '', rack: '', bin: '' });
  });
  it('preserves existing location fields', () => {
    const out = normalizeProductLocation({
      location: { warehouse: 'W2', aisle: 'A', rack: 'R', bin: 'B' },
    } as { location?: { warehouse?: string; aisle?: string; rack?: string; bin?: string } });
    expect(out.location).toEqual({ warehouse: 'W2', aisle: 'A', rack: 'R', bin: 'B' });
  });
});
