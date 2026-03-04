# Backup and restore runbook (Supabase)

## 1. Supabase project backups

- **Dashboard:** Supabase project → **Settings** → **Backups** (or **Database** → **Backups**).
- **PITR (Point-in-Time Recovery):** If enabled, you can restore to any second within the retention window (Pro plan). Use for accidental deletes or bad migrations.
- **Daily backups:** Supabase runs full backups; retention depends on plan. Use for full-project restore.

**Action:** Enable PITR if on Pro (or equivalent). Confirm backup schedule and retention in the dashboard.

---

## 2. Restore from PITR (Pro)

1. Supabase Dashboard → **Database** → **Backups** → **Point in time**.
2. Choose **Restore to a new project** (or same project if supported).
3. Select the target time (e.g. just before a bad migration).
4. Restore creates a new project; update API env (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) to point to the new project, then redeploy the API.

**Note:** Restoring to the same project overwrites data; prefer “restore to new project” and switch env to the new project.

---

## 3. Restore from daily backup

1. Dashboard → **Backups** → select a backup.
2. Follow Supabase docs for your plan (e.g. restore to new project or replace).
3. After restore, point API env to the restored project and redeploy.

---

## 4. Verify after restore

1. Run `GET /api/health` — should return 200 and `db: "ok"` when Supabase is reachable.
2. Log in as admin; confirm warehouses, products, and recent sales are present.
3. Run `inventory-server/supabase/scripts/verify_user_scopes.sql` (or equivalent) to confirm user_scopes.

---

## 5. Application-level backup (optional)

The app does not run scheduled DB dumps. For an extra safety net:

- Use **Supabase scheduled backups** (dashboard or plan).
- Optionally add a cron (e.g. GitHub Actions or external) that runs `pg_dump` via Supabase connection string and stores the dump in secure storage. Prefer Supabase’s built-in backups first.
