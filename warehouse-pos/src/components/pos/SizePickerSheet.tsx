import { useState, useCallback, useMemo, useEffect } from 'react';
import { Check, ShoppingCart } from 'lucide-react';

/**
 * POS product shape. Inventory Product (from useInventory) passed into POS views
 * must be compatible: id, name, sku, quantity, sellingPrice, category?, sizeKind?,
 * quantityBySize?, images?. Keep in sync when changing either type.
 */
export interface POSProduct {
  id: string;
  name: string;
  sku: string;
  sizeKind?: 'na' | 'one_size' | 'sized';
  quantity: number;
  quantityBySize?: Array<{ sizeCode: string; sizeLabel?: string; quantity: number }>;
  sellingPrice: number;
  category?: string;
  images?: string[];
  color?: string | null;
  barcode?: string | null;
}

export interface CartLineInput {
  productId: string;
  name: string;
  sku?: string;
  sizeCode?: string | null;
  sizeLabel?: string | null;
  unitPrice: number;
  qty: number;
  imageUrl?: string | null;
}

/** Same as Cart sheet: above nav + browser chrome on mobile; desktop 0. Single slot, no overlap. */
const SHEET_BOTTOM = 'var(--cart-sheet-bottom)';
const SHEET_MAX_H = 'var(--cart-sheet-max-h)';

interface SizeRowProps {
  variant: { sizeCode: string; sizeLabel?: string; quantity: number };
  selected: boolean;
  qty: number;
  onToggle: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
}

