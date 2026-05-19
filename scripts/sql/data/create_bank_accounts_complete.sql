-- ====================================================
-- 🏦 สร้างตาราง Bank Accounts สมบูรณ์จากศูนย์
-- ====================================================

-- ====================================================
-- 1. สร้างตาราง staff_bank_accounts (ใช้ staff_id)
-- ====================================================
CREATE TABLE IF NOT EXISTS staff_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    branch TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, account_number)
);

-- ====================================================
-- 2. สร้าง indexes
-- ====================================================
CREATE INDEX IF NOT EXISTS idx_staff_bank_accounts_staff_id ON staff_bank_accounts(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_bank_accounts_is_primary ON staff_bank_accounts(is_primary) WHERE is_primary = true;

-- ====================================================
-- 3. สร้าง trigger สำหรับ updated_at
-- ====================================================
CREATE OR REPLACE FUNCTION update_staff_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_staff_bank_accounts_updated_at ON staff_bank_accounts;
CREATE TRIGGER trigger_update_staff_bank_accounts_updated_at
    BEFORE UPDATE ON staff_bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_bank_accounts_updated_at();

-- ====================================================
-- 4. Enable RLS
-- ====================================================
ALTER TABLE staff_bank_accounts ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- 5. สร้าง RLS Policies
-- ====================================================

-- ลบ policies เก่า
DROP POLICY IF EXISTS "Staff can view own bank accounts" ON staff_bank_accounts;
DROP POLICY IF EXISTS "Staff can insert own bank accounts" ON staff_bank_accounts;
DROP POLICY IF EXISTS "Staff can update own bank accounts" ON staff_bank_accounts;
DROP POLICY IF EXISTS "Staff can delete own bank accounts" ON staff_bank_accounts;
DROP POLICY IF EXISTS "Admins can manage all bank accounts" ON staff_bank_accounts;

-- 1. Staff ดูบัญชีตัวเอง
CREATE POLICY "Staff can view own bank accounts"
    ON staff_bank_accounts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = staff_bank_accounts.staff_id
            AND s.profile_id = auth.uid()
        )
    );

-- 2. Staff เพิ่มบัญชีตัวเอง
CREATE POLICY "Staff can insert own bank accounts"
    ON staff_bank_accounts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = staff_bank_accounts.staff_id
            AND s.profile_id = auth.uid()
        )
    );

-- 3. Staff แก้ไขบัญชีตัวเอง
CREATE POLICY "Staff can update own bank accounts"
    ON staff_bank_accounts
    FOR UPDATE
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

-- 4. Staff ลบบัญชีตัวเอง
CREATE POLICY "Staff can delete own bank accounts"
    ON staff_bank_accounts
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = staff_bank_accounts.staff_id
            AND s.profile_id = auth.uid()
        )
    );

-- 5. Admin จัดการบัญชีทั้งหมด
CREATE POLICY "Admins can manage all bank accounts"
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

-- ====================================================
-- 6. Grant permissions
-- ====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_bank_accounts TO authenticated;

-- ====================================================
-- 7. เพิ่ม line_user_id column ใน staff table ถ้าไม่มี
-- ====================================================
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
-- 8. เพิ่มข้อมูลตัวอย่างสำหรับ staff คนนี้
-- ====================================================
INSERT INTO staff_bank_accounts (
    staff_id,
    bank_name,
    account_number,
    account_name,
    branch,
    is_primary
) VALUES (
    '95482752-043c-436e-af71-93da53eaa041',
    'ธนาคารกสิกรไทย',
    '1234567890',
    'เตย Staff',
    'สาขาสยาม',
    true
) ON CONFLICT (staff_id, account_number) DO NOTHING;

-- ====================================================
-- 9. ตรวจสอบผลลัพธ์
-- ====================================================
SELECT '🎉 Bank Accounts System Created!' as status;

-- ตรวจสอบตารางที่สร้าง
SELECT
    'Table created' as info,
    table_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_bank_accounts')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES ('staff_bank_accounts')) as t(table_name);

-- ตรวจสอบ columns
SELECT
    'Table structure' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'staff_bank_accounts'
ORDER BY ordinal_position;

-- ตรวจสอบ RLS policies
SELECT
    'RLS Policies' as info,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'staff_bank_accounts';

-- ตรวจสอบข้อมูลที่เพิ่ม
SELECT
    'Sample data' as info,
    COUNT(*) as records_count
FROM staff_bank_accounts
WHERE staff_id = '95482752-043c-436e-af71-93da53eaa041';

SELECT
    'Bank account details' as info,
    bank_name,
    account_number,
    account_name,
    is_primary
FROM staff_bank_accounts
WHERE staff_id = '95482752-043c-436e-af71-93da53eaa041';