/**
 * POS password enforcement: only the configured password works for each POS account.
 * Prevents theft — no other password is accepted for these emails.
 */

import { timingSafeEqual } from 'crypto';

const POS_CASHIER_MAIN_STORE_EMAIL = 'jcashier@hunnidofficial.com';
const POS_MAIN_TOWN_EMAIL = 'hcashier@hunnidofficial.com';

/** Env keys for POS passwords (set in .env / Vercel). */
export const POS_PASSWORD_ENV_KEYS = {
  [POS_CASHIER_MAIN_STORE_EMAIL]: 'POS_PASSWORD_CASHIER_MAIN_STORE',
  [POS_MAIN_TOWN_EMAIL]: 'POS_PASSWORD_MAIN_TOWN',
} as const;

/** Default warehouse UUIDs (match frontend DEFAULT_WAREHOUSE_ID and Main Town fallback). Override with env if your DB uses different IDs. */
const DEFAULT_MAIN_STORE_WAREHOUSE_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_MAIN_TOWN_WAREHOUSE_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Returns the warehouse_id to bind for this POS email so the frontend can skip the warehouse selector.
 * Main Store cashier → Main Store warehouse; Main Town cashier → Main Town warehouse.
 */
export function getWarehouseIdForPosEmail(email: string): string | undefined {
  const normalized = email.trim().toLowerCase();
  if (normalized === POS_CASHIER_MAIN_STORE_EMAIL) {
    return process.env.POS_WAREHOUSE_ID_MAIN_STORE?.trim() || DEFAULT_MAIN_STORE_WAREHOUSE_ID;
  }
  if (normalized === POS_MAIN_TOWN_EMAIL) {
    return process.env.POS_WAREHOUSE_ID_MAIN_TOWN?.trim() || DEFAULT_MAIN_TOWN_WAREHOUSE_ID;
  }
  return undefined;
}

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  if (bufA.length === 0) return true;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Returns true if this email is a POS account that requires password check.
 */
export function isPosRestrictedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized === POS_CASHIER_MAIN_STORE_EMAIL || normalized === POS_MAIN_TOWN_EMAIL;
}

/**
 * Verify password for a POS account. Only the configured env password is accepted.
 * Returns true if login is allowed, false if wrong password or env not set.
 */
export function verifyPosPassword(email: string, password: string): boolean {
  const normalized = email.trim().toLowerCase();
  const envKey = POS_PASSWORD_ENV_KEYS[normalized as keyof typeof POS_PASSWORD_ENV_KEYS];
  if (!envKey) return true; // not a POS-restricted account; caller may allow

  const expected = process.env[envKey];
  if (!expected || typeof expected !== 'string') return false;
  return timingSafeCompare(password, expected.trim());
}
