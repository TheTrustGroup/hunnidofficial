/**
 * Dashboard stats cache: key = warehouse_stats:{warehouseId}:{date}, TTL = 30s.
 * Invalidated on: sale (POST /api/sales), product create/update/delete for that warehouse.
 * If UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is unset, all ops no-op / return null.
 */

import { Redis } from '@upstash/redis';
import type { DashboardStatsResult } from '@/lib/data/dashboardStats';

const TTL_SECONDS = 30;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url?.trim() || !token?.trim()) return null;
  return new Redis({ url: url.trim(), token: token.trim() });
}

function cacheKey(warehouseId: string, date: string): string {
  return `warehouse_stats:${warehouseId}:${date}`;
}

/**
 * Returns cached dashboard stats for the given warehouse and date, or null on miss or if cache is disabled.
 */
export async function getCachedStats(
  warehouseId: string,
  date: string
): Promise<DashboardStatsResult | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const raw = await redis.get(cacheKey(warehouseId, date));
    if (raw == null || typeof raw !== 'object') return null;
    return raw as DashboardStatsResult;
  } catch (e) {
    console.warn('[warehouseStatsCache] get error', e);
    return null;
  }
}

/**
 * Stores dashboard stats for the given warehouse and date. No-op if Redis is not configured.
 */
export async function setCachedStats(
  warehouseId: string,
  date: string,
  data: DashboardStatsResult,
  ttlSeconds: number = TTL_SECONDS
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.set(cacheKey(warehouseId, date), data, { ex: ttlSeconds });
  } catch (e) {
    console.warn('[warehouseStatsCache] set error', e);
  }
}

/**
 * Invalidates the cache for this warehouse for "today" so the next dashboard request recomputes.
 * No-op if Redis is not configured.
 */
export async function invalidateDashboardCacheForWarehouse(warehouseId: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    const today = new Date().toISOString().split('T')[0];
    await redis.del(cacheKey(warehouseId, today));
  } catch (e) {
    console.warn('[warehouseStatsCache] invalidate error', e);
  }
}
