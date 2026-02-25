-- DISABLE RLS TEST
-- ปิด RLS เพื่อทดสอบว่าปัญหาอยู่ที่ auth token หรือ RLS

-- ปิด RLS ชั่วคราว
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- ตรวจสอบสถานะ
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'services';