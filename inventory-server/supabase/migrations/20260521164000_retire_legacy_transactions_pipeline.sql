DO $$
DECLARE
  v_transactions bigint;
  v_transaction_items bigint;
  v_stock_movements bigint;
BEGIN
  SELECT count(*) INTO v_transactions FROM public.transactions;
  SELECT count(*) INTO v_transaction_items FROM public.transaction_items;
  SELECT count(*) INTO v_stock_movements FROM public.stock_movements;

  IF v_transactions > 0 OR v_transaction_items > 0 OR v_stock_movements > 0 THEN
    RAISE EXCEPTION 'Legacy pipeline has data (transactions=%, transaction_items=%, stock_movements=%). Aborting drop.',
      v_transactions, v_transaction_items, v_stock_movements;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.process_sale(uuid, jsonb, jsonb, uuid, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.process_sale(uuid, jsonb, jsonb, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.process_sale(uuid, jsonb, jsonb);

DROP TABLE IF EXISTS public.stock_movements;
DROP TABLE IF EXISTS public.transaction_items;
DROP TABLE IF EXISTS public.transactions;