function SizeRow({ variant, selected, qty, onToggle, onDecrement, onIncrement }: SizeRowProps) {
  const sizeLabel = variant.sizeLabel ?? variant.sizeCode;
  const stock = variant.quantity;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`flex items-center px-3 py-2.5 rounded-lg mb-1.5 cursor-pointer select-none transition-colors ${
        selected
          ? 'border-[1.5px] bg-[var(--blue-soft)]'
          : 'border bg-[var(--surface)]'
      }`}
      style={selected ? { borderColor: 'var(--blue)' } : { borderColor: 'var(--border)' }}
    >
      <div
        className={`w-[18px] h-[18px] rounded-[4px] mr-2.5 flex-shrink-0 flex items-center justify-center ${
          selected ? 'bg-[var(--blue)]' : 'border'
        }`}
        style={selected ? undefined : { borderColor: 'var(--border-md)' }}
      >
        {selected && <Check size={9} color="white" strokeWidth={2.5} />}
      </div>
      <span className="text-[14px] font-semibold text-[var(--text)] min-w-[36px]">{sizeLabel}</span>
      <span className="text-[12px] text-[var(--text-3)] flex-1 ml-1.5">{stock} left</span>
      {selected && (
        <div
          className="flex items-center bg-[var(--overlay)] rounded-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-[30px] h-[30px] flex items-center justify-center text-base text-[var(--text)] active:bg-[var(--border)]"
            onClick={onDecrement}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-[24px] text-center text-[13px] font-semibold text-[var(--text)]">
            {qty}
          </span>
          <button
            type="button"
            className={`w-[30px] h-[30px] flex items-center justify-center text-base active:bg-[var(--border)] ${
              qty >= stock ? 'text-[var(--text-3)] cursor-not-allowed' : 'text-[var(--text)]'
            }`}
            disabled={qty >= stock}
            onClick={onIncrement}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

interface SizePickerSheetProps {
  product: POSProduct | null;
  onAdd: (input: CartLineInput) => void;
  /** When adding multiple lines at once, called with all lines so parent can show one toast. */
  onAddBatch?: (inputs: CartLineInput[]) => void;
  onClose: () => void;
}

export default function SizePickerSheet({ product, onAdd, onAddBatch, onClose }: SizePickerSheetProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qtyBySize, setQtyBySize] = useState<Record<string, number>>({});

  // Reset selection when opening for a different product so previous product's sizes are not still highlighted.
  useEffect(() => {
    setSelectedIds(new Set());
    setQtyBySize({});
  }, [product?.id]);

  const variants = useMemo(() => product?.quantityBySize ?? [], [product]);

  const toggleVariant = useCallback((sizeCode: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sizeCode)) {
        next.delete(sizeCode);
        return next;
      }
      next.add(sizeCode);
      return next;
    });
    setQtyBySize((prev) => {
      const next = { ...prev };
      if (!next[sizeCode]) next[sizeCode] = 1;
      return next;
    });
  }, []);

  const setVariantQty = useCallback((sizeCode: string, delta: number) => {
    setQtyBySize((prev) => {
      const current = prev[sizeCode] ?? 1;
      const variant = variants.find((v) => v.sizeCode === sizeCode);
      const max = variant?.quantity ?? 1;
      const next = Math.max(1, Math.min(max, current + delta));
      return { ...prev, [sizeCode]: next };
    });
  }, [variants]);

  if (!product) return null;

  const isSized =
    (product.sizeKind === 'sized' ||
      (Array.isArray(product.quantityBySize) && (product.quantityBySize?.length ?? 0) > 1)) &&
    (product.quantityBySize?.length ?? 0) > 0;

  const selectedVariants = variants.filter((v) => selectedIds.has(v.sizeCode));
  const totalPrice = selectedVariants.reduce(
    (sum, v) => sum + product.sellingPrice * (qtyBySize[v.sizeCode] ?? 1),
    0
  );

  const handleAddToCart = () => {
    if (selectedVariants.length === 0) return;
    const lines: CartLineInput[] = selectedVariants.map((v) => ({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      sizeCode: v.sizeCode,
      sizeLabel: v.sizeLabel ?? v.sizeCode,
      unitPrice: product.sellingPrice,
      qty: qtyBySize[v.sizeCode] ?? 1,
      imageUrl: product.images?.[0] ?? null,
    }));
    if (lines.length > 1 && onAddBatch) {
      onAddBatch(lines);
    } else {
      lines.forEach((line) => onAdd(line));
    }
    onClose();
  };

  // One-size / NA: single "Add to cart" with one qty (overlay still stops above bottom nav)
  if (!isSized) {
    return (
      <>
        <div
          className="fixed inset-x-0 top-0 z-40 bg-black/50"
          style={{ bottom: SHEET_BOTTOM }}
          onClick={onClose}
          aria-hidden
        />
        <div
          className="fixed inset-x-0 top-0 z-50 flex flex-col justify-end bg-black/50"
          style={{ bottom: SHEET_BOTTOM }}
        >
          <div
            className="bg-white rounded-t-3xl flex flex-col"
            style={{ boxShadow: '0 -12px 48px rgba(0,0,0,0.14), 0 -2px 12px rgba(0,0,0,0.06)', minHeight: 260, maxHeight: SHEET_MAX_H }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-3 mb-0.5 flex-shrink-0" aria-hidden />
            <div className="px-5 pt-3 pb-3 border-b flex-shrink-0 flex items-start justify-between" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="font-display text-[20px] tracking-[0.04em] leading-tight">
                  {product.name.toUpperCase()}
                </h2>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">{product.sku}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  className="w-6 h-6 rounded-full bg-[var(--overlay)] flex items-center justify-center text-[13px] text-[var(--text-2)]"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ✕
                </button>
                <span className="font-display text-[22px]" style={{ color: 'var(--blue)' }}>
                  GH₵{product.sellingPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="p-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}>
              <button
                type="button"
                onClick={() => {
                  onAdd({
                    productId: product.id,
                    name: product.name,
                    sku: product.sku,
                    sizeCode: null,
                    sizeLabel: null,
                    unitPrice: product.sellingPrice,
                    qty: 1,
                    imageUrl: product.images?.[0] ?? null,
                  });
                  onClose();
                }}
                className="w-full py-[14px] rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 text-white"
                style={{ background: 'var(--blue)' }}
              >
                <ShoppingCart size={15} />
                Add to cart — GH₵
                {product.sellingPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Overlay stops above bottom nav so nav stays visible and tappable */}
      <div
        className="fixed inset-x-0 top-0 z-50 flex flex-col justify-end bg-black/50"
        style={{ bottom: SHEET_BOTTOM }}
      >
        <div
          className="bg-white rounded-t-3xl flex flex-col"
          style={{ boxShadow: '0 -12px 48px rgba(0,0,0,0.14), 0 -2px 12px rgba(0,0,0,0.06)', minHeight: 260, maxHeight: SHEET_MAX_H }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-3 mb-0.5 flex-shrink-0" aria-hidden />

          <div className="px-5 pt-3 pb-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-[20px] tracking-[0.04em] leading-tight">
                  {product.name.toUpperCase()}
                </h2>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">{product.sku}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  className="w-6 h-6 rounded-full bg-[var(--overlay)] flex items-center justify-center text-[13px] text-[var(--text-2)]"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ✕
                </button>
                <span className="font-display text-[22px]" style={{ color: 'var(--blue)' }}>
                  GH₵{product.sellingPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <p className="px-5 pt-2.5 pb-1 text-[12px] text-[var(--text-3)] flex-shrink-0">
            Select sizes and quantity
          </p>

          <div
            className="flex-1 overflow-y-auto px-5 pt-1 min-h-0"
            style={{ paddingBottom: 'var(--sheet-safe-padding-bottom)' }}
          >
            {variants.map((v) => (
              <SizeRow
                key={v.sizeCode}
                variant={v}
                selected={selectedIds.has(v.sizeCode)}
                qty={qtyBySize[v.sizeCode] ?? 1}
                onToggle={() => toggleVariant(v.sizeCode)}
                onDecrement={() => setVariantQty(v.sizeCode, -1)}
                onIncrement={() => setVariantQty(v.sizeCode, 1)}
              />
            ))}
          </div>

          <div
            className="flex-shrink-0 px-5 pt-3 pb-4 border-t bg-[var(--surface)]"
            style={{ borderColor: 'var(--border)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex flex-wrap gap-1.5 mb-2.5 min-h-[22px] items-center">
              {selectedVariants.map((v) => (
                <span
                  key={v.sizeCode}
                  className="bg-[var(--blue-soft)] rounded-[5px] px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: 'var(--blue)' }}
                >
                  {v.sizeLabel ?? v.sizeCode} ×{qtyBySize[v.sizeCode] ?? 1}
                </span>
              ))}
              {selectedVariants.length > 0 && (
                <span className="text-[11px] text-[var(--text-3)] ml-1">
                  = GH₵{totalPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={selectedVariants.length === 0}
              onClick={handleAddToCart}
              className={`w-full py-[14px] rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors ${
                selectedVariants.length > 0
                  ? 'text-white cursor-pointer'
                  : 'bg-[var(--overlay)] text-[var(--text-3)] cursor-not-allowed'
              }`}
              style={selectedVariants.length > 0 ? { background: 'var(--blue)' } : undefined}
            >
              <ShoppingCart size={15} />
              {selectedVariants.length > 0
                ? `Add to cart — GH₵${totalPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
                : 'Select a size to add'}
            </button>
          </div>
        </div>
      </div>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        style={{ bottom: SHEET_BOTTOM }}
        onClick={onClose}
        aria-hidden
      />
    </>
  );
}
