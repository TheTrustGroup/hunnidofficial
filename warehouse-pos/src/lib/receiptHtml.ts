/**
 * Shared thermal receipt HTML (print + download). Ghana timezone, GH₵ formatting.
 */

export const RECEIPT_BUSINESS_NAME = 'Hunnid Official';
export const RECEIPT_TIMEZONE_LABEL = 'Africa/Accra (GMT)';

export interface ReceiptLineInput {
  name: string;
  sizeLabel?: string | null;
  qty: number;
  unitPrice: number;
}

export interface ReceiptHtmlInput {
  receiptId?: string;
  lines: ReceiptLineInput[];
  subtotal?: number;
  discountPct?: number;
  discountAmt?: number;
  total: number;
  paymentMethod: string;
  paymentMixBreakdown?: { cash: number; momo: number; card: number } | null;
  customerName?: string | null;
  completedAt?: string | null;
  syncPending?: boolean;
}

export function formatReceiptMoney(n: number): string {
  return `GH₵${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatReceiptDateTime(isoOrNull?: string | null): string {
  const d = isoOrNull ? new Date(isoOrNull) : new Date();
  return d.toLocaleString('en-GH', {
    timeZone: 'Africa/Accra',
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: true,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function receiptStatusBanner(receiptId?: string, syncPending?: boolean): string {
  if (syncPending || (receiptId ?? '').startsWith('PENDING-')) {
    return '<p class="warn center">⚠ Pending sync — stock will update when online. Reprint after sync for final receipt no.</p>';
  }
  if ((receiptId ?? '').startsWith('LOCAL-')) {
    return '<p class="warn center">⚠ Not synced to server</p>';
  }
  return '';
}

export function buildReceiptHtml(sale: ReceiptHtmlInput, options?: { autoPrint?: boolean }): string {
  const receiptNo = sale.receiptId?.trim() || '—';
  const dateStr = formatReceiptDateTime(sale.completedAt);
  const linesHtml = sale.lines
    .map(
      (l) =>
        `<tr><td class="item-name">${escapeHtml(l.name)}${l.sizeLabel ? ` (${escapeHtml(l.sizeLabel)})` : ''}</td><td class="qty" align="right">${l.qty}</td><td class="unit" align="right">${formatReceiptMoney(l.unitPrice)}</td><td class="amt" align="right">${formatReceiptMoney(l.unitPrice * l.qty)}</td></tr>`
    )
    .join('');

  const subtotal = sale.subtotal ?? sale.total;
  const discountAmt = sale.discountAmt ?? 0;
  const hasDiscount = (sale.discountPct ?? 0) > 0 || discountAmt > 0;
  const mix =
    sale.paymentMethod === 'Mix' && sale.paymentMixBreakdown
      ? `<p>Mix: Cash ${formatReceiptMoney(sale.paymentMixBreakdown.cash)} · MoMo ${formatReceiptMoney(sale.paymentMixBreakdown.momo)} · Card ${formatReceiptMoney(sale.paymentMixBreakdown.card)}</p>`
      : '';

  const printScript = options?.autoPrint
    ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en-GH">
<head>
  <meta charset="utf-8">
  <title>Receipt ${escapeHtml(receiptNo)}</title>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    body { font-family: 'Courier New', Courier, monospace; font-size: 12px; padding: 10px; max-width: 72mm; margin: 0 auto; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-bottom: 1px dashed #333; margin: 6px 0; }
    h1 { font-size: 14px; margin: 0 0 4px 0; }
    .receipt-no { font-size: 11px; margin-bottom: 2px; }
    .date { font-size: 11px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; padding: 2px 0; border-bottom: 1px solid #333; }
    th.qty, th.unit, th.amt { text-align: right; }
    td { padding: 2px 0; vertical-align: top; }
    td.qty, td.unit, td.amt { text-align: right; }
    .item-name { word-break: break-word; max-width: 55%; }
    .totals { margin-top: 6px; font-size: 11px; }
    .totals .row { display: flex; justify-content: space-between; padding: 1px 0; }
    .total-row { font-weight: bold; font-size: 13px; margin-top: 4px; padding-top: 4px; border-top: 2px solid #000; }
    .meta { font-size: 10px; margin-top: 8px; }
    .footer { margin-top: 12px; text-align: center; font-size: 10px; }
    .warn { margin-top: 6px; font-size: 10px; color: #b45309; font-weight: bold; }
  </style>
</head>
<body>
  <h1 class="center bold">${escapeHtml(RECEIPT_BUSINESS_NAME)}</h1>
  <p class="center receipt-no">Receipt No: ${escapeHtml(receiptNo)}</p>
  <p class="center date">${escapeHtml(dateStr)}</p>
  <p class="center date">${escapeHtml(RECEIPT_TIMEZONE_LABEL)}</p>
  <div class="divider"></div>
  <table>
    <thead><tr><th class="item-name">Item</th><th class="qty">Qty</th><th class="unit">Unit</th><th class="amt">Amount</th></tr></thead>
    <tbody>${linesHtml}</tbody>
  </table>
  <div class="divider"></div>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${formatReceiptMoney(subtotal)}</span></div>
    ${hasDiscount ? `<div class="row"><span>Discount (${sale.discountPct ?? 0}%)</span><span>−${formatReceiptMoney(discountAmt)}</span></div>` : ''}
    <div class="row total-row"><span>TOTAL</span><span>${formatReceiptMoney(sale.total)}</span></div>
  </div>
  <div class="meta">
    <p>Payment: ${escapeHtml(sale.paymentMethod)}</p>
    ${mix}
    ${sale.customerName ? `<p>Customer: ${escapeHtml(sale.customerName)}</p>` : ''}
  </div>
  ${receiptStatusBanner(sale.receiptId, sale.syncPending)}
  <div class="divider"></div>
  <p class="footer">Thank you for your purchase</p>
  <p class="footer">GH₵ — Ghana Cedi</p>
  ${printScript}
</body>
</html>`;
}
