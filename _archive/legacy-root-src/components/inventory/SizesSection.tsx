// ============================================================
// SizesSection.tsx
// File: warehouse-pos/src/components/inventory/SizesSection.tsx
//
// Fully controlled — no internal state.
// Parent owns state. This component only renders and calls onChange.
// ============================================================

import { useEffect, useRef, useState, type RefObject } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────

export type SizeKind = 'na' | 'one_size' | 'sized';

export interface SizeRow {
  sizeCode: string;
  quantity: number;
}

export interface SizeCode {
  size_code: string;
  size_label?: string;
}

export interface SizesSectionValue {
  sizeKind: SizeKind;
  quantity: number;
  quantityBySize: SizeRow[];
}

interface SizesSectionProps {
  value: SizesSectionValue;
  sizeCodes?: SizeCode[];       // from /api/size-codes for datalist suggestions
  onChange: (next: SizesSectionValue) => void;
  disabled?: boolean;
  showValidation?: boolean;     // pass true when user attempts submit
  /** When set and sizeKind is 'sized', show this instead of the legacy size table (warehouse size grid). */
  customSizedContent?: React.ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function totalQty(rows: SizeRow[]): number {
  return rows.reduce((sum, r) => sum + (r.quantity || 0), 0);
}

function getValidationError(value: SizesSectionValue): string | null {
  if (value.sizeKind !== 'sized') return null;
  const rows = Array.isArray(value.quantityBySize) ? value.quantityBySize : [];
  const named = rows.filter(r => String(r?.sizeCode ?? '').trim() !== '');
  if (named.length === 0) return 'Add at least one size to save.';
  const missingCode = rows.filter(
    r => String(r?.sizeCode ?? '').trim() === '' && Number(r?.quantity ?? 0) > 0
  );
  if (missingCode.length > 0) return 'Enter a size code for every row with a quantity.';
  return null;
}

// ── Icons (inline SVG as components) ─────────────────────────────────────

const IconBox = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
    <path d="M16 3v4M8 3v4"/>
  </svg>
);

const IconCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9"/>
  </svg>
);

const IconLayers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
  </svg>
);

const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ── Sub-components ────────────────────────────────────────────────────────

interface QtyInputProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  label: string;
  hint?: string;
}

