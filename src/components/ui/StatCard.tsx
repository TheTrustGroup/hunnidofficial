/**
 * Phase 3 Rebirth: KPI stat card. Value in IBM Plex Mono; primary variant uses Hunnid blue.
 * Skeleton shimmer when loading. Hover: translateY(-2px) + shadow.
 */
import type { LucideIcon } from 'lucide-react';

export type StatCardVariant = 'default' | 'primary' | 'green' | 'amber';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: StatCardVariant;
  loading?: boolean;
  className?: string;
}

const variantStyles: Record<StatCardVariant, { bg: string; accent: string; valueColor: string }> = {
  default: {
    bg: 'var(--surface)',
    accent: 'var(--text-2)',
    valueColor: 'var(--text)',
  },
  primary: {
    bg: 'var(--surface)',
    accent: 'var(--blue)',
    valueColor: 'var(--text)',
  },
  green: {
    bg: 'var(--surface)',
    accent: 'var(--green)',
    valueColor: 'var(--text)',
  },
  amber: {
    bg: 'var(--surface)',
    accent: 'var(--amber)',
    valueColor: 'var(--text)',
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  loading = false,
  className = '',
}: StatCardProps) {
  const style = variantStyles[variant];

  return (
    <div
      className={`rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${className}`}
      style={{
        background: variant === 'primary' ? `linear-gradient(135deg, var(--surface) 0%, var(--blue-dim) 100%)` : style.bg,
        borderColor: 'var(--border)',
        boxShadow: variant === 'primary' ? '0 2px 10px var(--blue-glow)' : undefined,
      }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-1.5">
          <p
            className="text-[10px] font-medium tracking-wide uppercase"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-b)' }}
          >
            {label}
          </p>
          {Icon && (
            <span style={{ color: style.accent }}>
              <Icon className="w-4 h-4" strokeWidth={2} aria-hidden />
            </span>
          )}
        </div>
        {loading ? (
          <div
            className="mt-1.5 h-6 w-20 rounded skeleton-shimmer"
            style={{ minHeight: 24 }}
            aria-hidden
          />
        ) : (
          <p
            className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl"
            style={{ color: style.valueColor, fontFamily: 'var(--font-m)' }}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
