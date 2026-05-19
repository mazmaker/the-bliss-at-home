-- ====================================================
-- 🔍 ตรวจสอบโครงสร้างตาราง Bank Accounts จริง
-- ====================================================

-- ตรวจสอบว่ามีตารางอะไรเกี่ยวกับ bank บ้าง
SELECT
    'Bank-related tables' as info,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%bank%'
ORDER BY table_name;

-- ตรวจสอบโครงสร้าง bank_accounts table
SELECT
    'bank_accounts table structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bank_accounts'
ORDER BY ordinal_position;

-- ตรวจสอบโครงสร้าง staff_bank_accounts table ถ้ามี
SELECT
    'staff_bank_accounts table structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'staff_bank_accounts'
ORDER BY ordinal_position;

-- ตรวจสอบข้อมูลตัวอย่างใน bank_accounts
SELECT
    'bank_accounts sample data' as info,
    *
FROM bank_accounts
LIMIT 3;

-- ตรวจสอบข้อมูลตัวอย่างใน staff_bank_accounts ถ้ามี
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_bank_accounts') THEN
        PERFORM 1; -- จะใส่ query ตรวจสอบข้อมูล
        RAISE NOTICE 'staff_bank_accounts table exists';
    ELSE
        RAISE NOTICE 'staff_bank_accounts table does not exist';
    END IF;
END $$;

-- ตรวจสอบ RLS policies ปัจจุบัน
SELECT
    'Current RLS policies' as info,
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename LIKE '%bank%'
ORDER BY tablename, policyname;

SELECT '🔍 Table structure analysis complete!' as status;