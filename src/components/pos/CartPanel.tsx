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
      className="w-[344px] flex-shrink-0 flex flex-col border-l border-[rgba(0,0,0,0.07)] bg-white overflow-hidden"
      aria-label="Current sale"
    >
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[rgba(0,0,0,0.07)] flex-shrink-0">
        <h2
          className="text-[14px] font-extrabold"
          style={{ fontFamily: 'Syne, sans-serif', color: '#0D1117', letterSpacing: '0.02em' }}
        >
          Current Sale
        </h2>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-[11px] font-medium text-[#8892A0] px-2 py-1.5 rounded border border-[rgba(0,0,0,0.11)] hover:bg-[#F4F6F9] transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-[#8892A0] mb-3"
              style={{ background: '#F4F6F9', border: '1px solid rgba(0,0,0,0.11)' }}
            >
              <IconCart />
            </div>
            <p
              className="text-[13px] font-semibold text-[#424958] mb-1"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Cart is empty
            </p>
            <p
              className="text-[12px]"
              style={{ fontFamily: "'DM Sans', sans-serif", color: '#8892A0' }}
            >
              Tap a product to add it
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[rgba(0,0,0,0.07)] hover:bg-[#F4F6F9] transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-[7px] flex-shrink-0 flex items-center justify-center overflow-hidden bg-[#F4F6F9] border border-[rgba(0,0,0,0.07)]"
                  >
                    {line.imageUrl ? (
                      <img src={line.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                    <IconBox />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#0D1117] truncate">{line.name}</p>
                    <p className="text-[10px] text-[#8892A0]">{line.sizeLabel ?? 'One size'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className="text-[13px] font-extrabold"
                      style={{ fontFamily: 'Syne, sans-serif', color: '#5CACFA' }}
                    >
                      {fmt(line.unitPrice * line.qty)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(line.key, -1)}
                        disabled={line.qty <= 1}
                        className="w-[22px] h-[22px] rounded flex items-center justify-center text-[#424958] font-semibold border border-[rgba(0,0,0,0.11)] bg-[#F4F6F9] hover:bg-[#EEF1F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        −
                      </button>
                      <span className="text-[12px] font-semibold min-w-[14px] text-center tabular-nums">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(line.key, 1)}
                        className="w-[22px] h-[22px] rounded flex items-center justify-center text-[#424958] font-semibold border border-[rgba(0,0,0,0.11)] bg-[#F4F6F9] hover:bg-[#EEF1F6] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-shrink-0 px-4 py-3.5 border-t border-[rgba(0,0,0,0.07)] space-y-2">
              <div className="flex justify-between items-center text-[12px]">
                <span style={{ color: '#8892A0' }}>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span className="font-medium text-[#424958] tabular-nums">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span style={{ color: '#8892A0' }}>Discount</span>
                <span className="font-medium text-[#16A34A] tabular-nums">−{fmt(0)}</span>
              </div>
              <div className="h-px bg-[rgba(0,0,0,0.07)] my-2" />
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-semibold text-[#0D1117]">Total</span>
                <span
                  className="text-[20px] font-extrabold tabular-nums"
                  style={{ fontFamily: 'Syne, sans-serif', color: '#0D1117' }}
                >
                  {fmt(subtotal)}
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 p-4 pt-0 flex flex-col gap-2">
              <button
                type="button"
                onClick={onOpenCharge}
                className="w-full h-11 rounded-[7px] text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-all duration-150 hover:-translate-y-px hover:bg-[#3D96F5] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  background: '#5CACFA',
                  boxShadow: '0 2px 8px rgba(92,172,250,0.25)',
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
                  className="flex-1 h-8 rounded-[7px] border border-[rgba(0,0,0,0.11)] bg-[#F4F6F9] text-[11px] font-medium text-[#424958] hover:bg-[#EEF1F6] transition-colors"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  + Discount
                </button>
                <button
                  type="button"
                  onClick={onHoldSale}
                  className="flex-1 h-8 rounded-[7px] border border-[rgba(0,0,0,0.11)] bg-[#F4F6F9] text-[11px] font-medium text-[#424958] hover:bg-[#EEF1F6] transition-colors"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
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
