# Step 3 — CODE files copy log

Source: `Desktop/World-Class Warehouse Inventory & Smart POS System/warehouse-pos` (EDK)  
Target: `Desktop/HunnidOfficial` (Hunnid)

All files cross-checked against `SYNC_PROTECTED_FILES.md`. No protected file was overwritten.

---

## Copied — C. ONLY IN EDK (47 files)

| File |
|------|
| .github/workflows/ci.yml |
| e2e/pos-sale.spec.ts |
| e2e/sw-update-toast.spec.ts |
| inventory-server/instrumentation.ts |
| inventory-server/app/api/admin/clear-sales-history/route.ts |
| inventory-server/app/api/health/ready/route.ts |
| inventory-server/app/api/products/verify-stock/route.ts |
| inventory-server/app/api/sentry-test/route.ts |
| inventory-server/lib/apiResponse.ts |
| inventory-server/lib/auth/credentials.ts |
| inventory-server/lib/cache/dashboardStatsCache.ts |
| inventory-server/lib/idempotency.ts |
| inventory-server/lib/ratelimit.ts |
| inventory-server/lib/requestLog.ts |
| inventory-server/lib/schemas/requestBodies.ts |
| inventory-server/lib/sentryApi.ts |
| inventory-server/lib/supabase/admin.ts |
| inventory-server/lib/validation.ts |
| inventory-server/docs/GET_PRODUCTS_QUERIES.md |
| inventory-server/scripts/build-with-frontend.mjs |
| inventory-server/scripts/check-auth-await.mjs |
| inventory-server/scripts/deploy-low-stock-alert.sh |
| inventory-server/sentry.client.config.ts |
| inventory-server/sentry.edge.config.ts |
| inventory-server/sentry.server.config.ts |
| inventory-server/supabase/functions/low-stock-alert/index.ts |
| inventory-server/supabase/functions/send-receipt/index.ts |
| sentry.client.config.ts |
| src/components/RealtimeSyncIndicator.tsx |
| src/contexts/PresenceContext.tsx |
| src/contexts/RealtimeContext.tsx |
| src/hooks/useDashboardQuery.ts |
| src/hooks/useInventoryRealtime.ts |
| src/lib/dashboardApi.ts |
| src/lib/idbErrorRecovery.ts |
| src/lib/imageResize.js |
| src/lib/onUnauthorized.ts |
| src/lib/queryClient.ts |
| src/lib/queryKeys.ts |
| src/lib/receiptTemplate.ts |
| src/lib/stockConstants.ts |
| src/lib/supabase.ts |
| src/lib/warehouseId.ts |
| src/services/reportsApi.ts |
| src/services/salesSyncService.ts |
| scripts/analyze-supabase-vercel.mjs |
| scripts/guard-uncommitted.mjs |
| RECOVERY_STEPS.md |

---

## Copied — B. DIFFERENT CODE (95 files)

| File |
|------|
| .gitignore |
| deploy_vercel.sh, find-api-endpoints.sh, fix_git.sh, test-api.sh, test-cors-and-login.sh, test-existing-api.sh |
| playwright.config.ts, vite.config.ts, tsconfig.json, tsconfig.node.json |
| scripts/ci-inventory-invariants.mjs |
| public/service-worker.js |
| inventory-server/.gitignore, ENV_SETUP.md, INVENTORY_DURABILITY.md, RBAC_AUDIT_AND_ENFORCEMENT.md, SERVER_ERROR_500.md |
| inventory-server/app/admin/api/login/route.ts, logout/route.ts, me/route.ts, products/route.ts, bulk/route.ts |
| inventory-server/app/api/auth/login/route.ts, logout/route.ts, user/route.ts |
| inventory-server/app/api/dashboard/route.ts, today-by-warehouse/route.ts |
| inventory-server/app/api/health/route.ts, inventory/deduct/route.ts |
| inventory-server/app/api/orders/route.ts, [id]/cancel/route.ts, deduct/route.ts, return-stock/route.ts |
| inventory-server/app/api/products/route.ts |
| inventory-server/app/api/reports/sales/route.ts, sales/void/route.ts |
| inventory-server/app/api/size-codes/route.ts, stock-movements/route.ts, stores/route.ts |
| inventory-server/app/api/sync-rejections/route.ts, [id]/void/route.ts |
| inventory-server/app/api/test/route.ts, transactions/route.ts, warehouses/route.ts |
| inventory-server/lib/api/productByIdHandlers.ts |
| inventory-server/lib/data/dashboardStats.ts, sizeCodes.ts, userScopes.ts |
| inventory-server/lib/supabase.ts |
| inventory-server/middleware.ts (EDK domains replaced with Hunnid — see below) |
| inventory-server/next-env.d.ts, next.config.js, tsconfig.json |
| inventory-server/docs/archive/DEPLOY_AND_VERIFY_405.md |
| inventory-server/supabase/migrations/ (7 files) |
| inventory-server/supabase/scripts/README.md, backfill_warehouse_inventory_from_by_size.sql, phase3_seed_one_store.sql, seed_one_product.sql, seed_stores_warehouses_dc_maintown.sql, seed_super_admin_scope.sql, verify_user_scopes.sql |
| src/__tests__/offline/performance.bench.test.js, syncService.offline.test.js |
| src/lib/circuit.ts, dashboardStats.test.ts, dashboardStats.ts, errorMessages.ts, imageUpload.ts, initErrorHandlers.ts, offlineDb.ts, utils.test.ts, utils.ts, INVENTORY_FLOW_AND_AUTHORITY.md |
| src/services/reportService.ts, salesApi.ts, syncService.conflict.test.js, syncService.js |
| src/types/index.ts, permissions.ts |
| src/utils/logger.d.ts, logger.js |
| src/contexts/InventoryContext.integration.test.tsx |
| src/pages/DashboardPage.test.tsx, InventoryPage.test.tsx, Inventory ui ux prompt guide·MD |
| src/db/inventoryDB.d.ts |
| src/hooks/useInventory.js |

---

## Skipped — EDK brand refs (move to Step 4 MIXED)

| File | Reason |
|------|--------|
| src/components/layout/MobileBottomNav.tsx | Comment "EDK mobile bottom tab bar" |
| src/components/layout/MoreMenuSheet.tsx | Barlow Condensed, --edk-ink |
| inventory-server/lib/data/inventory.ts | Comment references extremedeptkidz.com |

---

## Fixed after copy

| File | Change |
|------|--------|
| inventory-server/middleware.ts | Replaced EDK default origins/suffixes with Hunnid (warehouse.hunnidofficial.com, hunnidofficial.com). Logic unchanged. |

---

## Not copied (protected)

All paths in `SYNC_PROTECTED_FILES.md` were skipped (e.g. .env*, vercel.json, package.json, index.html, tailwind.config.js, manifest.json, defaultCredentials.ts, posPasswords.ts, cors.ts, session.ts, sales/route.ts, products/[...id]/route.ts, warehouseProducts.ts, and all MIXED components/pages/contexts).

---

**Total copied:** 142+ files (47 from C-only + 95 from B. DIFFERENT).  
**Skipped for Step 4:** 3 files.
