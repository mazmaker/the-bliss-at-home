-- ============================================
-- FIX BOOKING RLS POLICY - IMMEDIATE SOLUTION
-- รัน SQL นี้ใน Supabase Dashboard > SQL Editor
-- ============================================

-- 1. ตรวจสอบ user role ปัจจุบัน
SELECT id, email, role
FROM profiles
WHERE id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

-- 2. อัพเดต user role เป็น HOTEL (ถ้ายังไม่ใช่)
UPDATE profiles
SET role = 'HOTEL'
WHERE id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

-- 3. ดู policies ปัจจุบันที่มีสำหรับ bookings table
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;

-- 4. ลบ policies เก่าที่อาจจะขัดแย้งกัน
DROP POLICY IF EXISTS "Hotel staff can create hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel staff can update hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel staff can view hotel bookings" ON bookings;

-- 5. สร้าง policy ใหม่ที่ใช้งานได้
CREATE POLICY "Hotel users can create hotel bookings" ON bookings
FOR INSERT WITH CHECK (
  is_hotel_booking = true
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('HOTEL', 'ADMIN')
  )
);

CREATE POLICY "Hotel users can view hotel bookings" ON bookings
FOR SELECT USING (
  is_hotel_booking = true
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('HOTEL', 'ADMIN')
  )
);

CREATE POLICY "Hotel users can update hotel bookings" ON bookings
FOR UPDATE USING (
  is_hotel_booking = true
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('HOTEL', 'ADMIN')
  )
);

-- 6. ตรวจสอบว่า policies ถูกสร้างแล้ว
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'bookings'
AND policyname LIKE '%hotel%'
ORDER BY policyname;

-- 7. ทดสอบการจองด้วยข้อมูลตัวอย่าง
-- SET LOCAL request.jwt.claim.sub = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

-- INSERT INTO bookings (
--   service_id,
--   booking_date,
--   booking_time,
--   duration,
--   hotel_room_number,
--   customer_notes,
--   base_price,
--   final_price,
--   status,
--   is_hotel_booking
-- ) VALUES (
--   'test-service-id',
--   CURRENT_DATE,
--   CURRENT_TIME,
--   60,
--   '101',
--   'Test booking',
--   1000.00,
--   1000.00,
--   'confirmed',
--   true
-- );

-- 8. แสดงผลการตรวจสอบ
SELECT
  'User Role Check' as check_type,
  CASE
    WHEN role = 'HOTEL' THEN '✅ HOTEL role correct'
    ELSE '❌ Role is: ' || role
  END as result
FROM profiles
WHERE id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3'

UNION ALL

SELECT
  'RLS Policies Check' as check_type,
  '✅ ' || COUNT(*) || ' hotel policies active' as result
FROM pg_policies
WHERE tablename = 'bookings'
AND policyname LIKE '%hotel%';