function QtyInput({ value, onChange, disabled, label, hint }: QtyInputProps) {
  const step = (delta: number) => onChange(Math.max(0, value + delta));

  return (
    <div className="pt-1 pb-2">
      <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 mb-2">
        {label}
      </label>
      {hint && (
        <p className="text-[12px] text-slate-400 mb-3 leading-relaxed">{hint}</p>
      )}
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          value={value}
          disabled={disabled}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="
            w-[120px] h-[52px] rounded-xl border-[1.5px] border-slate-200
            bg-slate-50 text-center text-[22px] font-bold text-slate-900
            focus:outline-none focus:border-primary-400 focus:bg-white
            focus:ring-[3px] focus:ring-primary-100
            disabled:opacity-50 disabled:cursor-not-allowed
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
            [&::-webkit-inner-spin-button]:appearance-none
            transition-all duration-150
          "
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => step(1)}
            disabled={disabled}
            className="
              w-8 h-6 rounded-lg border-[1.5px] border-slate-200 bg-white
              text-slate-600 text-sm font-bold flex items-center justify-center
              hover:bg-slate-100 hover:border-slate-300
              active:scale-90 disabled:opacity-40
              transition-all duration-150
            "
          >+</button>
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={disabled}
            className="
              w-8 h-6 rounded-lg border-[1.5px] border-slate-200 bg-white
              text-slate-600 text-sm font-bold flex items-center justify-center
              hover:bg-slate-100 hover:border-slate-300
              active:scale-90 disabled:opacity-40
              transition-all duration-150
            "
          >−</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function SizesSection({
  value,
  sizeCodes = [],
  onChange,
  disabled = false,
  showValidation = false,
  customSizedContent,
}: SizesSectionProps) {

  // Focus the last added row's size input (or select in dropdown mode)
  const lastRowRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const prevRowCount = useRef(value.quantityBySize.length);
  /** When true, size rows use a dropdown of size codes instead of free text. */
  const [sizeInputMode, setSizeInputMode] = useState<'manual' | 'dropdown'>('manual');

  useEffect(() => {
    if (
      value.sizeKind === 'sized' &&
      value.quantityBySize.length > prevRowCount.current &&
      lastRowRef.current
    ) {
      lastRowRef.current.focus();
    }
    prevRowCount.current = value.quantityBySize.length;
  }, [value.quantityBySize.length, value.sizeKind]);

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleKindChange(kind: SizeKind) {
    if (kind === value.sizeKind) return;

    if (kind === 'na' || kind === 'one_size') {
      // Carry total quantity over, clear size rows
      const carried =
        value.sizeKind === 'sized'
          ? totalQty(value.quantityBySize)
          : value.quantity;
      onChange({ sizeKind: kind, quantity: carried, quantityBySize: [] });
      return;
    }

    // Switching TO sized — keep existing named rows or seed one empty row
    const realRows = value.quantityBySize.filter(r => r.sizeCode.trim() !== '');
    onChange({
      sizeKind: 'sized',
      quantity: 0,
      quantityBySize:
        realRows.length > 0
          ? realRows
          : [{ sizeCode: '', quantity: value.quantity || 0 }],
    });
  }

  function handleQtyChange(qty: number) {
    onChange({ ...value, quantity: qty });
  }

  function handleSizeCode(idx: number, code: string) {
    const next = value.quantityBySize.map((r, i) =>
      i === idx ? { ...r, sizeCode: code.toUpperCase().trim() } : r
    );
    onChange({ ...value, quantityBySize: next });
  }

  function handleSizeQty(idx: number, qty: number) {
    const next = value.quantityBySize.map((r, i) =>
      i === idx ? { ...r, quantity: Math.max(0, qty) } : r
    );
    onChange({
      ...value,
      quantityBySize: next,
      quantity: totalQty(next),
    });
  }

  function handleAddRow() {
    onChange({
      ...value,
      quantityBySize: [...value.quantityBySize, { sizeCode: '', quantity: 0 }],
    });
  }

  function handleRemoveRow(idx: number) {
    const next = value.quantityBySize.filter((_, i) => i !== idx);
    onChange({
      ...value,
      quantityBySize: next,
      quantity: totalQty(next),
    });
  }

  // ── Derived ─────────────────────────────────────────────────────────────

  const validationError = showValidation ? getValidationError(value) : null;
  const total = totalQty(value.quantityBySize);
  const datalistId = 'sizes-section-datalist';

  // ── Type selector buttons ────────────────────────────────────────────────

  const TYPE_BTNS: { kind: SizeKind; label: string; icon: React.ReactNode }[] = [
    { kind: 'na',       label: 'No sizes',  icon: <IconBox /> },
    { kind: 'one_size', label: 'One size',  icon: <IconCircle /> },
    { kind: 'sized',    label: 'Multiple',  icon: <IconLayers /> },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">

      {/* Section heading */}
      <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-3.5">
        Stock &amp; Sizes
      </p>

      {/* Type selector — mobile-first: min 44px touch targets */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {TYPE_BTNS.map(({ kind, label, icon }) => (
          <button
            key={kind}
            type="button"
            disabled={disabled}
            onClick={() => handleKindChange(kind)}
            className={`
              min-h-[44px] h-11 rounded-xl border-[1.5px] text-[13px] font-semibold
              flex items-center justify-center gap-1.5
              transition-all duration-150 touch-manipulation
              disabled:opacity-40 disabled:cursor-not-allowed
              ${value.sizeKind === kind
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50'
              }
            `}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Content — na */}
      {value.sizeKind === 'na' && (
        <QtyInput
          label="Total quantity"
          value={value.quantity}
          onChange={handleQtyChange}
          disabled={disabled}
        />
      )}

      {/* Content — one_size */}
      {value.sizeKind === 'one_size' && (
        <QtyInput
          label="Quantity"
          hint="For products with no specific size — accessories, one-size apparel, etc."
          value={value.quantity}
          onChange={handleQtyChange}
          disabled={disabled}
        />
      )}

      {/* Content — sized: warehouse size grid or legacy table */}
      {value.sizeKind === 'sized' && customSizedContent != null && (
        <div>{customSizedContent}</div>
      )}
      {value.sizeKind === 'sized' && customSizedContent == null && (
        <div>
          {/* Datalist for autocomplete (manual mode) */}
          <datalist id={datalistId}>
            {sizeCodes.map(s => (
              <option key={s.size_code} value={s.size_code}>
                {s.size_label ?? s.size_code}
              </option>
            ))}
          </datalist>

          {/* Size input mode toggle: type vs dropdown — mobile-friendly min touch targets */}
          {sizeCodes.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
              <span className="text-[12px] font-medium text-slate-500">Size input:</span>
              <div className="flex rounded-lg border-[1.5px] border-slate-200 p-0.5 bg-slate-50 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSizeInputMode('manual')}
                  disabled={disabled}
                  className={`
                    flex-1 sm:flex-none min-h-[44px] px-3 py-2.5 sm:py-1.5 rounded-md text-[12px] font-semibold transition-all touch-manipulation
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${sizeInputMode === 'manual'
                      ? 'bg-white border border-slate-200 shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                    }
                  `}
                >
                  Type size
                </button>
                <button
                  type="button"
                  onClick={() => setSizeInputMode('dropdown')}
                  disabled={disabled}
                  className={`
                    flex-1 sm:flex-none min-h-[44px] px-3 py-2.5 sm:py-1.5 rounded-md text-[12px] font-semibold transition-all touch-manipulation
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${sizeInputMode === 'dropdown'
                      ? 'bg-white border border-slate-200 shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                    }
                  `}
                >
                  Pick from list
                </button>
              </div>
            </div>
          )}

          {/* Table header — responsive: stacked on mobile, grid on sm+ */}
          <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_100px_36px] gap-2 px-1 pb-2 border-b-[1.5px] border-slate-100 mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Size</span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide text-right">Qty</span>
            <span className="hidden sm:block w-9" aria-hidden="true" />
          </div>

          {/* Size rows — mobile-first: full-width dropdown, touch-friendly min 44px */}
          <div className="flex flex-col gap-0.5">
            {value.quantityBySize.map((row, idx) => {
              const hasError =
                showValidation &&
                row.sizeCode.trim() === '' &&
                row.quantity > 0;
              const isLast = idx === value.quantityBySize.length - 1;
              const usedInOtherRows = value.quantityBySize
                .filter((_, i) => i !== idx)
                .map(r => (r.sizeCode ?? '').trim())
                .filter(Boolean);
              const currentCode = (row.sizeCode ?? '').trim();
              const dropdownOptions = sizeCodes.filter(
                s => !usedInOtherRows.includes(s.size_code) || s.size_code === currentCode
              );
              // Include current row's code if it's not in sizeCodes (e.g. legacy or custom) so it still displays
              const hasCurrentInList = currentCode && dropdownOptions.some(s => s.size_code === currentCode);
              const optionsToShow = hasCurrentInList
                ? dropdownOptions
                : currentCode
                  ? [{ size_code: currentCode, size_label: currentCode }, ...dropdownOptions]
                  : dropdownOptions;

              return (
                <div
                  key={idx}
                  className={`
                    grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_100px_36px] gap-2 sm:gap-2 items-center
                    px-1 py-1.5 rounded-lg
                    transition-colors duration-150
                    hover:bg-slate-50
                    min-h-[44px]
                    ${hasError ? 'bg-red-50' : ''}
                  `}
                >
                  {/* Size code: dropdown or text input — 16px font on mobile to avoid iOS zoom */}
                  {sizeInputMode === 'dropdown' && sizeCodes.length > 0 ? (
                    <select
                      ref={isLast ? (lastRowRef as RefObject<HTMLSelectElement>) : undefined}
                      value={row.sizeCode}
                      disabled={disabled}
                      onChange={e => handleSizeCode(idx, e.target.value)}
                      className={`
                        min-h-[44px] w-full min-w-0 rounded-lg border-[1.5px] px-3 py-2
                        font-medium text-[16px] sm:text-[14px] text-slate-900
                        bg-slate-50 outline-none cursor-pointer
                        focus:border-primary-400 focus:bg-white focus:ring-[3px] focus:ring-primary-100
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-150
                        touch-manipulation
                        ${hasError
                          ? 'border-red-400 bg-red-50'
                          : 'border-slate-200'
                        }
                      `}
                      aria-label="Select size"
                    >
                      <option value="">Select size…</option>
                      {optionsToShow.map(s => (
                        <option key={s.size_code} value={s.size_code}>
                          {s.size_label ?? s.size_code}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      ref={isLast ? (lastRowRef as RefObject<HTMLInputElement>) : undefined}
                      type="text"
                      list={datalistId}
                      value={row.sizeCode}
                      placeholder="e.g. EU30"
                      disabled={disabled}
                      onChange={e => handleSizeCode(idx, e.target.value)}
                      className={`
                        min-h-[44px] w-full min-w-0 rounded-lg border-[1.5px] px-3 py-2
                        font-mono text-[16px] sm:text-[14px] font-medium text-slate-900
                        bg-slate-50 outline-none
                        placeholder:font-sans placeholder:text-slate-300 placeholder:font-normal
                        focus:border-primary-400 focus:bg-white focus:ring-[3px] focus:ring-primary-100
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-150
                        touch-manipulation
                        ${hasError
                          ? 'border-red-400 bg-red-50'
                          : 'border-slate-200'
                        }
                      `}
                    />
                  )}

                  {/* Quantity input — touch-friendly, no zoom on iOS */}
                  <input
                    type="number"
                    min={0}
                    value={row.quantity}
                    disabled={disabled}
                    onChange={e => handleSizeQty(idx, parseInt(e.target.value) || 0)}
                    className={`
                      min-h-[44px] w-full min-w-[72px] sm:min-w-0 sm:w-full max-w-[100px] rounded-lg border-[1.5px] px-2 py-2 text-center
                      font-sans text-[16px] font-bold text-slate-900
                      bg-slate-50 outline-none
                      focus:border-primary-400 focus:bg-white focus:ring-[3px] focus:ring-primary-100
                      disabled:opacity-50 disabled:cursor-not-allowed
                      [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                      [&::-webkit-inner-spin-button]:appearance-none
                      transition-all duration-150 touch-manipulation
                      ${row.quantity === 0 ? 'text-slate-300' : 'text-slate-900'}
                      border-slate-200
                    `}
                  />

                  {/* Remove button — min 44px touch target on mobile */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={disabled}
                    className="
                      min-w-[44px] min-h-[44px] w-9 h-9 sm:w-9 sm:h-9 rounded-lg border-none bg-transparent
                      text-slate-300 flex items-center justify-center
                      hover:bg-red-50 hover:text-red-500
                      active:scale-90
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-150 touch-manipulation
                    "
                    aria-label="Remove size"
                  >
                    <IconX />
                  </button>

                  {/* Row error */}
                  {hasError && (
                    <p className="col-span-full text-[11px] text-red-500 font-medium px-1 pb-1">
                      Enter a size code for this row
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add size button */}
          <button
            type="button"
            onClick={handleAddRow}
            disabled={disabled}
            className="
              w-full h-11 mt-2.5 rounded-xl
              border-[1.5px] border-dashed border-slate-200
              bg-transparent text-[13px] font-semibold text-slate-400
              flex items-center justify-center gap-1.5
              hover:border-red-400 hover:text-red-500 hover:bg-red-50
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150
            "
          >
            <IconPlus /> Add size
          </button>

          {/* Total bar */}
          <div className="flex items-center justify-between pt-3.5 mt-3 border-t-[1.5px] border-slate-100">
            <span className="text-[13px] font-semibold text-slate-500">Total stock</span>
            <div className="text-[18px] font-bold text-slate-900">
              {total}
              <span className="text-[13px] font-medium text-slate-400 ml-1">units</span>
            </div>
          </div>
        </div>
      )}

      {/* Validation message */}
      {validationError && (
        <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-100 text-[13px] font-medium text-red-600">
          <IconAlert />
          {validationError}
        </div>
      )}

    </div>
  );
}

// ── Export validation helper for use in parent submit handler ──────────────
export { getValidationError };
