-- 🔧 HOTEL USER MAPPING FIX - Copy to Supabase SQL Editor
-- แก้ปัญหาการจองไม่ตรงกับโรงแรม
-- Date: 2026-02-20
-- Run this in: Supabase Dashboard > SQL Editor

-- =============================================================================
-- 🚨 PROBLEM: จองจาก โรงแรมดุสิต ธานี แต่ประวัติไปอยู่ใน รีสอร์ทในฝัน เชียงใหม่
-- 💡 SOLUTION: เพิ่ม hotel_id ใน profiles table เพื่อ map users กับโรงแรมที่ถูกต้อง
-- =============================================================================

-- ✅ STEP 1: Add hotel_id column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_hotel_id ON profiles(hotel_id);

-- Add documentation
COMMENT ON COLUMN profiles.hotel_id IS 'Foreign key reference to hotels table - maps users to their specific hotel';

-- ✅ STEP 2: Map existing hotel users to correct hotels
-- Map info@dusit.com → Dusit Thani Bangkok
UPDATE profiles
SET hotel_id = '550e8400-e29b-41d4-a716-446655440003'
WHERE email = 'info@dusit.com' AND role = 'HOTEL';

-- Map reservations@hilton.com → Hilton Bangkok
UPDATE profiles
SET hotel_id = '550e8400-e29b-41d4-a716-446655440001'
WHERE email = 'reservations@hilton.com' AND role = 'HOTEL';

-- Map ireservations@hilton.com → Hilton Bangkok
UPDATE profiles
SET hotel_id = '550e8400-e29b-41d4-a716-446655440001'
WHERE email = 'ireservations@hilton.com' AND role = 'HOTEL';

-- Map sweettuay emails → Nimman Resort Chiang Mai
UPDATE profiles
SET hotel_id = '550e8400-e29b-41d4-a716-446655440002'
WHERE email IN ('sweettuay.bt@gmail.com', 'isweettuay.bt@gmail.com') AND role = 'HOTEL';

-- Map test-hotel → Test Hotel Bangkok
UPDATE profiles
SET hotel_id = '3082d55a-b185-49b9-b4fc-01c00d61e7e1'
WHERE email = 'test-hotel@thebliss.com' AND role = 'HOTEL';

-- ✅ STEP 3: Verification - Show hotel user mappings
SELECT
  '🎯 HOTEL USER MAPPINGS' as status,
  ROW_NUMBER() OVER (ORDER BY h.name_th, p.email) as no,
  p.email,
  p.role,
  h.name_th as hotel_name,
  h.hotel_slug,
  p.hotel_id,
  CASE
    WHEN p.hotel_id IS NOT NULL THEN '✅ Mapped'
    ELSE '❌ Not Mapped'
  END as mapping_status
FROM profiles p
LEFT JOIN hotels h ON p.hotel_id = h.id
WHERE p.role = 'HOTEL'
ORDER BY h.name_th NULLS LAST, p.email;

-- ✅ STEP 4: Show booking distribution by hotel
SELECT
  '📊 BOOKINGS BY HOTEL' as status,
  h.name_th as hotel_name,
  h.hotel_slug,
  h.id as hotel_id,
  COUNT(b.id) as total_bookings,
  h.status as hotel_status
FROM hotels h
LEFT JOIN bookings b ON h.id = b.hotel_id
GROUP BY h.id, h.name_th, h.hotel_slug, h.status
ORDER BY total_bookings DESC, h.name_th;

-- ✅ STEP 5: Show recent bookings with guest names
SELECT
  '📋 RECENT BOOKINGS' as status,
  ROW_NUMBER() OVER (ORDER BY b.created_at DESC) as no,
  b.booking_number,
  CASE
    WHEN b.customer_notes ~ 'Guest:\s*([^,\n]+)'
    THEN TRIM(SUBSTRING(b.customer_notes FROM 'Guest:\s*([^,\n]+)'))
    ELSE 'Unknown Guest'
  END as guest_name,
  b.booking_date,
  h.name_th as hotel_name,
  h.hotel_slug,
  b.created_at
FROM bookings b
LEFT JOIN hotels h ON b.hotel_id = h.id
ORDER BY b.created_at DESC
LIMIT 10;

-- ✅ STEP 6: Problem Analysis
SELECT
  '🔍 PROBLEM ANALYSIS' as analysis,
  COUNT(CASE WHEN b.hotel_id = '550e8400-e29b-41d4-a716-446655440003' THEN 1 END) as dusit_thani_bookings,
  COUNT(CASE WHEN b.hotel_id = '550e8400-e29b-41d4-a716-446655440002' THEN 1 END) as resort_chiang_mai_bookings,
  COUNT(CASE WHEN b.hotel_id IS NULL THEN 1 END) as null_hotel_bookings,
  COUNT(*) as total_bookings
FROM bookings b;

-- ✅ SUCCESS MESSAGE
SELECT
  '🎉 HOTEL MAPPING FIX COMPLETED!' as message,
  'Users are now properly mapped to their hotels' as description,
  'Next: Update server authentication to use hotel_id from profiles' as next_step;