-- Remove ambiguous record_sale text overload.
-- Keeping only jsonb-based record_sale (and record_sale_impl) prevents PostgREST
-- from returning PGRST203 when resolving function candidates.

DROP FUNCTION IF EXISTS record_sale(
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  uuid,
  text,
  uuid
);
