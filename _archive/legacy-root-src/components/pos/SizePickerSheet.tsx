import { useState, useCallback, useMemo, useEffect } from 'react';

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

interface SizeRowState {
  sizeCode: string;
  sizeLabel: string | null;
  quantity: number;
  selected: boolean;
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

  const [sizeRows, setSizeRows] = useState<SizeRowState[]>(() =>
    sizes.map((row) => ({
      sizeCode: row.sizeCode,
      sizeLabel: row.sizeLabel ?? null,
      quantity: 1,
      selected: false,
    }))
  );
  useEffect(() => {
    setSizeRows(
      sizes.map((row) => ({
        sizeCode: row.sizeCode,
        sizeLabel: row.sizeLabel ?? null,
        quantity: 1,
        selected: false,
      }))
    );
  }, [product?.id, sizes.length]);

  const setRow = useCallback((index: number, update: Partial<SizeRowState>) => {
    setSizeRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...update } : r)));
  }, []);

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

  /** Single size add → add and close. */
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

  /** Add all selected sizes (each with its row qty) and close. */
  const handleAddSelected = useCallback(() => {
    if (!product) return;
    const toAdd = sizeRows.filter((r) => r.selected && r.quantity > 0);
    if (toAdd.length === 0) return;
    toAdd.forEach((r) => {
      const remaining = remainingBySize[r.sizeCode] ?? 0;
      const addQty = Math.min(r.quantity, remaining);
      if (addQty > 0) {
        onAdd({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          sizeCode: r.sizeCode,
          sizeLabel: r.sizeLabel ?? undefined,
          unitPrice: product.sellingPrice,
          qty: addQty,
          imageUrl: product.images?.[0] ?? null,
        });
      }
    });
    onClose();
  }, [product, sizeRows, remainingBySize, onAdd, onClose]);

  const selectedCount = sizeRows.filter((r) => r.selected && r.quantity > 0).length;

  if (!product) return null;

  return (
    <>
      {/* Backdrop: smooth dim, tap to close */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 ease-out"
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet: one path, one CTA. Sticky footer so Add to cart is always visible. */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] flex flex-col rounded-t-2xl bg-white shadow-large border-t border-slate-200/80"
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-picker-title"
      >
        {/* Header: product name + close */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200/90 bg-white px-5 py-3.5 flex-shrink-0">
          <h2
            id="size-picker-title"
            className="text-base font-semibold text-slate-900 tracking-tight line-clamp-1"
          >
            {product.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <span className="text-lg leading-none">✕</span>
          </button>
        </div>

        {isSized ? (
          <>
            {/* Single instruction; no global qty */}
            <p className="px-5 pt-3 text-xs text-slate-500 flex-shrink-0">Select sizes and quantity, then tap Add to cart.</p>
            {/* Scrollable list: compact rows, no per-row Add button */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
              <div className="space-y-1.5">
                {sizes.map((row, index) => {
                  const remaining = remainingBySize[row.sizeCode] ?? 0;
                  const unavailable = remaining <= 0;
                  const state = sizeRows[index] ?? { sizeCode: row.sizeCode, sizeLabel: row.sizeLabel ?? null, quantity: 1, selected: false };
                  const label = row.sizeLabel ?? row.sizeCode;

                  return (
                    <div
                      key={row.sizeCode}
                      role="button"
                      tabIndex={0}
                      onClick={() => !unavailable && setRow(index, { selected: !state.selected })}
                      onKeyDown={(e) => e.key === 'Enter' && !unavailable && setRow(index, { selected: !state.selected })}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                        unavailable ? 'border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed' : 'border-slate-200 bg-white cursor-pointer hover:bg-slate-50/80'
                      } ${state.selected ? 'ring-2 ring-primary-400 ring-offset-1' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={state.selected}
                        onChange={(e) => setRow(index, { selected: e.target.checked })}
                        disabled={unavailable}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-300 flex-shrink-0"
                      />
                      <span className="text-sm font-semibold text-slate-900 flex-shrink-0 w-14">{label}</span>
                      <span className="text-xs text-slate-500 flex-shrink-0">{remaining <= 0 ? '0 left' : `${remaining} left`}</span>
                      {state.selected && (
                        <div className="flex items-center gap-0.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={state.quantity <= 1}
                            onClick={() => setRow(index, { quantity: Math.max(1, state.quantity - 1) })}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium active:scale-95 disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-sm font-semibold text-slate-900 tabular-nums">{state.quantity}</span>
                          <button
                            type="button"
                            disabled={state.quantity >= remaining}
                            onClick={() => setRow(index, { quantity: Math.min(remaining, state.quantity + 1) })}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium active:scale-95 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Sticky single CTA — always visible */}
            <div
              className="flex-shrink-0 border-t border-slate-200 bg-white px-5 py-4"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={handleAddSelected}
                disabled={selectedCount === 0}
                className="w-full min-h-[48px] rounded-xl font-semibold text-white transition-all touch-manipulation active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-primary-500 hover:bg-primary-600"
              >
                {selectedCount > 0 ? `Add to cart (${selectedCount} size${selectedCount !== 1 ? 's' : ''})` : 'Select sizes above'}
              </button>
            </div>
          </>
        ) : (
          <div className="px-5 py-5 flex-shrink-0">
            <div className="mb-4">
              <span className="text-sm font-medium text-slate-600 mb-2 block">Quantity</span>
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
                <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} className="flex h-11 w-11 items-center justify-center rounded-lg font-medium text-slate-700 hover:bg-white active:scale-[0.98]" aria-label="Decrease quantity">−</button>
                <span className="w-10 text-center text-base font-semibold text-slate-900 tabular-nums" aria-live="polite">{qty}</span>
                <button type="button" onClick={() => setQty((n) => n + 1)} className="flex h-11 w-11 items-center justify-center rounded-lg font-medium text-slate-700 hover:bg-white active:scale-[0.98]" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSizeTap(null, null)}
              className="w-full min-h-[48px] rounded-xl bg-primary-500 py-3 font-semibold text-white hover:bg-primary-600 active:scale-[0.98] transition-transform"
            >
              Add to cart — GH₵{(product.sellingPrice * qty).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
