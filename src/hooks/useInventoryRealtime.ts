/**
 * Supabase Realtime subscription for instant cross-device inventory and sales updates.
 * Subscribes to warehouse_inventory_by_size, sales, and warehouse_products; on any change
 * invalidates React Query caches so the app refetches clean data (never uses event payload as source of truth).
 *
 * Requires: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY. Enable Replication in Supabase for the three tables.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClientAsync } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { isValidWarehouseId } from '../lib/warehouseId';
import { useRealtimeContext } from '../contexts/RealtimeContext';
import type { RealtimeStatus } from '../contexts/RealtimeContext';

export function useInventoryRealtime(warehouseId: string | null | undefined): void {
  const queryClient = useQueryClient();
  const realtimeContext = useRealtimeContext();
  const setStatusRef = useRef(realtimeContext?.setStatus);
  setStatusRef.current = realtimeContext?.setStatus;
  const channelRef = useRef<{ supabase: SupabaseClient; channel: RealtimeChannel } | null>(null);

  useEffect(() => {
    const setStatus = (s: RealtimeStatus) => setStatusRef.current?.(s);

    if (!warehouseId || !isValidWarehouseId(warehouseId)) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');

    let cancelled = false;
    getSupabaseClientAsync().then((supabase) => {
      if (cancelled) return;
      if (!supabase) {
        if (typeof console !== 'undefined' && !(window as unknown as { __realtimeConfigWarned?: boolean }).__realtimeConfigWarned) {
          (window as unknown as { __realtimeConfigWarned?: boolean }).__realtimeConfigWarned = true;
          console.warn(
            '[Realtime] Not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time (e.g. in Vercel env) and redeploy. See docs/REALTIME_OFFLINE.md.'
          );
        }
        setStatus('disconnected');
        return;
      }

      const channel = supabase
      .channel('warehouse-inventory-' + warehouseId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'warehouse_inventory_by_size',
          filter: 'warehouse_id=eq.' + warehouseId,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.products(warehouseId) });
          queryClient.invalidateQueries({ queryKey: ['dashboard', warehouseId] });
          queryClient.invalidateQueries({ queryKey: queryKeys.posProducts(warehouseId) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
          filter: 'warehouse_id=eq.' + warehouseId,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sales', warehouseId] });
          queryClient.invalidateQueries({ queryKey: ['dashboard', warehouseId] });
          queryClient.invalidateQueries({ queryKey: queryKeys.reports(warehouseId) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sales',
          filter: 'warehouse_id=eq.' + warehouseId,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sales', warehouseId] });
          queryClient.invalidateQueries({ queryKey: ['dashboard', warehouseId] });
          queryClient.invalidateQueries({ queryKey: queryKeys.reports(warehouseId) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'sales',
          filter: 'warehouse_id=eq.' + warehouseId,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sales', warehouseId] });
          queryClient.invalidateQueries({ queryKey: ['dashboard', warehouseId] });
          queryClient.invalidateQueries({ queryKey: queryKeys.reports(warehouseId) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'warehouse_products',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.products(warehouseId) });
          queryClient.invalidateQueries({ queryKey: ['dashboard', warehouseId] });
          queryClient.invalidateQueries({ queryKey: queryKeys.posProducts(warehouseId) });
        }
      )
      .subscribe((subscriptionStatus: string) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected');
          queryClient.invalidateQueries({ queryKey: queryKeys.products(warehouseId) });
          queryClient.invalidateQueries({ queryKey: ['dashboard', warehouseId] });
          queryClient.invalidateQueries({ queryKey: ['sales', warehouseId] });
        }
        if (subscriptionStatus === 'CHANNEL_ERROR') setStatus('error');
        if (subscriptionStatus === 'TIMED_OUT') setStatus('connecting');
      });

      channelRef.current = { supabase, channel };
    });

    return () => {
      cancelled = true;
      const ref = channelRef.current;
      if (ref) {
        ref.supabase.removeChannel(ref.channel);
        channelRef.current = null;
      }
      setStatus('disconnected');
    };
  }, [warehouseId, queryClient]);
}
