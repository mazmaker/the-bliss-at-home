-- ========================================
-- Fix Extension Commission Calculation
-- Date: 2026-03-25 15:00
-- Description: Fix staff earnings calculation to use commission rate, not full customer price
-- ========================================

-- Drop existing function and recreate with correct commission calculation
DROP FUNCTION IF EXISTS calculate_job_totals(UUID);

-- Function to calculate total earnings and duration for a job (including extensions with proper commission)
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

  -- Calculate extension totals with proper staff commission
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

  -- Return totals (base staff earnings + commission from extensions)
  RETURN QUERY SELECT
    COALESCE(base_earnings, 0) + extension_earnings,
    COALESCE(base_duration, 0) + extension_duration;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON FUNCTION calculate_job_totals(UUID) IS 'Calculates total staff earnings (base + extension commissions) and duration for a job';

-- Recalculate all existing job totals with correct commission
DO $$
DECLARE
  job_record RECORD;
BEGIN
  RAISE NOTICE 'Recalculating job totals with correct commission rates...';

  FOR job_record IN
    SELECT id FROM jobs
  LOOP
    PERFORM update_job_totals(job_record.id);
  END LOOP;

  RAISE NOTICE 'Job totals recalculation completed';
END $$;

-- Verification: Show before/after comparison
SELECT
  'Commission Fix Results:' as status,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN total_staff_earnings IS NOT NULL THEN 1 END) as jobs_with_totals,
  ROUND(AVG(CASE WHEN total_staff_earnings > staff_earnings THEN total_staff_earnings - staff_earnings ELSE 0 END), 2) as avg_extension_commission
FROM jobs;