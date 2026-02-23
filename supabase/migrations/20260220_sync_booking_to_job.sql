-- Migration: Sync Booking to Job
-- Description: Auto-create job record when booking is created
-- This ensures Staff App can see jobs from Customer bookings
-- Version: 20260220

-- ============================================
-- 1. Create function to sync booking to job
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

  -- Insert job record
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. Create trigger for new bookings
-- ============================================

DROP TRIGGER IF EXISTS create_job_from_booking ON bookings;

CREATE TRIGGER create_job_from_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_to_job();

-- ============================================
-- 3. Create function to sync booking updates to job
-- ============================================

CREATE OR REPLACE FUNCTION sync_booking_update_to_job()
RETURNS TRIGGER AS $$
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
  UPDATE jobs
  SET
    scheduled_date = NEW.booking_date,
    scheduled_time = NEW.booking_time,
    staff_id = v_staff_profile_id,
    status = CASE
      WHEN NEW.status = 'cancelled' THEN 'cancelled'::job_status
      WHEN NEW.status = 'confirmed' AND v_staff_profile_id IS NOT NULL THEN 'confirmed'::job_status
      WHEN NEW.status = 'pending' THEN 'pending'::job_status
      WHEN NEW.status = 'in_progress' THEN 'in_progress'::job_status
      WHEN NEW.status = 'completed' THEN 'completed'::job_status
      ELSE status -- Keep existing status
    END,
    updated_at = NOW()
  WHERE booking_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Create trigger for booking updates
-- ============================================

DROP TRIGGER IF EXISTS update_job_from_booking ON bookings;

CREATE TRIGGER update_job_from_booking
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (
    OLD.booking_date IS DISTINCT FROM NEW.booking_date OR
    OLD.booking_time IS DISTINCT FROM NEW.booking_time OR
    OLD.staff_id IS DISTINCT FROM NEW.staff_id OR
    OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION sync_booking_update_to_job();

-- ============================================
-- 5. Backfill: Create jobs for existing bookings without jobs
-- ============================================

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
)
SELECT
  b.id as booking_id,
  c.profile_id as customer_id,
  b.hotel_id,
  COALESCE(c.full_name, 'Customer') as customer_name,
  c.phone as customer_phone,
  h.name_th as hotel_name,
  b.hotel_room_number as room_number,
  COALESCE(b.address, '') as address,
  b.latitude,
  b.longitude,
  COALESCE(s.name_th, 'Service') as service_name,
  s.name_en as service_name_en,
  b.duration as duration_minutes,
  b.booking_date as scheduled_date,
  b.booking_time as scheduled_time,
  b.final_price as amount,
  COALESCE(b.staff_earnings, 0) as staff_earnings,
  CASE
    WHEN b.status = 'cancelled' THEN 'cancelled'::job_status
    WHEN b.status = 'completed' THEN 'completed'::job_status
    WHEN b.status = 'in_progress' THEN 'in_progress'::job_status
    WHEN b.status = 'confirmed' THEN 'confirmed'::job_status
    ELSE 'pending'::job_status
  END as status,
  b.customer_notes,
  b.created_at,
  b.updated_at
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
LEFT JOIN services s ON s.id = b.service_id
LEFT JOIN hotels h ON h.id = b.hotel_id
WHERE NOT EXISTS (
  SELECT 1 FROM jobs j WHERE j.booking_id = b.id
)
AND b.status NOT IN ('cancelled');

-- ============================================
-- Done!
-- ============================================

COMMENT ON FUNCTION sync_booking_to_job() IS 'Auto-creates job record when booking is created';
COMMENT ON FUNCTION sync_booking_update_to_job() IS 'Syncs booking updates to job record';

SELECT 'Migration completed: Booking-Job sync triggers created!' as status;
