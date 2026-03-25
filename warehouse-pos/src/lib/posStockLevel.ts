/**
 * Single source for POS stock banding (grid tiles, size sheet dots, badges).
 * "Low" uses Settings → low stock threshold; change rules here only.
 */

export type StockLevel = 'out' | 'low' | 'in';

/** Quantity on hand → level. threshold 0 means only out vs in (no low band). */
export function stockLevelForQty(qty: number, lowThreshold: number): StockLevel {
  if (qty <= 0) return 'out';
  if (lowThreshold > 0 && qty <= lowThreshold) return 'low';
  return 'in';
}

export function stockLevelLabel(level: StockLevel): string {
  switch (level) {
    case 'out':
      return 'Out of stock';
    case 'low':
      return 'Low stock';
    default:
      return 'In stock';
  }
}

export interface PosProductQtyInput {
  sizeKind?: 'na' | 'one_size' | 'sized';
  quantity: number;
  quantityBySize?: Array<{ sizeCode: string; sizeLabel?: string; quantity: number }>;
}

/** Total units for a POS row (sum of sizes when sized, else product.quantity). */
export function posProductTotalQuantity(product: PosProductQtyInput): number {
  if (product.sizeKind === 'sized' && (product.quantityBySize?.length ?? 0) > 0) {
    return (product.quantityBySize ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
  }
  return product.quantity ?? 0;
}
