/**
 * Starts background sync for offline inventory queue + POS sale outbox when authenticated.
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isOfflineEnabled, isPosSaleOutboxEnabled } from '../lib/offlineFeatureFlag';
import { syncPendingPosSales } from '../lib/posSaleSync';
import { syncService } from '../services/syncService';

export function OfflineSyncBootstrap() {
  const { isAuthenticated } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || startedRef.current) return;
    startedRef.current = true;

    if (isOfflineEnabled()) {
      syncService.processSyncQueue().catch(() => {});
      syncService.startAutoSync();
    }
    if (isPosSaleOutboxEnabled()) {
      syncPendingPosSales().catch(() => {});
    }

    return () => {
      syncService.stopAutoSync();
    };
  }, [isAuthenticated]);

  return null;
}
