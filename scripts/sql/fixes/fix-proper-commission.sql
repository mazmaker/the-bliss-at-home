-- Fix to use ACTUAL commission rate from services table (not hardcode)
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

  -- Calculate extension totals with ACTUAL commission rate from services table
  SELECT
    COALESCE(SUM(bs.price * (s.staff_commission_rate / 100)), 0),
    COALESCE(SUM(bs.duration), 0)
  INTO extension_earnings, extension_duration
  FROM booking_services bs
  JOIN services s ON bs.service_id = s.id
  WHERE bs.booking_id = job_booking_id
  AND bs.is_extension = TRUE;

  -- Debug output
  RAISE NOTICE 'Job %: base_earnings=%, extension_earnings=%, total=%',
    job_id, base_earnings, extension_earnings, (COALESCE(base_earnings, 0) + extension_earnings);

  -- Return totals (base staff earnings + actual commission from extensions)
  RETURN QUERY SELECT
    COALESCE(base_earnings, 0) + extension_earnings,
    COALESCE(base_duration, 0) + extension_duration;
END;
$$ LANGUAGE plpgsql;

-- Update all job totals with correct commission rates
DO $$
DECLARE
  job_record RECORD;
  calc_earnings DECIMAL(10,2);
  calc_duration INTEGER;
BEGIN
  RAISE NOTICE 'Recalculating with ACTUAL commission rates...';

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

  RAISE NOTICE 'Job totals updated with service-specific commission rates';
END $$;

-- Verification: Show commission rates being used
SELECT
  s.name as service_name,
  s.staff_commission_rate,
  COUNT(bs.*) as extension_count,
  AVG(bs.price) as avg_extension_price,
  AVG(bs.price * (s.staff_commission_rate / 100)) as avg_staff_commission
FROM services s
JOIN booking_services bs ON bs.service_id = s.id
WHERE bs.is_extension = TRUE
GROUP BY s.id, s.name, s.staff_commission_rate
ORDER BY s.name;