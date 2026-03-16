/**
 * Buttons — design system: primary (blue), primary dark, ghost, danger soft, icon.
 */
import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'primaryDark' | 'secondary' | 'action' | 'actionView' | 'actionEdit' | 'danger' | 'ghost';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  loading?: boolean;
  children: ReactNode;
}

const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-colors duration-150 min-h-[var(--touch-min)]';

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--h-blue)',
    color: 'var(--h-white)',
    border: 'none',
    padding: '10px 20px',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
  },
  primaryDark: {
    background: 'var(--h-gray-900)',
    color: 'var(--h-white)',
    border: 'none',
    padding: '10px 20px',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
  },
  secondary: {
    background: 'transparent',
    color: 'var(--h-gray-700)',
    border: '0.5px solid var(--h-gray-300)',
    padding: '10px 20px',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
  },
  action: {
    background: 'var(--h-gray-100)',
    color: 'var(--h-gray-700)',
    border: 'none',
    minWidth: 36,
    minHeight: 36,
    padding: 0,
    fontFamily: 'var(--font-body)',
  },
  actionView: {
    background: 'var(--h-gray-100)',
    color: 'var(--h-gray-700)',
    border: 'none',
    minWidth: 36,
    minHeight: 36,
    padding: 0,
    fontFamily: 'var(--font-body)',
  },
  actionEdit: {
    background: 'var(--h-gray-100)',
    color: 'var(--h-gray-700)',
    border: 'none',
    minWidth: 36,
    minHeight: 36,
    padding: 0,
    fontFamily: 'var(--font-body)',
  },
  danger: {
    background: 'var(--h-red-light)',
    color: 'var(--h-red)',
    border: 'none',
    minWidth: 36,
    minHeight: 36,
    padding: 0,
    fontFamily: 'var(--font-body)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--h-gray-700)',
    border: '0.5px solid var(--h-gray-300)',
    padding: '10px 20px',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
  },
};

const sizeStyles = {
  sm: { padding: '8px 16px', fontSize: 13 },
  md: {},
  lg: { padding: '12px 24px', fontSize: 15 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  children,
  type = 'button',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const vStyle = variantStyles[variant];
  const sStyle = size === 'md' ? {} : sizeStyles[size];
  const isIcon = variant === 'action' || variant === 'actionView' || variant === 'actionEdit' || variant === 'danger';
  const combinedStyle = { ...vStyle, ...(isIcon ? {} : sStyle), ...style };
  return (
    <button
      type={type}
      className={`${baseClasses} ${className}`.trim()}
      style={combinedStyle}
      disabled={disabled ?? loading}
      {...rest}
    >
      {loading && (
        <span className="loading-spinner-ring loading-spinner-ring-sm shrink-0" aria-hidden />
      )}
      {children}
    </button>
  );
}
