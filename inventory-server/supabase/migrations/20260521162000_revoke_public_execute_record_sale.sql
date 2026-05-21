-- Tighten function execute permissions for sales RPCs.
-- PUBLIC includes anon; revoke to avoid unauthenticated invocation.

REVOKE EXECUTE ON FUNCTION public.record_sale(
  uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text, uuid
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.record_sale_impl(
  uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text, uuid
) FROM PUBLIC;
