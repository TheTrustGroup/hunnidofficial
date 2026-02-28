/**
 * POS cart bar: sticky bar showing cart summary, opens cart sheet on tap.
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
    <div className="flex-shrink-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center justify-between gap-3 py-3 px-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99] transition-all duration-150"
      >
        <span className="text-[14px] font-bold">
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </span>
        <span className="text-[16px] font-extrabold tabular-nums">{fmt(total)}</span>
      </button>
    </div>
  );
}
