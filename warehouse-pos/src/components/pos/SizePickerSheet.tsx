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

  const totalSelected = pending.reduce((s, l) => s + product.sellingPrice * l.qty, 0);

  return (
    <>
      {/* Sheet overlay: leaves room for bottom nav */}
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        style={{
          paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(15,14,12,0.55)',
        }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-white shadow-xl"
        style={{
          bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 999,
              background: 'var(--h-gray-200)',
            }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-start justify-between flex-shrink-0"
          style={{
            padding: '14px 20px 12px',
            borderBottom: '0.5px solid var(--h-gray-100)',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                letterSpacing: '0.04em',
                color: 'var(--h-gray-900)',
              }}
            >
              {product.name.toUpperCase()}
            </h2>
            <p
              style={{
                fontSize: 12,
                color: 'var(--h-gray-400)',
                marginTop: 3,
              }}
            >
              {product.sku}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                border: '0.5px solid var(--h-gray-200)',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              ✕
            </button>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                color: 'var(--h-blue)',
              }}
            >
              GH₵{product.sellingPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Hint */}
        <div
          className="flex-shrink-0"
          style={{
            padding: '10px 20px',
            borderBottom: '0.5px solid var(--h-gray-100)',
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--h-gray-400)' }}>Select sizes and quantity, then tap Add to cart.</p>
        </div>

        {/* Scrollable size list */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '10px 20px 0' }}>
          {isSized ? (
            sizes.map((row) => {
              const key = row.sizeCode ?? 'NA';
              const pendingLine = pending.find((p) => (p.sizeCode ?? 'NA') === key);
              const isSelected = Boolean(pendingLine);
              const selectedQty = pendingLine?.qty ?? 0;
              const stock = row.quantity;
              const canIncrement = selectedQty < stock;

              const handleRowToggle = () => {
                if (isSelected) return;
                addToPending(row.sizeCode, row.sizeLabel ?? null);
              };

              const handleDec = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!pendingLine) return;
                const idx = pending.findIndex((p) => (p.sizeCode ?? 'NA') === key);
                if (idx >= 0) updatePendingQty(idx, -1);
              };

              const handleInc = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!pendingLine || !canIncrement) return;
                const idx = pending.findIndex((p) => (p.sizeCode ?? 'NA') === key);
                if (idx >= 0) updatePendingQty(idx, 1);
              };

              return (
                <div
                  key={row.sizeCode}
                  onClick={handleRowToggle}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: isSelected
                      ? '1.5px solid var(--h-blue)'
                      : '0.5px solid var(--h-gray-200)',
                    background: isSelected ? 'var(--h-blue-light)' : 'white',
                    marginBottom: 8,
                    cursor: stock > 0 ? 'pointer' : 'not-allowed',
                    opacity: stock > 0 ? 1 : 0.4,
                    userSelect: 'none',
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      flexShrink: 0,
                      marginRight: 10,
                      background: isSelected ? 'var(--h-blue)' : 'transparent',
                      border: `1.5px solid ${
                        isSelected ? 'var(--h-blue)' : 'var(--h-gray-300)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {isSelected ? '✓' : null}
                  </div>

                  {/* Size label */}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      minWidth: 36,
                    }}
                  >
                    {row.sizeLabel ?? row.sizeCode}
                  </span>

                  {/* Stock */}
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--h-gray-400)',
                      flex: 1,
                      marginLeft: 6,
                    }}
                  >
                    {stock} left
                  </span>

                  {/* Qty controls */}
                  {isSelected && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--h-gray-100)',
                        borderRadius: 6,
                        overflow: 'hidden',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={handleDec}
                        style={{
                          width: 32,
                          height: 32,
                          border: 'none',
                          background: 'transparent',
                          fontSize: 18,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 6,
                        }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          minWidth: 28,
                          textAlign: 'center',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {selectedQty}
                      </span>
                      <button
                        type="button"
                        onClick={handleInc}
                        disabled={!canIncrement}
                        style={{
                          width: 32,
                          height: 32,
                          border: 'none',
                          background: 'transparent',
                          fontSize: 18,
                          cursor: canIncrement ? 'pointer' : 'not-allowed',
                          opacity: canIncrement ? 1 : 0.35,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 6,
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ paddingBottom: 12 }}>
              <button
                type="button"
                onClick={handleAddToCart}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--h-blue)',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                Add to cart — GH₵
                {(product.sellingPrice * qty).toLocaleString('en-GH', {
                  minimumFractionDigits: 2,
                })}
              </button>
            </div>
          )}
        </div>

        {/* Sticky footer: summary + CTA */}
        {isSized && (
          <div
            style={{
              flexShrink: 0,
              padding: '12px 20px 16px',
              borderTop: '0.5px solid var(--h-gray-100)',
              background: 'white',
              position: 'sticky',
              bottom: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
                minHeight: 24,
                flexWrap: 'wrap',
              }}
            >
              {pending.map((line, i) => (
                <span
                  key={`${line.sizeCode ?? 'NA'}-${i}`}
                  style={{
                    background: 'var(--h-blue-light)',
                    color: 'var(--h-blue)',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {(line.sizeLabel ?? line.sizeCode ?? 'One size') + ` ×${line.qty}`}
                </span>
              ))}
              {pending.length > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--h-gray-400)',
                    marginLeft: 2,
                  }}
                >
                  = GH₵
                  {totalSelected.toLocaleString('en-GH', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={pending.length === 0}
              onClick={handleAddToCart}
              style={{
                width: '100%',
                padding: 14,
                border: 'none',
                borderRadius: 10,
                background:
                  pending.length > 0 ? 'var(--h-blue)' : 'var(--h-gray-100)',
                color:
                  pending.length > 0 ? 'white' : 'var(--h-gray-400)',
                fontSize: 15,
                fontWeight: 600,
                cursor: pending.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s',
              }}
            >
              {pending.length > 0
                ? `Add to cart — GH₵${totalSelected.toLocaleString('en-GH', {
                    minimumFractionDigits: 2,
                  })}`
                : 'Select a size to add'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
