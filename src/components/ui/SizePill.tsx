/**
 * Phase 3 Rebirth: Size pill. Status derived from quantity ONLY (never a stored stock_status).
 * quantity === 0 → red; quantity <= 2 → amber; quantity > 2 → green.
 */
export interface SizePillProps {
  sizeCode: string;
  quantity: number;
  className?: string;
}

function statusFromQuantity(quantity: number): 'out' | 'low' | 'in' {
  if (quantity === 0) return 'out';
  if (quantity <= 2) return 'low';
  return 'in';
}

const statusStyles = {
  out: { border: 'var(--red-status)', color: 'var(--red-status)', bg: 'var(--red-dim)' },
  low: { border: 'var(--amber)', color: 'var(--amber)', bg: 'var(--amber-dim)' },
  in: { border: 'var(--green)', color: 'var(--green)', bg: 'var(--green-dim)' },
};

export function SizePill({ sizeCode, quantity, className = '' }: SizePillProps) {
  const status = statusFromQuantity(quantity);
  const s = statusStyles[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium tabular-nums border ${className}`}
      style={{
        borderColor: s.border,
        color: s.color,
        background: s.bg,
        fontFamily: 'var(--font-m)',
      }}
    >
      <span>{sizeCode}</span>
      <span>{quantity}</span>
    </span>
  );
}
