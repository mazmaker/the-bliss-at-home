-- ============================================
-- Fix RLS Permissions for staff_performance_metrics
-- ============================================

-- 1. Grant permissions to authenticated users
GRANT SELECT ON staff_performance_metrics TO authenticated;
GRANT ALL ON staff_performance_metrics TO service_role;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Staff can view own performance" ON staff_performance_metrics;
DROP POLICY IF EXISTS "Admins can view all performance" ON staff_performance_metrics;
DROP POLICY IF EXISTS "System can manage metrics" ON staff_performance_metrics;

-- 3. Create simpler, more explicit policies

-- Policy 1: Staff can view their own performance
CREATE POLICY "staff_view_own_performance"
ON staff_performance_metrics
FOR SELECT
TO authenticated
USING (
    staff_id = auth.uid()
);

-- Policy 2: Admins can view all performance (simplified check)
CREATE POLICY "admin_view_all_performance"
ON staff_performance_metrics
FOR SELECT
TO authenticated
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- Policy 3: Admins and system can manage metrics
CREATE POLICY "admin_manage_metrics"
ON staff_performance_metrics
FOR ALL
TO authenticated
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'SYSTEM')
)
WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'SYSTEM')
);

-- 4. Verify policies were created
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'staff_performance_metrics'
ORDER BY policyname;

SELECT 'RLS policies recreated with proper permissions!' as status;
