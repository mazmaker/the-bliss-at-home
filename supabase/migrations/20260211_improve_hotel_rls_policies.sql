-- Migration: Improve RLS Policies for Multi-Hotel Data Isolation
-- Description: Enhance existing RLS policies to properly isolate hotel data
-- Date: 2026-02-11

-- ============================================
-- IMPROVE BOOKINGS RLS POLICIES
-- ============================================

-- Drop existing hotel booking policy
DROP POLICY IF EXISTS "Hotels can view their bookings" ON bookings;

-- ✅ Create improved hotel booking policy with proper hotel identification
CREATE POLICY "Hotels can view their bookings (improved)" ON bookings
  FOR SELECT USING (
    -- Check if the user is authenticated and belongs to this hotel
    hotel_id IN (
      SELECT h.id
      FROM hotels h
      JOIN profiles p ON p.metadata ->> 'hotel_id' = h.id::text
      WHERE p.id = auth.uid()
      AND h.status = 'active'
    )
  );

-- ✅ Allow hotels to create bookings for their property
CREATE POLICY "Hotels can create own bookings" ON bookings
  FOR INSERT WITH CHECK (
    hotel_id IN (
      SELECT h.id
      FROM hotels h
      JOIN profiles p ON p.metadata ->> 'hotel_id' = h.id::text
      WHERE p.id = auth.uid()
      AND h.status = 'active'
    )
    AND is_hotel_booking = true
  );

-- ✅ Allow hotels to update their own bookings
CREATE POLICY "Hotels can update own bookings" ON bookings
  FOR UPDATE USING (
    hotel_id IN (
      SELECT h.id
      FROM hotels h
      JOIN profiles p ON p.metadata ->> 'hotel_id' = h.id::text
      WHERE p.id = auth.uid()
      AND h.status = 'active'
    )
    AND is_hotel_booking = true
  );

-- ============================================
-- IMPROVE MONTHLY BILLS RLS POLICIES
-- ============================================

-- ✅ Hotels can view their own bills
CREATE POLICY "Hotels can view own bills" ON monthly_bills
  FOR SELECT USING (
    hotel_id IN (
      SELECT h.id
      FROM hotels h
      JOIN profiles p ON p.metadata ->> 'hotel_id' = h.id::text
      WHERE p.id = auth.uid()
      AND h.status = 'active'
    )
  );

-- ============================================
-- ADD HELPER FUNCTION FOR HOTEL IDENTIFICATION
-- ============================================

-- ✅ Function to get current hotel ID from authenticated user
CREATE OR REPLACE FUNCTION get_user_hotel_id()
RETURNS UUID AS $$
BEGIN
  -- Return hotel_id from user's profile metadata
  RETURN (
    SELECT (p.metadata ->> 'hotel_id')::uuid
    FROM profiles p
    WHERE p.id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Alternative simplified policies using the helper function
-- (Can be used instead of the complex JOIN queries above)

-- Example of simpler policy syntax:
-- CREATE POLICY "Hotels can view own bookings (simple)" ON bookings
--   FOR SELECT USING (hotel_id = get_user_hotel_id());

-- ============================================
-- UPDATE HOTELS TABLE RLS
-- ============================================

-- Drop existing hotel view policy if it exists
DROP POLICY IF EXISTS "Hotel staff can view their hotel" ON hotels;

-- ✅ Improved hotel self-view policy
CREATE POLICY "Hotels can view own data" ON hotels
  FOR SELECT USING (
    id = get_user_hotel_id()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- ✅ Allow hotels to update their own information
CREATE POLICY "Hotels can update own data" ON hotels
  FOR UPDATE USING (
    id = get_user_hotel_id()
  )
  WITH CHECK (
    id = get_user_hotel_id()
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION get_user_hotel_id() IS 'Returns the hotel_id associated with the current authenticated user';

-- ============================================
-- VERIFICATION QUERIES (for testing)
-- ============================================

-- Test query to verify RLS is working:
-- SET LOCAL request.jwt.claim.sub = 'some-user-id';
-- SELECT * FROM bookings WHERE hotel_id = 'some-hotel-id';

-- Note: To use these policies in practice, you need to:
-- 1. Add hotel_id to user profiles metadata when they sign up/login
-- 2. Ensure the hotel app sets the correct hotel context
-- 3. Test with actual authenticated users

COMMENT ON TABLE bookings IS 'Booking transactions with hotel-specific RLS policies';
COMMENT ON TABLE monthly_bills IS 'Monthly bills with hotel-specific RLS policies';
COMMENT ON TABLE hotels IS 'Hotels table with self-management RLS policies';