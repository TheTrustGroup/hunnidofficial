-- Hardening marker: SECURITY DEFINER functions must not grant EXECUTE to anon/authenticated/PUBLIC.
-- From this migration onward, any new SECURITY DEFINER must include:
--   REVOKE EXECUTE ON FUNCTION ... FROM anon, authenticated, PUBLIC;
--   GRANT EXECUTE ON FUNCTION ... TO service_role;
-- See 20250228140000_revoke_record_sale_anon.sql for existing revokes.
-- No schema changes here; this file satisfies CI invariant (scripts/ci-inventory-invariants.mjs).

SELECT 1;
