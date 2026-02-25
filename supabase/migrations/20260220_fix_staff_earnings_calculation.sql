-- Migration: Fix Staff Earnings Calculation
-- Description: Calculate staff_earnings from service's staff_commission_rate
-- Version: 20260220_fix_staff_earnings_calculation

-- ============================================
-- 1. Update sync_booking_to_job to calculate staff_earnings
-- ============================================

CREATE OR REPLACE FUNCTION sync_booking_to_job()
RETURNS TRIGGER
SECURITY DEFINER
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
  v_staff_commission_rate NUMERIC;
  v_total_staff_earnings NUMERIC;
  v_earnings_per_job NUMERIC;
  v_amount_per_job NUMERIC;
BEGIN
  -- Get recipient count (default to 1 for single bookings)
  v_recipient_count := COALESCE(NEW.recipient_count, 1);

  -- Get service info including commission rate
  SELECT s.name_th, s.name_en, COALESCE(s.staff_commission_rate, 0.6)
  INTO v_service_name, v_service_name_en, v_staff_commission_rate
  FROM services s
  WHERE s.id = NEW.service_id;

  -- Calculate staff earnings
  -- If booking already has staff_earnings set, use it
  -- Otherwise calculate from commission rate
  IF COALESCE(NEW.staff_earnings, 0) > 0 THEN
    v_total_staff_earnings := NEW.staff_earnings;
  ELSE
    -- Calculate from final_price * commission_rate
    v_total_staff_earnings := COALESCE(NEW.final_price, 0) * v_staff_commission_rate;
  END IF;

  -- Calculate earnings and amount per job (split evenly for couple bookings)
  v_earnings_per_job := v_total_staff_earnings / v_recipient_count;
  v_amount_per_job := COALESCE(NEW.final_price, 0) / v_recipient_count;

  -- Get customer profile_id and info
  SELECT c.profile_id, c.full_name, c.phone
  INTO v_customer_profile_id, v_customer_name, v_customer_phone
  FROM customers c
  WHERE c.id = NEW.customer_id;

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
      v_amount_per_job,
      v_earnings_per_job,
      'pending',
      NEW.customer_notes,
      v_job_index,
      v_recipient_count,
      NOW(),
      NOW()
    );
  END LOOP;

  -- Also update the booking's staff_earnings if it was NULL
  IF COALESCE(NEW.staff_earnings, 0) = 0 AND v_total_staff_earnings > 0 THEN
    UPDATE bookings
    SET staff_earnings = v_total_staff_earnings
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. Update existing jobs with 0 earnings
-- ============================================

-- Fix existing jobs that have staff_earnings = 0
UPDATE jobs j
SET staff_earnings = j.amount * COALESCE(
  (SELECT s.staff_commission_rate FROM services s
   JOIN bookings b ON b.service_id = s.id
   WHERE b.id = j.booking_id),
  0.6
)
WHERE j.staff_earnings = 0 AND j.amount > 0;

-- ============================================
-- Done!
-- ============================================

COMMENT ON FUNCTION sync_booking_to_job() IS 'Auto-creates job record(s) when booking is created. Calculates staff_earnings from service commission rate.';

SELECT 'Migration completed: Staff earnings now calculated from service commission rate!' as status;
