-- ====================================================
-- 🚨 ตรวจสอบความเสียหายหลัง DROP CASCADE
-- ====================================================

-- ตรวจสอบว่ามีตารางไหนหายไปบ้าง
SELECT
    'Missing tables check' as info,
    table_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name)
        THEN '✅ EXISTS'
        ELSE '❌ MISSING - NEEDS RESTORE'
    END as status
FROM (VALUES
    ('profiles'),
    ('staff'),
    ('customers'),
    ('hotels'),
    ('services'),
    ('bookings'),
    ('reviews'),
    ('notifications'),
    ('payouts'),
    ('staff_documents'),
    ('bank_accounts'),
    ('service_areas'),
    ('staff_service_areas'),
    ('staff_skills'),
    ('monthly_bills'),
    ('transactions'),
    ('addresses'),
    ('payment_methods')
) AS t(table_name);

-- ตรวจสอบ Foreign Keys ที่อาจหาย
SELECT
    'Foreign key constraints check' as info,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
AND tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('staff', 'payouts', 'staff_documents', 'bookings')
ORDER BY tc.table_name;

-- ตรวจสอบว่า staff table ยังสมบูรณ์ไหม
SELECT
    'Staff table structure check' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'staff'
ORDER BY ordinal_position;

-- ตรวจสอบข้อมูลใน staff table
SELECT
    'Staff data check' as info,
    COUNT(*) as total_staff
FROM staff;

-- ตรวจสอบ RLS policies ที่อาจหาย
SELECT
    'RLS policies check' as info,
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('staff', 'payouts', 'staff_documents')
GROUP BY schemaname, tablename
ORDER BY tablename;