-- Fix bookings RLS policy for admin UPDATE operations
-- The "FOR ALL" policy with null with_check doesn't properly handle UPDATEs
-- Replace it with separate explicit policies

-- Drop the problematic "FOR ALL" policy
DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;

-- Create separate explicit policies for UPDATE, INSERT, and DELETE

-- Admins can UPDATE all bookings (with both USING and WITH CHECK)
CREATE POLICY "Admins can update all bookings" ON bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Admins can INSERT bookings
CREATE POLICY "Admins can insert bookings" ON bookings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Admins can DELETE bookings
CREATE POLICY "Admins can delete bookings" ON bookings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );
