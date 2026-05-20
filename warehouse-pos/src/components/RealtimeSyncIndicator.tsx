/**
 * Small topbar indicator: Live (green) / Syncing… (yellow) / Updates paused (amber) / Offline (red).
 * "Offline" is only when the browser has no network — not when Supabase Realtime is disconnected.
 */

import { useContext } from 'react';
import { useRealtimeStatus } from '../contexts/RealtimeContext';
import { NetworkStatusContext } from '../contexts/NetworkStatusContext';

const labelClass = (always: boolean) => (always ? 'inline' : 'hidden sm:inline');

export function RealtimeSyncIndicator({ alwaysShowLabel = false }: { alwaysShowLabel?: boolean }) {
  const status = useRealtimeStatus();
  const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const network = useContext(NetworkStatusContext);
  const serverReachable = network?.isServerReachable ?? true;
  const showLabel = labelClass(alwaysShowLabel);

  if (!browserOnline) {
    return (
      <span
        className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--edk-red)] shrink-0"
        title="No internet connection"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2 rounded-full bg-[var(--edk-red)] shrink-0" aria-hidden />
        <span className={showLabel}>Offline</span>
      </span>
    );
  }

  if (!serverReachable) {
    return (
      <span
        className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--edk-amber)] shrink-0"
        title="Cannot reach API — inventory may show saved data until the server responds"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2 rounded-full bg-[var(--edk-amber)] shrink-0" aria-hidden />
        <span className={showLabel}>Server slow</span>
      </span>
    );
  }

  switch (status) {
    case 'connected':
      return (
        <span
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--edk-green)] shrink-0"
          title="Live updates on"
          role="status"
          aria-live="polite"
        >
          <span className="relative flex h-2 w-2 rounded-full bg-[var(--edk-green)] animate-pulse shrink-0" aria-hidden />
          <span className={showLabel}>Live</span>
        </span>
      );
    case 'connecting':
      return (
        <span
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--edk-amber)] shrink-0"
          title="Reconnecting live updates…"
          role="status"
          aria-live="polite"
        >
          <span className="relative flex h-2 w-2 rounded-full bg-[var(--edk-amber)] shrink-0" aria-hidden />
          <span className={showLabel}>Syncing…</span>
        </span>
      );
    case 'error':
    case 'disconnected':
    default:
      return (
        <span
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--edk-amber)] shrink-0"
          title="Live stock sync paused — refresh inventory or retry; sales still use the API"
          role="status"
          aria-live="polite"
        >
          <span className="relative flex h-2 w-2 rounded-full bg-[var(--edk-amber)] shrink-0" aria-hidden />
          <span className={showLabel}>Updates paused</span>
        </span>
      );
  }
}
