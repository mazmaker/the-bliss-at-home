-- Migration: Fix Hotel User Role and RLS Policy
-- Description: Set hotel user role and improve hotel booking policy
-- Version: 20260217000001

-- ============================================
-- SET USER ROLE TO HOTEL
-- ============================================

-- Update the current user to have HOTEL role
UPDATE profiles
SET role = 'HOTEL'
WHERE id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

-- ============================================
-- IMPROVE HOTEL BOOKING RLS POLICY
-- ============================================

-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "Hotel staff can create hotel bookings" ON bookings;

-- Create a more permissive policy for hotel bookings
CREATE POLICY "Hotel users can create hotel bookings" ON bookings
  FOR INSERT WITH CHECK (
    is_hotel_booking = true
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('HOTEL', 'ADMIN')
    )
  );

-- Also allow hotel users to update their bookings
DROP POLICY IF EXISTS "Hotel staff can update hotel bookings" ON bookings;

CREATE POLICY "Hotel users can update hotel bookings" ON bookings
  FOR UPDATE USING (
    is_hotel_booking = true
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('HOTEL', 'ADMIN')
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Hotel users can create hotel bookings" ON bookings IS 'Allow hotel users and admins to create hotel bookings';
COMMENT ON POLICY "Hotel users can update hotel bookings" ON bookings IS 'Allow hotel users and admins to update hotel bookings';