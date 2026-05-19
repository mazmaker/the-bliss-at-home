-- ตรวจสอบ RLS Policies ปัจจุบันทั้งหมด
-- รันใน Supabase Dashboard > SQL Editor

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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ตรวจสอบตารางที่เปิด RLS
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND rowsecurity = true
ORDER BY tablename;

-- ตรวจสอบ Helper Functions ที่ใช้ใน RLS
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('is_admin', 'is_hotel');