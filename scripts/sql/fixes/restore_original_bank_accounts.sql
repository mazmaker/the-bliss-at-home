-- ====================================================
-- 🏦 กู้คืนตาราง bank_accounts ตามระบบเดิม
-- ====================================================

-- ตรวจสอบสถานะปัจจุบัน
SELECT 'Restoring Original Bank Accounts Structure' as status;

-- ตรวจสอบตารางที่มีอยู่
SELECT
    'Existing bank tables' as info,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%bank%'
ORDER BY table_name;

-- ====================================================
-- 1. ลบตารางที่ไม่ถูกต้อง
-- ====================================================

-- ลบตารางที่อาจสร้างผิด
DROP TABLE IF EXISTS staff_bank_accounts CASCADE;

-- ลบตาราง bank_accounts เก่าและสร้างใหม่ตามโครงสร้างเดิม
DROP TABLE IF EXISTS bank_accounts CASCADE;

-- ====================================================
-- 2. สร้างตาราง bank_accounts ตามระบบเดิม
-- ====================================================

CREATE TABLE bank_accounts (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to staff table
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

    -- Bank information
    bank_code TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,

    -- Status flags
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(staff_id, account_number)
);

-- ====================================================
-- 3. สร้าง indexes
-- ====================================================
CREATE INDEX idx_bank_accounts_staff_id ON bank_accounts(staff_id);
CREATE INDEX idx_bank_accounts_is_primary ON bank_accounts(is_primary) WHERE is_primary = true;
CREATE INDEX idx_bank_accounts_bank_code ON bank_accounts(bank_code);

-- ====================================================
-- 4. สร้าง trigger สำหรับ updated_at
-- ====================================================
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_accounts_updated_at();

-- ====================================================
-- 5. Enable RLS และสร้าง policies
-- ====================================================
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- ลบ policies เก่า (ถ้ามี)
DROP POLICY IF EXISTS "Staff can view own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Staff can insert own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Staff can update own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Staff can delete own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Admins can manage all bank accounts" ON bank_accounts;

-- 1. Staff ดูบัญชีตัวเอง (ผ่าน profile_id)
CREATE POLICY "Staff can view own bank accounts"
    ON bank_accounts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = bank_accounts.staff_id
            AND s.profile_id = auth.uid()
        )
    );

-- 2. Staff เพิ่มบัญชีตัวเอง
CREATE POLICY "Staff can insert own bank accounts"
    ON bank_accounts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = bank_accounts.staff_id
            AND s.profile_id = auth.uid()
        )
    );

-- 3. Staff แก้ไขบัญชีตัวเอง
CREATE POLICY "Staff can update own bank accounts"
    ON bank_accounts
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = bank_accounts.staff_id
            AND s.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = bank_accounts.staff_id
            AND s.profile_id = auth.uid()
        )
    );

-- 4. Staff ลบบัญชีตัวเอง
CREATE POLICY "Staff can delete own bank accounts"
    ON bank_accounts
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = bank_accounts.staff_id
            AND s.profile_id = auth.uid()
        )
    );

-- 5. Admin จัดการบัญชีทั้งหมด (ดู/เพิ่ม/แก้ไข/ลบ)
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

-- ====================================================
-- 6. Grant permissions
-- ====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON bank_accounts TO authenticated;

-- ====================================================
-- 7. เพิ่มข้อมูลตัวอย่างสำหรับ Staff คนที่มีปัญหา
-- ====================================================

-- เพิ่มบัญชีตัวอย่างสำหรับ staff ที่มี ID = '95482752-043c-436e-af71-93da53eaa041'
INSERT INTO bank_accounts (
    staff_id,
    bank_code,
    bank_name,
    account_number,
    account_name,
    is_primary,
    is_verified
) VALUES (
    '95482752-043c-436e-af71-93da53eaa041',
    'KBANK',
    'ธนาคารกสิกรไทย',
    '1234567890',
    'เตย Staff',
    true,
    false
) ON CONFLICT (staff_id, account_number) DO NOTHING;

-- ====================================================
-- ตรวจสอบผลลัพธ์
-- ====================================================
SELECT '🎉 Original bank_accounts structure restored!' as status;

-- ตรวจสอบ table structure
SELECT
    'Table structure check' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bank_accounts'
ORDER BY ordinal_position;

-- ตรวจสอบ RLS policies
SELECT
    'RLS Policies check' as info,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'bank_accounts';

-- แสดงรายชื่อ policies
SELECT
    'Policy details' as info,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'bank_accounts'
ORDER BY policyname;

-- ตรวจสอบข้อมูลตัวอย่าง
SELECT
    'Sample data check' as info,
    COUNT(*) as records_count
FROM bank_accounts
WHERE staff_id = '95482752-043c-436e-af71-93da53eaa041';

-- แสดงข้อมูลบัญชีที่เพิ่ม
SELECT
    'Bank account details' as info,
    staff_id,
    bank_code,
    bank_name,
    account_number,
    account_name,
    is_primary,
    is_verified,
    created_at
FROM bank_accounts
WHERE staff_id = '95482752-043c-436e-af71-93da53eaa041';

-- ตรวจสอบการเชื่อมโยงกับ staff table
SELECT
    'Staff-Bank relationship check' as info,
    s.name_th as staff_name,
    s.phone as staff_phone,
    ba.bank_name,
    ba.account_number,
    ba.account_name,
    ba.is_primary
FROM staff s
LEFT JOIN bank_accounts ba ON s.id = ba.staff_id
WHERE s.id = '95482752-043c-436e-af71-93da53eaa041';

SELECT '✅ Bank Accounts System Ready!' as final_status;