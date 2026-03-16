// ============================================================
// CartSheet.tsx
// File: warehouse-pos/src/components/pos/CartSheet.tsx
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Trash2, Check, X, ShoppingBag } from 'lucide-react';
import { PayIcon } from './PaymentIcons';

export interface CartLine {
  key:        string;
  productId:  string;
  name:       string;
  sku:        string;
  sizeCode:   string | null;
  sizeLabel:  string | null;
  unitPrice:  number;
  qty:        number;
  imageUrl?:  string | null;
}

export type PaymentMethod  = 'Cash' | 'MoMo' | 'Card' | 'Mix';
export type DeliveryStatus = 'delivered' | 'pending' | 'dispatched';

export interface PaymentMixBreakdown {
  cash: number;
  momo: number;
  card: number;
}

export interface SalePayload {
  lines:           CartLine[];
  subtotal:        number;
  discountPct:     number;
  discountAmt:     number;
  total:           number;
  paymentMethod:   PaymentMethod;
  /** When paymentMethod is Mix, breakdown must sum to total. */
  paymentMixBreakdown?: PaymentMixBreakdown | null;
  customerName:    string;
  warehouseId:     string;
  deliveryStatus:  DeliveryStatus;
  recipientName:   string;
  recipientPhone:  string;
  deliveryAddress: string;
  deliveryNotes:   string;
  expectedDate:    string;
}

export type ChargeStatus = 'idle' | 'processing' | 'success' | 'error';

interface CartSheetProps {
  isOpen:       boolean;
  lines:        CartLine[];
  warehouseId:  string;
  chargeStatus?: ChargeStatus;
  lastChargeError?: string | null;
  onRetry?: () => void;
  onUpdateQty:  (key: string, delta: number) => void;
  onRemoveLine: (key: string) => void;
  onClearCart:  () => void;
  onCharge:     (payload: SalePayload) => Promise<void>;
  onClose:      () => void;
}

