// ============================================================
// PaymentIcons.tsx — System payment method icons (SVG, no emoji).
// Use in CartSheet, SaleSuccessScreen, SalesHistoryPage.
// ============================================================

import type { ComponentType } from 'react';

const stroke = 'currentColor';
const strokeWidth = 2;
const strokeLinecap = 'round' as const;
const strokeLinejoin = 'round' as const;

export function IconCash({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin} className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
  );
}

export function IconMoMo({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin} className={className}>
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
}

export function IconCard({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  );
}

export function IconMix({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin} className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
    </svg>
  );
}

const PAY_ICONS: Record<string, ComponentType<{ className?: string; size?: number }>> = {
  Cash: IconCash,
  MoMo: IconMoMo,
  Card: IconCard,
  Mix: IconMix,
};

export function PayIcon({ method, size = 18, className }: { method: string; size?: number; className?: string }) {
  const Icon = PAY_ICONS[method] ?? IconCash;
  return <Icon size={size} className={className} />;
}
