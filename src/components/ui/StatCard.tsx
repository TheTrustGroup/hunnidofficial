/**
 * Stat cards — design system: white bg, 0.5px border, radius-lg, label 11px 600 uppercase, value Bebas Neue 36px.
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

const valueColors: Record<StatCardVariant, string> = {
  default: 'var(--h-gray-900)',
  primary: 'var(--h-blue)',
  green: 'var(--h-green)',
  amber: 'var(--h-red)',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  loading = false,
  className = '',
}: StatCardProps) {
  const valueColor = valueColors[variant];
  return (
    <div
      className={`relative rounded-[var(--radius-lg)] border overflow-hidden ${className}`.trim()}
      style={{
        background: 'var(--h-white)',
        border: '0.5px solid var(--h-gray-200)',
        padding: '20px 24px',
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--h-gray-400)',
          fontFamily: 'var(--font-body)',
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      {loading ? (
        <div
          className="h-9 w-24 rounded skeleton-shimmer"
          style={{ minHeight: 36 }}
          aria-hidden
        />
      ) : (
        <p
          className="tabular-nums"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            color: valueColor,
          }}
        >
          {value}
        </p>
      )}
      {Icon && (
        <span
          className="absolute top-5 right-5 opacity-60"
          style={{ color: valueColor }}
          aria-hidden
        >
          <Icon className="w-5 h-5" strokeWidth={2} />
        </span>
      )}
    </div>
  );
}
