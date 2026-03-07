import type { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  danger: 'bg-red-500/10 text-red-600 border border-red-500/20',
  info: 'border border-[var(--blue)]/20 text-[var(--blue)]',
  gray: 'bg-slate-100 text-slate-700 border border-slate-200/60',
};

export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  const variantClass = variant === 'info'
    ? 'bg-[var(--blue-dim)]'
    : variantStyles[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ${variantClass} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
