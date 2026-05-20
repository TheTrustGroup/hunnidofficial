/**
 * CartPanel.tsx — Desktop POS cart (344px right column).
 * Spec: Current Sale header, items (40×40 thumb, qty 22×22), Subtotal/Discount/Grand Total,
 * "Charge GH₵X,XXX" primary, "+ Discount" | "Hold Sale" secondary. Empty state centered.
 */
import type { CartLine } from './CartSheet';

export interface CartPanelProps {
  lines: CartLine[];
  warehouseName?: string;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveLine: (key: string) => void;
  onClearCart: () => void;
  /** Opens the full cart sheet (payment, delivery, confirm). */
  onOpenCharge: () => void;
  onHoldSale?: () => void;
}

function fmt(n: number) {
  return `GH₵${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const IconCart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const IconBox = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

export default function CartPanel({
  lines,
  warehouseName,
  onUpdateQty,
  onRemoveLine: _onRemoveLine,
  onClearCart,
  onOpenCharge,
  onHoldSale,
}: CartPanelProps) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <aside
      className="w-[280px] flex-shrink-0 flex flex-col overflow-hidden"
      style={{ background: 'var(--h-white)', borderLeft: '0.5px solid var(--h-gray-200)' }}
      aria-label="Current sale"
    >
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
        style={{ borderBottom: '0.5px solid var(--h-gray-100)' }}
      >
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--h-gray-900)' }}>SALE</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}{warehouseName ? ` · ${warehouseName}` : ''}
          </p>
        </div>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-[11px] font-semibold transition-opacity hover:opacity-90"
            style={{ color: 'var(--h-red)', fontFamily: 'var(--font-body)' }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--h-gray-100)', color: 'var(--h-gray-400)' }}
            >
              <IconCart />
            </div>
            <p className="text-[13px] font-medium mb-1" style={{ fontFamily: 'var(--font-body)', color: 'var(--h-gray-900)' }}>
              Cart is empty
            </p>
            <p className="text-[12px]" style={{ fontFamily: 'var(--font-body)', color: 'var(--h-gray-400)' }}>
              Tap a product to add it
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="flex items-center gap-2.5 px-4 py-2.5 border-b transition-colors rounded-[var(--radius-md)] mx-2 mt-1"
                  style={{ borderBottom: '0.5px solid var(--h-gray-100)', background: 'var(--h-white)' }}
                >
                  <div
                    className="w-10 h-10 rounded-[var(--radius-sm)] flex-shrink-0 flex items-center justify-center overflow-hidden border"
                    style={{ background: 'var(--h-gray-50)', border: '0.5px solid var(--h-gray-200)' }}
                  >
                    {line.imageUrl ? (
                      <img src={line.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <IconBox />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--h-gray-900)', fontFamily: 'var(--font-body)' }}>{line.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>{line.sizeLabel ?? 'One size'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className="text-[13px] font-semibold tabular-nums"
                      style={{ fontFamily: 'var(--font-body)', color: 'var(--h-blue)' }}
                    >
                      {fmt(line.unitPrice * line.qty)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(line.key, -1)}
                        className="min-w-[28px] min-h-[28px] w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center font-semibold border transition-colors"
                        style={{ border: '0.5px solid var(--h-gray-200)', background: 'var(--h-gray-50)', color: 'var(--h-gray-700)' }}
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold min-w-[18px] text-center tabular-nums" style={{ color: 'var(--h-gray-900)' }}>{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(line.key, 1)}
                        className="min-w-[28px] min-h-[28px] w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center font-semibold border transition-colors"
                        style={{ border: '0.5px solid var(--h-gray-200)', background: 'var(--h-gray-50)', color: 'var(--h-gray-700)' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-shrink-0 px-4 py-3 border-t" style={{ borderTop: '0.5px solid var(--h-gray-100)' }}>
              <div
                className="rounded-[var(--radius-md)] p-3 mb-2 space-y-1"
                style={{ background: 'var(--h-gray-50)', border: '0.5px solid var(--h-gray-200)' }}
              >
                <div className="flex justify-between items-center text-[11px]" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>
                  <span>Discount</span>
                  <span className="tabular-nums">−{fmt(0)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 mt-1 border-t" style={{ borderColor: 'var(--h-gray-200)' }}>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--h-gray-700)', fontFamily: 'var(--font-body)' }}>Total</span>
                  <span className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--h-gray-900)' }}>{fmt(subtotal)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenCharge}
                className="w-full h-12 rounded-[var(--radius-md)] text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-95 font-medium text-[16px]"
                style={{ fontFamily: 'var(--font-body)', background: 'var(--h-blue)' }}
              >
                Charge {fmt(subtotal)}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={onOpenCharge}
                  className="flex-1 min-h-[44px] rounded-[var(--radius-md)] border text-[12px] font-medium transition-colors"
                  style={{ fontFamily: 'var(--font-body)', background: 'transparent', border: '0.5px solid var(--h-gray-300)', color: 'var(--h-gray-700)' }}
                >
                  + Discount
                </button>
                {onHoldSale && (
                  <button
                    type="button"
                    onClick={onHoldSale}
                    className="flex-1 min-h-[44px] rounded-[var(--radius-md)] border text-[12px] font-medium transition-colors"
                    style={{ fontFamily: 'var(--font-body)', background: 'transparent', border: '0.5px solid var(--h-gray-300)', color: 'var(--h-gray-700)' }}
                  >
                    Hold Sale
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
