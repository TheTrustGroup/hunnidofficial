# UI/UX Layout & Spacing Rules

World-class retail POS and inventory app: consistent measurements, touch targets, and visual hierarchy.

## Design system (source of truth)

- **Tokens:** `src/index.css` — `--grid-8` through `--grid-48`, `--touch-min: 44px`, `--radius-base`, `--shadow-*`, `--text`, `--text-2`, `--text-3`, `--blue`, `--surface`, `--border`.
- **Tailwind:** `tailwind.config.js` — `primary-*`, `spacing.touch: 44px`, `minHeight/minWidth.touch: 44px`, `rounded-xl` (12px), `rounded-2xl` (16px), `shadow-soft`, `shadow-card`, `shadow-primary`, `shadow-large`.

## 8pt grid

- Use multiples of **8px** for padding, margins, and gaps where possible: `p-4` (16), `p-5` (20), `p-6` (24), `gap-2` (8), `gap-3` (12), `gap-4` (16).
- **Section spacing** (between major blocks): `--space-section` (24px) or `mb-6` / `gap-6`.
- **Block spacing** (within a card/section): `--space-block` (16px) or `p-4` / `gap-4`.
- **Inline spacing** (between label and control): `gap-2` or `gap-3`.

## Touch targets

- **Primary actions** (buttons, tabs that navigate): minimum **44px** height and width. Use `min-h-touch` (44px), `min-w-touch`, or `min-h-[44px]`.
- **Secondary actions** (e.g. qty −/+ inside a row): may be smaller (e.g. 36px) if they are clearly part of a single “row” control; prefer ≥36px.
- **Icon-only buttons** in headers/sidebars: wrap in a tappable area that is at least 44×44; the visible icon can be smaller (e.g. 20px) with padding.

## Typography hierarchy

- **Page title:** `text-2xl` or `text-xl`, `font-bold`, `text-slate-900`, `font-[var(--font-d)]` where design uses display font.
- **Section title / card title:** `text-lg` or `text-base`, `font-semibold`, `text-slate-900`.
- **Body:** `text-sm` or `text-base`, `font-normal` or `font-medium`, `text-slate-700` / `--text` / `--text-2`.
- **Caption / meta:** `text-xs` or `text-sm`, `text-slate-500` / `--text-3`.
- **Numbers (prices, qty):** `tabular-nums`, `font-semibold` or `font-bold`; primary brand color for prices where appropriate.

## Cards, sheets, modals

- **Padding:** Cards and sheet content use **≥16px** (e.g. `p-4` or `px-5 py-4`). Modal content: `p-4` sm:`p-6`.
- **Radius:** Cards/sheets: `rounded-xl` (12px) or `rounded-2xl` (16px). Buttons: `rounded-xl` or `rounded-lg`.
- **Shadows:** Cards at rest: `shadow-card` or `shadow-soft`; elevated/hover: `shadow-card-hover` or `shadow-soft`; primary CTA: `shadow-primary` / `shadow-primary-hover`.
- **Borders:** `border border-slate-200` or `var(--border)`.

## Safe area & main layout

- **Main content:** `pl-[max(1rem,var(--safe-left))]` `pr-[max(1rem,var(--safe-right))]` so padding is at least 16px or safe inset.
- **Bottom nav / sticky bars:** `padding-bottom: max(8px, var(--safe-bottom))` (or similar) so content clears notches/home indicator.
- **Modals/sheets:** Use `modal-overlay-padding` or equivalent so content stays inside safe area.

## Consistency checklist

- [ ] Spacing uses 8pt grid (8, 16, 24, 32, 40, 48).
- [ ] Primary tap targets ≥ 44px.
- [ ] Title > subtitle > body > caption in size/weight/color.
- [ ] Cards/sheets use consistent padding (≥16px), radius (xl/2xl), and shadow.
- [ ] No ad-hoc fonts; use `var(--font-b)` (body) or `var(--font-d)` (display) as per design.
- [ ] Mobile: main padding and modals respect safe area.

---

## Audit summary (refinements applied)

| Area | Issue | Fix |
|------|--------|-----|
| Layout | Main pl/pr used 0.5rem on mobile; sidebar 240 vs 244 | Main: use max(1rem, safe); sidebar margin aligned to 244px where used |
| Header | Search/buttons below 44px touch | Min heights and tap areas raised to 44px where primary |
| Sidebar | Nav px 13px off 8pt grid | Nav padding to 12px/16px (grid) |
| BottomNav | Padding 6px/5px off grid | Padding to 8px (grid); icon containers ≥44px tap |
| CartBar | Font DM Sans | Use var(--font-b) / Inter |
| CartPanel | Qty buttons 22px | Increased to 36px with larger tap area; secondary buttons to min-h-touch where primary |
| CartSheet | Line qty 28px, PayBtn ok | Qty controls ≥36px tap |
| POSHeader | Search h-9, Scan 23px, Cart h-9 | Search/Scan/Cart to min-h-touch or 44px where primary |
| ProductGrid | Category tabs 30px | Optional: min tap area; Load more already 44px |
| EmptyState / PageHeader | Mixed margins | Standardised to 8pt (mb-4, gap-4, etc.) |
| POS product cards | Padding 10/8/10 | Align to 8pt (e.g. p-3, gap-2) |
| SizePickerSheet | Already aligned | No change |
| SessionScreen | Already good | No change |
