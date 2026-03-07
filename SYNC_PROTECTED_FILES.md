# Hunnid Sync — Protected Files
# These files must NEVER be overwritten

Generated from Step 2. Cross-check every copy/merge against this list. If a file is protected, do not overwrite it; for MIXED files, merge only (take EDK code, keep Hunnid brand).

---

## 1. Env and config (never touch)

- `.env`
- `.env.local`
- `.env.production`
- `.env.development`
- `.env.example`
- `.vercel/project.json`
- `vercel.json`
- `inventory-server/.env`
- `inventory-server/.env.local`
- `inventory-server/.env.production`
- `inventory-server/.env.development`
- `inventory-server/.env.example`
- `inventory-server/.env.local.example`
- `inventory-server/.vercel/project.json`
- `inventory-server/vercel.json`
- `inventory-server/supabase/config.toml`

*Nested copy (do not overwrite from EDK):*
- `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/.env.example`
- `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/.env.production`
- `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/vercel.json`
- `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/.vercel/project.json`
- `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server/.env.example`
- `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server/.env.local.example`
- `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server/vercel.json`
- `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server/.vercel/project.json`
- `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server/supabase/config.toml`

---

## 2. Vercel config (never touch)

- `.vercel/project.json`
- `vercel.json`
- `inventory-server/.vercel/project.json`
- `inventory-server/vercel.json`

---

## 3. Supabase config (never touch)

- `inventory-server/supabase/config.toml`
- `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server/supabase/config.toml`

---

## 4. Brand code (never touch)

- `src/constants/defaultCredentials.ts`
- `inventory-server/lib/auth/posPasswords.ts`
- `inventory-server/lib/cors.ts`
- `inventory-server/lib/auth/session.ts`

---

## 5. Brand assets and shell (never overwrite with EDK version)

- `index.html` — title, theme-color, Syne font, Hunnid description (merge only)
- `tailwind.config.js` — primary #5cacfa, shadows (merge only)
- `public/manifest.json` — name "Hunnid Official", theme_color #5cacfa
- `package.json` — `"name"` and project-specific fields (merge only)
- `inventory-server/package.json` — same (merge only)
- `Hunnid Official.code-workspace` — workspace definition

---

## 6. Brand content — root app (never overwrite; merge only)

*These contain "Hunnid", "hunnid", "#5CACFA", "Syne", or "hunnidofficial". Merge with EDK: take code, keep Hunnid values.*

- `src/index.css`
- `src/App.tsx`
- `src/main.tsx`
- `src/db/inventoryDB.js`
- `src/lib/api.ts`
- `src/lib/apiClient.ts`
- `src/lib/printReceipt.ts`
- `src/contexts/AuthContext.tsx`
- `src/contexts/SettingsContext.tsx`
- `src/contexts/WarehouseContext.tsx`
- `src/contexts/InventoryContext.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/InventoryPage.tsx`
- `src/pages/SalesHistoryPage.tsx`
- `src/pages/POSPage.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileMenu.tsx`
- `src/components/pos/POSHeader.tsx`
- `src/components/pos/CartBar.tsx`
- `src/components/pos/CartSheet.tsx`
- `src/components/pos/CartPanel.tsx`
- `src/components/pos/POSProductCard.tsx`
- `src/components/pos/ProductGrid.tsx`
- `src/components/pos/SaleSuccessScreen.tsx`
- `src/components/inventory/ProductCard.tsx`
- `src/components/inventory/ProductModal.tsx`
- `src/components/inventory/SizesSection.tsx`
- `src/components/settings/UserManagement.tsx`
- `src/components/ui/Toast.tsx`
- `src/components/SyncQueueModal.tsx`
- `src/components/SyncStatusBar.tsx`
- `src/components/debug/DebugPanel.tsx`
- `src/contexts/CriticalDataContext.tsx`
- `src/contexts/NetworkStatusContext.tsx`
- `src/contexts/OrderContext.tsx`
- `src/contexts/ToastContext.tsx`
- `src/config/navigation.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/DeliveriesPage.tsx`
- `src/pages/Orders.tsx`
- `src/pages/Reports.tsx`

---

## 7. Brand content — inventory-server (never overwrite; merge only)

- `inventory-server/app/api/sales/route.ts`
- `inventory-server/app/api/products/[...id]/route.ts`
- `inventory-server/lib/data/warehouseProducts.ts`

---

## 8. Hunnid-only docs and scripts (do not overwrite)

- `DEPLOY.md`
- `LOGO_DEPLOY_FIX.md`
- `PHASE2_FORENSIC_AUDIT_REPORT.md`
- `docs/HunnidOfficial_Login_Credentials.html`
- `docs/COLOR_SYSTEM.md`
- `docs/CLONE_AND_NEW_DB_VERIFICATION.md`
- `docs/DEPLOY_THEN_TEST_IN_PRODUCTION.md`
- `docs/ONBOARDING_NEW_WAREHOUSE.md`
- `docs/PERFORMANCE_OPTIMIZATIONS.md`
- `docs/ROBUSTNESS_AND_COMPLETENESS.md`
- `docs/STEP0_COMMIT_AND_PUSH.md`
- `docs/STEP3_MIGRATIONS_AND_SEEDS.md`
- `docs/STEP4_SEEDS_AND_AUTH.md`
- `docs/STEP5_ENV_AND_DEPLOY.md`
- `docs/TEST_THEN_DEPLOY.md`
- `docs/UX_OPERATIONS.md`
- `docs/VERCEL_LINK.md`
- `docs/WHY_LOGIN_PAGE_DID_NOT_SHOW.md`
- `inventory-server/supabase/scripts/STEP3_fix_record_sale_HUNNID.sql`
- `inventory-server/supabase/scripts/RUNBOOK_void_sale_idempotent.md`
- `inventory-server/docs/DEPLOY_AND_FIX_SALES_500.md`

---

## 9. Nested tree — entire path (do not overwrite)

*The folder `World-Class Warehouse Inventory & Smart POS System/warehouse-pos/` and everything under it is Hunnid-only or a duplicate tree. Do not overwrite any file there with EDK content.*

---

## Total protected

**By type (env/config/brand code):** 26 paths  
**Brand content (root + inventory-server):** 54 paths  
**Hunnid-only docs/scripts:** 21 paths  
**Nested tree:** entire directory protected  

**Total explicit paths listed:** 102+ (excluding the full nested tree).  
**Rule:** When in doubt, check this list and the Step 1 report. If a file is protected or contains Hunnid brand, do not overwrite; merge only and keep Hunnid values.
