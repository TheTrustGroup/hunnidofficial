/**
 * POS cart bar — fixed above bottom nav when cart has items.
 * Tap to open full cart sheet.
 */
export interface CartBarProps {
  itemCount: number;
  total: number;
  onOpen: () => void;
}

export default function CartBar({ itemCount, total, onOpen }: CartBarProps) {
  if (itemCount === 0) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={{ touchAction: 'manipulation' }}
      className="fixed left-4 right-4 z-30 cursor-pointer bottom-[calc(64px+env(safe-area-inset-bottom)+8px)]"
      aria-label={`View cart, ${itemCount} items, GH¢${total.toLocaleString()}`}
    >
      <div className="bg-[#1B6FE8] rounded-2xl px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(27,111,232,0.4)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white text-[13px] font-bold">{itemCount}</span>
          </div>
          <span className="text-white text-[14px] font-medium">View cart</span>
        </div>
        <span className="text-white font-display text-[18px] tracking-wide">
          GH¢{total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
