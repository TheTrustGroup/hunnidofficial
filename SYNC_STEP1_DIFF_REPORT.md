# Step 1 — Complete Categorized Diff Report
## EDK (warehouse-pos) vs Hunnid (HunnidOfficial)

**Comparison scope:** Source files only (excluding `node_modules`, `.git`, `dist`).

---

## Summary

| Category | Count | Description |
|----------|-------|-------------|
| **A. IDENTICAL** | 275 | File exists in both, content identical → **No action** |
| **B. DIFFERENT** | 235 | File exists in both, content differs → See categorization below |
| **C. ONLY IN EDK** | 238 | File added in EDK → Add to Hunnid (unless EDK-only branding) |
| **D. ONLY IN HUNNID** | 730 | Hunnid-only file → **Do not touch** |

**Paths:**  
- **EDK (read from):** `Desktop/World-Class Warehouse Inventory & Smart POS System/warehouse-pos`  
- **Hunnid (write to):** `Desktop/HunnidOfficial` (app at repo root)

---

## A. IDENTICAL (275 files) — No action needed

These files are the same in both projects. No copy or merge required.

---

## B. DIFFERENT (235 files) — Categorized

### 🔴 BRAND FILES — Never overwrite (keep Hunnid version)

| File | Reason |
|------|--------|
| `.env.example` | Env var names/placeholders; Hunnid has its own values |
| `.env.production` | Hunnid Supabase/Vercel URLs and keys |
| `.vercel/project.json` | Vercel project ID (Hunnid project) |
| `vercel.json` | Project/deployment config (Hunnid domain) |
| `inventory-server/.env.example` | Server env placeholders |
| `inventory-server/.env.local` | **Never copy** — Hunnid credentials |
| `inventory-server/.env.local.example` | Server env template |
| `inventory-server/.vercel/project.json` | Server Vercel project |
| `inventory-server/vercel.json` | Server deployment config |
| `src/constants/defaultCredentials.ts` | Demo/login credentials (brand-specific) |
| `inventory-server/lib/auth/posPasswords.ts` | POS passwords (brand-specific) |
| `inventory-server/lib/cors.ts` | Allowed origins (hunnidofficial.com vs EDK domain) |
| `inventory-server/lib/auth/session.ts` | Cookie/session names if different |

*Note: `inventory-server/supabase/config.toml` is in “only in Hunnid” or “different” — if it exists in both, treat as 🔴 BRAND (project ref).*

---

### 🟡 MIXED FILES — Merge required (EDK code + Hunnid brand)

These files contain both **code improvements** (bug fixes, features, performance) and **brand differences** (colors, fonts, app name, logo). For each: take EDK logic, keep Hunnid brand values.

