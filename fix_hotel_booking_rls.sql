-- ============================================
-- FIX HOTEL BOOKING RLS POLICIES
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Update user role to HOTEL
UPDATE profiles
SET role = 'HOTEL'
WHERE id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

-- 2. Check current user role (should show HOTEL after update)
SELECT id, role, first_name, last_name, email
FROM profiles
WHERE id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

-- 3. Add RLS policy for hotel bookings
CREATE POLICY IF NOT EXISTS "Hotel users can create hotel bookings" ON bookings
  FOR INSERT WITH CHECK (
    is_hotel_booking = true
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('HOTEL', 'ADMIN')
    )
  );

-- 4. Add RLS policy for hotel users to view their bookings
CREATE POLICY IF NOT EXISTS "Hotel users can view hotel bookings" ON bookings
  FOR SELECT USING (
    is_hotel_booking = true
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('HOTEL', 'ADMIN')
    )
  );

-- 5. Add RLS policy for hotel users to update their bookings
CREATE POLICY IF NOT EXISTS "Hotel users can update hotel bookings" ON bookings
  FOR UPDATE USING (
    is_hotel_booking = true
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('HOTEL', 'ADMIN')
    )
  );

-- 6. Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'bookings'
AND policyname LIKE '%hotel%';

-- 7. Show all current bookings policies for reference
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;