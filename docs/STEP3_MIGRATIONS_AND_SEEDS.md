# Step 3: Run migrations and seeds on the new Supabase project

**Prerequisites:** You have created a Supabase project and saved Project URL, anon key, and service_role key (Step 2).  
**Goal:** Apply all schema migrations, then seed stores/warehouses and admin scope.

---

## 3.1 Project reference ID

This project’s reference ID: **`ttmlclllzvydhggevkmu`** (already used in the commands below).  
To find it elsewhere: Supabase Dashboard → your project → **Settings** → **General** → **Reference ID**.

---

## 3.2 Option A — Supabase CLI (recommended)

### Install Supabase CLI (one-time)

```bash
# Option 1: macOS (Homebrew)
brew install supabase/tap/supabase

# Option 2: Use npx (no global install; run from inventory-server)
# npx supabase@latest <command>
```

If you use npx, run every `supabase` command as `npx supabase@latest ...` from `inventory-server`.  
Other install options: [Supabase CLI — Getting started](https://supabase.com/docs/guides/cli/getting-started#install-the-cli).

### Log in to Supabase CLI (one-time)

```bash
supabase login
# or: npx supabase@latest login
```

This opens a browser to get an access token. Required before `link` or `db push`.

### Link and push migrations

From the **inventory-server** directory (the one that contains `supabase/migrations`):

```bash
# If your repo root is warehouse-pos:
cd inventory-server

# If your repo root is HunnidOfficial and you have the full folder structure:
# cd "World-Class Warehouse Inventory & Smart POS System/warehouse-pos/inventory-server"

supabase link --project-ref ttmlclllzvydhggevkmu
# If using npx: npx supabase@latest link --project-ref ttmlclllzvydhggevkmu
```

When prompted, enter your Supabase **database password** (the one you set when creating the project).  
Then:

```bash
supabase db push
# If using npx: npx supabase@latest db push
```

Apply all migrations. If any fail, fix the reported migration file and run `supabase db push` again.

---

## 3.3 Option B — SQL Editor (no CLI)

If you prefer not to use the CLI, run each migration file in **Supabase Dashboard → SQL Editor** in this **exact order** (one file per run, top to bottom):

1. `20250204000000_create_warehouse_products.sql`
2. `20250209000000_warehouses_and_scoped_inventory.sql`
3. `20250209100000_atomic_deduct_inventory.sql`
4. `20250209200000_transactions_and_stock_movements.sql`
5. `20250209300000_order_return_inventory.sql`
6. `20250209400000_phase2_transactions_observability.sql`
7. `20250209500000_phase3_stores_and_scope.sql`
8. `20250209600000_phase4_offline_idempotency.sql`
9. `20250211000000_size_codes_and_inventory_by_size.sql`
10. `20250211010000_seed_size_codes_kids_infant.sql`
11. `20250211020000_allow_custom_size_codes.sql`
12. `20250213000000_atomic_product_inventory_rpc.sql`
13. `20250213100000_indexes_products_category.sql`
14. `20250218100000_get_products_with_sizes_rpc.sql`
15. `20250219000000_fix_update_atomic_empty_by_size_quantity.sql`
16. `20250219100000_enforce_size_kind_consistency_trigger.sql`
17. `20250219200000_seed_size_codes_eu23_eu37.sql`
18. `20250219210000_seed_size_codes_eu20_eu22.sql`
19. `20250219300000_warehouse_inventory_indexes_and_unique.sql`
20. `20250220100000_snapshot_inventory_by_size.sql`
21. `20250222040000_create_durability_log.sql`
22. `20250222040001_create_v_products_inventory_view.sql`
23. `20250222100000_clean_orphans_after_main_town_merge.sql`
24. `20250222110000_consolidate_main_store_remove_dc.sql`
25. `20250222120000_sales_and_record_sale.sql`
26. `20250222130000_master_sql_v2.sql`
27. `20250222140000_drop_record_sale_v1_overload.sql`
28. `20250222150000_record_sale_single_overload.sql`
29. `20250222160000_product_images_5mb_limit.sql`

Path from repo root: `warehouse-pos/inventory-server/supabase/migrations/<filename>`.

---

## 3.4 Run seed scripts (after migrations)

Seeds are **not** applied by `supabase db push`. Run them manually in **SQL Editor**, in this order:

### 1. Seed stores and warehouses (and POS user_scopes)

**File:** `warehouse-pos/inventory-server/supabase/scripts/seed_stores_warehouses_dc_maintown.sql`

- Creates stores **Main Jeff** and **Hunnid Main** and their warehouses (MAIN, MAINTOWN).
- Inserts `user_scopes` for `jcashier@hunnidofficial.com` (Main Jeff) and `hcashier@hunnidofficial.com` (Hunnid Main).
- Idempotent; safe to run more than once.

### 2. Seed super admin scope

**File:** `warehouse-pos/inventory-server/supabase/scripts/seed_super_admin_scope.sql`

- Grants `admin@hunnidofficial.com` access to both warehouses so admin can use the app and POST /api/sales.
- Idempotent; safe to run more than once.

---

## 3.5 Verify

Run in SQL Editor:

**File:** `warehouse-pos/inventory-server/supabase/scripts/verify_user_scopes.sql`

Expected result:

- `jcashier@hunnidofficial.com` → store **Main Jeff**, warehouse **Main Jeff** (code MAIN).
- `hcashier@hunnidofficial.com` → store **Hunnid Main**, warehouse **Hunnid Main** (code MAINTOWN).

---

## 3.6 Create auth users (Supabase Auth)

Migrations and seeds only create **application** data (stores, warehouses, `user_scopes`). You must create the **auth users** in Supabase:

1. **Authentication** → **Users** → **Add user** (or **Invite**).
2. Create:
   - `admin@hunnidofficial.com` — set password (store it securely).
   - `jcashier@hunnidofficial.com` — password must match `POS_PASSWORD_CASHIER_MAIN_STORE` in backend env.
   - `hcashier@hunnidofficial.com` — password must match `POS_PASSWORD_MAIN_TOWN` in backend env.

After Step 4 (env vars) and Step 6 (deploy), log in with these users to smoke-test.
