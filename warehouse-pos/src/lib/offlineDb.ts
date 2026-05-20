/**
 * IndexedDB: product cache mirror, legacy offline tx store, POS sale outbox.
 * Never deletes localStorage — migration copies into IDB (see clientDataMigration.ts).
 */
import { isQuotaExceededError, setOfflineQuotaExceeded } from './offlineQuota';

const DB_NAME = 'warehouse-pos';
const DB_VERSION = 2;
const STORE_PRODUCTS = 'products';
const STORE_OFFLINE_TX = 'offline_transactions';
export const STORE_POS_EVENT_QUEUE = 'pos_event_queue';

let dbPromise: Promise<IDBDatabase> | null = null;

export function clearOfflineDbInstance(): void {
  dbPromise = null;
}

function isTransactionError(e: unknown): boolean {
  if (e == null) return true;
  const msg = typeof (e as Error).message === 'string' ? (e as Error).message : String(e);
  return /e\.trans|n\.type|null is not an object.*trans|Transaction.*invalid|Database closed/i.test(msg);
}

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      if (db == null) {
        reject(new Error('IndexedDB open returned no database'));
        return;
      }
      resolve(db);
    };
    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_OFFLINE_TX)) {
        db.createObjectStore(STORE_OFFLINE_TX, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_POS_EVENT_QUEUE)) {
        const store = db.createObjectStore(STORE_POS_EVENT_QUEUE, { keyPath: 'event_id' });
        store.createIndex('by_status', 'status', { unique: false });
        store.createIndex('by_created_at', 'created_at', { unique: false });
      }
    };
  });
  return dbPromise;
}

function serializeForDb<T>(obj: T): Record<string, unknown> {
  const rec = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
  }
  return out;
}

export type SaleEventStatus = 'pending' | 'synced' | 'failed';

export interface PosSaleEvent {
  event_id: string;
  status: SaleEventStatus;
  created_at: number;
  payload: Record<string, unknown>;
}

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Append sale for replay via POST /api/sales when back online. */
export async function enqueueSaleEvent(
  payload: Record<string, unknown>,
  eventId?: string
): Promise<string> {
  const event_id = eventId ?? generateEventId();
  const event: PosSaleEvent = {
    event_id,
    status: 'pending',
    created_at: Date.now(),
    payload: { ...payload },
  };
  try {
    const db = await openDb();
    const store = db.transaction(STORE_POS_EVENT_QUEUE, 'readwrite').objectStore(STORE_POS_EVENT_QUEUE);
    store.put(serializeForDb(event));
  } catch (e) {
    if (isTransactionError(e)) clearOfflineDbInstance();
    if (isQuotaExceededError(e)) setOfflineQuotaExceeded();
    if (import.meta.env.DEV) console.warn('[offlineDb] enqueue sale failed', e);
    throw e;
  }
  return event_id;
}

export async function getPendingSaleEvents(): Promise<PosSaleEvent[]> {
  try {
    const db = await openDb();
    const store = db.transaction(STORE_POS_EVENT_QUEUE, 'readonly').objectStore(STORE_POS_EVENT_QUEUE);
    const index = store.index('by_status');
    const req = index.getAll('pending');
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const rows = (req.result || []) as PosSaleEvent[];
        rows.sort((a, b) => a.created_at - b.created_at);
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    if (isTransactionError(e)) clearOfflineDbInstance();
    return [];
  }
}

export async function deleteSaleEvent(eventId: string): Promise<void> {
  try {
    const db = await openDb();
    const store = db.transaction(STORE_POS_EVENT_QUEUE, 'readwrite').objectStore(STORE_POS_EVENT_QUEUE);
    store.delete(eventId);
  } catch (e) {
    if (isTransactionError(e)) clearOfflineDbInstance();
    if (import.meta.env.DEV) console.warn('[offlineDb] delete sale event failed', e);
  }
}

export async function markSaleEventFailed(eventId: string): Promise<void> {
  try {
    const db = await openDb();
    const store = db.transaction(STORE_POS_EVENT_QUEUE, 'readwrite').objectStore(STORE_POS_EVENT_QUEUE);
    const getReq = store.get(eventId);
    await new Promise<void>((resolve, reject) => {
      getReq.onsuccess = () => {
        const event = getReq.result as PosSaleEvent | undefined;
        if (event) {
          event.status = 'failed';
          store.put(event);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (e) {
    if (isTransactionError(e)) clearOfflineDbInstance();
  }
}

export async function getPendingSaleEventsCount(): Promise<number> {
  const events = await getPendingSaleEvents();
  return events.length;
}

export async function getFailedSaleEventsCount(): Promise<number> {
  try {
    const db = await openDb();
    const store = db.transaction(STORE_POS_EVENT_QUEUE, 'readonly').objectStore(STORE_POS_EVENT_QUEUE);
    const index = store.index('by_status');
    const req = index.getAll('failed');
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve((req.result || []).length);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/** Legacy queue in same DB (migrated from localStorage). */
export async function appendOfflineTransaction(tx: Record<string, unknown>): Promise<void> {
  try {
    const db = await openDb();
    const store = db.transaction(STORE_OFFLINE_TX, 'readwrite').objectStore(STORE_OFFLINE_TX);
    const id = String(tx.id ?? generateEventId());
    store.put(serializeForDb({ ...tx, id }));
  } catch (e) {
    if (isTransactionError(e)) clearOfflineDbInstance();
    if (isQuotaExceededError(e)) setOfflineQuotaExceeded();
    throw e;
  }
}

export async function getOfflineTransactionQueue<T = Record<string, unknown>>(): Promise<T[]> {
  try {
    const db = await openDb();
    const store = db.transaction(STORE_OFFLINE_TX, 'readonly').objectStore(STORE_OFFLINE_TX);
    const req = store.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve((req.result || []) as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}
