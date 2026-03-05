-- Fix 500 / PGRST203: "Could not choose the best candidate function" for record_sale.
-- API sends p_lines as a string (10 params). If both text and jsonb 10-param overloads exist,
-- Postgres cannot disambiguate. Keep only the text overload (API sends string).
-- Also drop any 11-param overloads (p_payments_breakdown) if present; payment mix is patched by API after RPC.
-- Idempotent: safe to run on Hunnid, EDK, or fresh DBs.

DROP FUNCTION IF EXISTS record_sale(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS record_sale(uuid, text, numeric, numeric, numeric, numeric, text, text, uuid, text, jsonb);
-- Resolves PGRST203: leave only text overload so API call (p_lines as string) matches exactly one function
DROP FUNCTION IF EXISTS record_sale(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text);

COMMENT ON FUNCTION record_sale(uuid, text, numeric, numeric, numeric, numeric, text, text, uuid, text) IS
  'Atomic sale with stock deduction. API sends p_lines as JSON string; only this overload should exist to avoid PGRST203.';
