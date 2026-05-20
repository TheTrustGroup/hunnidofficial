-- ============================================================
-- STEP 1 — HUNNID OFFICIAL: Find every version of record_sale
-- Run this in Hunnid Official Supabase SQL Editor. Paste full output.
-- ============================================================

SELECT 
  p.oid,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_identity_arguments(p.oid) AS identity_args,
  pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'record_sale'
ORDER BY p.oid;

-- ============================================================
-- STEP 4 — EDK: List record_sale overloads (run in EDK Supabase)
-- If 2+ rows, same duplicate fix needed. If 1 row, only fix payment constraint.
-- ============================================================
-- SELECT 
--   proname,
--   pg_get_function_arguments(oid) AS arguments
-- FROM pg_proc
-- WHERE proname = 'record_sale'
--   AND pronamespace = 'public'::regnamespace;

-- ============================================================
-- STEP 5 — EDK: Inspect payment_method constraint (run in EDK)
-- ============================================================
-- SELECT 
--   conname,
--   pg_get_constraintdef(oid) AS definition
-- FROM pg_constraint
-- WHERE conname = 'sales_payment_method_check'
--   AND conrelid = 'sales'::regclass;
