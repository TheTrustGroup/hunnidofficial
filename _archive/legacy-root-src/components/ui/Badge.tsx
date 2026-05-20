/**
 * Badges / status pills — design system: inline-flex, gap 4px, 3px 10px, 999px radius, 11px 600, dot optional.
 */
import type { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  /** Show status dot (6px circle) before text */
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: { background: 'var(--h-green-light)', color: 'var(--h-green)' },
  warning: { background: 'var(--h-amber-light)', color: 'var(--h-amber)' },
  danger: { background: 'var(--h-red-light)', color: 'var(--h-red)' },
  info: { background: 'var(--h-blue-light)', color: 'var(--h-blue)' },
  gray: { background: 'var(--h-gray-100)', color: 'var(--h-gray-500)' },
};

export function Badge({ children, variant = 'gray', className = '', dot = true }: BadgeProps) {
  const style = variantStyles[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 shrink-0 ${className}`.trim()}
      style={{
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        fontFamily: 'var(--font-body)',
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            flexShrink: 0,
          }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
