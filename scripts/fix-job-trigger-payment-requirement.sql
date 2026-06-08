-- Fix Job Creation Trigger - Wait for Payment Confirmation
-- Description: Only create jobs AFTER payment confirmation, not immediately after booking
-- This enforces: "ถ้าตัดไม่ผ่านไม่ให้ส่งงานให้สตาฟ"
-- Version: 20260608_fix_payment_job_trigger

-- ============================================
-- Step 1: Drop existing trigger
-- ============================================

DROP TRIGGER IF EXISTS create_job_from_booking ON bookings;

-- ============================================
-- Step 2: Create new trigger that waits for payment
-- ============================================

CREATE TRIGGER create_job_from_confirmed_booking
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (
    -- Only create job when payment is confirmed
    OLD.payment_status != 'paid' AND NEW.payment_status = 'paid'
    AND NEW.status = 'confirmed'
    -- Skip hotel bookings (they handle jobs separately)
    AND NEW.is_hotel_booking != true
    -- Ensure we have customer_id
    AND NEW.customer_id IS NOT NULL
  )
  EXECUTE FUNCTION sync_booking_to_job();

-- ============================================
-- Step 3: Clean up existing invalid jobs
-- ============================================

-- Delete jobs for bookings that are not paid yet
DELETE FROM jobs
WHERE booking_id IN (
  SELECT id FROM bookings
  WHERE payment_status != 'paid'
  AND is_hotel_booking != true
  AND created_at >= '2026-06-08'  -- Only recent bookings
);

-- ============================================
-- Step 4: Update sync_booking_to_job function to be more robust
-- ============================================

CREATE OR REPLACE FUNCTION sync_booking_to_job()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_profile_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_service_name TEXT;
  v_service_name_en TEXT;
  v_hotel_name TEXT;
  v_existing_job_id UUID;
BEGIN
  -- Additional safety checks
  IF NEW.payment_status != 'paid' OR NEW.status != 'confirmed' THEN
    RAISE NOTICE 'Skipping job creation: booking not paid/confirmed: %, payment_status: %, status: %',
      NEW.id, NEW.payment_status, NEW.status;
    RETURN NEW;
  END IF;

  -- Skip job creation for hotel bookings
  IF NEW.is_hotel_booking = true THEN
    RAISE NOTICE 'Skipping job creation for hotel booking: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Only proceed if this is a paid customer booking with customer_id
  IF NEW.customer_id IS NULL THEN
    RAISE NOTICE 'Skipping job creation: no customer_id for booking: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Check if job already exists
  SELECT id INTO v_existing_job_id
  FROM jobs
  WHERE booking_id = NEW.id
  LIMIT 1;

  IF v_existing_job_id IS NOT NULL THEN
    RAISE NOTICE 'Job already exists for booking: %, job_id: %', NEW.id, v_existing_job_id;
    RETURN NEW;
  END IF;

  -- Get customer profile_id and info
  SELECT c.profile_id, c.full_name, c.phone
  INTO v_customer_profile_id, v_customer_name, v_customer_phone
  FROM customers c
  WHERE c.id = NEW.customer_id;

  -- Skip if customer not found
  IF v_customer_profile_id IS NULL THEN
    RAISE NOTICE 'Customer profile not found for customer_id: %, booking: %', NEW.customer_id, NEW.id;
    RETURN NEW;
  END IF;

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

  -- Insert job record (only for paid customer bookings)
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
    COALESCE(v_service_name, 'Service'),
    v_service_name_en,
    NEW.duration,
    NEW.booking_date,
    NEW.booking_time,
    NEW.final_price,
    COALESCE(NEW.staff_earnings, 0),
    'pending',
    NEW.customer_notes,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Job created for PAID customer booking: %, payment_status: %, status: %',
    NEW.id, NEW.payment_status, NEW.status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 5: Update function comment
-- ============================================

COMMENT ON FUNCTION sync_booking_to_job() IS 'Auto-creates job record ONLY for PAID customer bookings (payment_status=paid AND status=confirmed)';

SELECT 'Migration completed: Job trigger now waits for payment confirmation!' as status;