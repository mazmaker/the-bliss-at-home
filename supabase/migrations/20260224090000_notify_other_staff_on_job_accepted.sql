-- Migration: Notify Other Staff When Job is Accepted
-- Description: When a staff member accepts a pending job, create in-app
-- notifications for all other available staff to inform them the job is taken.

-- ============================================
-- 1. Create function to notify other staff
-- ============================================

CREATE OR REPLACE FUNCTION notify_other_staff_on_job_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_accepting_staff_name TEXT;
BEGIN
  -- Only fire when job status changes from 'pending' to 'confirmed'
  -- and staff_id is newly assigned
  IF OLD.status != 'pending' OR NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  IF NEW.staff_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the name of the staff who accepted
  SELECT COALESCE(p.full_name, 'พนักงาน') INTO v_accepting_staff_name
  FROM profiles p WHERE p.id = NEW.staff_id;

  -- Insert notifications for all OTHER available staff
  INSERT INTO notifications (user_id, type, title, message, data, is_read)
  SELECT
    s.profile_id,
    'job_accepted',
    'งานถูกรับแล้ว',
    format('งาน "%s" วันที่ %s เวลา %s ถูกรับโดย %s แล้ว',
      COALESCE(NEW.service_name, 'บริการ'),
      NEW.scheduled_date::text,
      COALESCE(to_char(NEW.scheduled_time, 'HH24:MI'), ''),
      v_accepting_staff_name),
    jsonb_build_object(
      'job_id', NEW.id,
      'booking_id', NEW.booking_id,
      'service_name', COALESCE(NEW.service_name, 'บริการ'),
      'scheduled_date', NEW.scheduled_date::text,
      'scheduled_time', NEW.scheduled_time::text,
      'accepted_by', v_accepting_staff_name
    ),
    false
  FROM staff s
  WHERE s.is_available = true
    AND s.status = 'active'
    AND s.profile_id IS NOT NULL
    AND s.profile_id != NEW.staff_id;  -- Exclude the staff who accepted

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Create trigger on jobs table
-- ============================================

DROP TRIGGER IF EXISTS notify_other_staff_job_accepted_trigger ON jobs;

CREATE TRIGGER notify_other_staff_job_accepted_trigger
  AFTER UPDATE OF status ON jobs
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'confirmed')
  EXECUTE FUNCTION notify_other_staff_on_job_accepted();

-- ============================================
-- 3. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION notify_other_staff_on_job_accepted TO authenticated;

COMMENT ON FUNCTION notify_other_staff_on_job_accepted IS
  'Notifies all other available staff via in-app notification when a job is accepted by one staff member.';
