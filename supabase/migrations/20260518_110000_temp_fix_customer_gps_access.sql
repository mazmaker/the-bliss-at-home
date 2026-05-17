-- Temporary fix: Allow customers to read staff journeys for testing GPS
-- Date: 2026-05-18

-- Add temporary policy to allow customers to see all staff journeys (for testing)
CREATE POLICY staff_journeys_temp_customer_access ON staff_journeys
  FOR SELECT TO authenticated
  USING (true);  -- Allow all authenticated users to read

-- Note: This is a temporary fix for testing.
-- In production, use proper customer-booking relationship checking.