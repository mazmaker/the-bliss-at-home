-- FINAL RLS SERVICES FIX
-- รันใน Supabase Dashboard → SQL Editor

-- 1. ปิด RLS ชั่วคราว (เพื่อให้แน่ใจว่าทำงาน)
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- 2. ลบ policies เก่าทั้งหมด
DROP POLICY IF EXISTS "All authenticated users can view active services" ON services;
DROP POLICY IF EXISTS "All users can view active services" ON services;
DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;
DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;
DROP POLICY IF EXISTS "Services viewable by authenticated users" ON services;
DROP POLICY IF EXISTS "Admins can view all services" ON services;

-- 3. เปิด RLS ใหม่
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- 4. สร้าง policy ง่ายๆ ที่แน่ใจว่าทำงาน
CREATE POLICY "Allow all authenticated users to view services"
ON services FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. ถ้าข้างบนไม่ได้ผล ให้ใช้อันนี้แทน (อนุญาตทุกคน)
-- CREATE POLICY "Allow everyone to view services"
-- ON services FOR SELECT
-- USING (true);

-- 6. ตรวจสอบ policies ที่สร้างแล้ว
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'services';