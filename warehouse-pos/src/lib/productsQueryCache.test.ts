import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  syncProductsListToQueryCache,
  getProductsListFromQueryCache,
  applyStockDeductionToProductsCache,
  productsQueryKey,
} from './productsQueryCache';
import type { Product } from '../types';

const wid = '00000000-0000-0000-0000-000000000001';

function sampleProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Shoe',
    sku: 'SKU-1',
    category: 'Sneakers',
    quantity: 10,
    sellingPrice: 100,
    costPrice: 50,
    reorderLevel: 2,
    sizeKind: 'sized',
    quantityBySize: [{ sizeCode: 'EU40', sizeLabel: 'EU 40', quantity: 6 }],
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Product;
}

describe('productsQueryCache', () => {
  it('syncs inventory list into query cache', () => {
    const qc = new QueryClient();
    syncProductsListToQueryCache(qc, wid, [sampleProduct()], 1);
    const list = getProductsListFromQueryCache(qc, wid);
    expect(list).toHaveLength(1);
    expect(list[0]?.sku).toBe('SKU-1');
    expect(qc.getQueryData(productsQueryKey(wid))).toBeDefined();
  });

  it('deducts sized stock in cache', () => {
    const qc = new QueryClient();
    syncProductsListToQueryCache(qc, wid, [sampleProduct()], 1);
    applyStockDeductionToProductsCache(qc, wid, [
      { productId: 'p1', sizeCode: 'EU40', qty: 2 },
    ]);
    const row = getProductsListFromQueryCache(qc, wid)[0]?.quantityBySize?.[0];
    expect(row?.quantity).toBe(4);
    expect(getProductsListFromQueryCache(qc, wid)[0]?.quantity).toBe(4);
  });
});
