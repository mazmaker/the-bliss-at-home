-- Fix foreign key constraint for staff_journeys table
-- Date: 2026-05-18
-- Description: Update foreign key to reference bookings table instead of jobs table

-- Drop the incorrect constraint
ALTER TABLE staff_journeys
DROP CONSTRAINT IF EXISTS staff_journeys_booking_id_fkey;

-- Add the correct constraint
ALTER TABLE staff_journeys
ADD CONSTRAINT staff_journeys_booking_id_fkey
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- Verify the constraint is correct
-- This will show the constraint references the bookings table
-- \d staff_journeys;