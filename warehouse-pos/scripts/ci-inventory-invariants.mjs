#!/usr/bin/env node
/**
 * CI invariant checks for inventory reliability (P0).
 * Fails the build if:
 * - VITE_API_BASE_URL is missing when building for production (no default allowed).
 * - Regression locks fail (see runRegressionLocks below).
 *
 * Run: node scripts/ci-inventory-invariants.mjs
 * Set CHECK_ENV=1 to verify production env is set (e.g. in CI).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const isCI = process.env.CI === 'true' || process.env.CI === '1';
const isProduction = process.env.NODE_ENV === 'production' || isCI;
const checkEnv = process.env.CHECK_ENV === '1' || isProduction || isCI;

function fail(msg) {
  console.error('[INVENTORY RELIABILITY]', msg);
  process.exit(1);
}

if (checkEnv) {
  const apiBase = process.env.VITE_API_BASE_URL;
  if (!apiBase || String(apiBase).trim() === '') {
    fail('VITE_API_BASE_URL must be set in production/CI. No default allowed.');
  }
  console.log('[INVENTORY RELIABILITY] VITE_API_BASE_URL is set (invariant OK).');
}

/**
 * Locks for bugs we already fixed — extend this block when a new invariant should never regress.
 */
function runRegressionLocks() {
  const wp = path.join(REPO_ROOT, 'inventory-server', 'lib', 'data', 'warehouseProducts.ts');
  if (!fs.existsSync(wp)) {
    fail(`Missing ${path.relative(REPO_ROOT, wp)}`);
  }
  const warehouseProducts = fs.readFileSync(wp, 'utf8');
  // P0: legacy product create must upsert summary row (sync trigger may already insert it).
  if (!/from\(['"]warehouse_inventory['"]\)\s*\.upsert\s*\(/s.test(warehouseProducts)) {
    fail(
      'warehouseProducts.ts must use db.from("warehouse_inventory").upsert(...) for product create (sync with trigger_sync_warehouse_inventory_from_by_size).'
    );
  }

  const migDir = path.join(REPO_ROOT, 'inventory-server', 'supabase', 'migrations');
  if (!fs.existsSync(migDir)) {
    console.log('[REGRESSION LOCKS] No migrations dir; skip SQL checks.');
    return;
  }
  const sqlFiles = fs.readdirSync(migDir).filter((n) => n.endsWith('.sql'));
  for (const name of sqlFiles) {
    const content = fs.readFileSync(path.join(migDir, name), 'utf8');
    const definesBackfill =
      /create\s+or\s+replace\s+function\s+[\w.]+\s*backfill_by_size_from_inv_when_empty/i.test(content);
    if (!definesBackfill) continue;
    const hasSizedGuard = /\bif\s+sk\s*=\s*'sized'\s+then\b/i.test(content);
    if (!hasSizedGuard) {
      fail(
        `Migration ${name} redefines backfill_by_size_from_inv_when_empty without "if sk = 'sized'" guard. ` +
          'Sized products must not get auto OS rows (see SUPABASE_BRIEFING.md / 20260328170000).'
      );
    }
  }

  const lockFile = path.join(migDir, '20260328170000_fix_backfill_os_for_sized_products.sql');
  if (!fs.existsSync(lockFile)) {
    fail('Required migration missing: 20260328170000_fix_backfill_os_for_sized_products.sql');
  }

  console.log('[REGRESSION LOCKS] warehouse_inventory upsert + backfill sized guard OK.');
}

runRegressionLocks();

console.log('Inventory invariant checks passed.');
