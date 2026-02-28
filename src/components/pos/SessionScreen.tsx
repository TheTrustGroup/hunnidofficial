/**
 * POS session screen: select warehouse before using the POS.
 * Uses Warehouse type from app types (id, name, code).
 */
import type { Warehouse } from '../../types';

export interface SessionScreenProps {
  isOpen: boolean;
  warehouses: Warehouse[];
  activeWarehouseId: string;
  onSelect: (warehouse: Warehouse) => void;
}

export default function SessionScreen({
  isOpen,
  warehouses,
  activeWarehouseId,
  onSelect,
}: SessionScreenProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-900 px-4">
      <p className="text-slate-300 text-[14px] font-medium mb-4">Select warehouse to start</p>
      <div className="w-full max-w-sm space-y-2">
        {warehouses.length === 0 ? (
          <p className="text-slate-500 text-[13px] text-center py-6">No warehouses loaded</p>
        ) : (
          warehouses.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelect(w)}
              className={`w-full py-4 px-4 rounded-2xl text-left font-semibold text-[15px] transition-all duration-150 active:scale-[0.98]
                ${activeWarehouseId === w.id
                  ? 'bg-red-500 text-white shadow-[0_4px_16px_rgba(239,68,68,0.35)]'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'}`}
            >
              {w.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
