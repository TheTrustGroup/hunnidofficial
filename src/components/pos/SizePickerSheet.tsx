import { useState, useCallback, useMemo } from 'react';

/**
 * POS product shape. Inventory Product (from useInventory) passed into POS views
 * ProductGrid must be compatible: id, name, sku, quantity,
 * sellingPrice, category?, sizeKind?, quantityBySize?, images?. Keep in sync when changing either type.
 */
export interface POSProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  sizeKind?: 'na' | 'one_size' | 'sized';
  quantity: number;
  quantityBySize?: Array<{ sizeCode: string; sizeLabel?: string; quantity: number }>;
  sellingPrice: number;
  category?: string;
  /** Product color for filter. Optional. */
  color?: string | null;
  images?: string[];
}

export interface CartLineInput {
  productId: string;
  name: string;
  sku?: string;
  sizeCode?: string | null;
  sizeLabel?: string | null;
  unitPrice: number;
  qty: number;
  /** Product image URL (e.g. first of product.images) for receipt / API. */
  imageUrl?: string | null;
}

/**
 * Optional: map of sizeCode (normalized, e.g. uppercase) → qty already in cart for this product.
 * Used to compute remaining = stock − inCart so sizes show "0 left" and are disabled when fully selected.
 */
export type QtyInCartBySize = Record<string, number>;

interface SizePickerSheetProps {
  product: POSProduct | null;
  onAdd: (input: CartLineInput) => void;
  onClose: () => void;
  /** Optional: qty in cart per size (key = sizeCode normalized). Enables "remaining" and disables size when 0 left. */
  qtyInCartBySize?: QtyInCartBySize;
}

function normalizeSizeKey(sizeCode: string): string {
  return sizeCode.trim().toUpperCase();
}

export default function SizePickerSheet({
  product,
  onAdd,
  onClose,
  qtyInCartBySize = {},
}: SizePickerSheetProps) {
  const [qty, setQty] = useState(1);

  const isSized = product?.sizeKind === 'sized' && (product?.quantityBySize?.length ?? 0) > 0;
  const sizes = product?.quantityBySize ?? [];

  /** Per-size remaining = stock − inCart. Size is unavailable when remaining <= 0. */
  const remainingBySize = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of sizes) {
      const key = normalizeSizeKey(row.sizeCode);
      const inCart = qtyInCartBySize[key] ?? 0;
      map[row.sizeCode] = Math.max(0, row.quantity - inCart);
    }
    return map;
  }, [sizes, qtyInCartBySize]);

  /** Tap a size → add min(qty, remaining) to cart and close. No extra step. */
  const handleSizeTap = useCallback(
    (sizeCode: string | null, sizeLabel: string | null) => {
      if (!product) return;
      const stock = sizes.find((s) => s.sizeCode === sizeCode)?.quantity ?? 0;
      const inCart = sizeCode ? (qtyInCartBySize[normalizeSizeKey(sizeCode)] ?? 0) : 0;
      const remaining = Math.max(0, stock - inCart);
      const addQty = sizeCode ? Math.min(qty, remaining) : qty;
      if (addQty <= 0) return;

      onAdd({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        sizeCode: sizeCode ?? undefined,
        sizeLabel: sizeLabel ?? undefined,
        unitPrice: product.sellingPrice,
        qty: addQty,
        imageUrl: product.images?.[0] ?? null,
      });
      onClose();
    },
    [product, qty, sizes, qtyInCartBySize, onAdd, onClose]
  );

  if (!product) return null;

  return (
    <>
      {/* Backdrop: smooth dim, tap to close */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 ease-out"
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet: premium card, clear hierarchy */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white shadow-large border-t border-slate-200/80"
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-picker-title"
      >
        {/* Header: product name + close */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm px-5 py-4">
          <h2
            id="size-picker-title"
            className="text-lg font-semibold text-slate-900 tracking-tight line-clamp-2"
          >
            {product.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 transition-colors"
            aria-label="Close"
          >
            <span className="text-lg leading-none">✕</span>
          </button>
        </div>

        <div className="px-5 py-5 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}>
          {/* Qty: clear label, touch-friendly controls */}
          <div className="mb-6">
            <span className="text-sm font-medium text-slate-600 mb-3 block">Quantity</span>
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
              <button
                type="button"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-lg font-medium text-slate-700 hover:bg-white hover:shadow-sm active:scale-[0.98] transition-all min-w-touch min-h-touch"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center text-base font-semibold text-slate-900 tabular-nums" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((n) => n + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg font-medium text-slate-700 hover:bg-white hover:shadow-sm active:scale-[0.98] transition-all min-w-touch min-h-touch"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {isSized ? (
            <>
              <span className="text-sm font-medium text-slate-600 mb-3 block">Size</span>
              <div className="grid grid-cols-3 gap-3">
                {sizes.map((row) => {
                  const remaining = remainingBySize[row.sizeCode] ?? 0;
                  const stock = row.quantity;
                  const unavailable = remaining <= 0;
                  const label = row.sizeLabel ?? row.sizeCode;

                  return (
                    <button
                      key={row.sizeCode}
                      type="button"
                      disabled={unavailable}
                      onClick={() => handleSizeTap(row.sizeCode, row.sizeLabel ?? null)}
                      className={`
                        flex min-h-[52px] flex-col items-center justify-center rounded-xl border-2 py-3 px-2
                        text-center transition-all duration-150
                        min-w-0
                        ${unavailable
                          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-primary-400 hover:bg-primary-50/70 hover:shadow-soft active:scale-[0.98]'
                        }
                      `}
                    >
                      <span className="block text-[15px] font-semibold leading-tight truncate w-full">
                        {label}
                      </span>
                      <span
                        className={`mt-0.5 block text-xs font-medium ${
                          unavailable ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {stock <= 0 ? 'Out of stock' : remaining <= 0 ? '0 left' : `${remaining} left`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleSizeTap(null, null)}
              className="w-full min-h-touch rounded-xl bg-primary-500 py-3.5 px-4 font-semibold text-white shadow-primary hover:bg-primary-600 hover:shadow-primary-hover active:scale-[0.99] transition-all"
            >
              Add to cart — GH₵{(product.sellingPrice * qty).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
