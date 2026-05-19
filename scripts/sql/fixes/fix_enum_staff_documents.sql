-- ====================================================
-- 🔧 แก้ไข ENUM ปัญหาใน staff_documents table
-- ====================================================

-- ====================================================
-- 1. ตรวจสอบ ENUM types ที่มีอยู่
-- ====================================================
SELECT
    'Current ENUM Types' as info,
    typname as enum_name,
    array_agg(enumlabel ORDER BY enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('verification_status', 'document_type', 'document_status')
GROUP BY typname;

-- ====================================================
-- 2. ตรวจสอบโครงสร้างตาราง staff_documents
-- ====================================================
SELECT
    'staff_documents columns' as info,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'staff_documents'
ORDER BY ordinal_position;

-- ====================================================
-- 3. วิธีแก้ไข 1: เพิ่มค่าใน ENUM ถ้าขาด
-- ====================================================

-- ตรวจสอบและเพิ่มค่า ENUM ถ้าขาด
DO $$
BEGIN
    -- ตรวจสอบว่ามี verification_status enum หรือไม่
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        -- เพิ่มค่าที่อาจจะขาดใน verification_status enum
        BEGIN
            ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'pending';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'reviewing';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'verified';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'rejected';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        RAISE NOTICE 'verification_status enum updated';
    END IF;

    -- ตรวจสอบว่ามี document_type enum หรือไม่
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        -- เพิ่มค่าที่อาจจะขาดใน document_type enum
        BEGIN
            ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'id_card';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'license';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'certificate';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'bank_statement';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'other';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        RAISE NOTICE 'document_type enum updated';
    END IF;
END $$;

-- ====================================================
-- 4. วิธีแก้ไข 2: สร้างตาราง staff_documents ถ้าไม่มี (ใช้ ENUM)
-- ====================================================

-- สร้าง ENUM types ถ้าไม่มี
DO $$
BEGIN
    -- สร้าง verification_status enum ถ้าไม่มี
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('pending', 'reviewing', 'verified', 'rejected');
        RAISE NOTICE 'verification_status enum created';
    END IF;

    -- สร้าง document_type enum ถ้าไม่มี
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM ('id_card', 'license', 'certificate', 'bank_statement', 'other');
        RAISE NOTICE 'document_type enum created';
    END IF;
END $$;

-- สร้างตาราง staff_documents ด้วย ENUM
CREATE TABLE IF NOT EXISTS staff_documents (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

    -- Document information (ใช้ ENUM)
    document_type document_type NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    mime_type TEXT NOT NULL,

    -- Status tracking (ใช้ ENUM)
    verification_status verification_status NOT NULL DEFAULT 'pending',
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
-- 5. สร้าง indexes
-- ====================================================
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON staff_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_status ON staff_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_staff_documents_document_type ON staff_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_staff_documents_created_at ON staff_documents(created_at DESC);

-- ====================================================
-- 6. สร้าง trigger สำหรับ updated_at
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
-- 7. Enable RLS และ Policies
-- ====================================================
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;

-- ลบ policies เก่า
DROP POLICY IF EXISTS "Staff can view their own documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can insert their own documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can update their own pending documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can delete their own non-verified documents" ON staff_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON staff_documents;
DROP POLICY IF EXISTS "Admins can update all documents" ON staff_documents;
DROP POLICY IF EXISTS "Admins can delete all documents" ON staff_documents;

-- สร้าง policies ใหม่
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
    );

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

CREATE POLICY "Admins can view all documents"
    ON staff_documents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Admins can update all documents"
    ON staff_documents
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Admins can delete all documents"
    ON staff_documents
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- ====================================================
-- 8. Grant permissions
-- ====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_documents TO authenticated;

-- ====================================================
-- 9. ตรวจสอบผลลัพธ์
-- ====================================================
SELECT '🎉 staff_documents with ENUM fixed!' as status;

-- ตรวจสอบ ENUM values หลังแก้ไข
SELECT
    'Final ENUM Values' as info,
    typname as enum_name,
    array_agg(enumlabel ORDER BY enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('verification_status', 'document_type')
GROUP BY typname;

-- ตรวจสอบ table structure
SELECT
    'Final table structure' as info,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'staff_documents'
AND column_name IN ('document_type', 'verification_status');