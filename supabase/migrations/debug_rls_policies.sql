-- ============================================
-- Debug RLS Policies for staff_performance_metrics
-- ============================================

-- 1. Check current user info
SELECT
    auth.uid() as current_user_id,
    p.email,
    p.role,
    p.full_name
FROM profiles p
WHERE p.id = auth.uid();

-- 2. Check all RLS policies on staff_performance_metrics
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'staff_performance_metrics';

-- 3. Test if admin check works
SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'
) as is_admin;

-- 4. Try to query staff_performance_metrics directly
SELECT COUNT(*) as accessible_records
FROM staff_performance_metrics;

-- 5. Check if table has RLS enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'staff_performance_metrics';
