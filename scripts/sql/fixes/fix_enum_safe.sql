-- ====================================================
-- 🔧 แก้ไข ENUM อย่างปลอดภัย - Step by Step
-- ====================================================

-- ⚠️ รันทีละขั้นตอน - ไม่ใช่ทั้งไฟล์พร้อมกัน!

-- ====================================================
-- STEP 1: เพิ่ม ENUM values (รันก่อน)
-- ====================================================

-- เพิ่ม verification_status values
DO $$
BEGIN
    -- ตรวจสอบว่ามี enum type อยู่หรือไม่
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        -- เพิ่มทีละค่า โดยไม่ error ถ้ามีอยู่แล้ว
        PERFORM 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'verification_status' AND e.enumlabel = 'pending';

        IF NOT FOUND THEN
            ALTER TYPE verification_status ADD VALUE 'pending';
            RAISE NOTICE 'Added pending to verification_status';
        END IF;

        PERFORM 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'verification_status' AND e.enumlabel = 'reviewing';

        IF NOT FOUND THEN
            ALTER TYPE verification_status ADD VALUE 'reviewing';
            RAISE NOTICE 'Added reviewing to verification_status';
        END IF;

        PERFORM 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'verification_status' AND e.enumlabel = 'verified';

        IF NOT FOUND THEN
            ALTER TYPE verification_status ADD VALUE 'verified';
            RAISE NOTICE 'Added verified to verification_status';
        END IF;

        PERFORM 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'verification_status' AND e.enumlabel = 'rejected';

        IF NOT FOUND THEN
            ALTER TYPE verification_status ADD VALUE 'rejected';
            RAISE NOTICE 'Added rejected to verification_status';
        END IF;

    ELSE
        -- ถ้าไม่มี enum ให้สร้างใหม่
        CREATE TYPE verification_status AS ENUM ('pending', 'reviewing', 'verified', 'rejected');
        RAISE NOTICE 'Created verification_status enum';
    END IF;
END $$;

-- เพิ่ม document_type values
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        -- เพิ่มทีละค่า
        PERFORM 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'document_type' AND e.enumlabel = 'id_card';

        IF NOT FOUND THEN
            ALTER TYPE document_type ADD VALUE 'id_card';
            RAISE NOTICE 'Added id_card to document_type';
        END IF;

        PERFORM 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'document_type' AND e.enumlabel = 'license';

        IF NOT FOUND THEN
            ALTER TYPE document_type ADD VALUE 'license';
            RAISE NOTICE 'Added license to document_type';
        END IF;

        PERFORM 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'document_type' AND e.enumlabel = 'certificate';

        IF NOT FOUND THEN
            ALTER TYPE document_type ADD VALUE 'certificate';
            RAISE NOTICE 'Added certificate to document_type';
        END IF;

        PERFORM 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'document_type' AND e.enumlabel = 'bank_statement';

        IF NOT FOUND THEN
            ALTER TYPE document_type ADD VALUE 'bank_statement';
            RAISE NOTICE 'Added bank_statement to document_type';
        END IF;

        PERFORM 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'document_type' AND e.enumlabel = 'other';

        IF NOT FOUND THEN
            ALTER TYPE document_type ADD VALUE 'other';
            RAISE NOTICE 'Added other to document_type';
        END IF;

    ELSE
        CREATE TYPE document_type AS ENUM ('id_card', 'license', 'certificate', 'bank_statement', 'other');
        RAISE NOTICE 'Created document_type enum';
    END IF;
END $$;

SELECT '✅ ENUM values added successfully!' as step1_status;

-- ตรวจสอบ ENUM values
SELECT
    'verification_status values' as info,
    array_agg(enumlabel ORDER BY enumsortorder) as values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'verification_status';

SELECT
    'document_type values' as info,
    array_agg(enumlabel ORDER BY enumsortorder) as values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'document_type';