-- 🔧 COPY-PASTE ลงใน Supabase SQL Editor แล้วกด RUN
-- แก้ปัญหาการจองผิดโรงแรมใน 1 คลิก

-- เพิ่ม hotel_id column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id);
CREATE INDEX IF NOT EXISTS idx_profiles_hotel_id ON profiles(hotel_id);

-- Map users กับโรงแรมที่ถูกต้อง
UPDATE profiles SET hotel_id = '550e8400-e29b-41d4-a716-446655440003' WHERE email = 'info@dusit.com' AND role = 'HOTEL';
UPDATE profiles SET hotel_id = '550e8400-e29b-41d4-a716-446655440002' WHERE email IN ('sweettuay.bt@gmail.com', 'isweettuay.bt@gmail.com') AND role = 'HOTEL';
UPDATE profiles SET hotel_id = '550e8400-e29b-41d4-a716-446655440001' WHERE email IN ('reservations@hilton.com', 'ireservations@hilton.com') AND role = 'HOTEL';

-- ตรวจสอบผลลัพธ์
SELECT
  '✅ FIXED!' as status,
  p.email,
  h.name_th as hotel_name,
  CASE WHEN p.hotel_id IS NOT NULL THEN '✅ Mapped' ELSE '❌ Not Mapped' END as result
FROM profiles p
LEFT JOIN hotels h ON p.hotel_id = h.id
WHERE p.role = 'HOTEL'
ORDER BY h.name_th;

SELECT '🎉 แก้เสร็จแล้ว! ลองจองใหม่ดู' as message;