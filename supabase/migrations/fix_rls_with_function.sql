-- ============================================
-- Fix RLS with Helper Function Approach
-- ============================================

-- 1. Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create helper function to check if current user is staff viewing their own data
CREATE OR REPLACE FUNCTION is_own_staff(staff_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = staff_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop all existing policies
DROP POLICY IF EXISTS "Staff can view own performance" ON staff_performance_metrics;
DROP POLICY IF EXISTS "Admins can view all performance" ON staff_performance_metrics;
DROP POLICY IF EXISTS "System can manage metrics" ON staff_performance_metrics;
DROP POLICY IF EXISTS "staff_view_own_performance" ON staff_performance_metrics;
DROP POLICY IF EXISTS "admin_view_all_performance" ON staff_performance_metrics;
DROP POLICY IF EXISTS "admin_manage_metrics" ON staff_performance_metrics;

-- 4. Create new policies using helper functions

-- Allow staff to view their own performance
CREATE POLICY "staff_can_view_own"
ON staff_performance_metrics
FOR SELECT
TO authenticated
USING (is_own_staff(staff_id));

-- Allow admins to view all performance
CREATE POLICY "admins_can_view_all"
ON staff_performance_metrics
FOR SELECT
TO authenticated
USING (is_admin());

-- Allow admins to manage all metrics
CREATE POLICY "admins_can_manage_all"
ON staff_performance_metrics
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 5. Verify the setup
SELECT 'Testing is_admin() function...' as test;
SELECT is_admin() as am_i_admin;

SELECT 'Listing all policies...' as info;
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'staff_performance_metrics'
ORDER BY policyname;

SELECT 'RLS policies fixed with helper functions!' as status;
