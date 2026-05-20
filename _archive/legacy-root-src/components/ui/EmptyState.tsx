import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent empty state for lists and data views.
 * Use when there are no items to show (e.g. no orders, no products).
 */
export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 sm:p-8 solid-card max-w-md mx-auto gap-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto shrink-0 shadow-soft" style={{ background: 'var(--elevated)', color: 'var(--text-3)' }}>
        <Icon className="w-7 h-7" aria-hidden />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'var(--font-d)' }}>{title}</h2>
        {description && <p className="text-slate-600 text-sm">{description}</p>}
      </div>
      {action && <div className="flex justify-center pt-1">{action}</div>}
    </div>
  );
}
