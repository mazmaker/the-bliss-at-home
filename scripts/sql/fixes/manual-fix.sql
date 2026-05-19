-- ========================================
-- Manual Extension Fixes - Apply via Supabase Dashboard SQL Editor
-- ========================================

-- Step 1: Fix RPC Function Compatibility
-- Drop existing function first (as hinted by the error)
DROP FUNCTION IF EXISTS get_pending_extension_acknowledgments(uuid);

-- Create alias function for backward compatibility
CREATE OR REPLACE FUNCTION get_pending_extension_acknowledgments(staff_profile_id UUID)
RETURNS TABLE (
  acknowledgment_id UUID,
  booking_service_id UUID,
  job_id UUID,
  service_name TEXT,
  customer_name TEXT,
  duration INTEGER,
  price DECIMAL(10,2),
  extended_at TIMESTAMP,
  booking_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ea.id as acknowledgment_id,
    ea.booking_service_id,
    j.id as job_id,
    j.service_name,
    j.customer_name,
    bs.duration::INTEGER,
    bs.price,
    bs.created_at as extended_at,
    b.booking_number
  FROM extension_acknowledgments ea
  JOIN booking_services bs ON bs.id = ea.booking_service_id
  JOIN bookings b ON b.id = bs.booking_id
  JOIN jobs j ON j.booking_id = b.id
  WHERE j.staff_id = staff_profile_id
  AND ea.acknowledged_at IS NULL
  AND bs.is_extension = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Fix Commission Calculation
-- Drop and recreate calculate_job_totals with correct commission
DROP FUNCTION IF EXISTS calculate_job_totals(UUID);

CREATE OR REPLACE FUNCTION calculate_job_totals(job_id UUID)
RETURNS TABLE (
  total_earnings DECIMAL(10,2),
  total_duration INTEGER
) AS $$
DECLARE
  job_booking_id UUID;
  base_earnings DECIMAL(10,2);
  base_duration INTEGER;
  extension_earnings DECIMAL(10,2) DEFAULT 0;
  extension_duration INTEGER DEFAULT 0;
BEGIN
  -- Get job details
  SELECT booking_id, staff_earnings, duration_minutes
  INTO job_booking_id, base_earnings, base_duration
  FROM jobs
  WHERE id = job_id;

  -- Calculate extension totals with 30% commission for staff
  SELECT
    COALESCE(SUM(bs.price * 0.30), 0),
    COALESCE(SUM(bs.duration), 0)
  INTO extension_earnings, extension_duration
  FROM booking_services bs
  WHERE bs.booking_id = job_booking_id
  AND bs.is_extension = TRUE;

  -- Return totals (base staff earnings + 30% commission from extensions)
  RETURN QUERY SELECT
    COALESCE(base_earnings, 0) + extension_earnings,
    COALESCE(base_duration, 0) + extension_duration;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update all job totals with correct calculations
DO $$
DECLARE
  job_record RECORD;
  calc_earnings DECIMAL(10,2);
  calc_duration INTEGER;
BEGIN
  FOR job_record IN SELECT id FROM jobs LOOP
    SELECT total_earnings, total_duration
    INTO calc_earnings, calc_duration
    FROM calculate_job_totals(job_record.id);

    UPDATE jobs
    SET
      total_staff_earnings = calc_earnings,
      total_duration_minutes = calc_duration,
      updated_at = NOW()
    WHERE id = job_record.id;
  END LOOP;
END $$;

-- Step 4: Verification query
SELECT
  'Extension Fix Results:' as status,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN total_staff_earnings IS NOT NULL THEN 1 END) as jobs_with_totals,
  COUNT(CASE WHEN total_staff_earnings > staff_earnings THEN 1 END) as jobs_with_extensions,
  ROUND(AVG(CASE WHEN total_staff_earnings > staff_earnings THEN total_staff_earnings - staff_earnings ELSE 0 END), 2) as avg_extension_commission
FROM jobs;