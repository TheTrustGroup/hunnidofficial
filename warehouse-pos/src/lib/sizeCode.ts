/**
 * Shared size-code helpers for inventory forms and validations.
 * Keep sanitizeQuantityBySizeForApi in sync with inventory-server imports of this module.
 */

/** Strip zero-width / BOM so "O\u200bS" cannot bypass placeholder checks or match as a real EU size in the UI. */
function stripInvisibleSizeInput(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');
}

export function isPlaceholderOneSizeCode(sizeCode: string | null | undefined): boolean {
  const n = stripInvisibleSizeInput(String(sizeCode ?? ''))
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
  return n === 'OS' || n === 'ONESIZE' || n === 'ONE_SIZE' || n === 'O/S' || n === 'NA';
}

export interface QuantityBySizeRow {
  sizeCode: string;
  quantity: number;
}

/**
 * Catalog `size_codes` use compact EU keys (EU36.5), while labels show "EU 36.5".
 * Never strip all spaces globally — that can turn "O S" into "OS".
 */
export function normalizeInventorySizeCode(raw: string): string {
  const base = stripInvisibleSizeInput(String(raw ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  const eu = base.match(/^EU\s+(\d+(?:\.\d+)?)$/);
  if (eu) return `EU${eu[1]}`;
  return base;
}

/**
 * Per-size rows for API POST/PUT bodies. Strips empty codes and one-size placeholders (OS, etc.);
 * normalizes sizeCode (including EU spacing) and quantity to a non-negative number.
 * Single source of truth for client payloads and server sanitizeSizeRows().
 */
export function sanitizeQuantityBySizeForApi(
  rows: Array<{ sizeCode?: string; size_code?: string; quantity?: number }> | null | undefined
): QuantityBySizeRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      sizeCode: normalizeInventorySizeCode(String(r?.sizeCode ?? r?.size_code ?? '')),
      quantity: Math.max(0, Number(r?.quantity ?? 0) || 0),
    }))
    .filter((r) => r.sizeCode !== '' && !isPlaceholderOneSizeCode(r.sizeCode));
}

export interface NormalizeQuantityBySizeForPersistOptions {
  /** Omit rows with quantity &lt;= 0 (typical for POST create). */
  requirePositiveQuantity?: boolean;
}

/**
 * Single pipeline before writing `warehouse_inventory_by_size` or RPC `p_quantity_by_size`:
 * sanitize (EU compact + drop OS/One-size placeholders) → merge duplicate catalog keys → optional positive qty only.
 * DB `size_code` values must match this output (e.g. EU36.5), never "EU 36.5" or OS for sized products.
 */
export function normalizeQuantityBySizeForPersist(
  rows: Array<{ sizeCode?: string; size_code?: string; quantity?: number }> | null | undefined,
  options: NormalizeQuantityBySizeForPersistOptions = {}
): QuantityBySizeRow[] {
  const base = sanitizeQuantityBySizeForApi(rows);
  const merged = new Map<string, number>();
  for (const r of base) {
    const k = normalizeInventorySizeCode(r.sizeCode);
    if (!k || isPlaceholderOneSizeCode(k)) continue;
    merged.set(k, (merged.get(k) ?? 0) + Math.max(0, Number(r.quantity) || 0));
  }
  let out = [...merged.entries()].map(([sizeCode, quantity]) => ({ sizeCode, quantity }));
  if (options.requirePositiveQuantity) {
    out = out.filter((r) => r.quantity > 0);
  }
  return out;
}
