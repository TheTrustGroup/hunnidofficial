/**
 * Single source of truth for buttons. Phase 3: primary = #5CACFA background, dark text; loading spinner.
 */
import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'action' | 'actionView' | 'actionEdit' | 'danger' | 'ghost';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** When true, shows spinner and disables button. */
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'min-h-[var(--touch-min)] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] text-black',
  secondary: 'btn-secondary',
  action: 'btn-action',
  actionView: 'btn-action btn-action-view',
  actionEdit: 'btn-action btn-action-edit',
  danger: 'btn-action btn-action-delete',
  ghost: 'min-h-[var(--touch-min)] inline-flex items-center justify-center rounded-lg font-medium transition-colors text-primary-600 hover:bg-primary-50/80 border border-primary-200/30',
};

const sizeClasses = {
  sm: 'text-sm px-4 py-2 min-h-0',
  md: '',
  lg: 'py-3.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  children,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  const base = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  const isPrimary = variant === 'primary';
  const bgStyle = isPrimary ? { background: 'var(--blue)', boxShadow: '0 4px 14px var(--blue-glow)' } : undefined;
  const combined = [base, sizeClass, className].filter(Boolean).join(' ');
  return (
    <button
      type={type}
      className={combined}
      style={bgStyle}
      disabled={disabled ?? loading}
      {...rest}
    >
      {loading && (
        <span
          className="loading-spinner-ring loading-spinner-ring-sm shrink-0"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
