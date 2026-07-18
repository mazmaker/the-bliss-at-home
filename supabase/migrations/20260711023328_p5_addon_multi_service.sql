-- P5 Phase A (multi-service): let one add-on link to MANY services + an "applies to all" flag.
-- Replaces the single-service model (service_addons.service_id) with:
--   service_ids    uuid[]  -- explicit list of linked services
--   applies_to_all boolean -- true = attached to EVERY service (incl. future ones)
-- The legacy `service_id` column is intentionally KEPT (now unused by the new UI/read) to stay
-- additive & reversible; it is simply NULL on all new rows.
--
-- Safety: ADDITIVE. Both columns NOT NULL with defaults ('{}' / false); the table is empty
-- (0 rows) at apply time, so no backfill/data loss.
--
-- Rollback:
--   ALTER TABLE public.service_addons DROP COLUMN service_ids, DROP COLUMN applies_to_all;
--
-- Branch: feature/p5-addon-options (NOT deployed).

ALTER TABLE public.service_addons
  ADD COLUMN IF NOT EXISTS service_ids    uuid[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applies_to_all boolean NOT NULL DEFAULT false;
