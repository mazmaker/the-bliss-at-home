-- PART47 P20: add Korean (kr) + Japanese (jp) localized name/description columns to the customer-facing
-- catalog tables, mirroring the existing _cn columns added in 20260629141453_add_cn_columns_*.
--
-- Additive + nullable + IF NOT EXISTS: no data change, no NOT NULL, no default → safe/idempotent on prod.
-- The i18n language CODES are 'kr'/'jp' (NOT ISO 'ko'/'ja') so they equal the column suffix; pickLang(row,
-- field, lang) = row[`${field}_${lang}`], so a mismatch would silently fall back to _en everywhere.
--
-- services/promotions/service_addons get name + description (they already have description_cn);
-- skills + booking_addons get name only (no description_* column exists).
--
-- Applied + verified on prod 2026-07-21 (all 5 tables carry the columns; snap trigger copies kr/jp).

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS name_kr text,
  ADD COLUMN IF NOT EXISTS name_jp text,
  ADD COLUMN IF NOT EXISTS description_kr text,
  ADD COLUMN IF NOT EXISTS description_jp text;

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS name_kr text,
  ADD COLUMN IF NOT EXISTS name_jp text,
  ADD COLUMN IF NOT EXISTS description_kr text,
  ADD COLUMN IF NOT EXISTS description_jp text;

ALTER TABLE public.service_addons
  ADD COLUMN IF NOT EXISTS name_kr text,
  ADD COLUMN IF NOT EXISTS name_jp text,
  ADD COLUMN IF NOT EXISTS description_kr text,
  ADD COLUMN IF NOT EXISTS description_jp text;

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS name_kr text,
  ADD COLUMN IF NOT EXISTS name_jp text;

ALTER TABLE public.booking_addons
  ADD COLUMN IF NOT EXISTS name_kr text,
  ADD COLUMN IF NOT EXISTS name_jp text;

-- Extend the booking_addons BEFORE-INSERT snapshot trigger to also capture kr/jp
-- (only the two NEW.name_kr/jp lines are added vs the live definition).
CREATE OR REPLACE FUNCTION public.snap_booking_addon()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE sa public.service_addons%ROWTYPE;
BEGIN
  SELECT * INTO sa FROM public.service_addons WHERE id = NEW.addon_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'snap_booking_addon: service_addon % not found', NEW.addon_id;
  END IF;
  NEW.price_per_unit := sa.price;
  NEW.total_price    := sa.price * COALESCE(NEW.quantity, 1);
  NEW.name_th := sa.name_th;
  NEW.name_en := sa.name_en;
  NEW.name_cn := sa.name_cn;
  NEW.name_kr := sa.name_kr;
  NEW.name_jp := sa.name_jp;
  RETURN NEW;
END $function$;
