/**
 * POS receipt printing — Ghana standard (iframe, no pop-up).
 */
import { buildReceiptHtml, formatReceiptDateTime, type ReceiptHtmlInput } from './receiptHtml';

export type PrintReceiptPayload = ReceiptHtmlInput & { warehouseId?: string };

export { formatReceiptDateTime, formatReceiptDateTime as formatReceiptDate };

export function printReceipt(sale: PrintReceiptPayload): void {
  const html = buildReceiptHtml(sale);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Receipt print');
  iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;left:-9999px;top:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    console.warn('[printReceipt] Could not get iframe document.');
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return;
  }

  const runPrint = () => {
    win.focus();
    win.print();
    const cleanup = () => {
      try {
        if (iframe.parentNode) document.body.removeChild(iframe);
      } catch {
        /* already removed */
      }
    };
    if (typeof win.onafterprint !== 'undefined') {
      win.onafterprint = cleanup;
    } else {
      setTimeout(cleanup, 500);
    }
  };

  if (doc.readyState === 'complete') {
    setTimeout(runPrint, 0);
  } else {
    win.onload = runPrint;
  }
}
