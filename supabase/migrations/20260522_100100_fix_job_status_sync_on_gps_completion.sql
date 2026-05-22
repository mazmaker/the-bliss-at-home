-- Migration: Fix complete_staff_journey to sync job status with booking status
-- Date: 2026-05-22
-- Description: Update complete_staff_journey function to also update job status when completing GPS journey

-- Drop and recreate the complete_staff_journey function with job status sync
DROP FUNCTION IF EXISTS complete_staff_journey(UUID, DECIMAL(10, 8), DECIMAL(11, 8));

CREATE OR REPLACE FUNCTION complete_staff_journey(
  p_journey_id UUID,
  p_final_latitude DECIMAL(10, 8),
  p_final_longitude DECIMAL(11, 8)
)
RETURNS VOID AS $$
DECLARE
  v_booking_id UUID;
  v_current_booking_status TEXT;
  v_job_id UUID;
BEGIN
  -- Get booking ID and current status
  SELECT booking_id INTO v_booking_id
  FROM staff_journeys
  WHERE id = p_journey_id;

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Journey not found: %', p_journey_id;
  END IF;

  -- Get current booking status
  SELECT status INTO v_current_booking_status
  FROM bookings
  WHERE id = v_booking_id;

  -- Get job ID from booking
  SELECT id INTO v_job_id
  FROM jobs
  WHERE booking_id = v_booking_id;

  -- Update journey status to arrived
  UPDATE staff_journeys
  SET
    status = 'arrived',
    current_latitude = p_final_latitude,
    current_longitude = p_final_longitude,
    arrived_at = now(),
    last_location_update = now()
  WHERE id = p_journey_id;

  -- Add final location to history
  INSERT INTO journey_location_updates (
    journey_id, latitude, longitude
  ) VALUES (
    p_journey_id, p_final_latitude, p_final_longitude
  );

  -- Update booking status to in_progress regardless of current status
  -- This handles cases where booking status wasn't properly synced
  UPDATE bookings
  SET status = 'in_progress'
  WHERE id = v_booking_id;

  -- 🎯 NEW: Also update job status to in_progress to sync with booking
  IF v_job_id IS NOT NULL THEN
    UPDATE jobs
    SET status = 'in_progress'
    WHERE id = v_job_id;

    RAISE NOTICE 'Job status synced: % -> in_progress', v_job_id;
  END IF;

  -- Log the status transition for debugging
  RAISE NOTICE 'Journey completed: % -> Booking status: % -> in_progress, Job: %',
    p_journey_id, v_current_booking_status, v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_staff_journey(UUID, DECIMAL(10, 8), DECIMAL(11, 8)) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION complete_staff_journey(UUID, DECIMAL(10, 8), DECIMAL(11, 8)) IS
'Complete a staff journey and sync both booking and job status to in_progress. Ensures UI shows correct button state.';