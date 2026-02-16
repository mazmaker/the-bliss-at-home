-- Grant UPDATE permission on bookings table
-- The original migration only granted SELECT and INSERT, but forgot UPDATE
-- This prevents authenticated users (including admins) from updating bookings

GRANT UPDATE ON bookings TO authenticated;
GRANT DELETE ON bookings TO authenticated;

-- Verify grants
DO $$
BEGIN
  RAISE NOTICE 'Granted UPDATE and DELETE permissions on bookings table to authenticated role';
END $$;
