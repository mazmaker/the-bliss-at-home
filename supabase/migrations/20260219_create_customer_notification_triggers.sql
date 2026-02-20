-- Migration: Create Customer Notification Triggers
-- This migration creates database triggers to automatically create in-app notifications
-- for customers when booking status, payment status, or staff assignment changes.

-- ============================================
-- Function to create notification for customer
-- ============================================
CREATE OR REPLACE FUNCTION create_customer_notification(
  p_booking_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'
) RETURNS VOID AS $$
DECLARE
  v_customer_profile_id UUID;
  v_booking_number TEXT;
BEGIN
  -- Get customer profile_id and booking_number
  SELECT c.profile_id, b.booking_number
  INTO v_customer_profile_id, v_booking_number
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.id = p_booking_id;

  -- Only create notification if we found the customer
  IF v_customer_profile_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, data, is_read)
    VALUES (
      v_customer_profile_id,
      p_notification_type,
      p_title,
      p_message,
      p_data || jsonb_build_object('booking_id', p_booking_id, 'booking_number', v_booking_number),
      false
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger function for booking status changes
-- ============================================
CREATE OR REPLACE FUNCTION handle_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_service_name TEXT;
  v_booking_date TEXT;
  v_booking_time TEXT;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get service name and booking details
  SELECT COALESCE(s.name_th, s.name_en, 'บริการ') INTO v_service_name
  FROM services s WHERE s.id = NEW.service_id;

  v_booking_date := to_char(NEW.booking_date::date, 'DD/MM/YYYY');
  v_booking_time := NEW.booking_time;

  -- Create notification based on new status
  CASE NEW.status
    WHEN 'confirmed' THEN
      PERFORM create_customer_notification(
        NEW.id,
        'booking_confirmed',
        'การจองได้รับการยืนยัน',
        format('การจอง #%s (%s) วันที่ %s เวลา %s ได้รับการยืนยันแล้ว',
               NEW.booking_number, v_service_name, v_booking_date, v_booking_time),
        jsonb_build_object('status', 'confirmed')
      );

    WHEN 'in_progress' THEN
      PERFORM create_customer_notification(
        NEW.id,
        'booking_started',
        'เริ่มให้บริการแล้ว',
        format('การจอง #%s กำลังเริ่มให้บริการ %s', NEW.booking_number, v_service_name),
        jsonb_build_object('status', 'in_progress')
      );

    WHEN 'completed' THEN
      PERFORM create_customer_notification(
        NEW.id,
        'booking_completed',
        'บริการเสร็จสิ้น',
        format('การจอง #%s เสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ The Bliss at Home', NEW.booking_number),
        jsonb_build_object('status', 'completed')
      );

    -- Note: 'cancelled' is handled by server API to include refund details
    ELSE
      -- Do nothing for other statuses
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger function for staff assignment
-- ============================================
CREATE OR REPLACE FUNCTION handle_staff_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_name TEXT;
  v_service_name TEXT;
  v_booking_date TEXT;
BEGIN
  -- Only proceed if staff_id actually changed (and is not null)
  IF (OLD.staff_id IS NOT DISTINCT FROM NEW.staff_id) OR NEW.staff_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get staff name
  SELECT COALESCE(name_th, name_en, 'พนักงาน') INTO v_staff_name
  FROM staff WHERE id = NEW.staff_id;

  -- Get service name and booking date
  SELECT COALESCE(s.name_th, s.name_en, 'บริการ') INTO v_service_name
  FROM services s WHERE s.id = NEW.service_id;

  v_booking_date := to_char(NEW.booking_date::date, 'DD/MM/YYYY');

  -- Create notification
  PERFORM create_customer_notification(
    NEW.id,
    'staff_assigned',
    'มอบหมายพนักงานแล้ว',
    format('การจอง #%s วันที่ %s - คุณ%s จะเป็นผู้ให้บริการ %s',
           NEW.booking_number, v_booking_date, v_staff_name, v_service_name),
    jsonb_build_object('staff_id', NEW.staff_id, 'staff_name', v_staff_name)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger function for payment status changes
-- ============================================
CREATE OR REPLACE FUNCTION handle_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_service_name TEXT;
BEGIN
  -- Only proceed if payment_status actually changed
  IF OLD.payment_status = NEW.payment_status THEN
    RETURN NEW;
  END IF;

  -- Get service name
  SELECT COALESCE(s.name_th, s.name_en, 'บริการ') INTO v_service_name
  FROM services s WHERE s.id = NEW.service_id;

  -- Create notification based on new payment status
  CASE NEW.payment_status
    WHEN 'paid' THEN
      PERFORM create_customer_notification(
        NEW.id,
        'payment_successful',
        'ชำระเงินสำเร็จ',
        format('การชำระเงินสำหรับการจอง #%s จำนวน ฿%s เสร็จสมบูรณ์',
               NEW.booking_number, to_char(NEW.final_price, 'FM999,999,999')),
        jsonb_build_object('payment_status', 'paid', 'amount', NEW.final_price)
      );

    WHEN 'failed' THEN
      PERFORM create_customer_notification(
        NEW.id,
        'payment_failed',
        'การชำระเงินไม่สำเร็จ',
        format('การชำระเงินสำหรับการจอง #%s ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', NEW.booking_number),
        jsonb_build_object('payment_status', 'failed')
      );

    -- Note: 'refunded' is handled by server API cancel route
    ELSE
      -- Do nothing for other statuses (pending, processing)
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Drop existing triggers if they exist
-- ============================================
DROP TRIGGER IF EXISTS booking_status_change_trigger ON bookings;
DROP TRIGGER IF EXISTS staff_assignment_trigger ON bookings;
DROP TRIGGER IF EXISTS payment_status_change_trigger ON bookings;

-- ============================================
-- Create triggers
-- ============================================

-- Trigger for booking status changes
CREATE TRIGGER booking_status_change_trigger
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_status_change();

-- Trigger for staff assignment
CREATE TRIGGER staff_assignment_trigger
  AFTER UPDATE OF staff_id ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_staff_assignment();

-- Trigger for payment status changes
CREATE TRIGGER payment_status_change_trigger
  AFTER UPDATE OF payment_status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_status_change();

-- ============================================
-- Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION create_customer_notification TO authenticated;
GRANT EXECUTE ON FUNCTION handle_booking_status_change TO authenticated;
GRANT EXECUTE ON FUNCTION handle_staff_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION handle_payment_status_change TO authenticated;

-- ============================================
-- Add comment for documentation
-- ============================================
COMMENT ON FUNCTION create_customer_notification IS 'Creates an in-app notification for a customer based on booking events';
COMMENT ON FUNCTION handle_booking_status_change IS 'Trigger function to create notifications when booking status changes to confirmed, in_progress, or completed';
COMMENT ON FUNCTION handle_staff_assignment IS 'Trigger function to create notification when staff is assigned to a booking';
COMMENT ON FUNCTION handle_payment_status_change IS 'Trigger function to create notification when payment status changes to paid or failed';
