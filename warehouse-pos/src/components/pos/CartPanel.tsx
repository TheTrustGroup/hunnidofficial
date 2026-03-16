/**
 * CartPanel.tsx — Desktop POS cart (344px right column).
 * Spec: Current Sale header, items (40×40 thumb, qty 22×22), Subtotal/Discount/Grand Total,
 * "Charge GH₵X,XXX" primary, "+ Discount" | "Hold Sale" secondary. Empty state centered.
 */
import type { CartLine } from './CartSheet';

export interface CartPanelProps {
  lines: CartLine[];
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
      className="w-[344px] flex-shrink-0 flex flex-col overflow-hidden"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
      aria-label="Current sale"
    >
      <div
        className="flex items-center justify-between px-4 py-3.5 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <h2
          className="text-[14px] font-extrabold"
          style={{ fontFamily: 'var(--font-d)', color: 'var(--text)', letterSpacing: '0.02em' }}
        >
          Current Sale
        </h2>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-[11px] font-medium px-2 py-1.5 rounded border transition-colors hover:bg-[var(--overlay)]"
            style={{ fontFamily: 'var(--font-b)', color: 'var(--text-3)', borderColor: 'var(--border)' }}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3 border"
              style={{ background: 'var(--elevated)', borderColor: 'var(--border)', color: 'var(--text-3)' }}
            >
              <IconCart />
            </div>
            <p
              className="text-[13px] font-semibold mb-1"
              style={{ fontFamily: 'var(--font-d)', color: 'var(--text)' }}
            >
              Cart is empty
            </p>
            <p className="text-[12px]" style={{ fontFamily: 'var(--font-b)', color: 'var(--text-3)' }}>
              Tap a product to add it
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="flex items-center gap-2.5 px-4 py-2.5 border-b transition-colors rounded-[10px] mx-2 mt-1"
                  style={{ borderColor: 'var(--border)', background: 'var(--elevated)' }}
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex-shrink-0 flex items-center justify-center overflow-hidden border"
                    style={{ background: 'var(--elevated)', borderColor: 'var(--border)' }}
                  >
                    {line.imageUrl ? (
                      <img src={line.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <IconBox />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text)' }}>{line.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{line.sizeLabel ?? 'One size'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className="text-[13px] font-extrabold tabular-nums"
                      style={{ fontFamily: 'var(--font-m)', color: 'var(--blue)' }}
                    >
                      {fmt(line.unitPrice * line.qty)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(line.key, -1)}
                        className="pos-cart-qty-btn w-[22px] h-[22px] rounded flex items-center justify-center font-semibold border transition-colors"
                        style={{ borderColor: 'var(--border)', background: 'var(--border)', color: 'var(--text-2)' }}
                      >
                        −
                      </button>
                      <span className="text-[12px] font-semibold min-w-[14px] text-center tabular-nums" style={{ color: 'var(--text)' }}>
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(line.key, 1)}
                        className="pos-cart-qty-btn w-[22px] h-[22px] rounded flex items-center justify-center font-semibold border transition-colors"
                        style={{ borderColor: 'var(--border)', background: 'var(--border)', color: 'var(--text-2)' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-shrink-0 px-4 py-3.5 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-center text-[12px]">
                <span style={{ color: 'var(--text-3)' }}>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span className="font-medium tabular-nums" style={{ color: 'var(--text-2)' }}>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span style={{ color: 'var(--text-3)' }}>Discount</span>
                <span className="font-medium tabular-nums" style={{ color: 'var(--green)' }}>−{fmt(0)}</span>
              </div>
              <div className="h-px my-2" style={{ background: 'var(--border)' }} />
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Total</span>
                <span
                  className="text-[20px] font-extrabold tabular-nums"
                  style={{ fontFamily: 'var(--font-d)', color: 'var(--text)' }}
                >
                  {fmt(subtotal)}
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 p-4 pt-0 flex flex-col gap-2">
              <button
                type="button"
                onClick={onOpenCharge}
                className="w-full h-12 rounded-[10px] text-white flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 uppercase font-extrabold text-[16px]"
                style={{
                  fontFamily: 'var(--font-d)',
                  background: 'var(--blue)',
                  boxShadow: '0 4px 14px var(--blue-glow)',
                }}
              >
                Charge {fmt(subtotal)}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={onOpenCharge}
                  className="flex-1 h-8 rounded-[10px] border text-[11px] font-medium transition-colors"
                  style={{ fontFamily: 'var(--font-b)', background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
                >
                  + Discount
                </button>
                <button
                  type="button"
                  onClick={onHoldSale}
                  className="flex-1 h-8 rounded-[10px] border text-[11px] font-medium transition-colors"
                  style={{ fontFamily: 'var(--font-b)', background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
                >
                  Hold Sale
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
