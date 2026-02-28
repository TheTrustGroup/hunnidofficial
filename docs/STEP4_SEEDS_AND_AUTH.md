# Step 4: Seeds and auth (after db push)

Run in this exact order. Do not skip or reorder.

---

## Part A — Seed data (Supabase SQL Editor)

**1. Open Supabase**  
Dashboard → your project (ref `ttmlclllzvydhggevkmu`) → **SQL Editor**.

**2. Run seed 1: stores and warehouses + POS scopes**  
- Click **New query**.
- Paste the **entire** contents of:  
  `warehouse-pos/inventory-server/supabase/scripts/seed_stores_warehouses_dc_maintown.sql`
- Click **Run** (or Cmd+Enter).
- Expect: no error; message like “Success. No rows returned” or row counts.

**3. Run seed 2: super admin scope**  
- **New query** again.
- Paste the **entire** contents of:  
  `warehouse-pos/inventory-server/supabase/scripts/seed_super_admin_scope.sql`
- Click **Run**.
- Expect: no error.

**4. (Optional) Verify scopes**  
- **New query**.
- Paste the **entire** contents of:  
  `warehouse-pos/inventory-server/supabase/scripts/verify_user_scopes.sql`
- Click **Run**.
- Expect: 4 rows — `jcashier@hunnidofficial.com` (Main Jeff, MAIN), `hcashier@hunnidofficial.com` (Hunnid Main, MAINTOWN), `admin@hunnidofficial.com` (Main Jeff, MAIN), `admin@hunnidofficial.com` (Hunnid Main, MAINTOWN).

---

## Part B — Auth users (Supabase Auth)

**5. Open Authentication**  
Dashboard → **Authentication** → **Users**.

**6. Create three users**  
For each, click **Add user** (or **Invite**), then:

| # | Email | Password | Notes |
|---|--------|----------|--------|
| 1 | `admin@hunnidofficial.com` | *(your chosen admin password)* | Must match backend `ALLOWED_ADMIN_EMAILS` / admin login. |
| 2 | `jcashier@hunnidofficial.com` | *(e.g. same value as env `POS_PASSWORD_CASHIER_MAIN_STORE`)* | Main Jeff POS. |
| 3 | `hcashier@hunnidofficial.com` | *(e.g. same value as env `POS_PASSWORD_MAIN_TOWN`)* | Hunnid Main POS. |

- Use **Create user** (or send invite and set password when they accept).
- Record the three passwords in your password manager and in backend env (Step 5 runbook).

**7. Done**  
Seeds and auth are ready. Next: set env vars (frontend + backend) and deploy (Step 5/6).
