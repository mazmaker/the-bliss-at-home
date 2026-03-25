-- ========================================
-- Staff Notification for Extend Session
-- Date: 2026-03-24
-- Description: Auto-create notifications when booking is extended
-- ========================================

-- Create function to notify staff when booking is extended
CREATE OR REPLACE FUNCTION notify_staff_booking_extended()
RETURNS TRIGGER AS $$
DECLARE
  staff_profile_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only process extension services
  IF NEW.is_extension = TRUE THEN

    -- Get staff profile_id from booking
    SELECT s.profile_id INTO staff_profile_id
    FROM bookings b
    JOIN staff s ON b.staff_id = s.id
    WHERE b.id = NEW.booking_id;

    -- Skip if no staff assigned
    IF staff_profile_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Create notification message
    notification_title := 'การจองได้รับการเพิ่มเวลา';
    notification_message := FORMAT(
      'การจอง %s ได้รับการเพิ่มเวลา %s นาที (฿%s) จากโรงแรม',
      (SELECT booking_number FROM bookings WHERE id = NEW.booking_id),
      NEW.duration,
      NEW.price::TEXT
    );

    -- Insert notification for staff
    INSERT INTO staff_notifications (
      staff_profile_id,
      type,
      title,
      message,
      related_booking_id,
      data,
      created_at
    ) VALUES (
      staff_profile_id,
      'job_updated',
      notification_title,
      notification_message,
      NEW.booking_id,
      jsonb_build_object(
        'extension_type', 'booking_extended',
        'additional_duration', NEW.duration,
        'additional_price', NEW.price,
        'extended_at', NEW.extended_at
      ),
      NOW()
    );

    RAISE NOTICE 'Staff notification created for booking extension: %', NEW.booking_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on booking_services for extensions
DROP TRIGGER IF EXISTS trigger_notify_staff_booking_extended ON booking_services;
CREATE TRIGGER trigger_notify_staff_booking_extended
  AFTER INSERT ON booking_services
  FOR EACH ROW
  EXECUTE FUNCTION notify_staff_booking_extended();

-- Add index for staff notifications queries
CREATE INDEX IF NOT EXISTS idx_staff_notifications_profile_type
ON staff_notifications(staff_profile_id, type, created_at DESC);

-- Add helpful comment
COMMENT ON FUNCTION notify_staff_booking_extended() IS 'Automatically notify staff when their booking gets extended by hotel';

RAISE NOTICE 'Staff booking extension notification system enabled ✅';