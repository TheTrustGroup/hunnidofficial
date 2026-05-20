import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  extra?: ReactNode;
  className?: string;
}

/**
 * Design system: Bebas Neue 30px title, DM Sans 13px subtitle.
 */
export function PageHeader({ title, description, extra, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      <div className="flex flex-wrap items-center gap-3">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 30,
            letterSpacing: '0.04em',
            color: 'var(--h-gray-900)',
          }}
        >
          {title}
        </h1>
        {extra}
      </div>
      {description && (
        <p
          className="text-[13px] mb-5"
          style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
