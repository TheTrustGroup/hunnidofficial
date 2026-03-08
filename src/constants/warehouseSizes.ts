/**
 * Warehouse-specific size grids. No kid sizes; pre-populated only.
 * - MAIN JEFF: sneakers EU37–EU46
 * - HUNNID MAIN: apparel XS–XXXL + waist 28–42
 */

export interface SizeOption {
  code: string;
  label: string;
}

export interface WarehouseSizeConfig {
  /** Display label for the size set (e.g. "EU", "Apparel", "Waist") */
  label: string;
  sizes: SizeOption[];
}

/** Match warehouse name (case-insensitive, trimmed). */
export function getSizeConfigForWarehouse(warehouseName: string | null | undefined): WarehouseSizeConfig[] | null {
  if (!warehouseName || typeof warehouseName !== 'string') return null;
  const name = warehouseName.trim().toUpperCase();
  if (name.includes('MAIN') && name.includes('JEFF')) return SNEAKER_CONFIG;
  if (name.includes('HUNNID') && name.includes('MAIN')) return APPAREL_CONFIG;
  return null;
}

const SNEAKER_SIZES: SizeOption[] = [
  'EU37', 'EU38', 'EU39', 'EU40', 'EU41', 'EU42', 'EU43', 'EU44', 'EU45', 'EU46',
].map((code) => ({ code, label: code }));

const SNEAKER_CONFIG: WarehouseSizeConfig[] = [
  { label: 'EU', sizes: SNEAKER_SIZES },
];

const APPAREL_SIZES: SizeOption[] = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
].map((code) => ({ code, label: code }));

const WAIST_SIZES: SizeOption[] = [
  28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 40, 42,
].map((n) => {
  const code = String(n);
  return { code, label: code };
});

const APPAREL_CONFIG: WarehouseSizeConfig[] = [
  { label: 'Apparel', sizes: APPAREL_SIZES },
  { label: 'Waist', sizes: WAIST_SIZES },
];
