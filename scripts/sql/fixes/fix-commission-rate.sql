-- Fix Commission Rate from 30% to 25%
-- Apply this in Supabase SQL Editor

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

  -- Calculate extension totals with 25% commission for staff (FIXED RATE)
  SELECT
    COALESCE(SUM(bs.price * 0.25), 0),
    COALESCE(SUM(bs.duration), 0)
  INTO extension_earnings, extension_duration
  FROM booking_services bs
  WHERE bs.booking_id = job_booking_id
  AND bs.is_extension = TRUE;

  -- Return totals (base staff earnings + 25% commission from extensions)
  RETURN QUERY SELECT
    COALESCE(base_earnings, 0) + extension_earnings,
    COALESCE(base_duration, 0) + extension_duration;
END;
$$ LANGUAGE plpgsql;

-- Update all job totals with correct 25% rate
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