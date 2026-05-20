/**
 * Single React Query cache for warehouse product lists (POS + Inventory).
 * Key: queryKeys.products(warehouseId) — infinite-query shape used by useProductsQuery.
 */

import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Product } from '../types';
import type { POSProduct } from '../components/pos/SizePickerSheet';
import { queryKeys } from './queryKeys';

export type ProductsPage = { data: POSProduct[]; total: number };

export const productsQueryKey = queryKeys.products;

function toPosProduct(p: Product): POSProduct {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    sizeKind: p.sizeKind,
    quantity: Number(p.quantity ?? 0),
    quantityBySize: Array.isArray(p.quantityBySize) ? p.quantityBySize : undefined,
    sellingPrice: Number(p.sellingPrice ?? 0),
    category: p.category,
    images: Array.isArray(p.images) ? p.images : undefined,
    color: p.color ?? null,
    barcode: p.barcode ?? null,
  };
}

export function buildInfiniteProductsData(
  products: Product[],
  total?: number | null
): InfiniteData<ProductsPage> {
  const data = products.map(toPosProduct);
  const t = typeof total === 'number' && total >= 0 ? total : data.length;
  return {
    pages: [{ data, total: t }],
    pageParams: [0],
  };
}

/** Push InventoryContext list into the shared cache (POS reads this). */
export function syncProductsListToQueryCache(
  queryClient: QueryClient,
  warehouseId: string,
  products: Product[],
  total?: number | null
): void {
  if (!warehouseId) return;
  queryClient.setQueryData(productsQueryKey(warehouseId), buildInfiniteProductsData(products, total));
}

/** Read flattened list from cache (hydrate Inventory when navigating from POS). */
export function getProductsListFromQueryCache(
  queryClient: QueryClient,
  warehouseId: string
): POSProduct[] {
  const cached = queryClient.getQueryData<InfiniteData<ProductsPage>>(productsQueryKey(warehouseId));
  if (!cached?.pages?.length) return [];
  return cached.pages.flatMap((p) => p.data ?? []);
}

/** Hydrate InventoryContext from POS/shared cache when localStorage is empty. */
export function posProductsToInventoryProducts(rows: POSProduct[]): Product[] {
  const now = new Date();
  return rows.map(
    (p) =>
      ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category ?? '',
        quantity: Number(p.quantity ?? 0),
        sellingPrice: Number(p.sellingPrice ?? 0),
        costPrice: 0,
        reorderLevel: 0,
        sizeKind: p.sizeKind,
        quantityBySize: Array.isArray(p.quantityBySize) ? p.quantityBySize : undefined,
        images: Array.isArray(p.images) ? p.images : [],
        color: p.color ?? null,
        barcode: p.barcode ?? null,
        createdAt: now,
        updatedAt: now,
        expiryDate: null,
      }) as Product
  );
}

export function invalidateProductsQuery(
  queryClient: QueryClient,
  warehouseId: string
): Promise<void> {
  if (!warehouseId) return Promise.resolve();
  return queryClient.invalidateQueries({ queryKey: productsQueryKey(warehouseId), exact: false });
}

export interface StockDeductionLine {
  productId: string;
  sizeCode?: string | null;
  qty: number;
}

/** Optimistic stock deduction after a successful sale (shared POS + future callers). */
export function applyStockDeductionToProductsCache(
  queryClient: QueryClient,
  warehouseId: string,
  lines: StockDeductionLine[]
): void {
  if (!warehouseId || lines.length === 0) return;
  const key = productsQueryKey(warehouseId);
  queryClient.setQueryData<InfiniteData<ProductsPage>>(key, (old) => {
    if (!old) return old;
    const deduct = (p: POSProduct): POSProduct => {
      const saleLines = lines.filter((l) => l.productId === p.id);
      if (saleLines.length === 0) return p;
      if (p.sizeKind === 'sized') {
        const updatedSizes = (p.quantityBySize ?? []).map((row) => {
          const line = saleLines.find(
            (l) =>
              l.sizeCode &&
              row.sizeCode &&
              l.sizeCode.toUpperCase() === row.sizeCode.toUpperCase()
          );
          return line ? { ...row, quantity: Math.max(0, row.quantity - line.qty) } : row;
        });
        return {
          ...p,
          quantityBySize: updatedSizes,
          quantity: updatedSizes.reduce((s, r) => s + r.quantity, 0),
        };
      }
      const totalSold = saleLines.reduce((s, l) => s + l.qty, 0);
      return { ...p, quantity: Math.max(0, p.quantity - totalSold) };
    };
    return {
      ...old,
      pages: old.pages.map((page) => ({ ...page, data: page.data.map(deduct) })),
    };
  });
}
