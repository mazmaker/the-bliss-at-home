-- ============================================
-- COMPLETE FIX FOR BOOKING RLS POLICY
-- รัน SQL ทั้งหมดนี้ใน Supabase Dashboard
-- ============================================

-- 1. ตรวจสอบ user และ session ปัจจุบัน
SELECT
  'Current User Check' as step,
  auth.uid() as current_user_id,
  auth.jwt() as current_jwt_claim;

-- 2. ตรวจสอบ profile ของ user
SELECT
  'Profile Check' as step,
  id, email, role
FROM profiles
WHERE id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

-- 3. แสดง policies ปัจจุบันทั้งหมดของ bookings table
SELECT
  'Current Policies' as step,
  policyname,
  cmd,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;

-- 4. ลบ policies ทั้งหมดที่เกี่ยวข้องกับ hotel
DROP POLICY IF EXISTS "Hotel staff can create hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel staff can update hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel staff can view hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel users can create hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel users can update hotel bookings" ON bookings;
DROP POLICY IF EXISTS "Hotel users can view hotel bookings" ON bookings;

-- 5. เปิด RLS (ให้แน่ใจว่าเปิดอยู่)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 6. สร้าง policy ใหม่แบบครอบคลุม
CREATE POLICY "Allow hotel and admin full access to hotel bookings"
ON bookings FOR ALL
USING (
  is_hotel_booking = true
  AND (
    -- Allow HOTEL role users
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'HOTEL'
    )
    OR
    -- Allow ADMIN role users
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
)
WITH CHECK (
  is_hotel_booking = true
  AND (
    -- Allow HOTEL role users
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'HOTEL'
    )
    OR
    -- Allow ADMIN role users
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
);

-- 7. เพิ่ม policy สำหรับ customer bookings (ถ้าจำเป็น)
CREATE POLICY "Allow customers to manage their own bookings"
ON bookings FOR ALL
USING (
  is_hotel_booking = false
  AND (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
)
WITH CHECK (
  is_hotel_booking = false
  AND (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
);

-- 8. ตรวจสอบ policies ใหม่ที่สร้างแล้ว
SELECT
  'New Policies Created' as step,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;

-- 9. ทดสอบการ insert (แบบจำลอง)
-- หมายเหตุ: Uncomment บรรทัดด้านล่างเพื่อทดสอบ
/*
INSERT INTO bookings (
  service_id,
  booking_date,
  booking_time,
  duration,
  hotel_room_number,
  customer_notes,
  base_price,
  final_price,
  status,
  is_hotel_booking
) VALUES (
  gen_random_uuid(),
  CURRENT_DATE + INTERVAL '1 day',
  '14:00:00',
  60,
  '101',
  'Test booking from RLS fix',
  1000.00,
  1000.00,
  'confirmed',
  true
);
*/

-- 10. แสดงสรุปผล
SELECT
  'Summary' as step,
  'RLS Fix Completed' as message,
  NOW() as timestamp;

-- 11. แสดงข้อมูล user สำหรับการยืนยัน
SELECT
  'User Verification' as step,
  p.id,
  p.email,
  p.role,
  'Should be HOTEL' as expected_role,
  CASE
    WHEN p.role = 'HOTEL' THEN '✅ Correct'
    ELSE '❌ Wrong: ' || p.role
  END as status
FROM profiles p
WHERE p.id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';