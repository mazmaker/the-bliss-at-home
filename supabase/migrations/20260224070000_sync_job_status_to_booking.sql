-- Migration: Sync Job Status to Booking
-- Description: When staff updates job status (in_progress, completed),
-- sync back to bookings table. This makes existing customer notification
-- triggers fire automatically.

-- ============================================
-- 1. Create function to sync job status → booking
-- ============================================

CREATE OR REPLACE FUNCTION sync_job_status_to_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_table_id UUID;
  v_current_booking_status TEXT;
BEGIN
  -- Get current booking status to avoid unnecessary updates
  SELECT status INTO v_current_booking_status
  FROM bookings WHERE id = NEW.booking_id;

  -- Don't update cancelled bookings
  IF v_current_booking_status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Sync staff_id when staff accepts job (job gets staff_id assigned)
  IF NEW.staff_id IS NOT NULL AND (OLD.staff_id IS NULL OR OLD.staff_id IS DISTINCT FROM NEW.staff_id) THEN
    -- Convert profiles.id (used in jobs) → staff.id (used in bookings)
    SELECT s.id INTO v_staff_table_id
    FROM staff s WHERE s.profile_id = NEW.staff_id;

    IF v_staff_table_id IS NOT NULL THEN
      UPDATE bookings
      SET staff_id = v_staff_table_id
      WHERE id = NEW.booking_id
        AND (staff_id IS NULL OR staff_id IS DISTINCT FROM v_staff_table_id);
    END IF;
  END IF;

  -- Sync status: only in_progress and completed
  -- These cascade to existing customer notification triggers on bookings table
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'in_progress' AND v_current_booking_status != 'in_progress' THEN
      UPDATE bookings SET status = 'in_progress'
      WHERE id = NEW.booking_id;

    ELSIF NEW.status = 'completed' AND v_current_booking_status != 'completed' THEN
      UPDATE bookings SET status = 'completed'
      WHERE id = NEW.booking_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Create trigger on jobs table
-- ============================================

DROP TRIGGER IF EXISTS sync_job_to_booking_trigger ON jobs;

CREATE TRIGGER sync_job_to_booking_trigger
  AFTER UPDATE ON jobs
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.staff_id IS DISTINCT FROM NEW.staff_id
  )
  EXECUTE FUNCTION sync_job_status_to_booking();

-- ============================================
-- 3. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION sync_job_status_to_booking TO authenticated;

COMMENT ON FUNCTION sync_job_status_to_booking IS
  'Syncs job status changes back to bookings table. When staff starts/completes a job, '
  'the corresponding booking status updates automatically, triggering customer notifications.';
