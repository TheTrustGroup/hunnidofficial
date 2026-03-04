# Onboarding a new warehouse / client location

Precise runbook to add a new store and warehouse so cashiers can use the POS for that location. Assumes the same Supabase project and API (single tenant, multiple locations).

---

## 1. Database: add store and warehouse

Run in **Supabase SQL Editor** (or add a migration and run `supabase db push`).

### 1.1 Create store (optional but recommended)

```sql
INSERT INTO stores (id, name, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'Your Store Name', 'active', now(), now())
ON CONFLICT DO NOTHING;
```

Note the store `id` (or query it: `SELECT id FROM stores WHERE name = 'Your Store Name' LIMIT 1`).

### 1.2 Create warehouse

```sql
INSERT INTO warehouses (id, name, code, store_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Your Warehouse Display Name',
  'UNIQUE_CODE',   -- e.g. STORE2, BRANCH_A — must be unique
  (SELECT id FROM stores WHERE name = 'Your Store Name' LIMIT 1),
  now(),
  now()
);
```

Get the warehouse `id`: `SELECT id, name, code FROM warehouses WHERE code = 'UNIQUE_CODE'`.

---

## 2. User scopes: assign cashiers (and admin) to the new warehouse

For each user who should operate at this location, add a row to `user_scopes`:

```sql
INSERT INTO user_scopes (user_email, store_id, warehouse_id, created_at)
SELECT
  'cashier@example.com',
  s.id,
  w.id,
  now()
FROM stores s
JOIN warehouses w ON w.store_id = s.id AND w.code = 'UNIQUE_CODE'
WHERE s.name = 'Your Store Name'
  AND NOT EXISTS (
    SELECT 1 FROM user_scopes us
    WHERE us.user_email = 'cashier@example.com'
      AND us.store_id = s.id AND us.warehouse_id = w.id
  );
```

Repeat for each cashier/manager email. For admin access to the new warehouse:

```sql
INSERT INTO user_scopes (user_email, store_id, warehouse_id, created_at)
SELECT
  'admin@yourcompany.com',
  s.id,
  w.id,
  now()
FROM stores s
JOIN warehouses w ON w.store_id = s.id AND w.code = 'UNIQUE_CODE'
WHERE s.name = 'Your Store Name'
  AND NOT EXISTS (
    SELECT 1 FROM user_scopes us
    WHERE us.user_email = 'admin@yourcompany.com'
      AND us.warehouse_id = w.id
  );
```

---

## 3. Auth users (Supabase Dashboard)

In **Supabase → Authentication → Users**, create (or ensure) a user for each cashier:

- Email: same as in `user_scopes` (e.g. `cashier@example.com`)
- Password: set and communicate securely

If using **app login** (not Supabase Magic Link), ensure the backend has the POS password env for that email if required (see `ENV_SETUP.md`: `POS_PASSWORD_*` per account).

---

## 4. Backend env (if using per-cashier POS passwords)

If the API uses fixed POS passwords per email (e.g. `POS_PASSWORD_CASHIER_MAIN_STORE`), add a new env var for the new location’s cashier(s) and document the mapping. Otherwise, rely on Supabase Auth or your auth provider.

---

## 5. Product inventory for the new warehouse

New warehouse has no rows in `warehouse_inventory` or `warehouse_inventory_by_size` until you add them:

- **Option A:** Copy from an existing warehouse (run a one-off script that inserts into `warehouse_inventory` / `warehouse_inventory_by_size` for the new `warehouse_id` from a source warehouse).
- **Option B:** Let admins add/adjust stock via the app (Inventory page, select the new warehouse and set quantities).

No migration is required for products: `warehouse_products` is global; quantity is per warehouse in `warehouse_inventory` and `warehouse_inventory_by_size`.

---

## 6. Verify

1. **Scopes:** Run `inventory-server/supabase/scripts/verify_user_scopes.sql` (or equivalent) and confirm the new emails have the new store/warehouse.
2. **Login:** Log in as a cashier for the new location; confirm the warehouse selector shows only the assigned warehouse(s) (or the single warehouse if bound).
3. **POS:** Create a test sale at the new warehouse; confirm POST /api/sales succeeds and stock deducts.

---

## Summary checklist

| Step | Action |
|------|--------|
| 1 | Insert into `stores` (name, status). |
| 2 | Insert into `warehouses` (name, code, store_id). |
| 3 | Insert into `user_scopes` (user_email, store_id, warehouse_id) for each cashier and admin. |
| 4 | Create Auth users in Supabase for each cashier. |
| 5 | Set backend POS password env (if applicable). |
| 6 | Populate inventory for the new warehouse (copy or manual). |
| 7 | Verify scopes and test login + one sale. |

Same codebase and API serve all locations; only data (stores, warehouses, user_scopes, inventory) and env (if any) change per onboarding.
