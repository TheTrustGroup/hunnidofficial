-- Security: revoke record_sale from anon so only authenticated and service_role can call it.
-- The API uses service_role; direct Supabase client with anon key cannot record sales.
-- Idempotent: revoke each overload; ignore undefined_function (e.g. DB already has 10-param only).

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION record_sale(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION record_sale(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION record_sale(uuid, text, numeric, numeric, numeric, numeric, text, text, uuid, text) FROM anon;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
