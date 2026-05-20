/**
 * Replay queued POS sales (POST /api/sales) oldest-first with Idempotency-Key = event_id.
 */

import { API_BASE_URL } from './api';
import { apiPost } from './apiClient';
import {
  deleteSaleEvent,
  getPendingSaleEvents,
  markSaleEventFailed,
  type PosSaleEvent,
} from './offlineDb';

export interface PosSaleSyncResult {
  synced: number;
  failed: number;
  pending: number;
}

export async function syncPendingPosSales(options?: {
  baseUrl?: string;
  onProgress?: (event: PosSaleEvent, result: 'synced' | 'failed') => void;
}): Promise<PosSaleSyncResult> {
  const baseUrl = options?.baseUrl ?? API_BASE_URL;
  const pending = await getPendingSaleEvents();
  let synced = 0;
  let failed = 0;

  for (const event of pending) {
    const body = event.payload;
    try {
      const res = await apiPost<{ id: string; receiptId?: string; createdAt?: string }>(
        baseUrl,
        '/api/sales',
        body,
        { idempotencyKey: event.event_id, timeoutMs: 125_000 }
      );
      if (!res?.id) {
        await markSaleEventFailed(event.event_id);
        failed++;
        options?.onProgress?.(event, 'failed');
        continue;
      }
      await deleteSaleEvent(event.event_id);
      synced++;
      options?.onProgress?.(event, 'synced');
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        status === 409 ||
        msg.includes('INSUFFICIENT_STOCK') ||
        msg.includes('Insufficient stock') ||
        status === 400 ||
        status === 403
      ) {
        await markSaleEventFailed(event.event_id);
        failed++;
        options?.onProgress?.(event, 'failed');
      }
      // Network / 5xx: leave pending for next retry
    }
  }

  const stillPending = (await getPendingSaleEvents()).length;
  return { synced, failed, pending: stillPending };
}
