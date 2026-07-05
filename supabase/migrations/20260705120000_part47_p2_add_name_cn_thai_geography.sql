-- PART47 P2 (D2b): Chinese localization for the Thai address dropdowns.
-- Add a nullable name_cn column to the 3 geography reference tables so the customer
-- app's ThaiAddressFields pickLang() can render province/district/subdistrict names in
-- 中文 (falls back to name_en, then name_th when null).
--
-- The name_cn VALUES (8,441 rows: 77 provinces = standard Chinese exonyms,
-- 928 districts + 7,436 subdistricts = phonetic transliteration) were seeded separately
-- as a one-time prod data operation (pre-change snapshot in backups/2026-07-05-geo-pre-namecn/).
-- This migration is the SCHEMA change only.

ALTER TABLE public.thai_provinces    ADD COLUMN IF NOT EXISTS name_cn text;
ALTER TABLE public.thai_districts    ADD COLUMN IF NOT EXISTS name_cn text;
ALTER TABLE public.thai_subdistricts ADD COLUMN IF NOT EXISTS name_cn text;
