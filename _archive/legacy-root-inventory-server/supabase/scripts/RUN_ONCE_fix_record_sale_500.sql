-- ============================================================
-- ONE-TIME FIX for POST /api/sales 500
-- "Could not choose the best candidate function" for record_sale
-- ============================================================
-- Run this ONCE in the Supabase project used by api.hunnidofficial.com
-- (Supabase Dashboard → SQL Editor → New query → Paste → Run)
-- ============================================================

-- Remove both 11-param overloads (jsonb and text for p_lines) so only 10-param versions remain
DROP FUNCTION IF EXISTS record_sale(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS record_sale(uuid, text, numeric, numeric, numeric, numeric, text, text, uuid, text, jsonb);

-- Verify: you should see exactly 2 rows (one with p_lines jsonb, one with p_lines text)
SELECT routine_name, pg_get_function_identity_arguments(p.oid) AS args
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE r.routine_schema = 'public' AND r.routine_name = 'record_sale'
ORDER BY args;
