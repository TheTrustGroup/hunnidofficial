-- Add half sizes (e.g. EU 38.5, 42.5) so products can use .5 sizes when recording stock.
-- Trigger enforce_size_rules requires size_code to exist in size_codes.

insert into size_codes (size_code, size_label, size_order) values
  ('EU37.5', 'EU 37.5', 84),
  ('EU38.5', 'EU 38.5', 94),
  ('EU39.5', 'EU 39.5', 95),
  ('EU40.5', 'EU 40.5', 96),
  ('EU41.5', 'EU 41.5', 97),
  ('EU42.5', 'EU 42.5', 98),
  ('EU43.5', 'EU 43.5', 99),
  ('EU44.5', 'EU 44.5', 100),
  ('EU45.5', 'EU 45.5', 101),
  ('EU46.5', 'EU 46.5', 102)
on conflict (size_code) do nothing;
