-- ====================================================
-- 🚨 แก้ไขปัญหา Staff App Production - Document Upload
-- ====================================================

-- ====================================================
-- 1. สร้างตาราง service_areas ก่อน (ต้องมีก่อนเพื่อใช้ FK)
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
-- 2. สร้างตาราง staff_service_areas หลัง service_areas
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

-- เพิ่ม indexes
CREATE INDEX IF NOT EXISTS idx_staff_service_areas_staff_id ON staff_service_areas(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_service_areas_service_area_id ON staff_service_areas(service_area_id);

-- ====================================================
-- 3. Enable RLS
-- ====================================================
ALTER TABLE staff_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- 4. RLS Policies สำหรับ service_areas
-- ====================================================
DROP POLICY IF EXISTS "Anyone can view service areas" ON service_areas;
CREATE POLICY "Anyone can view service areas" ON service_areas
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage service areas" ON service_areas;
CREATE POLICY "Admins can manage service areas" ON service_areas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- ====================================================
-- 5. RLS Policies สำหรับ staff_service_areas
-- ====================================================
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
-- 6. Grant permissions
-- ====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON service_areas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_service_areas TO authenticated;

-- ====================================================
-- 7. เพิ่มข้อมูลตัวอย่าง service_areas
-- ====================================================
INSERT INTO service_areas (name_th, name_en, description) VALUES
('กรุงเทพมหานคร', 'Bangkok', 'พื้นที่บริการกรุงเทพฯ'),
('นนทบุรี', 'Nonthaburi', 'พื้นที่บริการจังหวัดนนทบุรี'),
('ปทุมธานี', 'Pathum Thani', 'พื้นที่บริการจังหวัดปทุมธานี'),
('สมุทรปราการ', 'Samut Prakan', 'พื้นที่บริการจังหวัดสมุทรปราการ')
ON CONFLICT DO NOTHING;

-- เพิ่มข้อมูลสำหรับ staff คนนี้
INSERT INTO staff_service_areas (staff_id, service_area_id)
SELECT
    '95482752-043c-436e-af71-93da53eaa041',
    sa.id
FROM service_areas sa
WHERE sa.name_th IN ('กรุงเทพมหานคร', 'นนทบุรี')
ON CONFLICT (staff_id, service_area_id) DO NOTHING;

-- ====================================================
-- 8. ตรวจสอบและแก้ไข Storage Bucket
-- ====================================================

-- ตรวจสอบ storage buckets
SELECT
    'Storage Buckets Check' as info,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'staff-documents';

-- ถ้าไม่มี bucket ให้สร้าง (run ใน Supabase Dashboard)
/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'staff-documents',
    'staff-documents',
    false,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT DO NOTHING;
*/

-- ====================================================
-- 9. ตรวจสอบ RLS Policies สำหรับ staff_documents
-- ====================================================

-- ตรวจสอบว่ามี RLS policies หรือไม่
SELECT
    'staff_documents RLS check' as info,
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies
WHERE tablename = 'staff_documents';

-- แก้ไข RLS policies ถ้าจำเป็น
DROP POLICY IF EXISTS "Staff can insert their own documents" ON staff_documents;
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

DROP POLICY IF EXISTS "Staff can view their own documents" ON staff_documents;
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

-- ====================================================
-- 10. Grant permissions สำหรับ staff_documents
-- ====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_documents TO authenticated;

-- ====================================================
-- ตรวจสอบผลลัพธ์
-- ====================================================
SELECT '🎉 Staff Production Fix Applied!' as status;

-- ตรวจสอบตารางที่สร้าง
SELECT 'Tables Check' as info, table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('service_areas', 'staff_service_areas', 'staff_documents')
ORDER BY table_name;

-- ตรวจสอบข้อมูลที่เพิ่ม
SELECT 'Data Check' as info,
    (SELECT COUNT(*) FROM service_areas) as service_areas_count,
    (SELECT COUNT(*) FROM staff_service_areas WHERE staff_id = '95482752-043c-436e-af71-93da53eaa041') as staff_areas_count;