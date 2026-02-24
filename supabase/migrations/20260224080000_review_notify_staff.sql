-- Migration: Review Notification to Staff
-- Description: When a customer submits a review, create an in-app notification
-- for the staff member who provided the service.

-- ============================================
-- 1. Create function to notify staff on new review
-- ============================================

CREATE OR REPLACE FUNCTION notify_staff_on_review()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_profile_id UUID;
  v_customer_name TEXT;
  v_service_name TEXT;
  v_booking_number TEXT;
BEGIN
  -- Get staff profile_id (notifications.user_id uses profiles.id)
  SELECT s.profile_id INTO v_staff_profile_id
  FROM staff s WHERE s.id = NEW.staff_id;

  -- Get customer name
  SELECT c.full_name INTO v_customer_name
  FROM customers c WHERE c.id = NEW.customer_id;

  -- Get service name
  SELECT COALESCE(s.name_th, s.name_en) INTO v_service_name
  FROM services s WHERE s.id = NEW.service_id;

  -- Get booking number
  IF NEW.booking_id IS NOT NULL THEN
    SELECT b.booking_number INTO v_booking_number
    FROM bookings b WHERE b.id = NEW.booking_id;
  END IF;

  -- Create in-app notification for staff
  IF v_staff_profile_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, data, is_read)
    VALUES (
      v_staff_profile_id,
      'new_review',
      'ได้รับรีวิวใหม่',
      format('คุณ%s ให้คะแนน %s ดาว สำหรับบริการ %s',
        COALESCE(v_customer_name, 'ลูกค้า'),
        NEW.rating,
        COALESCE(v_service_name, 'บริการ')),
      jsonb_build_object(
        'review_id', NEW.id,
        'booking_id', NEW.booking_id,
        'booking_number', v_booking_number,
        'rating', NEW.rating,
        'customer_name', COALESCE(v_customer_name, 'ลูกค้า'),
        'service_name', COALESCE(v_service_name, 'บริการ')
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Create trigger on reviews table
-- ============================================

DROP TRIGGER IF EXISTS review_notify_staff_trigger ON reviews;

CREATE TRIGGER review_notify_staff_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_staff_on_review();

-- ============================================
-- 3. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION notify_staff_on_review TO authenticated;

COMMENT ON FUNCTION notify_staff_on_review IS
  'Creates an in-app notification for staff when a customer submits a review.';
