// ============================================================
// SaleSuccessScreen.tsx
// File: warehouse-pos/src/components/pos/SaleSuccessScreen.tsx
//
// World-class post-sale experience.
// - Dark luxury backdrop with animated success state
// - Full thermal receipt with REAL receipt number from server
// - Product image thumbnails in line items
// - Download receipt as printable PDF page
// - Share via WhatsApp / native share sheet
// - Smooth slide-up animation
// ============================================================

import { useEffect, useState, useRef } from 'react';
import { type SalePayload, type DeliveryStatus } from './CartSheet';
import { PayIcon } from './PaymentIcons';

// ── Extended sale type (POSPage sets receiptId from server) ────────────────
export interface CompletedSale extends Omit<SalePayload, 'deliveryStatus'> {
  receiptId?:      string;
  saleId?:         string;
  completedAt?:    string;
  deliveryStatus?: DeliveryStatus | string;
}

interface SaleSuccessScreenProps {
  sale: CompletedSale | null;
  onNewSale: () => void;
  onShareReceipt: (sale: CompletedSale) => void;
  onPrint: (sale: CompletedSale) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `GH₵${Number(n).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDateTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString('en-GH', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}

// ── Icons ──────────────────────────────────────────────────────────────────

const IconPrint = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

const IconWhatsApp = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

const IconDownload = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// ── Payment config ─────────────────────────────────────────────────────────

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  Cash: { label: 'Cash',         color: 'bg-emerald-500' },
  MoMo: { label: 'Mobile Money', color: 'bg-amber-500'   },
  Card: { label: 'Card',         color: 'bg-blue-500'    },
  Mix:  { label: 'Mix',          color: 'bg-violet-500'  },
};

// ── Download receipt as printable page ────────────────────────────────────

function downloadReceipt(sale: CompletedSale) {
  const receiptNo = sale.receiptId ?? `RCP-${Date.now().toString(36).toUpperCase()}`;
  const payment   = PAYMENT_CONFIG[sale.paymentMethod] ?? { label: sale.paymentMethod, color: '' };
  const itemCount = sale.lines.reduce((s, l) => s + l.qty, 0);

  // ── Date formatting ────────────────────────────────────────────────────
  const d = sale.completedAt ? new Date(sale.completedAt) : new Date();
  const dateStr = d.toLocaleDateString('en-GH', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', hour12: true });

  // ── Line items ─────────────────────────────────────────────────────────
  const itemsHtml = sale.lines.map(l => {
    const lineName = l.name + (l.sizeLabel ? ` <span class="size-tag">${l.sizeLabel}</span>` : '');
    return `
      <tr class="item-row">
        <td class="item-desc">
          <span class="item-name">${lineName}</span>
        </td>
        <td class="item-qty">${l.qty}</td>
        <td class="item-price">${fmt(l.unitPrice)}</td>
        <td class="item-total">${fmt(l.unitPrice * l.qty)}</td>
      </tr>`;
  }).join('');

  const discountRow = sale.discountPct > 0 ? `
    <tr class="summary-row">
      <td colspan="3" class="summary-label">Discount (${sale.discountPct}%)</td>
      <td class="summary-value discount-val">−${fmt(sale.discountAmt)}</td>
    </tr>` : '';

  const subtotalRow = sale.subtotal !== sale.total ? `
    <tr class="summary-row">
      <td colspan="3" class="summary-label">Subtotal</td>
      <td class="summary-value">${fmt(sale.subtotal)}</td>
    </tr>` : '';

  // ── HTML receipt ───────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receipt ${receiptNo} — Hunnid Official</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'DM Sans', system-ui, sans-serif;
    background: #f4f4f5;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 100vh;
    padding: 32px 16px 64px;
    color: #09090b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .receipt {
    background: #fff;
    width: 100%;
    max-width: 420px;
    border-radius: 2px;
    box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 8px 32px rgba(0,0,0,.08);
    overflow: hidden;
  }

  /* ── Header ── */
  .header {
    padding: 28px 28px 20px;
    border-bottom: 1px solid #f0f0f0;
  }
  .store-wordmark {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.4px;
    color: #09090b;
    margin-bottom: 2px;
  }
  .store-tagline {
    font-size: 11px;
    color: #a1a1aa;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .receipt-meta {
    margin-top: 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .receipt-no-label {
    font-size: 10px;
    color: #a1a1aa;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .receipt-no-val {
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    font-weight: 500;
    color: #09090b;
    letter-spacing: 0.02em;
  }
  .receipt-date {
    text-align: right;
  }
  .date-main {
    font-size: 13px;
    font-weight: 600;
    color: #09090b;
  }
  .date-time {
    font-size: 11px;
    color: #71717a;
    margin-top: 2px;
  }

  /* ── Customer row ── */
  .customer-row {
    padding: 10px 28px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
    font-size: 12px;
    color: #52525b;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .customer-label { font-weight: 500; color: #a1a1aa; }

  /* ── Items table ── */
  .items-section { padding: 0 28px; }

  .table-head {
    display: grid;
    grid-template-columns: 1fr 32px 72px 72px;
    gap: 8px;
    padding: 12px 0 8px;
    border-bottom: 1.5px solid #09090b;
  }
  .col-head {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #71717a;
  }
  .col-head.right { text-align: right; }

  table.items { width: 100%; border-collapse: collapse; }

  .item-row td { padding: 9px 0 2px; vertical-align: top; }
  .item-row + .item-row td { border-top: 1px solid #f4f4f5; }

  .item-desc { padding-right: 8px; }
  .item-name {
    font-size: 13px;
    font-weight: 600;
    color: #09090b;
    line-height: 1.35;
  }
  .size-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 500;
    color: #71717a;
    background: #f4f4f5;
    border-radius: 4px;
    padding: 1px 5px;
    margin-left: 4px;
    vertical-align: middle;
  }
  .item-qty {
    font-size: 12px;
    font-weight: 500;
    color: #71717a;
    text-align: center;
    white-space: nowrap;
    padding-top: 10px;
  }
  .item-price {
    font-size: 12px;
    color: #71717a;
    text-align: right;
    white-space: nowrap;
    padding-top: 10px;
  }
  .item-total {
    font-size: 13px;
    font-weight: 600;
    color: #09090b;
    text-align: right;
    white-space: nowrap;
    padding-top: 10px;
  }

  /* ── Summary ── */
  .summary-section {
    padding: 0 28px 4px;
    border-top: 1.5px solid #09090b;
    margin-top: 4px;
  }
  table.summary { width: 100%; border-collapse: collapse; }

  .summary-row td { padding: 6px 0; }
  .summary-label {
    font-size: 12px;
    color: #71717a;
    font-weight: 500;
    text-align: right;
    padding-right: 16px;
  }
  .summary-value {
    font-size: 13px;
    font-weight: 600;
    color: #09090b;
    text-align: right;
    white-space: nowrap;
    min-width: 72px;
  }
  .discount-val { color: #16a34a; }

  /* ── Total ── */
  .total-section {
    padding: 14px 28px 16px;
    border-top: 2px solid #09090b;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .total-label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #09090b;
  }
  .total-items {
    font-size: 11px;
    color: #a1a1aa;
    margin-top: 2px;
    font-weight: 400;
  }
  .total-amount {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.6px;
    color: #09090b;
  }

  /* ── Payment ── */
  .payment-section {
    padding: 12px 28px 14px;
    background: #fafafa;
    border-top: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .payment-label {
    font-size: 11px;
    color: #a1a1aa;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .payment-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
    background: #09090b;
    color: #fff;
  }

  /* ── Footer ── */
  .footer {
    padding: 16px 28px 20px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .footer-message {
    font-size: 12px;
    color: #71717a;
    font-weight: 500;
    text-align: center;
  }
  .footer-receipt {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: #d4d4d8;
    letter-spacing: 0.12em;
  }

  /* ── Print styles ── */
  @media print {
    body { background: none; padding: 0; }
    .receipt {
      box-shadow: none;
      border-radius: 0;
      max-width: 100%;
      width: 100%;
    }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<!-- Print button (hidden when printing) -->
<div class="receipt">

  <!-- Header -->
  <div class="header">
    <div class="store-wordmark">Hunnid Official</div>
    <div class="store-tagline">Official Receipt</div>
    <div class="receipt-meta">
      <div>
        <div class="receipt-no-label">Receipt No.</div>
        <div class="receipt-no-val">${receiptNo}</div>
      </div>
      <div class="receipt-date">
        <div class="date-main">${dateStr}</div>
        <div class="date-time">${timeStr}</div>
      </div>
    </div>
  </div>

  ${sale.customerName ? `
  <div class="customer-row">
    <span class="customer-label">Customer</span>
    <span>${sale.customerName}</span>
  </div>` : ''}

  <!-- Items -->
  <div class="items-section">
    <div class="table-head">
      <span class="col-head">Item</span>
      <span class="col-head right">Qty</span>
      <span class="col-head right">Price</span>
      <span class="col-head right">Amount</span>
    </div>
    <table class="items">
      <tbody>${itemsHtml}</tbody>
    </table>
  </div>

  <!-- Summary (subtotal + discount) -->
  ${subtotalRow || discountRow ? `
  <div class="summary-section">
    <table class="summary">
      <tbody>
        ${subtotalRow}
        ${discountRow}
      </tbody>
    </table>
  </div>` : ''}

  <!-- Total -->
  <div class="total-section">
    <div>
      <div class="total-label">Total</div>
      <div class="total-items">${itemCount} item${itemCount !== 1 ? 's' : ''}</div>
    </div>
    <div class="total-amount">${fmt(sale.total)}</div>
  </div>

  <!-- Payment -->
  <div class="payment-section">
    <span class="payment-label">Payment</span>
    <span class="payment-pill">${payment.label}</span>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-message">Thank you for shopping with us!</div>
    <div class="footer-receipt">${receiptNo}</div>
  </div>

</div>

<script>
  // Auto-open print dialog after fonts load
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 600);
  });
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);

  // Open in new tab — print dialog fires automatically
  const tab = window.open(url, '_blank');
  if (!tab) {
    // Fallback: download if popup blocked
    const a  = document.createElement('a');
    a.href   = url;
    a.download = `receipt-${receiptNo}.html`;
    a.click();
  }
  // Revoke after delay
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

// ── Line item row ──────────────────────────────────────────────────────────

function ReceiptLine({ line }: { line: CompletedSale['lines'][number] }) {
  const [imgError, setImgError] = useState(false);
  const hasImg = line.imageUrl && !imgError;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      {/* Product thumbnail */}
      {hasImg ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
          <img
            src={line.imageUrl!}
            alt={line.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-300 border border-slate-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
      )}

      {/* Name + size */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-900 truncate">{line.name}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {line.sizeLabel ? `${line.sizeLabel} · ` : ''}{line.qty} × {fmt(line.unitPrice)}
        </p>
      </div>

      {/* Line total */}
      <p className="text-[14px] font-extrabold text-slate-900 tabular-nums flex-shrink-0">
        {fmt(line.unitPrice * line.qty)}
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SaleSuccessScreen({
  sale,
  onNewSale,
  onShareReceipt,
  onPrint,
}: SaleSuccessScreenProps) {

  const isOpen = sale !== null;
  const [visible, setVisible] = useState(false);
  const [badgeIn, setBadgeIn] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Stagger animations on open
  useEffect(() => {
    if (isOpen) {
      const t1 = setTimeout(() => setVisible(true), 20);
      const t2 = setTimeout(() => setBadgeIn(true), 100);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setVisible(false);
      setBadgeIn(false);
    }
  }, [isOpen]);

  if (!sale) return null;

  const payment  = PAYMENT_CONFIG[sale.paymentMethod] ?? { label: sale.paymentMethod, color: 'bg-slate-600' };
  const receiptNo         = sale.receiptId ?? `RCPT-${Date.now().toString(36).toUpperCase()}`;
  const itemCount         = sale.lines.reduce((s, l) => s + l.qty, 0);
  const isPendingDelivery = sale.deliveryStatus === 'pending' || sale.deliveryStatus === 'dispatched';
  const expectedDateStr   = sale.expectedDate ? new Date(sale.expectedDate).toLocaleDateString('en-GH', { day: '2-digit', month: 'short' }) : '';

  return (
    <div
      className={`
        fixed inset-0 z-[60] flex flex-col
        bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800
        transition-all duration-400
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
      style={{ transitionDuration: '300ms' }}
    >
      {/* ── Top: Success state ── */}
      <div
        className={`
          flex flex-col items-center pt-12 pb-8 px-6
          transition-all duration-500
          ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}
        style={{ transitionDelay: '80ms' }}
      >
        {/* Animated check circle */}
        <div
          className={`
            w-[72px] h-[72px] rounded-full bg-emerald-500
            flex items-center justify-center mb-5
            shadow-[0_0_0_12px_rgba(16,185,129,0.15),0_8px_32px_rgba(16,185,129,0.35)]
            transition-all duration-600 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${badgeIn ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
          `}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <p className="text-[13px] font-semibold text-emerald-400 uppercase tracking-widest mb-1">
          Sale Complete
        </p>
        <p className="text-[38px] font-black text-white tabular-nums leading-none mb-3">
          {fmt(sale.total)}
        </p>

        {/* Tags row */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className={`
            inline-flex items-center gap-1.5 h-7 px-3 rounded-full
            ${payment.color} text-white text-[12px] font-bold
          `}>
            <PayIcon method={sale.paymentMethod} size={14} /> {payment.label}
            {sale.paymentMethod === 'Mix' && sale.paymentMixBreakdown && (
              <span className="opacity-90 font-normal">
                {' '}(Cash {fmt(sale.paymentMixBreakdown.cash)} · MoMo {fmt(sale.paymentMixBreakdown.momo)} · Card {fmt(sale.paymentMixBreakdown.card)})
              </span>
            )}
          </span>

          <span className="inline-flex items-center h-7 px-3 rounded-full
            bg-slate-700 text-slate-300 text-[12px] font-semibold">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>

          {sale.customerName && (
            <span className="inline-flex items-center h-7 px-3 rounded-full
              bg-slate-700 text-slate-300 text-[12px] font-semibold">
              👤 {sale.customerName}
            </span>
          )}

          <span className="text-[12px] text-slate-500 font-medium">
            {fmtTime(sale.completedAt)}
          </span>
        </div>
      </div>

      {/* ── Receipt card ── */}
      <div
        className={`
          flex-1 overflow-y-auto px-4 pb-3
          transition-all duration-500
          ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}
        `}
        style={{ transitionDelay: '160ms' }}
      >
        <div
          ref={receiptRef}
          className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
        >
          {/* Pending delivery banner */}
          {isPendingDelivery && (
            <div className="mx-4 mb-2 mt-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
              <span className="text-xl">🚚</span>
              <div>
                <p className="text-[12px] font-bold text-amber-800">Scheduled for Delivery</p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  {sale.deliveryStatus === 'dispatched' ? 'On the way' : 'Pending dispatch'}
                  {expectedDateStr ? ` · Expected ${expectedDateStr}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Receipt header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[15px] font-black text-slate-900 tracking-tight">Hunnid Official</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Official Receipt</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-mono font-bold text-slate-700">{receiptNo}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(sale.completedAt)}</p>
              </div>
            </div>

