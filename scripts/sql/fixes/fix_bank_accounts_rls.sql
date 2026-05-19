-- ====================================================
-- 🏦 แก้ไข Bank Accounts RLS Policies
-- ====================================================

-- ตรวจสอบตารางที่เกี่ยวข้องกับ Bank Accounts
SELECT
    'Bank-related tables check' as info,
    table_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name)
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES
    ('bank_accounts'),
    ('staff_bank_accounts')
) AS t(table_name);

-- ====================================================
-- 1. แก้ไข RLS Policies สำหรับ bank_accounts table
-- ====================================================

-- ตรวจสอบ RLS policies ปัจจุบัน
SELECT
    'Current bank_accounts policies' as info,
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies
WHERE tablename = 'bank_accounts';

-- Enable RLS ถ้ายังไม่ได้เปิด
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- ลบ policies เก่า
DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Admins can manage all bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Staff can manage own bank accounts" ON bank_accounts;

-- สร้าง policies ใหม่
-- 1. Users ดูบัญชีตัวเอง
CREATE POLICY "Users can view own bank accounts"
    ON bank_accounts
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 2. Users เพิ่มบัญชีตัวเอง
CREATE POLICY "Users can insert own bank accounts"
    ON bank_accounts
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 3. Users แก้ไขบัญชีตัวเอง
CREATE POLICY "Users can update own bank accounts"
    ON bank_accounts
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 4. Users ลบบัญชีตัวเอง
CREATE POLICY "Users can delete own bank accounts"
    ON bank_accounts
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- 5. Admin จัดการบัญชีทั้งหมด
CREATE POLICY "Admins can manage all bank accounts"
    ON bank_accounts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR auth.jwt() ->> 'role' = 'service_role'
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- 6. Staff สามารถจัดการบัญชีตัวเอง (ผ่าน staff table)
CREATE POLICY "Staff can manage own bank accounts"
    ON bank_accounts
    FOR ALL
    TO authenticated
    USING (
        user_id IN (
            SELECT s.profile_id FROM staff s WHERE s.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT s.profile_id FROM staff s WHERE s.profile_id = auth.uid()
        )
    );

-- ====================================================
-- 2. แก้ไข RLS Policies สำหรับ staff_bank_accounts table ถ้ามี
-- ====================================================

-- ตรวจสอบว่ามี staff_bank_accounts table หรือไม่
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_bank_accounts') THEN
        -- Enable RLS
        EXECUTE 'ALTER TABLE staff_bank_accounts ENABLE ROW LEVEL SECURITY';

        -- ลบ policies เก่า
        DROP POLICY IF EXISTS "Staff can manage own bank accounts" ON staff_bank_accounts;
        DROP POLICY IF EXISTS "Admins can manage all staff bank accounts" ON staff_bank_accounts;

        -- สร้าง policies ใหม่
        CREATE POLICY "Staff can manage own bank accounts"
            ON staff_bank_accounts
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM staff s
                    WHERE s.id = staff_bank_accounts.staff_id
                    AND s.profile_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM staff s
                    WHERE s.id = staff_bank_accounts.staff_id
                    AND s.profile_id = auth.uid()
                )
            );

        CREATE POLICY "Admins can manage all staff bank accounts"
            ON staff_bank_accounts
            FOR ALL
            TO authenticated
            USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
                OR auth.jwt() ->> 'role' = 'service_role'
            )
            WITH CHECK (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
                OR auth.jwt() ->> 'role' = 'service_role'
            );

        RAISE NOTICE 'staff_bank_accounts RLS policies updated';
    ELSE
        RAISE NOTICE 'staff_bank_accounts table does not exist';
    END IF;
END $$;

-- ====================================================
-- 3. เพิ่ม line_user_id column ใน staff table ถ้าไม่มี
-- ====================================================

-- ตรวจสอบว่ามี line_user_id column หรือไม่
SELECT
    'staff table columns check' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'staff'
AND column_name IN ('line_user_id', 'name_th', 'phone');

-- เพิ่ม line_user_id column ถ้าไม่มี
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'staff' AND column_name = 'line_user_id'
    ) THEN
        ALTER TABLE staff ADD COLUMN line_user_id TEXT;
        RAISE NOTICE 'Added line_user_id column to staff table';
    ELSE
        RAISE NOTICE 'line_user_id column already exists in staff table';
    END IF;
END $$;

-- ====================================================
-- 4. Grant permissions
-- ====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON bank_accounts TO authenticated;

-- Grant permissions สำหรับ staff_bank_accounts ถ้ามี
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_bank_accounts') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON staff_bank_accounts TO authenticated;
        RAISE NOTICE 'Granted permissions on staff_bank_accounts';
    END IF;
END $$;

-- ====================================================
-- ตรวจสอบผลลัพธ์
-- ====================================================
SELECT '🎉 Bank Accounts RLS Fixed!' as status;

-- ตรวจสอบ policies ที่สร้าง
SELECT
    'bank_accounts policies' as info,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'bank_accounts';

-- ตรวจสอบ staff table columns
SELECT
    'staff table final check' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'staff'
AND column_name IN ('line_user_id', 'name_th', 'phone', 'profile_id')
ORDER BY column_name;