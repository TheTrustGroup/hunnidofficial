-- RLS for user_scopes and warehouses so the frontend (Supabase client with user JWT) can read only allowed rows.
-- Requires the Supabase client to have a session JWT that includes the user's email (e.g. auth.jwt()->>'email').
-- If your app uses API Bearer token only (no Supabase Auth), use GET /api/auth/current-warehouse instead; see docs below.

-- 1. user_scopes: user can only see their own scope rows (match by email)
ALTER TABLE user_scopes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_scopes_select_own" ON user_scopes;
CREATE POLICY "user_scopes_select_own" ON user_scopes
  FOR SELECT
  TO authenticated
  USING (
    LOWER(TRIM(user_email)) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
  );

-- Service role (backend) must still see all
DROP POLICY IF EXISTS "user_scopes_service_role" ON user_scopes;
CREATE POLICY "user_scopes_service_role" ON user_scopes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. warehouses: allow authenticated users to read all (needed for dropdown and names in user_scopes join)
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warehouses_select_authenticated" ON warehouses;
CREATE POLICY "warehouses_select_authenticated" ON warehouses
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "warehouses_service_role" ON warehouses;
CREATE POLICY "warehouses_service_role" ON warehouses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