            {/* Dashed rule */}
            <div className="mt-3 border-t border-dashed border-slate-200" />
          </div>

          {/* Line items */}
          <div className="px-5 py-1">
            {sale.lines.map(line => (
              <ReceiptLine key={line.key} line={line} />
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 pb-5 pt-3 border-t border-dashed border-slate-200 space-y-2">
            {sale.subtotal !== sale.total && (
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-600 tabular-nums">{fmt(sale.subtotal)}</span>
              </div>
            )}

            {sale.discountPct > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500">Discount ({sale.discountPct}%)</span>
                <span className="font-semibold text-emerald-600 tabular-nums">−{fmt(sale.discountAmt)}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
              <span className="text-[15px] font-black text-slate-900">Total</span>
              <span className="text-[22px] font-black text-slate-900 tabular-nums">{fmt(sale.total)}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-100">
              <span className="text-[12px] text-slate-400">Payment method</span>
              <span className={`
                inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-bold text-white
                ${payment.color}
              `}>
                <PayIcon method={sale.paymentMethod} size={12} /> {payment.label}
                {sale.paymentMethod === 'Mix' && sale.paymentMixBreakdown && (
                  <span className="opacity-90 text-[10px] font-normal block mt-0.5">
                    Cash {fmt(sale.paymentMixBreakdown.cash)} · MoMo {fmt(sale.paymentMixBreakdown.momo)} · Card {fmt(sale.paymentMixBreakdown.card)}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">Thank you for shopping with us! 🙏</p>
            <p className="text-[10px] text-slate-300 mt-0.5 font-mono">{receiptNo}</p>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div
        className={`
          px-4 pt-3 pb-8 flex flex-col gap-2.5 flex-shrink-0
          transition-all duration-500
          ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}
        style={{ transitionDelay: '240ms' }}
      >
        {/* Top row: 3 action buttons */}
        <div className="flex gap-2">
          {/* Print */}
          <button
            type="button"
            onClick={() => onPrint(sale)}
            className="
              flex-1 h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5
              bg-slate-800 border border-slate-700 text-white
              hover:bg-slate-700 active:scale-[0.97]
              transition-all duration-150
            "
          >
            <IconPrint />
            <span className="text-[10px] font-bold tracking-wide">PRINT</span>
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={() => downloadReceipt(sale)}
            className="
              flex-1 h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5
              bg-slate-800 border border-slate-700 text-white
              hover:bg-slate-700 active:scale-[0.97]
              transition-all duration-150
            "
          >
            <IconDownload />
            <span className="text-[10px] font-bold tracking-wide">SAVE</span>
          </button>

          {/* WhatsApp share */}
          <button
            type="button"
            onClick={() => onShareReceipt(sale)}
            className="
              flex-1 h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5
              bg-[#25D366] text-white
              hover:bg-[#1da851] active:scale-[0.97]
              transition-all duration-150
            "
          >
            <IconWhatsApp />
            <span className="text-[10px] font-bold tracking-wide">SHARE</span>
          </button>
        </div>

        {/* New sale — primary CTA (Hunnid blue, Syne) */}
        <button
          type="button"
          onClick={onNewSale}
          className="w-full h-14 rounded-2xl text-white text-[16px] font-extrabold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all duration-150"
          style={{
            background: 'var(--blue)',
            fontFamily: 'var(--font-d)',
            boxShadow: '0 4px 20px var(--blue-glow)',
          }}
        >
          <IconPlus />
          New Sale
        </button>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes successPop {
          0%   { transform: scale(0.4); opacity: 0; }
          70%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
