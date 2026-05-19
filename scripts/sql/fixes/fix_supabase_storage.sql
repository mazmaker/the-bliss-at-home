-- ====================================================
-- 🗃️ แก้ไข Supabase Storage สำหรับ Document Upload
-- ====================================================

-- ====================================================
-- 1. ตรวจสอบ Storage Buckets ปัจจุบัน
-- ====================================================
SELECT
    'Current Storage Buckets' as info,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets;

-- ====================================================
-- 2. สร้าง staff-documents bucket ถ้าไม่มี
-- ====================================================
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
) VALUES (
    'staff-documents',
    'staff-documents',
    false, -- ไม่เป็น public
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/webp'];

-- ====================================================
-- 3. ตรวจสอบ Storage RLS Policies
-- ====================================================
SELECT
    'Storage Policies Check' as info,
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

-- ====================================================
-- 4. แก้ไข Storage RLS Policies
-- ====================================================

-- ลบ policies เก่า
DROP POLICY IF EXISTS "Staff can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can access all staff documents" ON storage.objects;

-- สร้าง policies ใหม่สำหรับ staff-documents bucket

-- 1. Staff สามารถอัปโหลดเอกสารของตัวเองได้
CREATE POLICY "Staff can upload own documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'staff-documents'
        AND (storage.foldername(name))[1] IN (
            SELECT s.id::text
            FROM staff s
            WHERE s.profile_id = auth.uid()
        )
    );

-- 2. Staff สามารถดูเอกสารของตัวเองได้
CREATE POLICY "Staff can view own documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'staff-documents'
        AND (storage.foldername(name))[1] IN (
            SELECT s.id::text
            FROM staff s
            WHERE s.profile_id = auth.uid()
        )
    );

-- 3. Staff สามารถอัปเดตเอกสารของตัวเองได้
CREATE POLICY "Staff can update own documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'staff-documents'
        AND (storage.foldername(name))[1] IN (
            SELECT s.id::text
            FROM staff s
            WHERE s.profile_id = auth.uid()
        )
    );

-- 4. Staff สามารถลบเอกสารของตัวเองได้
CREATE POLICY "Staff can delete own documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'staff-documents'
        AND (storage.foldername(name))[1] IN (
            SELECT s.id::text
            FROM staff s
            WHERE s.profile_id = auth.uid()
        )
    );

-- 5. Admin สามารถเข้าถึงเอกสารทั้งหมดได้
CREATE POLICY "Admins can access all staff documents"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'staff-documents'
        AND (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
            OR auth.jwt() ->> 'role' = 'service_role'
        )
    )
    WITH CHECK (
        bucket_id = 'staff-documents'
        AND (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
            OR auth.jwt() ->> 'role' = 'service_role'
        )
    );

-- ====================================================
-- 5. ตรวจสอบผลลัพธ์
-- ====================================================

-- ตรวจสอบ bucket ที่สร้าง
SELECT
    '✅ Storage Bucket Created' as status,
    name,
    public,
    file_size_limit / 1024 / 1024 as size_limit_mb,
    array_length(allowed_mime_types, 1) as allowed_types_count
FROM storage.buckets
WHERE name = 'staff-documents';

-- ตรวจสอบ policies ที่สร้าง
SELECT
    '✅ Storage Policies Created' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%staff%document%';

SELECT '🎉 Supabase Storage Fixed!' as result;