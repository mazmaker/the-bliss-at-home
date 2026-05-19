-- ====================================================
-- 🚨 แก้ไข Production Issues - เรียงลำดับถูกต้อง
-- ====================================================

-- ====================================================
-- 1. สร้าง service_areas ก่อน (ไม่มี dependencies)
-- ====================================================
CREATE TABLE IF NOT EXISTS service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_th TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================
-- 2. เพิ่มข้อมูล service_areas ทันที
-- ====================================================
INSERT INTO service_areas (name_th, name_en, description) VALUES
('กรุงเทพมหานคร', 'Bangkok', 'พื้นที่บริการกรุงเทพฯ'),
('นนทบุรี', 'Nonthaburi', 'พื้นที่บริการจังหวัดนนทบุรี'),
('ปทุมธานี', 'Pathum Thani', 'พื้นที่บริการจังหวัดปทุมธานี'),
('สมุทรปราการ', 'Samut Prakan', 'พื้นที่บริการจังหวัดสมุทรปราการ')
ON CONFLICT DO NOTHING;

-- ====================================================
-- 3. สร้าง staff_service_areas (หลังจากมี service_areas แล้ว)
-- ====================================================
CREATE TABLE IF NOT EXISTS staff_service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    service_area_id UUID NOT NULL REFERENCES service_areas(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, service_area_id)
);

-- ====================================================
-- 4. เพิ่ม indexes
-- ====================================================
CREATE INDEX IF NOT EXISTS idx_staff_service_areas_staff_id ON staff_service_areas(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_service_areas_service_area_id ON staff_service_areas(service_area_id);

-- ====================================================
-- 5. Enable RLS
-- ====================================================
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_service_areas ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- 6. RLS Policies
-- ====================================================

-- service_areas - ทุกคนดูได้
DROP POLICY IF EXISTS "Anyone can view service areas" ON service_areas;
CREATE POLICY "Anyone can view service areas" ON service_areas
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage service areas" ON service_areas;
CREATE POLICY "Admins can manage service areas" ON service_areas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- staff_service_areas - staff ดูของตัวเองได้
DROP POLICY IF EXISTS "Staff can manage own service areas" ON staff_service_areas;
CREATE POLICY "Staff can manage own service areas" ON staff_service_areas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN profiles p ON p.id = s.profile_id
            WHERE s.id = staff_service_areas.staff_id AND p.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all service areas" ON staff_service_areas;
CREATE POLICY "Admins can manage all service areas" ON staff_service_areas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- ====================================================
-- 7. Grant permissions
-- ====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON service_areas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_service_areas TO authenticated;

-- ====================================================
-- 8. เพิ่มข้อมูลสำหรับ staff คนนี้
-- ====================================================
INSERT INTO staff_service_areas (staff_id, service_area_id)
SELECT
    '95482752-043c-436e-af71-93da53eaa041',
    sa.id
FROM service_areas sa
WHERE sa.name_th IN ('กรุงเทพมหานคร', 'นนทบุรี')
ON CONFLICT (staff_id, service_area_id) DO NOTHING;

-- ====================================================
-- 9. ตรวจสอบ staff_documents table และ RLS
-- ====================================================

-- ตรวจสอบว่ามี staff_documents table หรือไม่
SELECT 'staff_documents table check' as info,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_documents')
        THEN 'EXISTS'
        ELSE 'MISSING'
    END as status;

-- แก้ไข RLS policies สำหรับ staff_documents ถ้ามีตาราง
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_documents') THEN
        -- Enable RLS
        EXECUTE 'ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY';

        -- Drop existing policies
        DROP POLICY IF EXISTS "Staff can insert their own documents" ON staff_documents;
        DROP POLICY IF EXISTS "Staff can view their own documents" ON staff_documents;

        -- Create new policies
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

        -- Grant permissions
        GRANT SELECT, INSERT, UPDATE, DELETE ON staff_documents TO authenticated;

        RAISE NOTICE 'staff_documents RLS policies updated';
    ELSE
        RAISE NOTICE 'staff_documents table does not exist - skipping';
    END IF;
END $$;

-- ====================================================
-- ตรวจสอบผลลัพธ์
-- ====================================================
SELECT '🎉 Production Fix Applied Successfully!' as status;

-- ตรวจสอบตารางที่สร้าง
SELECT 'Tables Created' as info,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'service_areas') as service_areas_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'staff_service_areas') as staff_service_areas_exists;

-- ตรวจสอบข้อมูล
SELECT 'Data Inserted' as info,
    (SELECT COUNT(*) FROM service_areas) as service_areas_count,
    (SELECT COUNT(*) FROM staff_service_areas WHERE staff_id = '95482752-043c-436e-af71-93da53eaa041') as staff_areas_count;