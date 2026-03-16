/**
 * POS cart bar (CHANGE 7): "[N] items · GH₵XXX · View Cart →", 44px min tap target, font ≥11px.
 * Opens full-screen cart drawer on tap.
 */
import type { CartLine } from './CartSheet';

export interface CartBarProps {
  lines: CartLine[];
  onOpen: () => void;
}

function fmt(n: number) {
  return `GH₵${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CartBar({ lines, onOpen }: CartBarProps) {
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  if (itemCount === 0) return null;

  return (
    <div
      className="flex-shrink-0 p-3 bg-[var(--surface)] border-t shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ borderColor: 'rgba(0,0,0,0.08)' }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="w-full min-h-[44px] flex items-center justify-between gap-2 py-2.5 px-4 rounded-xl text-white active:scale-[0.99] transition-all duration-150 text-left"
        style={{ background: 'var(--text)' }}
      >
        <span className="text-[12px] font-semibold">
          {itemCount} item{itemCount !== 1 ? 's' : ''} · {fmt(total)}
        </span>
        <span className="text-[11px] font-medium text-[var(--blue)] flex items-center gap-0.5 shrink-0">
          View Cart
          <span aria-hidden>→</span>
        </span>
      </button>
    </div>
  );
}
