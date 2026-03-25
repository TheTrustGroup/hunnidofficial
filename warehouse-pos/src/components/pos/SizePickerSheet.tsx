import { useState, useCallback, useMemo, useEffect } from 'react';
import { getSafeProductImageUrlSized, EMPTY_IMAGE_DATA_URL } from '../../lib/imageUpload';
import { useSettings } from '../../contexts/SettingsContext';
import {
  type StockLevel,
  stockLevelForQty,
  stockLevelLabel,
} from '../../lib/posStockLevel';

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

/** Client reference: light blue CTA (distinct from primary link blue). */
const ADD_TO_CART_BG = '#A5C9F3';

function StockDot({ level }: { level: StockLevel }) {
  const bg =
    level === 'out' ? 'bg-red-600' : level === 'low' ? 'bg-amber-500' : 'bg-emerald-600';
  return (
    <span
      className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ${bg} shrink-0 ring-2 ring-white shadow-sm`}
      title={stockLevelLabel(level)}
      aria-hidden
    />
  );
}

function StockLegend({ threshold }: { threshold: number }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-3)]"
      aria-label="Stock indicators: red out of stock, amber low, green OK"
    >
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-red-600 shrink-0" aria-hidden />
        Out
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" aria-hidden />
        Low{threshold > 0 ? ` (≤${threshold})` : ''}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" aria-hidden />
        OK
      </span>
    </div>
  );
}

interface SizeGridCardProps {
  variant: { sizeCode: string; sizeLabel?: string; quantity: number };
  selected: boolean;
  disabled: boolean;
  stockLevel: StockLevel;
  onSelect: () => void;
}

function SizeGridCard({ variant, selected, disabled, stockLevel, onSelect }: SizeGridCardProps) {
  const sizeLabel = variant.sizeLabel ?? variant.sizeCode;
  const stock = variant.quantity;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={`${sizeLabel}, stock ${stock}, ${stockLevelLabel(stockLevel)}`}
      className={`
        relative rounded-lg border px-2 py-3 text-center transition-colors min-h-[72px] flex flex-col items-center justify-center
        ${disabled ? 'opacity-45 cursor-not-allowed bg-slate-50' : 'cursor-pointer active:scale-[0.98]'}
        ${
          selected && !disabled
            ? 'border-[1.5px] bg-[var(--blue-soft)]'
            : 'border bg-white'
        }
      `}
      style={
        selected && !disabled
          ? { borderColor: 'var(--blue)' }
          : { borderColor: 'var(--border)' }
      }
    >
      <StockDot level={stockLevel} />
      <span className="text-[15px] font-semibold text-[var(--text)] leading-tight">{sizeLabel}</span>
      <span className="text-[12px] text-[var(--text-3)] mt-1">Stock: {stock}</span>
    </button>
  );
}

interface QtyPerTapRowProps {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}

function QtyPerTapRow({ value, min, max, disabled, onDecrement, onIncrement }: QtyPerTapRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 flex-shrink-0">
      <span className="text-[14px] font-medium text-[var(--text)]">Qty per tap</span>
      <div
        className="flex items-center rounded-lg border overflow-hidden bg-white"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center text-lg text-[var(--text)] active:bg-slate-100 disabled:opacity-40"
          disabled={disabled || value <= min}
          onClick={onDecrement}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="min-w-[36px] text-center text-[15px] font-semibold text-[var(--text)] tabular-nums">
          {value}
        </span>
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center text-lg text-[var(--text)] active:bg-slate-100 disabled:opacity-40"
          disabled={disabled || value >= max}
          onClick={onIncrement}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
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
  const [qtyPerTap, setQtyPerTap] = useState(1);
  const { systemSettings } = useSettings();
  const lowStockThreshold = Math.max(0, systemSettings.lowStockThreshold);

  // Reset selection when opening for a different product so previous product's sizes are not still highlighted.
  useEffect(() => {
    setSelectedIds(new Set());
    setQtyPerTap(1);
  }, [product?.id]);

  const variants = useMemo(() => product?.quantityBySize ?? [], [product]);

  const maxQtyPerTapForSelection = useMemo(() => {
    if (selectedIds.size === 0) return 1;
    const stocks = variants.filter((v) => selectedIds.has(v.sizeCode)).map((v) => v.quantity);
    if (stocks.length === 0) return 1;
    return Math.max(1, Math.min(...stocks));
  }, [selectedIds, variants]);

  useEffect(() => {
    if (selectedIds.size === 0) {
      setQtyPerTap(1);
      return;
    }
    setQtyPerTap((q) => Math.min(Math.max(1, q), maxQtyPerTapForSelection));
  }, [maxQtyPerTapForSelection, selectedIds.size]);

  const toggleVariant = useCallback((sizeCode: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sizeCode)) {
        next.delete(sizeCode);
      } else {
        next.add(sizeCode);
      }
      return next;
    });
  }, []);

  const bumpQtyPerTap = useCallback(
    (delta: number) => {
      setQtyPerTap((q) => {
        const next = q + delta;
        return Math.max(1, Math.min(maxQtyPerTapForSelection, next));
      });
    },
    [maxQtyPerTapForSelection]
  );

  if (!product) return null;

  const isSized =
    (product.sizeKind === 'sized' ||
      (Array.isArray(product.quantityBySize) && (product.quantityBySize?.length ?? 0) > 1)) &&
    (product.quantityBySize?.length ?? 0) > 0;

  const selectedVariants = variants.filter((v) => selectedIds.has(v.sizeCode));
  const totalPrice = selectedVariants.reduce(
    (sum, _v) => sum + product.sellingPrice * qtyPerTap,
    0
  );

  const handleAddToCart = () => {
    if (selectedVariants.length === 0) return;
    const lines: CartLineInput[] = selectedVariants.map((v) => {
      const first = product.images?.[0];
      const sized = first ? getSafeProductImageUrlSized(first, 'thumb') : '';
      const imageUrl =
        sized && sized !== EMPTY_IMAGE_DATA_URL ? sized : null;
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        sizeCode: v.sizeCode,
        sizeLabel: v.sizeLabel ?? v.sizeCode,
        unitPrice: product.sellingPrice,
        qty: qtyPerTap,
        imageUrl,
      };
    });
    if (lines.length > 1 && onAddBatch) {
      onAddBatch(lines);
    } else {
      lines.forEach((line) => onAdd(line));
    }
    onClose();
  };

  const sheetHeader = (
    <div className="px-5 pt-3 pb-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[18px] sm:text-[20px] font-semibold tracking-tight text-[var(--text)] leading-snug">
            {product.name}
          </h2>
          <p className="text-[11px] text-[var(--text-3)] mt-0.5 truncate">{product.sku}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <button
            type="button"
            className="w-7 h-7 rounded-full bg-[var(--overlay)] flex items-center justify-center text-[15px] text-[var(--text-2)] leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          <span className="font-display text-[18px] sm:text-[20px] font-semibold" style={{ color: 'var(--blue)' }}>
            GH₵{product.sellingPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );

  // One-size / NA: qty stepper + single CTA (same visual system as sized sheet)
  if (!isSized) {
    const maxOne = Math.max(1, product.quantity);
    const oneStockLevel = stockLevelForQty(product.quantity, lowStockThreshold);

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
            style={{
              boxShadow: '0 -12px 48px rgba(0,0,0,0.14), 0 -2px 12px rgba(0,0,0,0.06)',
              minHeight: 260,
              maxHeight: SHEET_MAX_H,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-3 mb-0.5 flex-shrink-0" aria-hidden />
            {sheetHeader}
            <div className="px-5 pt-4 pb-2 flex-1 min-h-0 flex flex-col gap-3">
              <StockLegend threshold={lowStockThreshold} />
              <QtyPerTapRow
                value={qtyPerTap}
                min={1}
                max={maxOne}
                onDecrement={() => setQtyPerTap((q) => Math.max(1, q - 1))}
                onIncrement={() => setQtyPerTap((q) => Math.min(maxOne, q + 1))}
              />
              <div className="flex items-center justify-between text-[13px] pt-1">
                <span className="text-[var(--text-3)]">Total stock</span>
                <span className="inline-flex items-center gap-2 font-semibold text-[var(--text)] tabular-nums">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      oneStockLevel === 'out'
                        ? 'bg-red-600'
                        : oneStockLevel === 'low'
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                    }`}
                    title={stockLevelLabel(oneStockLevel)}
                    aria-hidden
                  />
                  {product.quantity}
                </span>
              </div>
            </div>
            <div
              className="flex-shrink-0 px-5 pt-2 pb-4 border-t bg-[var(--surface)]"
              style={{ borderColor: 'var(--border)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={() => {
                  const first = product.images?.[0];
                  const sized = first ? getSafeProductImageUrlSized(first, 'thumb') : '';
                  const imageUrl =
                    sized && sized !== EMPTY_IMAGE_DATA_URL ? sized : null;
                  onAdd({
                    productId: product.id,
                    name: product.name,
                    sku: product.sku,
                    sizeCode: null,
                    sizeLabel: null,
                    unitPrice: product.sellingPrice,
                    qty: qtyPerTap,
                    imageUrl,
                  });
                  onClose();
                }}
                className="w-full py-[14px] rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 text-white shadow-sm"
                style={{ background: ADD_TO_CART_BG }}
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

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
          style={{
            boxShadow: '0 -12px 48px rgba(0,0,0,0.14), 0 -2px 12px rgba(0,0,0,0.06)',
            minHeight: 260,
            maxHeight: SHEET_MAX_H,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-3 mb-0.5 flex-shrink-0" aria-hidden />

          {sheetHeader}

          <div className="px-5 pt-3 pb-2 flex-shrink-0 flex flex-col gap-2">
            <QtyPerTapRow
              value={qtyPerTap}
              min={1}
              max={maxQtyPerTapForSelection}
              disabled={selectedIds.size === 0}
              onDecrement={() => bumpQtyPerTap(-1)}
              onIncrement={() => bumpQtyPerTap(1)}
            />
            <StockLegend threshold={lowStockThreshold} />
          </div>

          <div
            className="flex-1 overflow-y-auto px-5 pt-1 min-h-0"
            style={{ paddingBottom: 'var(--sheet-safe-padding-bottom)' }}
          >
            <div className="grid grid-cols-3 gap-2 pb-2">
              {variants.map((v) => {
                const out = v.quantity <= 0;
                const level = stockLevelForQty(v.quantity, lowStockThreshold);
                return (
                  <SizeGridCard
                    key={v.sizeCode}
                    variant={v}
                    selected={selectedIds.has(v.sizeCode)}
                    disabled={out}
                    stockLevel={level}
                    onSelect={() => {
                      if (!out) toggleVariant(v.sizeCode);
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div
            className="flex-shrink-0 px-5 pt-3 pb-4 border-t bg-[var(--surface)]"
            style={{ borderColor: 'var(--border)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
          >
            {selectedVariants.length > 0 && (
              <p className="text-[12px] text-[var(--text-3)] mb-2 text-center">
                {selectedVariants.length} size{selectedVariants.length === 1 ? '' : 's'} · GH₵
                {totalPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </p>
            )}
            <button
              type="button"
              disabled={selectedVariants.length === 0}
              onClick={handleAddToCart}
              className={`w-full py-[14px] rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm ${
                selectedVariants.length > 0
                  ? 'text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
              }`}
              style={selectedVariants.length > 0 ? { background: ADD_TO_CART_BG } : undefined}
            >
              {selectedVariants.length > 0 ? 'Add to cart' : 'Select a size'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
