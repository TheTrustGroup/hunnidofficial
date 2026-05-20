-- One-time fix: set warehouse display names to Main Jeff / Hunnid Main (matches POS locations).
-- Run in Supabase SQL Editor if you still see "Main Store" or "Main Town" in the app or in verify_user_scopes.
-- Safe to run multiple times.

UPDATE warehouses SET name = 'Main Jeff' WHERE code = 'MAIN';
UPDATE warehouses SET name = 'Hunnid Main' WHERE code = 'MAINTOWN';