function fmt(n: number) {
  return `GH\u20B5${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

/** Group cart lines by product (same productId) for multi-size rows with size chips. */
function groupLinesByProduct(lines: CartLine[]): Array<{ productId: string; name: string; sku: string; lines: CartLine[] }> {
  const byProduct = new Map<string, CartLine[]>();
  for (const l of lines) {
    if (!byProduct.has(l.productId)) byProduct.set(l.productId, []);
    byProduct.get(l.productId)!.push(l);
  }
  return Array.from(byProduct.entries()).map(([productId, groupLines]) => {
    const first = groupLines[0]!;
    return { productId, name: first.name, sku: first.sku, lines: groupLines };
  });
}

const SWIPE_REVEAL_PX = 80;
const SWIPE_THRESHOLD_PX = 50;

function SwipeToRevealRow({ onRemove, children, className = '' }: { onRemove: () => void; children: React.ReactNode; className?: string }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const currentX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; currentX.current = offset; };
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    setOffset(Math.min(0, Math.max(-SWIPE_REVEAL_PX, currentX.current + dx)));
  };
  const handleTouchEnd = () => setOffset(offset < -SWIPE_THRESHOLD_PX ? -SWIPE_REVEAL_PX : 0);
  return (
    <div className={`relative overflow-hidden rounded-[10px] ${className}`}>
      <div
        className="relative z-10 transition-transform duration-150 ease-out touch-pan-y"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
      <div className="absolute right-0 top-0 bottom-0 z-0 w-[80px] flex items-center justify-center bg-red-500" aria-hidden>
        <button type="button" onClick={() => { setOffset(0); onRemove(); }} className="w-full h-full flex items-center justify-center text-white text-[12px] font-bold">Remove</button>
      </div>
    </div>
  );
}

const IconX = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const IconUser = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const IconTruck = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>);
const IconPhone = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.38 2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16l.92.92z"/></svg>);
const IconMapPin = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>);
const IconCalendar = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
const IconSpinner = () => <span className="loading-spinner-ring loading-spinner-ring-sm inline-block shrink-0" aria-hidden />;

function PayBtn({ method, selected, onSelect }: { method: PaymentMethod; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex-1 h-14 rounded-2xl border flex flex-col items-center justify-center gap-1 text-[12px] font-bold transition-all duration-150 active:scale-95"
      style={{
        background: selected ? 'var(--blue-soft)' : 'var(--surface)',
        borderColor: selected ? 'rgba(92,172,250,0.3)' : 'var(--border)',
        color: selected ? 'var(--blue)' : 'var(--text-2)',
      }}
    >
      <span className="flex items-center justify-center leading-none"><PayIcon method={method} size={20} /></span>
      <span>{method}</span>
    </button>
  );
}

function FieldRow({ icon, placeholder, value, onChange, type = 'text', min }: { icon: React.ReactNode; placeholder: string; value: string; onChange: (v: string) => void; type?: string; min?: string; }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-amber-100/60 last:border-0">
      <span className="text-amber-500 flex-shrink-0">{icon}</span>
      <input type={type} min={min} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent font-sans text-[13px] text-slate-900 placeholder:text-slate-400 outline-none border-none" />
    </div>
  );
}

export default function CartSheet({ isOpen, lines, warehouseId, chargeStatus = 'idle', lastChargeError, onRetry, onUpdateQty, onRemoveLine, onClearCart, onCharge, onClose }: CartSheetProps) {
  const [customerName,     setCustomerName]    = useState('');
  const [discountPct,      setDiscountPct]     = useState<number | ''>(0);
  const [paymentMethod,    setPaymentMethod]   = useState<PaymentMethod>('Cash');
  const [mixCash,          setMixCash]         = useState<string>('');
  const [mixMoMo,          setMixMoMo]         = useState<string>('');
  const [mixCard,          setMixCard]         = useState<string>('');
  const processing = chargeStatus === 'processing';
  const [scheduleDelivery, setScheduleDelivery] = useState(false);
  const [recipientName,    setRecipientName]   = useState('');
  const [recipientPhone,   setRecipientPhone]  = useState('');
  const [deliveryAddress,  setDeliveryAddress] = useState('');
  const [deliveryNotes,    setDeliveryNotes]   = useState('');
  const [expectedDate,     setExpectedDate]    = useState('');
  const customerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) { setDiscountPct(0); setPaymentMethod('Cash'); setMixCash(''); setMixMoMo(''); setMixCard(''); setScheduleDelivery(false); setRecipientName(''); setRecipientPhone(''); setDeliveryAddress(''); setDeliveryNotes(''); setExpectedDate(''); }
  }, [isOpen]);

  useEffect(() => { if (isOpen) document.body.style.overflow = 'hidden'; else document.body.style.overflow = ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen && !processing) onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [isOpen, processing, onClose]);

  // Pre-fill recipient name from customer name when toggling delivery on
  useEffect(() => { if (scheduleDelivery && !recipientName && customerName) setRecipientName(customerName); }, [scheduleDelivery]);

  const subtotal    = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const disc        = Number(discountPct) || 0;
  const discountAmt = subtotal * (disc / 100);
  const total       = subtotal - discountAmt;
  const itemCount   = lines.reduce((s, l) => s + l.qty, 0);
  const deliveryReady = !scheduleDelivery || recipientName.trim().length > 0;

  const mixCashN = Number(mixCash) || 0;
  const mixMoMoN = Number(mixMoMo) || 0;
  const mixCardN = Number(mixCard) || 0;
  const mixSum   = mixCashN + mixMoMoN + mixCardN;
  const mixValid = paymentMethod !== 'Mix' || Math.abs(mixSum - total) < 0.01;
  const canCharge = deliveryReady && mixValid;

  async function handleCharge() {
    if (lines.length === 0 || processing || !canCharge) return;
    if (paymentMethod === 'Mix' && Math.abs(mixSum - total) >= 0.01) return;
    const payload: SalePayload = {
      lines, subtotal, discountPct: disc, discountAmt, total,
      paymentMethod, customerName: customerName.trim(), warehouseId,
      deliveryStatus:  scheduleDelivery ? 'pending'  : 'delivered',
      recipientName:   scheduleDelivery ? recipientName.trim()   : '',
      recipientPhone:  scheduleDelivery ? recipientPhone.trim()  : '',
      deliveryAddress: scheduleDelivery ? deliveryAddress.trim() : '',
      deliveryNotes:   scheduleDelivery ? deliveryNotes.trim()   : '',
      expectedDate:    scheduleDelivery ? expectedDate           : '',
    };
    if (paymentMethod === 'Mix') {
      payload.paymentMixBreakdown = { cash: mixCashN, momo: mixMoMoN, card: mixCardN };
    }
    await onCharge(payload);
  }

  return (
    <>
      {/* Overlay: on mobile leave room for bottom nav (--bottom-nav-h); desktop full cover */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-250 ${isOpen ? 'bg-black/40 backdrop-blur-[2px] pointer-events-auto' : 'bg-transparent pointer-events-none'}`}
        style={{ paddingBottom: 'var(--bottom-nav-h)' }}
        onClick={() => !processing && onClose()}
      />
      {/* Sheet: above bottom nav; max-height so it never goes under browser chrome; premium handle + shadow */}
      <div
        className={`fixed left-0 right-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.34,1.1,0.64,1)] ${isOpen ? 'translate-y-0' : 'translate-y-full'} bottom-[var(--bottom-nav-h)] lg:bottom-0 rounded-t-3xl max-h-[72dvh] lg:max-h-[85vh]`}
        style={{ boxShadow: '0 -12px 48px rgba(0,0,0,0.14), 0 -2px 12px rgba(0,0,0,0.06)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0" aria-hidden>
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[18px] font-bold text-slate-900">Cart</h2>
            {lines.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[var(--blue)] text-white text-[11px] font-bold">
                {itemCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {lines.length > 0 && (
              <span className="text-[14px] font-bold text-slate-900 tabular-nums">{fmt(subtotal)}</span>
            )}
            {lines.length > 0 && <button type="button" onClick={onClearCart} disabled={processing} className="h-8 px-3 rounded-lg text-[12px] font-semibold text-red-500 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors duration-150">Clear all</button>}
            <button type="button" onClick={onClose} disabled={processing} className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 transition-all duration-150"><IconX /></button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: 'var(--sheet-safe-padding-bottom)' }}
        >
          {lines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-[#8892A0]" style={{ background: '#F4F6F9', border: '1px solid rgba(0,0,0,0.11)' }}>
                <ShoppingBag className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-semibold text-[#424958] mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Cart is empty</p>
              <p className="text-[12px] mb-5" style={{ color: 'var(--text-3)' }}>
                Add products from the grid to get started.
              </p>
              <button type="button" onClick={onClose} className="h-11 px-6 rounded-xl text-white text-sm font-bold transition-all active:scale-[0.98]" style={{ background: 'var(--blue)' }}>Start adding products</button>
            </div>
          )}

          {lines.length > 0 && (<>
            {/* Customer name */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
              <span className="text-slate-400 flex-shrink-0"><IconUser /></span>
              <input ref={customerInputRef} type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Search or add customer" className="flex-1 h-10 bg-transparent font-sans text-[14px] text-slate-900 placeholder:text-slate-300 outline-none border-none" />
              {customerName && <button type="button" onClick={() => setCustomerName('')} className="text-slate-300 hover:text-slate-500 transition-colors"><IconX /></button>}
            </div>

            {/* Line items — grouped by product with size chips */}
            <div className="px-2 space-y-2">
              {groupLinesByProduct(lines).map((group) => {
                const groupTotal = group.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
                const removeGroup = () => group.lines.forEach(l => onRemoveLine(l.key));
                return (
                  <SwipeToRevealRow key={group.productId} onRemove={removeGroup}>
                    <div className="px-4 py-3.5 rounded-[10px] mx-0" style={{ borderColor: 'var(--border)', background: 'var(--elevated)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[14px] font-bold truncate leading-snug flex-1 min-w-0" style={{ color: 'var(--text)' }}>{group.name}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <p className="text-[14px] font-bold tabular-nums" style={{ color: 'var(--blue)', fontFamily: 'var(--font-m)' }}>{fmt(groupTotal)}</p>
                          <button type="button" onClick={removeGroup} className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-colors" style={{ background: 'var(--red-dim)', color: 'var(--red-status)' }}><Trash2 className="w-3.5 h-3.5" strokeWidth={2} /></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {group.lines.map((l) => (
                          <div key={l.key} className="inline-flex items-center gap-0.5 rounded-lg border px-2 py-1.5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                          <button type="button" onClick={() => onUpdateQty(l.key, -1)} className="w-7 h-7 rounded flex items-center justify-center text-[14px] font-bold" style={{ color: 'var(--text-2)' }}>−</button>
                            <span className="min-w-[2.5rem] text-center text-[12px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>{l.sizeLabel ?? 'One size'} ×{l.qty}</span>
                            <button type="button" onClick={() => onUpdateQty(l.key, 1)} className="w-7 h-7 rounded flex items-center justify-center text-[14px] font-bold" style={{ color: 'var(--text-2)' }}>+</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SwipeToRevealRow>
                );
              })}
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
              <div>
                <p className="text-[13px] font-semibold text-slate-700">Cart discount</p>
                {disc > 0 && <p className="text-[12px] text-emerald-600 font-medium mt-0.5">Saving {fmt(discountAmt)}</p>}
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={100} value={discountPct} onChange={e => { const v = e.target.value; setDiscountPct(v === '' ? '' : Math.min(100, Math.max(0, Number(v)))); }} className="w-16 h-10 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-center font-sans text-[16px] font-bold text-slate-900 focus:outline-none focus:border-primary-400 focus:bg-white focus:ring-[3px] focus:ring-primary-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all duration-150" />
                <span className="text-[14px] font-semibold text-slate-400">%</span>
              </div>
            </div>

            {/* Totals */}
            <div className="px-5 py-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center"><span className="text-[12px] text-[#8892A0]">Subtotal</span><span className="text-[12px] font-medium text-[#424958] tabular-nums">{fmt(subtotal)}</span></div>
              {disc > 0 && <div className="flex justify-between items-center"><span className="text-[12px] text-[#8892A0]">Discount ({disc}%)</span><span className="text-[12px] font-medium text-[#16A34A] tabular-nums">−{fmt(discountAmt)}</span></div>}
              <div className="flex justify-between items-center pt-2 border-t border-[rgba(0,0,0,0.07)]"><span className="text-[13px] font-semibold text-[#0D1117]">Total</span><span className="text-[20px] font-extrabold tabular-nums" style={{ fontFamily: 'Syne, sans-serif', color: '#0D1117' }}>{fmt(total)}</span></div>
            </div>

            {/* Payment */}
            <div className="px-5 pt-2 pb-3 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Payment method</p>
              <div className="flex gap-2">
                {(['Cash', 'MoMo', 'Card', 'Mix'] as PaymentMethod[]).map((method) => (
                  <PayBtn key={method} method={method} selected={paymentMethod === method} onSelect={() => setPaymentMethod(method)} />
                ))}
              </div>
              {paymentMethod === 'Mix' && (
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-bold text-slate-500">Split total ({fmt(total)})</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Cash</label>
                      <input type="number" min={0} step={0.01} value={mixCash} onChange={e => setMixCash(e.target.value)} placeholder="0" className="w-full h-10 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 px-2 text-[13px] font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">MoMo</label>
                      <input type="number" min={0} step={0.01} value={mixMoMo} onChange={e => setMixMoMo(e.target.value)} placeholder="0" className="w-full h-10 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 px-2 text-[13px] font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Card</label>
                      <input type="number" min={0} step={0.01} value={mixCard} onChange={e => setMixCard(e.target.value)} placeholder="0" className="w-full h-10 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 px-2 text-[13px] font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                  </div>
                  {!mixValid && mixSum > 0 && <p className="text-[11px] text-red-500 font-medium">Cash + MoMo + Card must equal total ({fmt(total)})</p>}
                </div>
              )}
            </div>

            {/* ── Schedule Delivery Toggle ─────────────────────────────── */}
            <div className="px-5 py-3 border-t border-slate-100">
              <button type="button" onClick={() => setScheduleDelivery(v => !v)} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-[1.5px] transition-all duration-200 ${scheduleDelivery ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`${scheduleDelivery ? 'text-amber-500' : 'text-slate-400'} transition-colors`}><IconTruck /></span>
                  <div className="text-left">
                    <p className={`text-[13px] font-bold leading-tight ${scheduleDelivery ? 'text-amber-700' : 'text-slate-700'}`}>Schedule Delivery</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Paid now · delivered later</p>
                  </div>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${scheduleDelivery ? 'bg-amber-400' : 'bg-slate-200'}`}>
                  <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${scheduleDelivery ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                </div>
              </button>

              {/* Delivery fields */}
              <div className={`overflow-hidden transition-all duration-300 ${scheduleDelivery ? 'max-h-[400px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="rounded-2xl border-[1.5px] border-amber-200 bg-amber-50/50 overflow-hidden">
                  <div className="px-4 py-2.5 bg-amber-100/60 border-b border-amber-200">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Delivery Details</p>
                  </div>
                  <FieldRow icon={<IconUser />}     placeholder="Recipient name *"      value={recipientName}   onChange={setRecipientName} />
                  <FieldRow icon={<IconPhone />}    placeholder="Phone number"           value={recipientPhone}  onChange={setRecipientPhone}  type="tel" />
                  <FieldRow icon={<IconMapPin />}   placeholder="Delivery address"       value={deliveryAddress} onChange={setDeliveryAddress} />
                  <FieldRow icon={<IconCalendar />} placeholder="Expected delivery date" value={expectedDate}    onChange={setExpectedDate}    type="date" min={todayStr()} />
                  <div className="px-4 py-2.5">
                    <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full bg-transparent resize-none font-sans text-[13px] text-slate-900 placeholder:text-slate-400 outline-none border-none" />
                  </div>
                  {scheduleDelivery && !recipientName.trim() && (
                    <div className="px-4 pb-2.5"><p className="text-[11px] text-amber-600 font-medium">⚠ Recipient name required to schedule delivery</p></div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-4" />
          </>)}
        </div>

        {/* Charge button — IDLE / PROCESSING / SUCCESS / ERROR */}
        {lines.length > 0 && (
          <div
            className="px-5 py-4 flex-shrink-0 space-y-1"
            style={{
              borderTop: '0.5px solid var(--h-gray-100)',
              background: 'var(--h-white)',
              position: 'sticky',
              bottom: 0,
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            }}
          >
            {chargeStatus === 'error' && lastChargeError && (
              <p className="text-[11px] text-red-500 font-medium text-center">
                {lastChargeError}
              </p>
            )}
            <button
              type="button"
              onClick={chargeStatus === 'error' ? onRetry : handleCharge}
              disabled={lines.length === 0 || !canCharge || chargeStatus === 'processing' || chargeStatus === 'success'}
              className="w-full h-12 rounded-[10px] border-none text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-200 hover:-translate-y-px uppercase font-extrabold text-[16px]"
              style={{
                fontFamily: 'var(--font-d)',
                background: chargeStatus === 'success' ? '#16A34A' : chargeStatus === 'error' ? 'var(--red-status)' : chargeStatus === 'processing' ? 'var(--border)' : scheduleDelivery ? 'var(--amber)' : 'var(--blue)',
                color: chargeStatus === 'processing' ? 'var(--text-3)' : undefined,
                boxShadow: chargeStatus === 'success' ? '0 4px 14px rgba(22,163,74,0.25)' : chargeStatus === 'error' ? '0 4px 14px rgba(239,68,68,0.2)' : chargeStatus === 'processing' ? 'none' : scheduleDelivery ? '0 4px 14px rgba(217,119,6,0.2)' : '0 4px 14px var(--blue-glow)',
              }}
            >
              {chargeStatus === 'processing' ? (<><IconSpinner /> Processing…</>) : chargeStatus === 'success' ? (<><Check className="w-5 h-5" strokeWidth={2.5} /> Sale complete</>) : chargeStatus === 'error' ? (<><X className="w-5 h-5" strokeWidth={2.5} /> Failed — tap to retry</>) : scheduleDelivery ? (<><IconTruck /> Charge & Schedule — {fmt(total)}</>) : (`Charge ${fmt(total)}`)}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes cart-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
