-- Migration: Fix Couple Booking - Create multiple jobs
-- Description: When recipient_count > 1, create multiple job records
-- Version: 20260220_fix_couple_booking_jobs

-- ============================================
-- 1. Add job_index column to jobs table
-- ============================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_index INTEGER DEFAULT 1;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_jobs INTEGER DEFAULT 1;

COMMENT ON COLUMN jobs.job_index IS 'Index of this job in a multi-therapist booking (1, 2, etc.)';
COMMENT ON COLUMN jobs.total_jobs IS 'Total number of jobs/therapists for this booking';

-- ============================================
-- 2. Replace sync_booking_to_job function
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
-- 3. Replace sync_booking_update_to_job function
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
-- 4. Recreate triggers
-- ============================================

DROP TRIGGER IF EXISTS create_job_from_booking ON bookings;
CREATE TRIGGER create_job_from_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_to_job();

DROP TRIGGER IF EXISTS update_job_from_booking ON bookings;
CREATE TRIGGER update_job_from_booking
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (
    OLD.booking_date IS DISTINCT FROM NEW.booking_date OR
    OLD.booking_time IS DISTINCT FROM NEW.booking_time OR
    OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION sync_booking_update_to_job();

-- ============================================
-- 5. Fix existing bookings with recipient_count > 1
-- ============================================

-- First, delete jobs for couple bookings that only have 1 job
DELETE FROM jobs
WHERE booking_id IN (
  SELECT b.id
  FROM bookings b
  WHERE COALESCE(b.recipient_count, 1) > 1
)
AND job_index IS NULL;

-- Then recreate jobs for couple bookings
DO $$
DECLARE
  v_booking RECORD;
  v_customer_profile_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_service_name TEXT;
  v_service_name_en TEXT;
  v_hotel_name TEXT;
  v_job_index INTEGER;
  v_earnings_per_job NUMERIC;
BEGIN
  FOR v_booking IN
    SELECT b.*,
           COALESCE(b.recipient_count, 1) as actual_recipient_count
    FROM bookings b
    WHERE COALESCE(b.recipient_count, 1) > 1
      AND b.status NOT IN ('cancelled')
      AND NOT EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.booking_id = b.id
          AND j.job_index IS NOT NULL
      )
  LOOP
    -- Get customer info
    SELECT c.profile_id, c.full_name, c.phone
    INTO v_customer_profile_id, v_customer_name, v_customer_phone
    FROM customers c
    WHERE c.id = v_booking.customer_id;

    -- Get service name
    SELECT s.name_th, s.name_en
    INTO v_service_name, v_service_name_en
    FROM services s
    WHERE s.id = v_booking.service_id;

    -- Get hotel name
    IF v_booking.hotel_id IS NOT NULL THEN
      SELECT h.name_th INTO v_hotel_name
      FROM hotels h
      WHERE h.id = v_booking.hotel_id;
    ELSE
      v_hotel_name := NULL;
    END IF;

    -- Calculate earnings per job
    v_earnings_per_job := COALESCE(v_booking.staff_earnings, 0) / v_booking.actual_recipient_count;

    -- Create jobs for each therapist
    FOR v_job_index IN 1..v_booking.actual_recipient_count LOOP
      INSERT INTO jobs (
        booking_id, customer_id, hotel_id, customer_name, customer_phone,
        hotel_name, room_number, address, latitude, longitude,
        service_name, service_name_en, duration_minutes,
        scheduled_date, scheduled_time, amount, staff_earnings,
        status, customer_notes, job_index, total_jobs, created_at, updated_at
      ) VALUES (
        v_booking.id, v_customer_profile_id, v_booking.hotel_id,
        COALESCE(v_customer_name, 'Customer'), v_customer_phone,
        v_hotel_name, v_booking.hotel_room_number,
        COALESCE(v_booking.address, ''), v_booking.latitude, v_booking.longitude,
        COALESCE(v_service_name, 'Service') || ' (หมอนวดคนที่ ' || v_job_index || '/' || v_booking.actual_recipient_count || ')',
        v_service_name_en, v_booking.duration,
        v_booking.booking_date, v_booking.booking_time,
        v_booking.final_price / v_booking.actual_recipient_count,
        v_earnings_per_job,
        CASE
          WHEN v_booking.status = 'completed' THEN 'completed'::job_status
          WHEN v_booking.status = 'in_progress' THEN 'in_progress'::job_status
          WHEN v_booking.status = 'confirmed' THEN 'pending'::job_status
          ELSE 'pending'::job_status
        END,
        v_booking.customer_notes, v_job_index, v_booking.actual_recipient_count,
        v_booking.created_at, v_booking.updated_at
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 6. Update existing single jobs to have job_index = 1
-- ============================================

UPDATE jobs
SET job_index = 1, total_jobs = 1
WHERE job_index IS NULL;

-- ============================================
-- Done!
-- ============================================

SELECT 'Migration completed: Couple booking support added!' as status;
