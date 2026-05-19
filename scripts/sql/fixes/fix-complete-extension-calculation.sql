-- ========================================
-- Complete Fix: Use ACTUAL commission rates from services table
-- Apply this in Supabase SQL Editor
-- ========================================

-- Step 1: Create function that uses ACTUAL service commission rates
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

  -- Calculate extension totals with ACTUAL commission rates from services table
  -- Note: staff_commission_rate is stored as decimal (0.25 = 25%), not percentage (25)
  SELECT
    COALESCE(SUM(bs.price * s.staff_commission_rate), 0),
    COALESCE(SUM(bs.duration), 0)
  INTO extension_earnings, extension_duration
  FROM booking_services bs
  JOIN services s ON s.id = bs.service_id
  WHERE bs.booking_id = job_booking_id
  AND bs.is_extension = TRUE;

  -- Debug output
  RAISE NOTICE 'Job %: base=฿%, ext=฿% (% mins), total=฿%',
    job_id, base_earnings, extension_earnings, extension_duration,
    (COALESCE(base_earnings, 0) + extension_earnings);

  -- Return totals (base staff earnings + actual commission from extensions)
  RETURN QUERY SELECT
    COALESCE(base_earnings, 0) + extension_earnings,
    COALESCE(base_duration, 0) + extension_duration;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create function to update single job totals
CREATE OR REPLACE FUNCTION update_job_totals(job_id UUID)
RETURNS VOID AS $$
DECLARE
  calc_earnings DECIMAL(10,2);
  calc_duration INTEGER;
BEGIN
  -- Calculate totals using actual commission rates
  SELECT total_earnings, total_duration
  INTO calc_earnings, calc_duration
  FROM calculate_job_totals(job_id);

  -- Update job record
  UPDATE jobs
  SET
    total_staff_earnings = calc_earnings,
    total_duration_minutes = calc_duration,
    updated_at = NOW()
  WHERE id = job_id;

  RAISE NOTICE 'Updated job % totals: earnings=฿%, duration=% mins',
               job_id, calc_earnings, calc_duration;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger function for automatic updates
CREATE OR REPLACE FUNCTION trigger_update_job_totals_on_extension()
RETURNS TRIGGER AS $$
DECLARE
  affected_job_id UUID;
BEGIN
  -- Only process extensions
  IF NEW.is_extension = TRUE THEN
    -- Find the job for this booking
    SELECT id INTO affected_job_id
    FROM jobs
    WHERE booking_id = NEW.booking_id
    LIMIT 1;

    IF affected_job_id IS NOT NULL THEN
      -- Update job totals with actual commission rates
      PERFORM update_job_totals(affected_job_id);

      RAISE NOTICE 'Extension added: updated job % for booking %',
                   affected_job_id, NEW.booking_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger
DROP TRIGGER IF EXISTS trigger_job_totals_on_extension ON booking_services;
CREATE TRIGGER trigger_job_totals_on_extension
  AFTER INSERT OR UPDATE ON booking_services
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_job_totals_on_extension();

-- Step 5: Fix the specific job mentioned
DO $$
BEGIN
  RAISE NOTICE 'Fixing specific job: b2884b43-f59e-4756-a463-f9f2106430cc';
  PERFORM update_job_totals('b2884b43-f59e-4756-a463-f9f2106430cc');
END $$;

-- Step 6: Fix ALL jobs with extensions (in case others are broken too)
DO $$
DECLARE
  job_record RECORD;
  job_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Updating ALL jobs with proper commission calculation...';

  FOR job_record IN
    SELECT DISTINCT j.id
    FROM jobs j
    JOIN booking_services bs ON bs.booking_id = j.booking_id
    WHERE bs.is_extension = TRUE
  LOOP
    PERFORM update_job_totals(job_record.id);
    job_count := job_count + 1;
  END LOOP;

  RAISE NOTICE 'Updated % jobs with extensions', job_count;
END $$;

-- Step 7: Verification - Show actual commission rates being used
SELECT
  'Service Commission Rates' as info,
  s.id as service_id,
  s.staff_commission_rate as commission_percent,
  COUNT(bs.id) as extension_count,
  ROUND(AVG(bs.price), 2) as avg_customer_price,
  ROUND(AVG(bs.price * s.staff_commission_rate), 2) as avg_staff_commission
FROM services s
JOIN booking_services bs ON bs.service_id = s.id
WHERE bs.is_extension = TRUE
GROUP BY s.id, s.staff_commission_rate
ORDER BY s.id;

-- Step 8: Verify the specific job
SELECT
  'Job Verification' as info,
  j.id,
  j.service_name,
  j.staff_earnings as base_earnings,
  j.total_staff_earnings as total_earnings,
  j.duration_minutes as base_duration,
  j.total_duration_minutes as total_duration,
  j.status
FROM jobs j
WHERE j.id = 'b2884b43-f59e-4756-a463-f9f2106430cc';