-- Cascade booking completion to its jobs.
--
-- Bug: when an admin marks a booking "completed" (bookings.status='completed'), the
-- booking->job trigger sync_booking_update_to_job() only cascaded date/time and the
-- 'cancelled' status. So the jobs stayed at 'confirmed', and because staff earnings are
-- counted only from status='completed' jobs (update_staff_job_stats + earningsService),
-- the staff's earnings for that booking never showed. (e.g. BK20260701-0544 / ฿800.)
--
-- Fix: add a 'completed' cascade branch mirroring the existing 'cancelled' one, so
-- completing a booking completes its non-terminal jobs (single AND couple). Recursion-safe:
-- the reverse trigger sync_job_status_to_booking() only sets the booking to 'completed'
-- when it is NOT already completed, so it no-ops when fired from this cascade.
--
-- Applied to prod rbdvlfriqjnwpxmmgisf via apply_migration on 2026-07-01.
CREATE OR REPLACE FUNCTION public.sync_booking_update_to_job()
 RETURNS trigger
 LANGUAGE plpgsql
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
