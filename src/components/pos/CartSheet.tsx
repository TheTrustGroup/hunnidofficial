// ============================================================
// CartSheet.tsx
// File: warehouse-pos/src/components/pos/CartSheet.tsx
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
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

interface CartSheetProps {
  isOpen:       boolean;
  lines:        CartLine[];
  warehouseId:  string;
  warehouseName?: string;
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

function CartLineItem({ line, onUpdateQty, onRemove }: { line: CartLine; onUpdateQty: (k: string, d: number) => void; onRemove: (k: string) => void }) {
  return (
    <div
      className="flex items-start gap-3 px-5 py-3.5 border-b last:border-0 rounded-[10px] mx-2 mt-1"
      style={{ borderColor: 'var(--border)', background: 'var(--elevated)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold truncate leading-snug" style={{ color: 'var(--text)' }}>{line.name}</p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>{line.sizeLabel ? `${line.sizeLabel} · ` : ''}{fmt(line.unitPrice)} each</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => onUpdateQty(line.key, -1)}
            disabled={line.qty <= 1}
            className="min-w-[44px] min-h-[44px] rounded-lg border text-sm font-bold flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 touch-manipulation"
            style={{ background: 'var(--border)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
          >
            −
          </button>
          <span className="text-sm font-bold min-w-[20px] text-center tabular-nums" style={{ color: 'var(--text)' }}>{line.qty}</span>
          <button
            type="button"
            onClick={() => onUpdateQty(line.key, 1)}
            className="min-w-[44px] min-h-[44px] rounded-lg border text-sm font-bold flex items-center justify-center active:scale-95 transition-all duration-150 touch-manipulation"
            style={{ background: 'var(--border)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
          >
            +
          </button>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0 pt-0.5">
        <button
          type="button"
          onClick={() => onRemove(line.key)}
          className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-colors touch-manipulation text-[11px] font-semibold"
          style={{ background: 'var(--red-dim)', color: 'var(--red-status)' }}
          aria-label={`Remove ${line.name}${line.sizeLabel ? ` (${line.sizeLabel})` : ''} from cart`}
        >
          <Trash2 className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          <span>Remove</span>
        </button>
        <p className="text-[14px] font-bold tabular-nums" style={{ color: 'var(--blue)', fontFamily: 'var(--font-m)' }}>{fmt(line.unitPrice * line.qty)}</p>
      </div>
    </div>
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

export default function CartSheet({ isOpen, lines, warehouseId, warehouseName, onUpdateQty, onRemoveLine, onClearCart, onCharge, onClose }: CartSheetProps) {
  const [customerName,     setCustomerName]    = useState('');
  const [discountPct,      setDiscountPct]     = useState<number | ''>(0);
  const [paymentMethod,    setPaymentMethod]   = useState<PaymentMethod>('Cash');
  const [mixCash,          setMixCash]         = useState<string>('');
  const [mixMoMo,          setMixMoMo]         = useState<string>('');
  const [mixCard,          setMixCard]         = useState<string>('');
  const [isCharging,       setIsCharging]      = useState(false);
  const [scheduleDelivery, setScheduleDelivery] = useState(false);
  const [recipientName,    setRecipientName]   = useState('');
  const [recipientPhone,   setRecipientPhone]  = useState('');
  const [deliveryAddress,  setDeliveryAddress] = useState('');
  const [deliveryNotes,    setDeliveryNotes]   = useState('');
  const [expectedDate,     setExpectedDate]    = useState('');
  const [chargeStatus,     setChargeStatus]    = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const customerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDiscountPct(0);
      setPaymentMethod('Cash');
      setMixCash(''); setMixMoMo(''); setMixCard('');
      setScheduleDelivery(false);
      setRecipientName(''); setRecipientPhone(''); setDeliveryAddress(''); setDeliveryNotes(''); setExpectedDate('');
      setChargeStatus('idle');
    }
  }, [isOpen]);

  useEffect(() => { if (isOpen) document.body.style.overflow = 'hidden'; else document.body.style.overflow = ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen && !isCharging) onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [isOpen, isCharging, onClose]);

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
    if (lines.length === 0 || isCharging || !canCharge) return;
    if (paymentMethod === 'Mix' && Math.abs(mixSum - total) >= 0.01) return;
    setIsCharging(true);
    setChargeStatus('processing');
    try {
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
      setChargeStatus('success');
      setCustomerName(''); setDiscountPct(0); setPaymentMethod('Cash');
      setMixCash(''); setMixMoMo(''); setMixCard('');
      setScheduleDelivery(false); setRecipientName(''); setRecipientPhone('');
      setDeliveryAddress(''); setDeliveryNotes(''); setExpectedDate('');
      // Parent closes sheet after 2s and shows success screen
    } catch {
      setChargeStatus('error');
    } finally {
      setIsCharging(false);
    }
  }

  return (
    <>
      <div className={`fixed inset-0 z-40 transition-all duration-250 ${isOpen ? 'bg-black/40 backdrop-blur-[2px] pointer-events-auto' : 'bg-transparent pointer-events-none'}`} onClick={() => !isCharging && onClose()} />
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[24px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] flex flex-col max-h-[92vh] transition-transform duration-300 ease-[cubic-bezier(0.34,1.1,0.64,1)] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>

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
          <div className="flex items-center gap-2">
            {lines.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                disabled={isCharging}
                className="text-[11px] font-semibold disabled:opacity-40 transition-opacity"
                style={{ color: 'var(--h-red)', fontFamily: 'var(--font-body)' }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isCharging}
              className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--h-gray-100)', color: 'var(--h-gray-500)' }}
              aria-label="Close"
            >
              <IconX />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {lines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 text-[#8892A0]" style={{ background: '#F4F6F9', border: '1px solid rgba(0,0,0,0.11)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-[#424958] mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Cart is empty</p>
              <p className="text-[12px]" style={{ fontFamily: "'DM Sans', sans-serif", color: '#8892A0' }}>Tap a product to add it</p>
            </div>
          )}

          {lines.length > 0 && (<>
            {/* Customer name */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
              <span className="text-slate-400 flex-shrink-0"><IconUser /></span>
              <input ref={customerInputRef} type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name (optional)" className="flex-1 h-10 bg-transparent font-sans text-[14px] text-slate-900 placeholder:text-slate-300 outline-none border-none" />
              {customerName && <button type="button" onClick={() => setCustomerName('')} className="text-slate-300 hover:text-slate-500 transition-colors"><IconX /></button>}
            </div>

            {/* Line items */}
            <div>{lines.map(line => <CartLineItem key={line.key} line={line} onUpdateQty={onUpdateQty} onRemove={onRemoveLine} />)}</div>

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
            className="px-4 py-3 border-t flex-shrink-0"
            style={{ borderTop: '0.5px solid var(--h-gray-100)', background: 'var(--h-white)' }}
          >
            <button
              type="button"
              onClick={handleCharge}
              disabled={chargeStatus === 'processing' || chargeStatus === 'success' || (chargeStatus === 'idle' && (lines.length === 0 || !canCharge))}
              className="w-full h-12 rounded-[var(--radius-md)] border-none text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all font-medium text-[16px]"
              style={{
                fontFamily: chargeStatus === 'success' ? 'var(--font-body)' : 'var(--font-display)',
                background:
                  chargeStatus === 'success' ? 'var(--h-green)' :
                  chargeStatus === 'error' ? 'var(--h-red-light)' :
                  chargeStatus === 'processing' ? 'var(--h-gray-300)' :
                  scheduleDelivery ? 'var(--h-amber)' : 'var(--h-blue)',
                color: chargeStatus === 'error' ? 'var(--h-red)' : 'var(--h-white)',
              }}
            >
              {chargeStatus === 'processing' && <><IconSpinner /> Processing…</>}
              {chargeStatus === 'success' && '✓ Sale complete'}
              {chargeStatus === 'error' && 'Failed — tap to retry'}
              {chargeStatus === 'idle' && (scheduleDelivery ? <><IconTruck /> Charge & Schedule — {fmt(total)}</> : `Charge ${fmt(total)}`)}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
