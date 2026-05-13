-- ========================================
-- Add total_staff_earnings column if not exists
-- Date: 2026-05-13 15:00
-- Description: Ensure total_staff_earnings column exists in jobs table for extension earnings tracking
-- ========================================

-- Add total_staff_earnings column to jobs table if it doesn't exist
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'jobs'
        AND column_name = 'total_staff_earnings'
        AND table_schema = 'public'
    ) THEN
        -- Add the column
        ALTER TABLE jobs ADD COLUMN total_staff_earnings DECIMAL(10,2) DEFAULT NULL;

        -- Add comment
        COMMENT ON COLUMN jobs.total_staff_earnings IS 'Total staff earnings including extensions (base + extension earnings)';

        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_jobs_total_staff_earnings
        ON jobs(total_staff_earnings)
        WHERE total_staff_earnings IS NOT NULL;

        RAISE NOTICE 'Added total_staff_earnings column to jobs table';
    ELSE
        RAISE NOTICE 'total_staff_earnings column already exists in jobs table';
    END IF;

    -- Also add total_duration_minutes if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'jobs'
        AND column_name = 'total_duration_minutes'
        AND table_schema = 'public'
    ) THEN
        -- Add the column
        ALTER TABLE jobs ADD COLUMN total_duration_minutes INTEGER DEFAULT NULL;

        -- Add comment
        COMMENT ON COLUMN jobs.total_duration_minutes IS 'Total service duration including extensions (base + extension duration)';

        RAISE NOTICE 'Added total_duration_minutes column to jobs table';
    ELSE
        RAISE NOTICE 'total_duration_minutes column already exists in jobs table';
    END IF;
END $$;

-- Function to update job totals based on booking services
CREATE OR REPLACE FUNCTION update_job_totals(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
    v_booking_id UUID;
    v_base_earnings DECIMAL(10,2);
    v_base_duration INTEGER;
    v_total_earnings DECIMAL(10,2) := 0;
    v_total_duration INTEGER := 0;
BEGIN
    -- Get job details
    SELECT booking_id, staff_earnings, duration_minutes
    INTO v_booking_id, v_base_earnings, v_base_duration
    FROM jobs
    WHERE id = p_job_id;

    IF v_booking_id IS NULL THEN
        RAISE NOTICE 'Job % not found', p_job_id;
        RETURN;
    END IF;

    -- Calculate total duration from all booking services
    SELECT COALESCE(SUM(duration), 0)
    INTO v_total_duration
    FROM booking_services
    WHERE booking_id = v_booking_id;

    -- For staff earnings: use base staff_earnings for now (fixed amount system)
    -- Extension earnings will be calculated separately in the application
    v_total_earnings := COALESCE(v_base_earnings, 0);

    -- Update the job record
    UPDATE jobs
    SET
        total_duration_minutes = v_total_duration,
        total_staff_earnings = v_total_earnings,
        updated_at = NOW()
    WHERE id = p_job_id;

    RAISE NOTICE 'Updated job % totals: duration=%, earnings=%', p_job_id, v_total_duration, v_total_earnings;
END;
$$ LANGUAGE plpgsql;

-- Update existing jobs to have total values
DO $$
DECLARE
    job_record RECORD;
    job_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Updating existing jobs with total earnings and duration...';

    FOR job_record IN
        SELECT id
        FROM jobs
        WHERE total_staff_earnings IS NULL OR total_duration_minutes IS NULL
        ORDER BY created_at DESC
        LIMIT 100 -- Process in batches to avoid timeouts
    LOOP
        PERFORM update_job_totals(job_record.id);
        job_count := job_count + 1;
    END LOOP;

    RAISE NOTICE 'Updated % jobs with total earnings and duration', job_count;
END $$;