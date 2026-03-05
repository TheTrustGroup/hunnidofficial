-- ============================================================
-- DIAGNOSTIC: Run this in Supabase SQL Editor (both projects)
-- to confirm record_sale RPC exists and which overloads are present.
-- ============================================================

-- 1. RPC existence and signature
SELECT routine_name, routine_type,
       pg_get_function_identity_arguments(p.oid) AS args
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'record_sale'
ORDER BY args;

-- 2. record_sale_impl (internal) — used by record_sale wrappers
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'record_sale_impl';

-- 3. receipt_seq (required by record_sale for receipt IDs)
SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'receipt_seq';

-- 4. sale_lines.cost_price column (required by 20260306120000 record_sale_impl)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sale_lines'
  AND column_name = 'cost_price';

-- 5. warehouse_products.cost_price (record_sale_impl reads this when writing sale_lines)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'warehouse_products'
  AND column_name = 'cost_price';
