import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'gray' | 'danger' | 'warning' | 'green';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantClass: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-800',
  gray: 'bg-slate-100 text-slate-700',
  danger: 'bg-[var(--edk-red-soft)] text-[var(--edk-red)] border border-[var(--edk-red-border)]',
  warning: 'bg-[var(--edk-amber-bg)] text-[var(--edk-amber)]',
  green: 'bg-[var(--edk-green-bg)] text-[var(--edk-green)]',
};

const sizeClass: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({ children, className = '', variant = 'default', size = 'md' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md font-medium shrink-0 ${variantClass[variant]} ${sizeClass[size]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
