-- ============================================================
-- STEP 3 — HUNNID OFFICIAL: Fix PGRST203 (duplicate record_sale)
-- Keeps: record_sale(..., p_lines text, ...) — matches API.
-- Drops: record_sale(..., p_lines jsonb, ...) — removes ambiguity.
-- Run in Hunnid Official Supabase SQL Editor. Then verify and test a sale.
-- ============================================================

-- Drop the jsonb overload so only the text overload remains (API sends p_lines as string)
DROP FUNCTION IF EXISTS public.record_sale(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text);

-- Verify: must return exactly 1 row (text overload only)
SELECT 
  proname,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE proname = 'record_sale'
  AND pronamespace = 'public'::regnamespace
ORDER BY arguments;
