-- Per-recipient job duration for COUPLE/simultaneous bookings.
--
-- PROBLEM: jobs.duration_minutes is written as NEW.duration (the booking-level duration) for
-- EVERY job in sync_booking_to_job()'s per-recipient loop, and bookings.duration is only
-- recipient 0's value (packages/supabase/src/services/bookingService.ts sets it from
-- services.find(s => s.recipient_index === 0)). The customer wizard lets the two recipients pick
-- DIFFERENT durations (BookingWizard.tsx: selectedDuration vs person2Duration), so recipient 2's
-- job can carry recipient 1's duration. The staff complete-gate reads
-- `total_duration_minutes || duration_minutes` (StaffDashboard.tsx), so a 120-min service would
-- unlock "เสร็จสิ้นงาน" at minute 60 — the gate fires at HALF the real duration.
--
-- Verified on prod 2026-07-16: all 4 existing couple bookings have equal per-recipient durations
-- (120/120), so NO existing row is wrong today. This is a LATENT bug — it fires the first time a
-- couple picks unequal durations, which the UI already allows.
--
-- WHY A SEPARATE TRIGGER instead of editing sync_booking_to_job():
--   1. sync_booking_to_job() on PROD is OWNED BY THE UNMERGED P5 BRANCH — the live body (4639
--      chars) reads booking_addons and sets v_commission_per_recipient, which exist only in
--      feature/p5-addon-options. A CREATE OR REPLACE authored from THIS branch's newest copy
--      (20260630120000) would DELETE that live P5 logic from production. This trigger touches a
--      different object entirely, so P5 can merge later with no collision.
--   2. It catches BOTH job-creation paths: the customer path (sync_booking_to_job, fired by
--      create_job_from_confirmed_booking AFTER UPDATE when payment_status→'paid') AND the hotel
--      path (the server's createJobsFromBooking, which never runs that trigger). A fix inside
--      sync_booking_to_job() would silently miss every hotel couple booking.
--
-- DATA SAFETY: BEFORE INSERT only — it can never modify, delete, or even read an existing job
-- row. Existing data is untouched by design. If the lookup finds nothing it leaves the incoming
-- value as-is (fail-safe: it can only ever correct a value, never blank one).
--
-- ROLLBACK: DROP TRIGGER set_job_duration_per_recipient ON public.jobs;

CREATE OR REPLACE FUNCTION public.set_job_duration_per_recipient()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_duration integer;
BEGIN
  -- Only a couple/simultaneous booking can disagree per recipient; single bookings are correct
  -- already and are left completely alone (their booking_services.recipient_index may be legacy).
  IF COALESCE(NEW.total_jobs, 1) <= 1 OR NEW.job_index IS NULL OR NEW.booking_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- The documented mapping: jobs.job_index is 1-based, booking_services.recipient_index is 0-based
  -- (same as StaffJobDetail.tsx: recipientIndex = (job.job_index ?? 1) - 1).
  -- SUM because a booking may carry several services for one recipient (P5 multi-service);
  -- is_extension rows are excluded — extensions belong to total_duration_minutes, not the base.
  SELECT SUM(bs.duration)
    INTO v_duration
  FROM booking_services bs
  WHERE bs.booking_id = NEW.booking_id
    AND bs.recipient_index = NEW.job_index - 1
    AND COALESCE(bs.is_extension, FALSE) = FALSE;

  -- Fail-safe: only ever overwrite with a real, positive value.
  IF v_duration IS NOT NULL AND v_duration > 0 THEN
    NEW.duration_minutes := v_duration;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_job_duration_per_recipient ON public.jobs;
CREATE TRIGGER set_job_duration_per_recipient
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  WHEN (COALESCE(NEW.total_jobs, 1) > 1)
  EXECUTE FUNCTION public.set_job_duration_per_recipient();

COMMENT ON FUNCTION public.set_job_duration_per_recipient() IS
  'Couple bookings: set jobs.duration_minutes from the recipient''s OWN booking_services rows (recipient_index = job_index-1) instead of the booking-level duration. Additive by design so it never collides with sync_booking_to_job(), which the P5 branch owns.';
