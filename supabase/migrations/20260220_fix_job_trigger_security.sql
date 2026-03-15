-- Migration: Fix Job Trigger Security
-- Description: Make sync_booking_to_job run with SECURITY DEFINER
-- This allows the trigger to insert jobs even when run by customers
-- Version: 20260220_fix_job_trigger_security

-- ============================================
-- 1. Update sync_booking_to_job with SECURITY DEFINER
-- ============================================

CREATE OR REPLACE FUNCTION sync_booking_to_job()
RETURNS TRIGGER
SECURITY DEFINER  -- Run with owner's privileges, not invoker's
SET search_path = public
AS $$
DECLARE
  v_customer_profile_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_service_name TEXT;
  v_service_name_en TEXT;
  v_hotel_name TEXT;
  v_recipient_count INTEGER;
  v_job_index INTEGER;
  v_earnings_per_job NUMERIC;
BEGIN
  -- Get recipient count (default to 1 for single bookings)
  v_recipient_count := COALESCE(NEW.recipient_count, 1);

  -- Calculate earnings per job (split evenly)
  v_earnings_per_job := COALESCE(NEW.staff_earnings, 0) / v_recipient_count;

  -- Get customer profile_id and info
  SELECT c.profile_id, c.full_name, c.phone
  INTO v_customer_profile_id, v_customer_name, v_customer_phone
  FROM customers c
  WHERE c.id = NEW.customer_id;

  -- Get service name
  SELECT s.name_th, s.name_en
  INTO v_service_name, v_service_name_en
  FROM services s
  WHERE s.id = NEW.service_id;

  -- Get hotel name if applicable
  IF NEW.hotel_id IS NOT NULL THEN
    SELECT h.name_th INTO v_hotel_name
    FROM hotels h
    WHERE h.id = NEW.hotel_id;
  END IF;

  -- Create job records for each therapist needed
  FOR v_job_index IN 1..v_recipient_count LOOP
    INSERT INTO jobs (
      booking_id,
      customer_id,
      hotel_id,
      customer_name,
      customer_phone,
      hotel_name,
      room_number,
      address,
      latitude,
      longitude,
      service_name,
      service_name_en,
      duration_minutes,
      scheduled_date,
      scheduled_time,
      amount,
      staff_earnings,
      status,
      customer_notes,
      job_index,
      total_jobs,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      v_customer_profile_id,
      NEW.hotel_id,
      COALESCE(v_customer_name, 'Customer'),
      v_customer_phone,
      v_hotel_name,
      NEW.hotel_room_number,
      COALESCE(NEW.address, ''),
      NEW.latitude,
      NEW.longitude,
      CASE
        WHEN v_recipient_count > 1 THEN
          COALESCE(v_service_name, 'Service') || ' (หมอนวดคนที่ ' || v_job_index || '/' || v_recipient_count || ')'
        ELSE
          COALESCE(v_service_name, 'Service')
      END,
      v_service_name_en,
      NEW.duration,
      NEW.booking_date,
      NEW.booking_time,
      NEW.final_price / v_recipient_count, -- Split amount per therapist
      v_earnings_per_job,
      'pending',
      NEW.customer_notes,
      v_job_index,
      v_recipient_count,
      NOW(),
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. Update sync_booking_update_to_job with SECURITY DEFINER
-- ============================================

CREATE OR REPLACE FUNCTION sync_booking_update_to_job()
RETURNS TRIGGER
SECURITY DEFINER  -- Run with owner's privileges
SET search_path = public
AS $$
DECLARE
  v_staff_profile_id UUID;
BEGIN
  -- Get staff profile_id if staff is assigned
  IF NEW.staff_id IS NOT NULL THEN
    SELECT s.profile_id INTO v_staff_profile_id
    FROM staff s
    WHERE s.id = NEW.staff_id;
  END IF;

  -- Update related job(s)
  -- Note: For couple bookings, staff assignment happens per-job, not per-booking
  -- So we only update date/time/status here, not staff_id
  UPDATE jobs
  SET
    scheduled_date = NEW.booking_date,
    scheduled_time = NEW.booking_time,
    status = CASE
      WHEN NEW.status = 'cancelled' THEN 'cancelled'::job_status
      WHEN NEW.status = 'completed' THEN 'completed'::job_status
      WHEN NEW.status = 'in_progress' THEN 'in_progress'::job_status
      ELSE status -- Keep existing job status for individual job management
    END,
    updated_at = NOW()
  WHERE booking_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Done!
-- ============================================

COMMENT ON FUNCTION sync_booking_to_job() IS 'Auto-creates job record(s) when booking is created. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION sync_booking_update_to_job() IS 'Syncs booking updates to job record(s). Uses SECURITY DEFINER to bypass RLS.';

SELECT 'Migration completed: Trigger functions now have SECURITY DEFINER!' as status;
