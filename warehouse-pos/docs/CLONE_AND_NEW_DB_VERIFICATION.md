# Clone path and new-database verification

## 1. Are we on the right path?

**Yes.** This project is a **clone of an original codebase** (formerly “Extreme Dept Kidz”), customized for **Hunnid Official**:

| What | Original (clone source) | This project (Hunnid Official) |
|------|-------------------------|---------------------------------|
| Branding | Extreme Dept Kidz | Hunnid Official |
| App domain | warehouse.extremedeptkidz.com | warehouse.hunnidofficial.com |
| Admin email | info@extremedeptkidz.com | admin@hunnidofficial.com |
| POS 1 | cashier@… (Main Store) | jcashier@hunnidofficial.com (Main Jeff) |
| POS 2 | maintown_cashier@… (Main Town) | hcashier@hunnidofficial.com (Hunnid Main) |
| Theme | Red (#ef4444) | Blue (#5cacfa) |
| Warehouse UUIDs | Same (0000…0001, 0000…0002) | Same (app and backend use these) |

The codebase has been updated so that **no runtime or config** still references the original brand, domains, or emails. You have:

- A **new GitHub repo**: [TheTrustGroup/hunnidofficial](https://github.com/TheTrustGroup/hunnidofficial)
- A **new Supabase project** (ref `ttmlclllzvydhggevkmu`)
- Migrations and seeds that target this **new, empty** database

So the path is: **clone → customize → new repo + new DB → run migrations then seeds.** That is correct.

---

## 2. Are migrations correct for a new database?

**Yes.** Migrations are **additive and order-safe** for an empty database:

- They create tables, indexes, functions, and RPCs in dependency order (products → warehouses → inventory → stores → user_scopes → size codes → sales → etc.).
- **20250209000000** inserts the default warehouse with id `00000000-0000-0000-0000-000000000001`, code `MAIN`, and name **"Main Jeff"** so the first location matches Hunnid Official from the start.
- **20250222110000_consolidate_main_store_remove_dc.sql** assumes an optional warehouse `DC` and merges it into `MAIN` then drops `DC`. On a **new** DB there is no `DC`, so those steps affect 0 rows and are safe.
- **20250222100000_clean_orphans_after_main_town_merge.sql** only deletes rows whose `warehouse_id` is not in `warehouses`. On a new DB there are no such rows; safe.

So running all migrations in the documented order on a **new** Supabase project is correct and will not assume any pre-existing data.

---

## 3. Are seeds correct for the new database?

**Yes.** Seeds are intended to run **after** all migrations on the **new** DB:

1. **seed_stores_warehouses_dc_maintown.sql**
   - Creates stores **Main Jeff** and **Hunnid Main** (if they don’t exist).
   - Ensures warehouses **MAIN** (for Main Jeff) and **MAINTOWN** (for Hunnid Main), links them to the correct stores, and creates **user_scopes** for:
     - `jcashier@hunnidofficial.com` → Main Jeff (MAIN)
     - `hcashier@hunnidofficial.com` → Hunnid Main (MAINTOWN)
   - Idempotent; safe to run multiple times.

2. **seed_super_admin_scope.sql**
   - Grants `admin@hunnidofficial.com` access to both warehouses (MAIN and MAINTOWN) so admin can use the app and POST /api/sales.
   - Idempotent; safe to run multiple times.

**Fix applied:** The seed previously used `maintown_jcashier@hunnidofficial.com` for the second POS; it now correctly uses `hcashier@hunnidofficial.com` so Hunnid Main POS login matches the backend and AuthContext.

---

## 4. Correct order on the new database

1. **Migrations** (schema only): run all files in `inventory-server/supabase/migrations/` in timestamp order (e.g. via `supabase db push` or one-by-one in SQL Editor).
2. **Seeds** (data): run in SQL Editor, in this order:
   - `seed_stores_warehouses_dc_maintown.sql`
   - `seed_super_admin_scope.sql`
3. **Auth users**: in Supabase Dashboard → Authentication → Users, create `admin@hunnidofficial.com`, `jcashier@hunnidofficial.com`, `hcashier@hunnidofficial.com` with the passwords you will use in backend env.

After that, the new database is consistent with the Hunnid Official clone and ready for the app and API.
