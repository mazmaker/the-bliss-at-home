-- Migration: Add reschedule_count to bookings table
-- Created: 2026-02-20
-- Description: Tracks how many times a booking has been rescheduled

-- Add reschedule_count column with default value of 0
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN bookings.reschedule_count IS 'Number of times this booking has been rescheduled';
