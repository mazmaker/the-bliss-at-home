-- ============================================================
-- Part 1: Hotel in-app notifications on booking status change
-- ============================================================
-- Context: hotel bookings have no `customers` row (customer_id IS NULL),
-- so create_customer_notification() emits nothing for them and the hotel
-- app's /notifications page was always empty. This adds a hotel-targeted
-- notification path resolved via hotels.auth_user_id (NOT profiles.hotel_id,
-- which is NULL for hotel users).
--
-- Applied to prod (rbdvlfriqjnwpxmmgisf) via MCP apply_migration on 2026-07-09;
-- this file keeps git in sync with prod.

-- Helper: notify the HOTEL user tied to a booking.
-- Mirrors create_customer_notification, but resolves the target via
-- hotels.auth_user_id (hotel users link by auth_user_id, not profiles.hotel_id).
CREATE OR REPLACE FUNCTION public.create_hotel_notification(
  p_booking_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_hotel_auth_user_id UUID;
  v_hotel_id UUID;
  v_booking_number TEXT;
BEGIN
  SELECT h.auth_user_id, b.hotel_id, b.booking_number
  INTO v_hotel_auth_user_id, v_hotel_id, v_booking_number
  FROM bookings b
  JOIN hotels h ON h.id = b.hotel_id
  WHERE b.id = p_booking_id;

  -- Only insert if the hotel has a linked auth user (guard NULL).
  IF v_hotel_auth_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, data, is_read)
    VALUES (
      v_hotel_auth_user_id,
      p_notification_type,
      p_title,
      p_message,
      p_data || jsonb_build_object(
        'booking_id', p_booking_id,
        'booking_number', v_booking_number,
        'hotel_id', v_hotel_id
      ),
      false
    );
  END IF;
END;
$function$;

-- Trigger fn: customer block UNCHANGED; hotel block APPENDED.
CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_service_name TEXT;
  v_booking_date TEXT;
  v_booking_time TEXT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(s.name_th, s.name_en, 'บริการ') INTO v_service_name
  FROM services s WHERE s.id = NEW.service_id;

  v_booking_date := to_char(NEW.booking_date::date, 'DD/MM/YYYY');
  v_booking_time := NEW.booking_time;

  -- Customer notifications (UNCHANGED)
  CASE NEW.status
    WHEN 'confirmed' THEN
      PERFORM create_customer_notification(
        NEW.id, 'booking_confirmed', 'การจองได้รับการยืนยัน',
        format('การจอง #%s (%s) วันที่ %s เวลา %s ได้รับการยืนยันแล้ว',
               NEW.booking_number, v_service_name, v_booking_date, v_booking_time),
        jsonb_build_object('status', 'confirmed'));
    WHEN 'in_progress' THEN
      PERFORM create_customer_notification(
        NEW.id, 'booking_started', 'เริ่มให้บริการแล้ว',
        format('การจอง #%s กำลังเริ่มให้บริการ %s', NEW.booking_number, v_service_name),
        jsonb_build_object('status', 'in_progress'));
    WHEN 'completed' THEN
      PERFORM create_customer_notification(
        NEW.id, 'booking_completed', 'บริการเสร็จสิ้น',
        format('การจอง #%s เสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ The Bliss at Home', NEW.booking_number),
        jsonb_build_object('status', 'completed'));
    ELSE
      NULL;
  END CASE;

  -- Hotel notifications (NEW)
  -- Hotel bookings have no customers row, so the customer block above emits
  -- nothing for them. Notify the hotel user directly via hotels.auth_user_id.
  IF NEW.is_hotel_booking IS TRUE AND NEW.hotel_id IS NOT NULL THEN
    CASE NEW.status
      WHEN 'confirmed' THEN
        PERFORM create_hotel_notification(
          NEW.id, 'booking_confirmed', 'การจองได้รับการยืนยัน',
          format('การจอง #%s (%s) วันที่ %s เวลา %s ได้รับการยืนยันแล้ว',
                 NEW.booking_number, v_service_name, v_booking_date, v_booking_time),
          jsonb_build_object('status', 'confirmed'));
      WHEN 'in_progress' THEN
        PERFORM create_hotel_notification(
          NEW.id, 'booking_started', 'เริ่มให้บริการแล้ว',
          format('การจอง #%s กำลังเริ่มให้บริการ %s', NEW.booking_number, v_service_name),
          jsonb_build_object('status', 'in_progress'));
      WHEN 'completed' THEN
        PERFORM create_hotel_notification(
          NEW.id, 'booking_completed', 'บริการเสร็จสิ้น',
          format('การจอง #%s เสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ The Bliss at Home', NEW.booking_number),
          jsonb_build_object('status', 'completed'));
      ELSE
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$function$;
