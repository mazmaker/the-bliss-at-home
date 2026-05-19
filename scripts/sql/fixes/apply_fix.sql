-- Apply commission fix directly
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

  -- Return totals (base staff earnings + commission from extensions)
  RETURN QUERY SELECT
    COALESCE(base_earnings, 0) + extension_earnings,
    COALESCE(base_duration, 0) + extension_duration;
END;
$$ LANGUAGE plpgsql;
