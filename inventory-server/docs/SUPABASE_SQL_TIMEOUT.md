# Supabase SQL timeout — what it means and what to do

## Symptom

SQL Editor or MCP shows:

`Connection terminated due to connection timeout`  
or Postgres log: `canceling statement due to statement timeout`

## Important: inventory list no longer needs the heavy view migration

From commit `6290738` onward, **GET /api/products** uses a **paginated join** on `warehouse_inventory` + `warehouse_products` (no `v_products_inventory` update required).

Deploy the latest **inventory-server** on Vercel — that fixes the 504 / slow product list for go-live.

## If SQL Editor still times out on simple queries

1. **Test connectivity** — run only:
   ```sql
   SELECT 1 AS ok;
   ```
   If this times out, the database session is stuck or overloaded (not your SQL syntax).

2. **Supabase Dashboard** → **Project Settings** → **Database**:
   - Check **Database health** / restart if offered
   - Confirm project is not **Paused**
   - On free tier, avoid running large `CREATE VIEW` scripts with subqueries on full tables

3. **Kill long queries** (Dashboard → **Reports** or SQL):
   ```sql
   SELECT pid, state, query_start, left(query, 80) AS query
   FROM pg_stat_activity
   WHERE datname = current_database() AND state != 'idle'
   ORDER BY query_start;
   ```

4. **Increase timeout** (paid plans): Database settings → statement timeout. Default SQL Editor cap is often ~8s.

## Do not run (unless support asks)

The old `20260520180000_products_list_view_fast_path.sql` view definition with a `jsonb_agg` subquery per row can exceed the editor timeout on large catalogs. It is **not required** for the app after the join-path API fix.
