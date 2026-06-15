-- Module E / C2 follow-up: sync a job's "confirmed" (accepted) status back to its booking.
--
-- sync_job_status_to_booking() (see 20260220_sync_booking_to_job.sql) already syncs
-- staff_id and the in_progress / completed transitions, but had NO branch for the
-- pending -> confirmed transition. After the C2 fix (hotel bookings are created as
-- 'pending' instead of 'confirmed'), a booking therefore stayed 'pending' forever even
-- after a staff accepted its job (job -> 'confirmed'), because the accept is a direct
-- PATCH on the jobs table and staff cannot update bookings (RLS). This adds the missing
-- 'confirmed' branch so accepting a job advances the booking pending -> confirmed.
-- "Any job accepted -> booking confirmed", consistent with the existing in_progress rule.

CREATE OR REPLACE FUNCTION public.sync_job_status_to_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_staff_table_id UUID;
  v_current_booking_status TEXT;
  v_total_jobs INTEGER;
  v_completed_jobs INTEGER;
BEGIN
  SELECT status INTO v_current_booking_status FROM bookings WHERE id = NEW.booking_id;

  IF v_current_booking_status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Sync staff_id when a staff accepts the job (jobs.staff_id holds profiles.id;
  -- bookings.staff_id holds staff.id).
  IF NEW.staff_id IS NOT NULL AND (OLD.staff_id IS NULL OR OLD.staff_id IS DISTINCT FROM NEW.staff_id) THEN
    SELECT s.id INTO v_staff_table_id FROM staff s WHERE s.profile_id = NEW.staff_id;
    IF v_staff_table_id IS NOT NULL THEN
      UPDATE bookings SET staff_id = v_staff_table_id
      WHERE id = NEW.booking_id AND (staff_id IS NULL OR staff_id IS DISTINCT FROM v_staff_table_id);
    END IF;
  END IF;

  -- Sync status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- NEW: a job accepted -> mark the booking confirmed (only while still pending)
    IF NEW.status = 'confirmed' AND v_current_booking_status = 'pending' THEN
      UPDATE bookings SET status = 'confirmed'
      WHERE id = NEW.booking_id AND status = 'pending';

    -- ANY job starts -> booking in_progress
    ELSIF NEW.status = 'in_progress' AND v_current_booking_status <> 'in_progress' THEN
      UPDATE bookings SET status = 'in_progress' WHERE id = NEW.booking_id;

    -- ALL jobs completed -> booking completed
    ELSIF NEW.status = 'completed' THEN
      SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
      INTO v_total_jobs, v_completed_jobs
      FROM jobs WHERE booking_id = NEW.booking_id;
      IF v_total_jobs = v_completed_jobs AND v_current_booking_status <> 'completed' THEN
        UPDATE bookings SET status = 'completed' WHERE id = NEW.booking_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
