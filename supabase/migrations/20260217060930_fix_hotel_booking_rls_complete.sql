-- ============================================
-- COMPLETE FIX FOR HOTEL BOOKING RLS POLICY
-- Migration: 20260217060930_fix_hotel_booking_rls_complete
-- ============================================

-- 1. Verify and update user role to HOTEL if needed
UPDATE profiles
SET role = 'HOTEL'
WHERE id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3'
AND role != 'HOTEL';

-- 2. Drop all existing conflicting booking policies
DROP POLICY IF EXISTS "Hotel staff can create hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel staff can update hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel staff can view hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel users can create hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel users can update hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel users can view hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Allow hotel and admin full access to hotel bookings" ON bookings;

-- 3. Ensure RLS is enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 4. Create comprehensive policy for hotel bookings (INSERT)
CREATE POLICY "Hotel users can create hotel bookings v2"
ON bookings FOR INSERT
WITH CHECK (
  is_hotel_booking = true
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow users with HOTEL role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'HOTEL'
    )
    OR
    -- Allow users with ADMIN role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
);

-- 5. Create comprehensive policy for hotel bookings (SELECT)
CREATE POLICY "Hotel users can view hotel bookings v2"
ON bookings FOR SELECT
USING (
  is_hotel_booking = true
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow users with HOTEL role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'HOTEL'
    )
    OR
    -- Allow users with ADMIN role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
);

-- 6. Create comprehensive policy for hotel bookings (UPDATE)
CREATE POLICY "Hotel users can update hotel bookings v2"
ON bookings FOR UPDATE
USING (
  is_hotel_booking = true
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow users with HOTEL role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'HOTEL'
    )
    OR
    -- Allow users with ADMIN role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
)
WITH CHECK (
  is_hotel_booking = true
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow users with HOTEL role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'HOTEL'
    )
    OR
    -- Allow users with ADMIN role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
);

-- 7. Ensure customer bookings policy exists (for non-hotel bookings)
CREATE POLICY IF NOT EXISTS "Customers can manage their own bookings"
ON bookings FOR ALL
USING (
  is_hotel_booking = false
  AND (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
)
WITH CHECK (
  is_hotel_booking = false
  AND (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
);

-- 8. Verification queries
-- Check user role
DO $$
BEGIN
  RAISE NOTICE 'User Role Check for df59b8ba-52e6-4d4d-b050-6f63d83446e3:';
END $$;

SELECT
  id,
  email,
  role,
  CASE
    WHEN role = 'HOTEL' THEN '✅ HOTEL role confirmed'
    ELSE '❌ Wrong role: ' || COALESCE(role, 'NULL')
  END as status
FROM profiles
WHERE id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

-- Check policies created
DO $$
BEGIN
  RAISE NOTICE 'RLS Policies Check:';
END $$;

SELECT
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%hotel%v2%' THEN '✅ New policy'
    ELSE '📄 Policy'
  END as status
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;

-- 9. Final status
DO $$
BEGIN
  RAISE NOTICE '🎉 Hotel Booking RLS Fix Migration Completed!';
  RAISE NOTICE '✅ User role updated to HOTEL';
  RAISE NOTICE '✅ Old conflicting policies removed';
  RAISE NOTICE '✅ New comprehensive policies created';
  RAISE NOTICE '✅ Ready for hotel bookings';
END $$;