-- Security: revoke record_sale from anon so only authenticated and service_role can call it.
-- The API uses service_role; direct Supabase client with anon key cannot record sales.

REVOKE EXECUTE ON FUNCTION record_sale(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid) FROM anon;
