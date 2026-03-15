import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional badge or extra content after the title (e.g. role label). */
  extra?: ReactNode;
  className?: string;
}

/**
 * Consistent page title and optional description. Use at the top of every main page.
 */
export function PageHeader({ title, description, extra, className = '' }: PageHeaderProps) {
  return (
    <div className={`animate-fade-in-up flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-d)' }}>
          {title}
        </h1>
        {extra}
      </div>
      {description && (
        <p className="text-slate-500 text-sm">
          {description}
        </p>
      )}
    </div>
  );
}
