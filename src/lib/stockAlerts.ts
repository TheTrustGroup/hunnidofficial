/**
 * Centralized stock alert logic. Used by Dashboard (API), Reports, Inventory filters,
 * ProductCard, ProductGridView, and backend get_warehouse_stats so counts and labels stay in sync.
 *
 * Rules (single source of truth):
 * - Out of stock: quantity === 0
 * - Low stock: quantity > 0 && quantity <= reorderLevel (reorderLevel defaults to 0 = no low-by-reorder)
 * - In stock: otherwise
 */

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductForStockAlert {
  quantity?: number;
  reorderLevel?: number;
  sizeKind?: 'na' | 'one_size' | 'sized';
  quantityBySize?: Array<{ quantity?: number }>;
}

/** Total sellable quantity (sized = sum of quantityBySize; else quantity). */
export function getProductQtyForAlert(p: ProductForStockAlert): number {
  if (p.sizeKind === 'sized' && (p.quantityBySize?.length ?? 0) > 0) {
    return (p.quantityBySize ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
  }
  return Number(p.quantity ?? 0) || 0;
}

/** Status for alerts and UI. Matches backend get_warehouse_stats and reportService. */
export function getStockStatus(p: ProductForStockAlert): StockStatus {
  const qty = getProductQtyForAlert(p);
  const reorder = Number(p.reorderLevel ?? 0) || 0;
  if (qty === 0) return 'out_of_stock';
  if (qty <= reorder) return 'low_stock';
  return 'in_stock';
}

/** Display label for status. */
export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'out_of_stock':
      return 'Out of stock';
    case 'low_stock':
      return 'Low Stock';
    case 'in_stock':
      return 'In Stock';
    default:
      return 'In Stock';
  }
}
