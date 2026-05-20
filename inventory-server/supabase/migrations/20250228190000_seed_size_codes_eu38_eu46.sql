-- Add EU38–EU46 to size_codes so products can use EU40, EU41, EU44, EU45 etc.
-- Trigger enforce_size_rules requires size_code to exist in size_codes.

insert into size_codes (size_code, size_label, size_order) values
  ('EU38', 'EU 38', 85),
  ('EU39', 'EU 39', 86),
  ('EU40', 'EU 40', 87),
  ('EU41', 'EU 41', 88),
  ('EU42', 'EU 42', 89),
  ('EU43', 'EU 43', 90),
  ('EU44', 'EU 44', 91),
  ('EU45', 'EU 45', 92),
  ('EU46', 'EU 46', 93)
on conflict (size_code) do nothing;
