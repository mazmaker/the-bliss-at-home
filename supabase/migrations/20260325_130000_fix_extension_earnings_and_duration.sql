-- ========================================
-- Fix Extension Earnings and Duration Calculation
-- Date: 2026-03-25
-- Description: Update jobs table to include extension earnings and duration
-- ========================================

-- Add columns to track extension totals in jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_staff_earnings DECIMAL(10,2) DEFAULT NULL;

-- Function to calculate total earnings and duration for a job (including extensions)
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

  -- Calculate extension totals for this booking
  SELECT
    COALESCE(SUM(bs.price), 0),
    COALESCE(SUM(bs.duration), 0)
  INTO extension_earnings, extension_duration
  FROM booking_services bs
  WHERE bs.booking_id = job_booking_id
  AND bs.is_extension = TRUE;

  -- Return totals
  RETURN QUERY SELECT
    COALESCE(base_earnings, 0) + COALESCE(extension_earnings, 0),
    COALESCE(base_duration, 0) + COALESCE(extension_duration, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update job totals
CREATE OR REPLACE FUNCTION update_job_totals(job_id UUID)
RETURNS VOID AS $$
DECLARE
  calc_earnings DECIMAL(10,2);
  calc_duration INTEGER;
BEGIN
  -- Calculate totals
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

  RAISE NOTICE 'Updated job % totals: earnings=%, duration=%',
               job_id, calc_earnings, calc_duration;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update job totals when extensions are added
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
      -- Update job totals
      PERFORM update_job_totals(affected_job_id);

      RAISE NOTICE 'Extension added: updated job % for booking %',
                   affected_job_id, NEW.booking_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for extensions
DROP TRIGGER IF EXISTS trigger_job_totals_on_extension ON booking_services;
CREATE TRIGGER trigger_job_totals_on_extension
  AFTER INSERT OR UPDATE ON booking_services
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_job_totals_on_extension();

-- Initialize totals for existing jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  RAISE NOTICE 'Initializing job totals for existing jobs...';

  FOR job_record IN
    SELECT id FROM jobs
    WHERE total_staff_earnings IS NULL OR total_duration_minutes IS NULL
  LOOP
    PERFORM update_job_totals(job_record.id);
  END LOOP;

  RAISE NOTICE 'Job totals initialization completed';
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_total_earnings
ON jobs(total_staff_earnings)
WHERE total_staff_earnings IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_total_duration
ON jobs(total_duration_minutes)
WHERE total_duration_minutes IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN jobs.total_staff_earnings IS 'Total staff earnings including extensions (calculated automatically)';
COMMENT ON COLUMN jobs.total_duration_minutes IS 'Total duration including extensions (calculated automatically)';
COMMENT ON FUNCTION calculate_job_totals(UUID) IS 'Calculates total earnings and duration for a job including extensions';
COMMENT ON FUNCTION update_job_totals(UUID) IS 'Updates job totals based on base + extension values';

-- Verification query
SELECT
  'Job Totals Update:' as status,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN total_staff_earnings IS NOT NULL THEN 1 END) as jobs_with_total_earnings,
  COUNT(CASE WHEN total_duration_minutes IS NOT NULL THEN 1 END) as jobs_with_total_duration,
  SUM(CASE WHEN total_staff_earnings > staff_earnings THEN 1 ELSE 0 END) as jobs_with_extensions
FROM jobs;