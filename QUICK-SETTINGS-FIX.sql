-- ⚡ QUICK SETTINGS FIX - Copy-Paste ลงใน Supabase SQL Editor
-- แก้ "column hotels.settings does not exist" ใน 1 คลิก

-- เพิ่ม settings column
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- เพิ่ม default settings
UPDATE hotels SET settings = '{"discount_rate":15,"commission_rate":20,"auto_assign":true}' WHERE settings = '{}' OR settings IS NULL;

-- ตรวจสอบผลลัพธ์
SELECT '✅ SETTINGS FIXED!' as status, name_th, settings FROM hotels ORDER BY name_th;