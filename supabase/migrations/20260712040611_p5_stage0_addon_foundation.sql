-- P5 STAGE 0 — Add-on DB foundation.
--
-- GIT-HYGIENE RECONSTRUCTION (STEP D): this file reproduces prod migration
-- `20260712040611_p5_stage0_addon_foundation`, which was applied to prod out-of-band
-- on 2026-07-12 but never committed. Content is reconstructed faithfully from the live
-- prod schema (rbdvlfriqjnwpxmmgisf) + the drafting script
-- backups/2026-07-12-pre-stage0/stage0-migration-to-apply.sql (PART A).
--
-- The service_addons / booking_addons tables already existed on prod (created out-of-band),
-- so this is an ALTER-based migration, not CREATE. IF [NOT] EXISTS / DROP … IF EXISTS guards
-- keep it idempotent. Decision lock 2(ก): hard-delete of an add-on with sales history is
-- blocked at the DB (FK RESTRICT) + soft-delete in the app (service_addons.is_active).
--
-- NOTE — the "Hotels can view own booking addons" policy below is the ORIGINAL (broken)
-- version that matches bookings.hotel_id = profiles.hotel_id. profiles.hotel_id is NULL for
-- every hotel account, so this policy never matched; it is intentionally reproduced here as
-- it was applied, then DROP+CREATE-replaced with the correct hotels.auth_user_id form by
-- 20260713074158_p5_stepc_fix_hotel_booking_addons_rls. Running the migrations in order
-- reproduces the final prod state. See the hotel-multitenant-authz skill.
--
-- Rollback: drop trg_snap_booking_addon + snap_booking_addon(); revert the FK to ON DELETE
-- CASCADE; revert the UNIQUE to (booking_id, addon_id); drop recipient_index/name_th/en/cn;
-- drop the hotel SELECT policy.

-- A1. recipient_index (couple: which recipient the add-on belongs to)
ALTER TABLE public.booking_addons
  ADD COLUMN IF NOT EXISTS recipient_index integer NOT NULL DEFAULT 0;

-- A2. name snapshot (lock the add-on name at booking time; nullable → old rows live-join fallback)
ALTER TABLE public.booking_addons
  ADD COLUMN IF NOT EXISTS name_th text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_cn text;

-- A3. FK addon_id: CASCADE -> RESTRICT, KEEP THE EXACT NAME booking_addons_addon_id_fkey
--     (receipts.ts embeds by this FK name; renaming = PGRST200 500 on 3 endpoints).
--     RESTRICT = cannot hard-delete an add-on that has sales history (decision 2ก).
ALTER TABLE public.booking_addons DROP CONSTRAINT IF EXISTS booking_addons_addon_id_fkey;
ALTER TABLE public.booking_addons
  ADD CONSTRAINT booking_addons_addon_id_fkey
  FOREIGN KEY (addon_id) REFERENCES public.service_addons(id) ON DELETE RESTRICT;

-- A4. UNIQUE (booking_id, addon_id) -> (booking_id, addon_id, recipient_index)
--     couple can pick the SAME add-on for both people without a unique crash.
ALTER TABLE public.booking_addons DROP CONSTRAINT IF EXISTS booking_addons_booking_id_addon_id_key;
ALTER TABLE public.booking_addons
  ADD CONSTRAINT booking_addons_booking_id_addon_id_recipient_index_key
  UNIQUE (booking_id, addon_id, recipient_index);

-- A5. BEFORE-INSERT price/name snapshot trigger (server-authoritative = anti-tamper).
--     Client sends only {addon_id, quantity, recipient_index}; price/total/names come from catalog.
--     search_path is pinned by the next migration (20260712040752).
CREATE OR REPLACE FUNCTION public.snap_booking_addon()
RETURNS trigger LANGUAGE plpgsql AS $fn$
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
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_snap_booking_addon ON public.booking_addons;
CREATE TRIGGER trg_snap_booking_addon
  BEFORE INSERT ON public.booking_addons
  FOR EACH ROW EXECUTE FUNCTION public.snap_booking_addon();

-- A6. Hotel READ path (ORIGINAL, broken — fixed later by 20260713074158). Reproduced as applied.
DROP POLICY IF EXISTS "Hotels can view own booking addons" ON public.booking_addons;
CREATE POLICY "Hotels can view own booking addons" ON public.booking_addons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE b.id = booking_addons.booking_id
        AND p.role = 'HOTEL'
        AND b.hotel_id = p.hotel_id
    )
  );
