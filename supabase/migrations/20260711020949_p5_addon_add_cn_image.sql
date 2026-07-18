-- P5 Phase A (A1): add localized Chinese + image columns to public.service_addons
-- Brings service_addons to parity with the `services` table (name_cn / description_cn / image_url).
--
-- Safety: ADDITIVE & backward-compatible. All three columns are NULLABLE, no existing code
-- writes them, and select('*') consumers simply read NULL. The table is empty (0 rows) at apply
-- time, so there is no data to backfill or lose.
--
-- Rollback:
--   ALTER TABLE public.service_addons
--     DROP COLUMN name_cn, DROP COLUMN description_cn, DROP COLUMN image_url;
--
-- Branch: feature/p5-addon-options (NOT deployed). Committed for git<->prod parity — the add-on
-- tables previously had NO create/alter migration in this repo (they existed only on prod).

ALTER TABLE public.service_addons
  ADD COLUMN IF NOT EXISTS name_cn        text,
  ADD COLUMN IF NOT EXISTS description_cn text,
  ADD COLUMN IF NOT EXISTS image_url      text;
