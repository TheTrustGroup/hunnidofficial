/**
 * Warehouse size grid: pre-populated size codes with quantity inputs.
 * Used when the current warehouse has a known size set (Main Jeff sneakers, Hunnid Main apparel/waist).
 */

import type { WarehouseSizeConfig } from '../../constants/warehouseSizes';

export interface SizeQuantityGridProps {
  config: WarehouseSizeConfig[];
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  disabled?: boolean;
}

export function SizeQuantityGrid({ config, value, onChange, disabled }: SizeQuantityGridProps) {
  const handleChange = (sizeCode: string, qty: number) => {
    const next = { ...value, [sizeCode]: Math.max(0, qty) };
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {config.map(({ label, sizes }) => (
        <div key={label}>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {sizes.map(({ code }) => (
              <div key={code} className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-slate-600">{code}</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={value[code] ?? 0}
                  onChange={(e) => handleChange(code, e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  disabled={disabled}
                  className="size-qty-input w-full h-9 px-2 rounded-lg border border-slate-200 bg-slate-50 text-center text-[14px] font-semibold text-slate-900 outline-none focus:border-[var(--blue)] focus:bg-white focus:ring-2 focus:ring-[var(--blue-dim)] disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
