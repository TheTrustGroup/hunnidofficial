-- Restore sale line thumbnails from product catalog Storage URLs (after blob cleanup).

UPDATE public.sale_lines sl
SET product_image_url = public.sanitize_sale_line_image_url(btrim(wp.images->>0, '"'))
FROM public.warehouse_products wp
WHERE wp.id = sl.product_id
  AND (sl.product_image_url IS NULL OR btrim(sl.product_image_url) = '')
  AND wp.images IS NOT NULL
  AND jsonb_typeof(wp.images) = 'array'
  AND jsonb_array_length(wp.images) > 0
  AND btrim(wp.images->>0, '"') <> ''
  AND public.sanitize_sale_line_image_url(btrim(wp.images->>0, '"')) IS NOT NULL;
