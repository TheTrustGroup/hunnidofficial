import { describe, expect, it } from 'vitest';
import { isValidWarehouseId } from './warehouseId';

describe('isValidWarehouseId', () => {
  it('rejects null, empty, and all-zero UUID', () => {
    expect(isValidWarehouseId(null)).toBe(false);
    expect(isValidWarehouseId(undefined)).toBe(false);
    expect(isValidWarehouseId('')).toBe(false);
    expect(isValidWarehouseId('00000000-0000-0000-0000-000000000000')).toBe(false);
  });

  it('accepts real warehouse UUIDs', () => {
    expect(isValidWarehouseId('00000000-0000-0000-0000-000000000001')).toBe(true);
    expect(isValidWarehouseId('00000000-0000-0000-0000-000000000002')).toBe(true);
  });
});
