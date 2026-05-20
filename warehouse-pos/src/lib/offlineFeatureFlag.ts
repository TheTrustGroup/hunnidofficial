/**
 * Feature flag for offline mode. Gates IndexedDB sync queue + POS sale outbox.
 * @see INTEGRATION_PLAN.md
 */

const OFFLINE_ENABLED =
  typeof import.meta.env !== 'undefined' &&
  String(import.meta.env.VITE_OFFLINE_ENABLED || '').toLowerCase() === 'true';

const ROLLOUT_PERCENT = (() => {
  if (typeof import.meta.env === 'undefined') return 0;
  const v = import.meta.env.VITE_OFFLINE_ROLLOUT_PERCENT;
  if (v === undefined || v === '') return 100;
  const n = parseInt(String(v), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  if (n > 100) return 100;
  return n;
})();

function getRolloutSeed(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let seed = sessionStorage.getItem('offline_rollout_seed');
    if (!seed) {
      seed = `${window.location.origin}-${navigator.userAgent}-${Date.now()}`;
      sessionStorage.setItem('offline_rollout_seed', seed);
    }
    return seed;
  } catch {
    return `${typeof location !== 'undefined' ? location.origin : ''}-${Math.random()}`;
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** IndexedDB product sync + POS sale outbox when true. */
export function isOfflineEnabled(): boolean {
  if (!OFFLINE_ENABLED) return false;
  if (ROLLOUT_PERCENT >= 100) return true;
  if (ROLLOUT_PERCENT <= 0) return false;
  const bucket = hashString(getRolloutSeed()) % 100;
  return bucket < ROLLOUT_PERCENT;
}

/** POS sale queue works whenever IDB is available (even if full offline inventory flag is off). */
export function isPosSaleOutboxEnabled(): boolean {
  return isOfflineEnabled() || String(import.meta.env.VITE_POS_SALE_OUTBOX || 'true').toLowerCase() !== 'false';
}
