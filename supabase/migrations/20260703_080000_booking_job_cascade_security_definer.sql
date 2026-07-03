-- Fix: booking->job cascade silently updated 0 rows for non-owner completers.
--
-- Root cause (verified on prod rbdvlfriqjnwpxmmgisf, 2026-07-03):
--   sync_booking_update_to_job() ran as SECURITY INVOKER, so its `UPDATE jobs ...`
--   was subject to the jobs RLS policy "Staff can update jobs"
--   (qual: staff_id = auth.uid() OR (status='pending' AND staff_id IS NULL)).
--   When a NON-owner completes/cancels a booking — e.g. an admin via the client
--   (apps/admin updateBooking → supabase.from('bookings').update(), authenticated
--   role) — the cascade's UPDATE matched 0 job rows (RLS filtered, no error). The
--   jobs stayed 'confirmed', and since staff earnings are counted only from
--   status='completed' jobs (update_staff_job_stats), the staff's earnings never
--   showed. Smoking gun: couple booking BK20260701-0562 had the owner-completed
--   job done but the partner's job stuck at 'confirmed'.
--
-- Fix: SECURITY DEFINER so the cascade runs as the function owner (postgres), which
--   owns the jobs table (relforcerowsecurity=false) and therefore bypasses RLS.
--   Body is byte-for-byte identical to the prior version — only the two lines
--   SECURITY DEFINER + SET search_path are added. Covers BOTH the 'completed' and
--   'cancelled' cascade branches (same function).
-- Recursion-safe: the reverse trigger sync_job_status_to_booking() only sets the
--   booking to 'completed'/'cancelled' when it is not already, so it no-ops here.

CREATE OR REPLACE FUNCTION public.sync_booking_update_to_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
BEGIN
  -- Update date/time for all jobs
  IF OLD.booking_date IS DISTINCT FROM NEW.booking_date
     OR OLD.booking_time IS DISTINCT FROM NEW.booking_time THEN
    UPDATE jobs
    SET
      scheduled_date = NEW.booking_date,
      scheduled_time = NEW.booking_time,
      updated_at = NOW()
    WHERE booking_id = NEW.id;
  END IF;

  -- Cascade cancellation to all non-terminal jobs (admin/system cancel)
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' THEN
    UPDATE jobs
    SET
      status = 'cancelled'::job_status,
      updated_at = NOW()
    WHERE booking_id = NEW.id
      AND status NOT IN ('completed', 'cancelled');
  END IF;

  -- Cascade completion to all non-terminal jobs (admin marks the booking "completed").
  -- Without this an admin "เสร็จสิ้น" left jobs at 'confirmed', so the staff's earnings
  -- (which count only status='completed' jobs) never showed. Safe from recursion: the
  -- job->booking trigger sync_job_status_to_booking() only sets the booking to 'completed'
  -- when it is NOT already completed, so it no-ops when fired from here.
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    UPDATE jobs
    SET
      status = 'completed'::job_status,
      completed_at = COALESCE(completed_at, NOW()),
      updated_at = NOW()
    WHERE booking_id = NEW.id
      AND status NOT IN ('completed', 'cancelled');
  END IF;

  RETURN NEW;
END;
$function$;
