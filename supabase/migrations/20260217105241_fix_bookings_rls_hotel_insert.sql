-- Fix Bookings RLS Policy for Hotel Users
-- Allow hotel users to INSERT, SELECT, and UPDATE bookings

-- Drop any existing conflicting policies first
DROP POLICY IF EXISTS "hotel_users_can_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "hotel_users_can_view_bookings" ON bookings;
DROP POLICY IF EXISTS "hotel_users_can_update_bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel users can insert hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel users can view hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel users can update hotel bookings" ON bookings;

-- Allow hotel users to INSERT bookings
CREATE POLICY "hotel_users_can_insert_bookings" ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'HOTEL'
    )
  );

-- Allow hotel users to SELECT their bookings
CREATE POLICY "hotel_users_can_view_bookings" ON bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('HOTEL', 'ADMIN')
    )
  );

-- Allow hotel users to UPDATE their bookings
CREATE POLICY "hotel_users_can_update_bookings" ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('HOTEL', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('HOTEL', 'ADMIN')
    )
  );