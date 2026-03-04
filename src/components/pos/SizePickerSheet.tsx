import { useState, useCallback } from 'react';

/**
 * POS product shape. Inventory Product (from useInventory) passed into POS views
 * (ProductGrid, ProductSearch) must be compatible: id, name, sku, quantity,
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

/** One line in the pending selection (before "Add to cart"). */
interface PendingLine {
  sizeCode: string | null;
  sizeLabel: string | null;
  qty: number;
}

interface SizePickerSheetProps {
  product: POSProduct | null;
  onAdd: (input: CartLineInput) => void;
  /** When adding multiple lines at once (e.g. multi-size selection), called with all lines so parent can show one toast. */
  onAddBatch?: (inputs: CartLineInput[]) => void;
  onClose: () => void;
}

export default function SizePickerSheet({ product, onAdd, onAddBatch, onClose }: SizePickerSheetProps) {
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState<PendingLine[]>([]);

  const isSized = product?.sizeKind === 'sized' && (product?.quantityBySize?.length ?? 0) > 0;
  const sizes = product?.quantityBySize ?? [];

  const addToPending = useCallback((sizeCode: string | null, sizeLabel: string | null) => {
    const key = sizeCode ?? 'NA';
    setPending((prev) => {
      const i = prev.findIndex((p) => (p.sizeCode ?? 'NA') === key);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...prev, { sizeCode, sizeLabel, qty }];
    });
  }, [qty]);

  const updatePendingQty = useCallback((index: number, delta: number) => {
    setPending((prev) => {
      const next = [...prev];
      const n = next[index].qty + delta;
      if (n <= 0) return next.filter((_, i) => i !== index);
      next[index] = { ...next[index], qty: n };
      return next;
    });
  }, []);

  const removePending = useCallback((index: number) => {
    setPending((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const base = {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unitPrice: product.sellingPrice,
      imageUrl: product.images?.[0] ?? null,
    };
    if (isSized && pending.length > 0) {
      const lines: CartLineInput[] = pending.map((line) => ({
        ...base,
        sizeCode: line.sizeCode ?? undefined,
        sizeLabel: line.sizeLabel ?? undefined,
        qty: line.qty,
      }));
      if (lines.length > 1 && onAddBatch) {
        onAddBatch(lines);
      } else {
        lines.forEach((line) => onAdd(line));
      }
      onClose();
      return;
    }
    if (!isSized) {
      onAdd({ ...base, sizeCode: undefined, sizeLabel: undefined, qty });
      onClose();
    }
  }, [product, isSized, pending, onAdd, onAddBatch, onClose]);

  if (!product) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h3 className="font-semibold text-slate-900">{product.name}</h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="p-4">
          <div className="mb-4 flex items-center gap-4">
            <span className="text-sm text-slate-600">Qty per tap</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 font-medium"
              >
                −
              </button>
              <span className="w-8 text-center font-medium">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((n) => n + 1)}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 font-medium"
              >
                +
              </button>
            </div>
          </div>
          {isSized ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {sizes.map((row) => (
                  <button
                    key={row.sizeCode}
                    type="button"
                    disabled={row.quantity <= 0}
                    onClick={() => addToPending(row.sizeCode, row.sizeLabel ?? null)}
                    className="rounded-xl border border-slate-200 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary-400 hover:bg-primary-50"
                  >
                    <span className="block">{row.sizeLabel ?? row.sizeCode}</span>
                    <span className="text-xs text-slate-500">Stock: {row.quantity}</span>
                  </button>
                ))}
              </div>

              {pending.length > 0 && (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">Selection</p>
                  <ul className="space-y-1.5">
                    {pending.map((line, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-800">
                          {line.sizeLabel ?? line.sizeCode ?? 'One size'} × {line.qty}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updatePendingQty(i, -1)}
                            className="h-7 w-7 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-slate-700">{line.qty}</span>
                          <button
                            type="button"
                            onClick={() => updatePendingQty(i, 1)}
                            className="h-7 w-7 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => removePending(i)}
                            className="h-7 px-2 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={pending.length === 0}
                className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700 disabled:hover:bg-primary-600"
              >
                Add to cart
                {pending.length > 0 && (
                  <span className="ml-2 opacity-90">
                    — GH₵{pending
                      .reduce((s, l) => s + product.sellingPrice * l.qty, 0)
                      .toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white"
            >
              Add to cart — GH₵{(product.sellingPrice * qty).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
