import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { SyncStatusBar } from '../SyncStatusBar';
import { ConflictModalContainer } from '../ConflictModalContainer';
import { ApiStatusProvider, useApiStatus } from '../../contexts/ApiStatusContext';
import { useCriticalData } from '../../contexts/CriticalDataContext';
import { useRealtimeContext } from '../../contexts/RealtimeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { PresenceProvider } from '../../contexts/PresenceContext';
import { Button } from '../ui/Button';

const DISMISS_BANNER_KEY = 'dismiss_degraded_banner_session';
/** Only show "server offline" banner after degraded for this long to avoid jitter from brief blips. */
const BANNER_DEBOUNCE_MS = 4000;

/** Layout: single vertical rhythm — section spacing (24px) and consistent main padding. Mobile-first. */
export function Layout() {
  return (
    <ApiStatusProvider>
      <LayoutContent />
    </ApiStatusProvider>
  );
}

function LayoutContent() {
  const location = useLocation();
  const isPOS = location.pathname === '/pos';
  const { user, isAuthenticated } = useAuth();
  const { currentWarehouseId, currentWarehouse } = useWarehouse();
  const { isDegraded: degraded, retry } = useApiStatus();
  const [showBanner, setShowBanner] = useState(false);
  const degradedSinceRef = useRef<number | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_BANNER_KEY) === '1';
  });
  const { criticalDataError, isSyncingCriticalData, reloadCriticalData } = useCriticalData();
  const realtimeContext = useRealtimeContext();
  const [now, setNow] = useState(() => Date.now());
  const disconnectedSince = realtimeContext?.disconnectedSince ?? null;
  const realtimeStatus = realtimeContext?.status ?? 'disconnected';
  const showReconnectingBanner =
    disconnectedSince != null &&
    (realtimeStatus === 'error' || realtimeStatus === 'disconnected') &&
    now - disconnectedSince >= 30_000;

  useEffect(() => {
    if (!showReconnectingBanner) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [showReconnectingBanner]);

  // Debounce: show banner only after degraded for BANNER_DEBOUNCE_MS so brief flickers don't cause jitter
  useEffect(() => {
    if (degraded) {
      const now = Date.now();
      if (degradedSinceRef.current === null) degradedSinceRef.current = now;
      const elapsed = now - (degradedSinceRef.current ?? now);
      if (elapsed >= BANNER_DEBOUNCE_MS) {
        setShowBanner(true);
      } else {
        const t = setTimeout(() => setShowBanner(true), BANNER_DEBOUNCE_MS - elapsed);
        return () => clearTimeout(t);
      }
    } else {
      degradedSinceRef.current = null;
      setShowBanner(false);
    }
  }, [degraded]);

  // When circuit is no longer degraded, clear dismiss so the banner can show again next time
  useEffect(() => {
    if (!degraded && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(DISMISS_BANNER_KEY);
      setDismissed(false);
    }
  }, [degraded]);

  const handleTryAgain = () => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(DISMISS_BANNER_KEY);
    setDismissed(false);
    retry();
  };

  const handleDismissBanner = () => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(DISMISS_BANNER_KEY, '1');
    setDismissed(true);
  };

  const showDegradedBanner = showBanner && degraded && !dismissed;
  const showSyncingBar = isSyncingCriticalData;

  return (
    <div className="min-h-[var(--min-h-viewport)] bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      {!isPOS && <Header />}
      {/* Slim hint while phase 2 (inventory, orders) syncs in background after login */}
      {isSyncingCriticalData && (
        <div
          className="lg:ml-[244px] mt-[calc(48px+var(--safe-top))] bg-primary-50/90 text-primary-900 text-center py-1.5 px-3 text-xs font-medium flex items-center justify-center gap-2 border-b border-primary-200/50"
          role="status"
          aria-live="polite"
        >
          <span className="loading-spinner-ring loading-spinner-ring-sm shrink-0 inline-block" aria-hidden />
          Syncing inventory & orders…
        </div>
      )}
      {/* In-flow banner: reserves layout space so content is never overlapped. Pushes main content down. */}
      {criticalDataError && (
        <div
          className="lg:ml-[244px] mt-[calc(48px+var(--safe-top))] bg-amber-500 text-amber-950 text-center py-2 px-3 text-xs font-medium flex items-center justify-center gap-2 flex-wrap min-h-[2.5rem] border-b border-amber-600/20"
          role="alert"
        >
          <span>Initial load had issues: {criticalDataError}</span>
          <Button type="button" variant="ghost" onClick={() => reloadCriticalData()} className="underline font-semibold hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-800 rounded">
            Retry
          </Button>
        </div>
      )}
      {showReconnectingBanner && (
        <div
          className="lg:ml-[244px] mt-[calc(48px+var(--safe-top))] bg-amber-100 text-amber-900 text-center py-1.5 px-3 text-xs font-medium border-b border-amber-200"
          role="status"
          aria-live="polite"
        >
          Reconnecting… Your data may be slightly delayed.
        </div>
      )}
      {showDegradedBanner && (
        <div
          className="lg:ml-[244px] mt-[calc(48px+var(--safe-top))] bg-amber-500 text-amber-950 text-center py-2 px-3 text-xs font-medium flex items-center justify-center gap-2 flex-wrap min-h-[2.5rem] border-b border-amber-600/20"
          role="status"
        >
          <span>Server temporarily unavailable. Last saved data — read-only. Add, edit, and sales disabled until server is back.</span>
          <Button
            type="button"
            variant="ghost"
            onClick={handleTryAgain}
            className="underline font-semibold hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-800 rounded"
          >
            Try again
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleDismissBanner}
            className="text-amber-900/80 hover:text-amber-950 font-medium focus:outline-none focus:ring-2 focus:ring-amber-800 rounded"
          >
            Dismiss
          </Button>
        </div>
      )}
      {/* Main: offset by sidebar and topbar; on POS no extra top margin (POS has its own topbar). */}
      <main
        className={`lg:ml-[244px] pt-14 lg:pt-6 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] lg:px-6 pb-[max(3rem,calc(var(--safe-bottom)+3rem))] lg:pb-[max(3rem,calc(var(--safe-bottom)+3rem))] min-h-[calc(var(--min-h-viewport)-48px)] max-w-[1600px] overflow-x-hidden ${
          showDegradedBanner || showSyncingBar ? 'mt-0' : isPOS ? 'mt-0' : 'mt-[calc(48px+var(--safe-top))]'
        }`}
      >
        <PresenceProvider
          currentUserEmail={user?.email ?? null}
          currentUserRole={user?.role ?? null}
          currentWarehouseId={currentWarehouseId ?? ''}
          currentWarehouseName={currentWarehouse?.name ?? ''}
          isAuthenticated={!!isAuthenticated}
        >
          <Outlet />
        </PresenceProvider>
      </main>
      <SyncStatusBar />
      <BottomNav />
      <ConflictModalContainer />
    </div>
  );
}
