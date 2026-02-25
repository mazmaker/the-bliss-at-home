-- Fix Hotel Booking Job Trigger
-- Description: Skip job creation for hotel bookings or handle them properly
-- Version: 20260223

-- ============================================
-- Fix the sync_booking_to_job function to handle hotel bookings
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
BEGIN
  -- Skip job creation for hotel bookings (they are handled directly by hotel staff)
  IF NEW.is_hotel_booking = true THEN
    RAISE NOTICE 'Skipping job creation for hotel booking: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Only proceed if this is a regular customer booking with customer_id
  IF NEW.customer_id IS NULL THEN
    RAISE NOTICE 'Skipping job creation: no customer_id for booking: %', NEW.id;
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

  -- Insert job record (only for regular customer bookings)
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

  RAISE NOTICE 'Job created for regular customer booking: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Update the comment
-- ============================================

COMMENT ON FUNCTION sync_booking_to_job() IS 'Auto-creates job record for regular customer bookings (skips hotel bookings)';

-- ============================================
-- Test the fix
-- ============================================

SELECT 'Migration completed: Hotel booking job trigger fixed!' as status;