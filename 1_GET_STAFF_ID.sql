-- ============================================
-- ขั้นตอนที่ 1: หา Staff ID ของคุณ
-- ============================================
-- รัน SQL นี้เพื่อดู Staff ID ของคุณ
-- แล้วคัดลอก ID ไปใส่ในไฟล์ 2_SEED_WITH_STAFF_ID.sql

SELECT
    id as staff_id,
    email,
    full_name,
    role
FROM profiles
WHERE role = 'STAFF'
ORDER BY created_at DESC;

-- จด staff_id ที่ได้ไว้ แล้วไปรันไฟล์ถัดไป