| File | Brand elements to keep in Hunnid |
|------|-----------------------------------|
| `index.html` | Title "Hunnid Official", theme-color #5cacfa, Syne font, favicon/vite.svg |
| `tailwind.config.js` | Primary blue (#5cacfa), primary shadow rgba(92,172,250,...) |
| `public/manifest.json` | App name, short_name, theme_color |
| `src/index.css` | CSS variables for primary color / font if any |
| `src/config/navigation.tsx` | App name in nav labels if present |
| `src/main.tsx` | Document title or app name if set |
| `src/components/layout/Header.tsx` | Logo, app name, colors |
| `src/components/layout/Layout.tsx` | Branding in layout |
| `src/components/layout/Sidebar.tsx` | Logo, name, colors |
| `src/components/layout/MobileMenu.tsx` | Same |
| `src/components/pos/POSHeader.tsx` | Logo, colors |
| `src/components/pos/CartBar.tsx` | Colors |
| `src/components/pos/CartSheet.tsx` | Colors |
| `src/components/pos/POSProductCard.tsx` | Primary color usage |
| `src/components/pos/ProductGrid.tsx` | Styling |
| `src/components/pos/SaleSuccessScreen.tsx` | Copy, colors |
| `src/components/inventory/ProductCard.tsx` | Primary color |
| `src/components/inventory/ProductModal.tsx` | Buttons/inputs (primary) |
| `src/components/inventory/SizesSection.tsx` | Styling |
| `src/components/settings/UserManagement.tsx` | Any brand strings |
| `src/components/ui/Toast.tsx` | Theming |
| `src/components/SyncQueueModal.tsx` | Theming |
| `src/components/SyncStatusBar.tsx` | Theming |
| `src/components/debug/DebugPanel.tsx` | Theming if any |
| `src/contexts/AuthContext.tsx` | App name / branding in messages |
| `src/contexts/SettingsContext.tsx` | Brand prefs |
| `src/contexts/CriticalDataContext.tsx` | Copy/brand if any |
| `src/contexts/InventoryContext.tsx` | Any brand |
| `src/contexts/NetworkStatusContext.tsx` | Copy if any |
| `src/contexts/OrderContext.tsx` | Any brand |
| `src/contexts/ToastContext.tsx` | Any brand |
| `src/contexts/WarehouseContext.tsx` | Any brand |
| `src/pages/LoginPage.tsx` | Logo, name, colors |
| `src/pages/Dashboard.tsx` | Title, colors |
| `src/pages/DashboardPage.tsx` | Same |
| `src/pages/DeliveriesPage.tsx` | Title, colors |
| `src/pages/InventoryPage.tsx` | Title, colors |
| `src/pages/Orders.tsx` | Same |
| `src/pages/POSPage.tsx` | Same |
| `src/pages/Reports.tsx` | Same |
| `src/pages/SalesHistoryPage.tsx` | Same |
| `src/lib/printReceipt.ts` | Header/footer text, store name |
| `src/lib/api.ts` | Base URL from env only; do not copy EDK URL |
| `src/lib/apiClient.ts` | Base URL from env |
| `src/db/inventoryDB.js` | DB name / any brand string |
| `package.json` | `"name"` and any project-specific fields (keep Hunnid) |
| `inventory-server/package.json` | Same (keep Hunnid name) |

*If any of the above are identical in both repos, they fall in A and are skipped.*

---

### 🟢 CODE FILES — Safe to copy from EDK to Hunnid

Copy EDK version as-is. No brand content (or only generic logic).

**Root / config (structure only):**
- `.gitignore` (if only generic rules differ)
- `playwright.config.ts`
- `vite.config.ts`
- `tsconfig.json`, `tsconfig.node.json`
- `inventory-server/tsconfig.json`
- `inventory-server/next.config.js` (check: no EDK domain; if env-based, safe)
- `inventory-server/next-env.d.ts`

**Scripts:**
- `deploy_vercel.sh`
- `find-api-endpoints.sh`
- `fix_git.sh`
- `test-api.sh`, `test-cors-and-login.sh`, `test-existing-api.sh`
- `scripts/ci-inventory-invariants.mjs`

**Docs (optional to sync):**
- All `*.md` in root and `docs/` that are different (content is doc, not brand)
- `inventory-server/ENV_SETUP.md`, `INVENTORY_DURABILITY.md`, `RBAC_AUDIT_AND_ENFORCEMENT.md`, `SERVER_ERROR_500.md`
- `inventory-server/docs/archive/*.md`
- `inventory-server/supabase/scripts/README.md`

**Inventory-server app (API / logic):**
- `inventory-server/app/admin/api/login/route.ts`
- `inventory-server/app/admin/api/logout/route.ts`
- `inventory-server/app/admin/api/me/route.ts`
- `inventory-server/app/admin/api/products/route.ts`
- `inventory-server/app/admin/api/products/bulk/route.ts`
- `inventory-server/app/api/auth/login/route.ts`
- `inventory-server/app/api/auth/logout/route.ts`
- `inventory-server/app/api/auth/user/route.ts`
- `inventory-server/app/api/dashboard/route.ts`
- `inventory-server/app/api/dashboard/today-by-warehouse/route.ts`
- `inventory-server/app/api/health/route.ts`
- `inventory-server/app/api/inventory/deduct/route.ts`
- `inventory-server/app/api/orders/route.ts`
- `inventory-server/app/api/orders/[id]/cancel/route.ts`
- `inventory-server/app/api/orders/deduct/route.ts`
- `inventory-server/app/api/orders/return-stock/route.ts`
- `inventory-server/app/api/products/route.ts`
- `inventory-server/app/api/products/[...id]/route.ts`
- `inventory-server/app/api/reports/sales/route.ts`
- `inventory-server/app/api/sales/route.ts`
- `inventory-server/app/api/sales/void/route.ts`
- `inventory-server/app/api/size-codes/route.ts`
- `inventory-server/app/api/stock-movements/route.ts`
- `inventory-server/app/api/stores/route.ts`
- `inventory-server/app/api/sync-rejections/route.ts`
- `inventory-server/app/api/sync-rejections/[id]/void/route.ts`
- `inventory-server/app/api/test/route.ts`
- `inventory-server/app/api/transactions/route.ts`
- `inventory-server/app/api/warehouses/route.ts`
- `inventory-server/lib/api/productByIdHandlers.ts`
- `inventory-server/lib/data/dashboardStats.ts`
- `inventory-server/lib/data/inventory.ts`
- `inventory-server/lib/data/sizeCodes.ts`
- `inventory-server/lib/data/userScopes.ts`
- `inventory-server/lib/data/warehouseProducts.ts`
- `inventory-server/lib/supabase.ts`
- `inventory-server/middleware.ts`

**Migrations (schema / logic only):**
- All `inventory-server/supabase/migrations/*.sql` that differ (review for EDK-specific data; if schema-only, 🟢)
- `inventory-server/supabase/scripts/backfill_warehouse_inventory_from_by_size.sql`
- `inventory-server/supabase/scripts/phase3_seed_one_store.sql`
- `inventory-server/supabase/scripts/seed_one_product.sql`
- `inventory-server/supabase/scripts/seed_stores_warehouses_dc_maintown.sql`
- `inventory-server/supabase/scripts/seed_super_admin_scope.sql`
- `inventory-server/supabase/scripts/verify_user_scopes.sql`

**Frontend src (logic only):**
- `src/App.tsx` (if only routing/logic; if title/logo present → 🟡)
- `src/__tests__/*`
- `src/lib/INVENTORY_FLOW_AND_AUTHORITY.md`
- `src/lib/api.ts` (base URL must stay from env)
- `src/lib/apiClient.ts` (same)
- `src/lib/circuit.ts`
- `src/lib/dashboardStats.test.ts`
- `src/lib/dashboardStats.ts`
- `src/lib/errorMessages.ts`
- `src/lib/imageUpload.ts`
- `src/lib/initErrorHandlers.ts`
- `src/lib/offlineDb.ts`
- `src/lib/printReceipt.ts` (merge: keep Hunnid store name)
- `src/lib/utils.test.ts`
- `src/lib/utils.ts`
- `src/types/index.ts`
- `src/types/permissions.ts`
- `src/utils/logger.d.ts`
- `src/utils/logger.js`
- `src/services/reportService.ts`
- `src/services/salesApi.ts`
- `src/services/syncService.conflict.test.js`
- `src/services/syncService.js`
- `src/contexts/InventoryContext.integration.test.tsx`
- `src/pages/InventoryPage.test.tsx`
- `src/pages/DashboardPage.test.tsx`
- `src/pages/Inventory ui ux prompt guide·MD`
- `public/service-worker.js`
- `public/manifest.json` (🟡 if name/theme differ; else 🟢)

**Lock files (optional):**
- `package-lock.json`, `inventory-server/package-lock.json` — Regenerate with `npm install` after syncing `package.json` (merge name), or keep Hunnid and add deps.

---

## C. ONLY IN EDK (238 files) — Add to Hunnid (unless EDK-only branding)

### 🔴 EDK-only branding — Do not add to Hunnid

- `src/components/login/ExtremeDeptKidzLockup.tsx` — EDK logo/lockup (Hunnid has its own).
- `src/components/ui/DoubleELogo.tsx` — EDK logo.
- `src/config/branding.ts` — EDK colors/name; Hunnid keeps its branding.
- `docs/BRANDING.md` — EDK-specific; optional to skip or adapt.

### 🟢 CODE — Add to Hunnid as-is

**CI / tooling:**
- `.github/workflows/ci.yml`
- `e2e/pos-sale.spec.ts`
- `e2e/sw-update-toast.spec.ts`

**Inventory-server (new routes / lib):**
- `inventory-server/app/api/admin/clear-sales-history/route.ts`
- `inventory-server/app/api/health/ready/route.ts`
- `inventory-server/app/api/products/verify-stock/route.ts`
- `inventory-server/app/api/sentry-test/route.ts`
- `inventory-server/instrumentation.ts`
- `inventory-server/lib/apiResponse.ts`
- `inventory-server/lib/auth/credentials.ts`
- `inventory-server/lib/cache/dashboardStatsCache.ts`
- `inventory-server/lib/idempotency.ts`
- `inventory-server/lib/ratelimit.ts`
- `inventory-server/lib/requestLog.ts`
- `inventory-server/lib/schemas/requestBodies.ts`
- `inventory-server/lib/sentryApi.ts`
- `inventory-server/lib/supabase/admin.ts`
- `inventory-server/lib/validation.ts`
- `inventory-server/docs/GET_PRODUCTS_QUERIES.md`
- `inventory-server/scripts/build-with-frontend.mjs`
- `inventory-server/scripts/check-auth-await.mjs`
- `inventory-server/scripts/deploy-low-stock-alert.sh`
- `inventory-server/sentry.client.config.ts`
- `inventory-server/sentry.edge.config.ts`
- `inventory-server/sentry.server.config.ts`
- `inventory-server/supabase/functions/low-stock-alert/index.ts`
- `inventory-server/supabase/functions/send-receipt/index.ts`

**Migrations (run in order after review):**
- All new `inventory-server/supabase/migrations/*.sql` from 20260301 onward (list in Step 4; run on Hunnid DB in timestamp order).

**Scripts:**
- `scripts/analyze-supabase-vercel.mjs`
- `scripts/guard-uncommitted.mjs`
- `RECOVERY_STEPS.md`

**Frontend (new components/hooks/lib):**
- `src/components/RealtimeSyncIndicator.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/layout/MoreMenuSheet.tsx` (if not brand-specific; if it uses EDK lockup → 🟡 merge)
- `src/components/ui/BrandLockup.tsx` — **🟡** Add file but Hunnid must implement Hunnid version (or swap to Hunnid component).
- `src/contexts/PresenceContext.tsx`
- `src/contexts/RealtimeContext.tsx`
- `src/hooks/useDashboardQuery.ts`
- `src/hooks/useInventoryRealtime.ts`
- `src/lib/dashboardApi.ts`
- `src/lib/idbErrorRecovery.ts`
- `src/lib/imageResize.js`
- `src/lib/onUnauthorized.ts`
- `src/lib/queryClient.ts`
- `src/lib/queryKeys.ts`
- `src/lib/receiptTemplate.ts`
- `src/lib/stockConstants.ts`
- `src/lib/supabase.ts`
- `src/lib/warehouseId.ts`
- `src/services/reportsApi.ts`
- `src/services/salesSyncService.ts`
- `sentry.client.config.ts` (root)

**Docs (optional):**
- All `docs/*.md` and `docs/**/*` that exist only in EDK (e.g. ANALYZE_SUPABASE_AND_VERCEL, AUDIT_END_TO_END, …). Safe to add as documentation.

**Build artifacts (do not copy):**
- `inventory-server/public/assets/*`, `inventory-server/public/*.html`, `inventory-server/public/sw.js`, `inventory-server/public/version.json`, `inventory-server/public/favicon.svg`, `inventory-server/public/vite.svg`, `inventory-server/public/manifest.json`, `inventory-server/public/service-worker.js` — Generated; Hunnid builds its own.
- `playwright-report/**`, `test-results/**`, `supabase/.temp/**`, `inventory-server/supabase/.temp/**`, `inventory-server/tsconfig.tsbuildinfo` — Do not copy.

---

## D. ONLY IN HUNNID (730 files) — Do not touch

- **Root:** e.g. `Hunnid Official.code-workspace`, `DEPLOY.md`, `DEPLOY_CHANGES.md`, `DEPLOY_RUNBOOK.md`, `LOGO_DEPLOY_FIX.md`, `PHASE2_FORENSIC_AUDIT_REPORT.md`, and other Hunnid-only docs.
- **docs:** e.g. `docs/COLOR_SYSTEM.md`, `docs/HunnidOfficial_Login_Credentials.html`, `docs/ONBOARDING_NEW_WAREHOUSE.md`, `docs/PERFORMANCE_OPTIMIZATIONS.md`, `docs/ROBUSTNESS_AND_COMPLETENESS.md`, `docs/STEP0_COMMIT_AND_PUSH.md`, `docs/STEP3_MIGRATIONS_AND_SEEDS.md`, `docs/STEP4_SEEDS_AND_AUTH.md`, `docs/STEP5_ENV_AND_DEPLOY.md`, `docs/TEST_THEN_DEPLOY.md`, `docs/UX_OPERATIONS.md`, `docs/VERCEL_LINK.md`, `docs/WHY_LOGIN_PAGE_DID_NOT_SHOW.md`, etc.
- **inventory-server:** Hunnid-specific migrations (e.g. `20250213000001_atomic_*`, `20250228100000_*`, … through `20260306180000_*`), scripts (`RUNBOOK_void_sale_idempotent.md`, `STEP3_fix_record_sale_HUNNID.sql`, `fix_warehouse_display_names.sql`, etc.), `inventory-server/public/ok.txt`, `inventory-server/scripts/smoke-api.mjs`, `inventory-server/lib/cache/warehouseStatsCache.ts`, `inventory-server/lib/safeError.ts`, `inventory-server/app/api/orders/[id]/assign-driver/route.ts`, `deliver/route.ts`, `fail/route.ts`, `route.ts` (orders).
- **Nested copy:** `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/...` — Full duplicate tree under HunnidOfficial; leave as-is or treat as secondary copy; do not overwrite with EDK.
- **Other:** Any file that exists only in Hunnid is kept unchanged unless you explicitly decide to remove or replace it.

---

## Next step

Proceed to **Step 2 — Protected file list** (all files that must never be overwritten), then await your approval before any copy or merge.
