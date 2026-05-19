-- ====================================================
-- 📋 สร้างตาราง staff_documents สำหรับ Document Upload
-- ====================================================

-- ====================================================
-- 1. ตรวจสอบว่ามีตาราง staff_documents หรือไม่
-- ====================================================
SELECT
    'staff_documents table check' as info,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_documents')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- ====================================================
-- 2. สร้าง staff_documents table ถ้าไม่มี
-- ====================================================
CREATE TABLE IF NOT EXISTS staff_documents (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

    -- Document information
    document_type TEXT NOT NULL CHECK (document_type IN ('id_card', 'license', 'certificate', 'bank_statement', 'other')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    mime_type TEXT NOT NULL,

    -- Status tracking
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'reviewing', 'verified', 'rejected')),
    verified_by UUID, -- User ID of admin who verified/rejected
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,

    -- Metadata
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================
-- 3. สร้าง indexes
-- ====================================================
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON staff_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_status ON staff_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_staff_documents_document_type ON staff_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_staff_documents_created_at ON staff_documents(created_at DESC);

-- ====================================================
-- 4. สร้าง trigger สำหรับ updated_at
-- ====================================================
CREATE OR REPLACE FUNCTION update_staff_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_staff_documents_updated_at ON staff_documents;
CREATE TRIGGER trigger_update_staff_documents_updated_at
    BEFORE UPDATE ON staff_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_documents_updated_at();

-- ====================================================
-- 5. Enable RLS
-- ====================================================
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- 6. สร้าง RLS Policies
-- ====================================================

-- ลบ policies เก่า
DROP POLICY IF EXISTS "Staff can view their own documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can insert their own documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can update their own pending documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can delete their own non-verified documents" ON staff_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON staff_documents;
DROP POLICY IF EXISTS "Admins can update all documents" ON staff_documents;
DROP POLICY IF EXISTS "Admins can delete all documents" ON staff_documents;

-- 1. Staff สามารถดูเอกสารของตัวเองได้
CREATE POLICY "Staff can view their own documents"
    ON staff_documents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = staff_documents.staff_id
            AND s.profile_id = auth.uid()
        )
    );

-- 2. Staff สามารถเพิ่มเอกสารของตัวเองได้
CREATE POLICY "Staff can insert their own documents"
    ON staff_documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = staff_documents.staff_id
            AND s.profile_id = auth.uid()
        )
    );

-- 3. Staff สามารถแก้ไขเอกสารที่ยังไม่ verified
CREATE POLICY "Staff can update their own pending documents"
    ON staff_documents
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = staff_documents.staff_id
            AND s.profile_id = auth.uid()
        )
        AND verification_status = 'pending'
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = staff_documents.staff_id
            AND s.profile_id = auth.uid()
        )
        AND verification_status = 'pending'
    );

-- 4. Staff สามารถลบเอกสารที่ยังไม่ verified
CREATE POLICY "Staff can delete their own non-verified documents"
    ON staff_documents
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = staff_documents.staff_id
            AND s.profile_id = auth.uid()
        )
        AND verification_status != 'verified'
    );

-- 5. Admin สามารถดูเอกสารทั้งหมด
CREATE POLICY "Admins can view all documents"
    ON staff_documents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- 6. Admin สามารถแก้ไขเอกสารทั้งหมด
CREATE POLICY "Admins can update all documents"
    ON staff_documents
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR auth.jwt() ->> 'role' = 'service_role'
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- 7. Admin สามารถลบเอกสารทั้งหมด
CREATE POLICY "Admins can delete all documents"
    ON staff_documents
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- ====================================================
-- 7. Grant permissions
-- ====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_documents TO authenticated;

-- ====================================================
-- 8. ตรวจสอบผลลัพธ์
-- ====================================================
SELECT '🎉 staff_documents table created!' as status;

-- ตรวจสอบตาราง
SELECT
    'Table verification' as info,
    table_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_documents')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES ('staff_documents')) as t(table_name);

-- ตรวจสอบ columns
SELECT
    'Column check' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'staff_documents'
ORDER BY ordinal_position;

-- ตรวจสอบ RLS policies
SELECT
    'RLS Policies' as info,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'staff_documents';