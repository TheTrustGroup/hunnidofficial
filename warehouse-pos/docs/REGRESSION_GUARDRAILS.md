# Regression guardrails (build on each fix)

**Goal:** Fixes stay fixed. Automated checks catch accidental reverts; humans follow a short checklist for what machines cannot see.

## What runs in CI (`npm run ci`)

`npm run ci` runs `ci:inventory`, which includes:

1. **Env** — `VITE_API_BASE_URL` set in CI/production builds.
2. **Regression locks** — see `scripts/ci-inventory-invariants.mjs` (section “Regression locks”):
   - `create` path uses `warehouse_inventory` **upsert** (works with sync trigger).
   - Any migration that **redefines** `backfill_by_size_from_inv_when_empty` must include the **`sized` guard** (no auto-`OS` for multi-size products).

If CI fails on a regression lock, read the script error and restore the invariant or update the lock **intentionally** with team review.

## When you fix a production bug

1. **Prefer a regression lock** in `ci-inventory-invariants.mjs` if the rule is checkable as text (file exists, pattern in SQL/TS).
2. **Document** the invariant in `inventory-server/supabase/SUPABASE_BRIEFING.md` if it involves triggers or `size_kind`.
3. **Add a Vitest test** in `src/` when the rule is pure TypeScript (e.g. `sizeCode.ts`, `errorMessages.ts`).
4. **Post-deploy smoke** (2 min): create a product with **multiple sizes** (some qty 0, some &gt; 0), save, confirm list shows correct stock.

## Related docs

- `docs/USER_FACING_ERRORS.md` — API + UI error policy  
- `inventory-server/supabase/SUPABASE_BRIEFING.md` — size and inventory triggers  
