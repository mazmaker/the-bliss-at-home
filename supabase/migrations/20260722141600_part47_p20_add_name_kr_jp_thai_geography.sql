-- PART47 P20 (งานที่ 2): Korean + Japanese localization for the Thai address dropdowns.
-- Add nullable name_kr / name_jp columns to the 3 geography reference tables so the customer
-- app's ThaiAddressFields pickLang() can render province/district/subdistrict names in
-- 한국어 / 日本語 (falls back to name_en, then name_th when null).
--
-- Mirrors 20260705120000_part47_p2_add_name_cn_thai_geography.sql (the proven name_cn pass).
-- The language CODES are 'kr'/'jp' (NOT ISO 'ko'/'ja') so they equal the column suffix;
-- pickLang(row, field, lang) = row[`${field}_${lang}`], so a mismatch silently falls back to _en.
--
-- The name_kr/name_jp VALUES (8,441 rows each: 77 provinces = standard exonyms,
-- 928 districts + 7,436 subdistricts = phonetic transliteration into Hangul / Katakana) are
-- seeded separately as a one-time prod data operation. This migration is the SCHEMA change only.
--
-- Applied + verified on prod 2026-07-22 (all 3 tables carry both columns).

ALTER TABLE public.thai_provinces    ADD COLUMN IF NOT EXISTS name_kr text;
ALTER TABLE public.thai_provinces    ADD COLUMN IF NOT EXISTS name_jp text;
ALTER TABLE public.thai_districts    ADD COLUMN IF NOT EXISTS name_kr text;
ALTER TABLE public.thai_districts    ADD COLUMN IF NOT EXISTS name_jp text;
ALTER TABLE public.thai_subdistricts ADD COLUMN IF NOT EXISTS name_kr text;
ALTER TABLE public.thai_subdistricts ADD COLUMN IF NOT EXISTS name_jp text;
