-- ============================================
-- Fix RLS Policies for staff table
-- ============================================
-- Issue: Admin users getting 406 error when querying staff table
-- Solution: Use helper functions instead of inline subqueries

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Anyone can view active staff" ON staff;
DROP POLICY IF EXISTS "Staff can update own profile" ON staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON staff;

-- 2. Drop policies with new names if they already exist
DROP POLICY IF EXISTS "public_can_view_active_staff" ON staff;
DROP POLICY IF EXISTS "admins_can_view_all_staff" ON staff;
DROP POLICY IF EXISTS "staff_can_update_own_profile" ON staff;
DROP POLICY IF EXISTS "admins_can_manage_all_staff" ON staff;

-- Create new policies using helper functions

-- Allow anyone to view active staff (public-facing)
CREATE POLICY "public_can_view_active_staff"
ON staff
FOR SELECT
TO authenticated, anon
USING (status = 'active');

-- Allow admins to view ALL staff (including pending, inactive, etc.)
CREATE POLICY "admins_can_view_all_staff"
ON staff
FOR SELECT
TO authenticated
USING (is_admin());

-- Allow staff to update their own profile
CREATE POLICY "staff_can_update_own_profile"
ON staff
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = staff.profile_id
    AND profiles.id = auth.uid()
  )
);

-- Allow admins to manage all staff (INSERT, UPDATE, DELETE)
CREATE POLICY "admins_can_manage_all_staff"
ON staff
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 3. Verify policies were created
SELECT 'Listing staff table policies...' as info;
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'staff'
ORDER BY policyname;

SELECT 'Staff table RLS policies fixed!' as status;
