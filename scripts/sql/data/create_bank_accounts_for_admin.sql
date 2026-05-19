-- ====================================================
-- 🏦 สร้าง bank_accounts table ที่ Admin app ต้องการ
-- ====================================================

-- ตรวจสอบว่า Admin app ใช้ table structure แบบไหน
-- จากการวิเคราะห์ error, Admin app คาดหวัง bank_accounts table

-- ====================================================
-- 1. สร้างตาราง bank_accounts ที่ Admin app ต้องการ
-- ====================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- อาจเชื่อมกับ profiles หรือ staff.profile_id
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    branch TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, account_number)
);

-- ====================================================
-- 2. สร้าง indexes
-- ====================================================
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_primary ON bank_accounts(is_primary) WHERE is_primary = true;

-- ====================================================
-- 3. สร้าง trigger สำหรับ updated_at
-- ====================================================
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER trigger_update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_accounts_updated_at();

-- ====================================================
-- 4. Enable RLS
-- ====================================================
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- 5. สร้าง RLS Policies สำหรับ bank_accounts
-- ====================================================

-- ลบ policies เก่า
DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Admins can manage all bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Staff can manage own bank accounts" ON bank_accounts;

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

-- 6. Staff สามารถจัดการบัญชีตัวเอง (ผ่าน staff.profile_id)
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
-- 6. Grant permissions
-- ====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON bank_accounts TO authenticated;

-- ====================================================
-- 7. เพิ่มข้อมูลตัวอย่างสำหรับ Staff คนนี้
-- ====================================================
-- เพิ่มข้อมูลโดยใช้ profile_id ของ staff
INSERT INTO bank_accounts (
    user_id,
    bank_name,
    account_number,
    account_name,
    branch,
    is_primary
)
SELECT
    s.profile_id,  -- ใช้ profile_id จาก staff table
    'ธนาคารกสิกรไทย',
    '0987654321',  -- เลขบัญชีใหม่ (ไม่ซ้ำกับ staff_bank_accounts)
    'เตย Staff',
    'สาขาสยาม',
    true
FROM staff s
WHERE s.id = '95482752-043c-436e-af71-93da53eaa041'
ON CONFLICT (user_id, account_number) DO NOTHING;

-- ====================================================
-- 8. ตรวจสอบผลลัพธ์
-- ====================================================
SELECT '🎉 bank_accounts table created for Admin app!' as status;

-- ตรวจสอบตารางที่สร้าง
SELECT
    'bank_accounts table' as info,
    table_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_accounts')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES ('bank_accounts')) as t(table_name);

-- ตรวจสอบ columns
SELECT
    'bank_accounts structure' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bank_accounts'
ORDER BY ordinal_position;

-- ตรวจสอบ RLS policies
SELECT
    'bank_accounts RLS policies' as info,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'bank_accounts';

-- ตรวจสอบข้อมูลตัวอย่าง
SELECT
    'bank_accounts sample data' as info,
    bank_name,
    account_number,
    account_name,
    is_primary
FROM bank_accounts
LIMIT 3;

-- ตรวจสอบว่าตอนนี้มีตารางไหนเกี่ยวกับ bank บ้าง
SELECT
    'Bank tables available' as info,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%bank%'
ORDER BY table_name;