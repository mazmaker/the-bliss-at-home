# 🚀 วิธี Apply Provider Preference Migration

## ขั้นตอนที่ 1: Copy SQL ไป Supabase Dashboard

1. **เปิด Supabase Dashboard**: https://supabase.com/dashboard
2. **เลือก Project ของคุณ**
3. **ไปที่ SQL Editor** (ซ้ายมือ)
4. **กด "+ New Query"**
5. **Copy & Paste SQL ด้านล่างนี้:**

```sql
-- 🚀 Apply Provider Preference Migration
-- Date: 2026-02-19

-- 1. Add provider_preference column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS provider_preference VARCHAR(20)
CHECK (provider_preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference'))
DEFAULT 'no-preference';

-- 2. Add index for fast preference queries
CREATE INDEX IF NOT EXISTS idx_bookings_provider_preference ON bookings(provider_preference)
WHERE provider_preference IS NOT NULL;

-- 3. Add comment to document the column
COMMENT ON COLUMN bookings.provider_preference IS 'Customer provider preference for staff assignment';

-- 4. Update existing bookings with default value
UPDATE bookings
SET provider_preference = 'no-preference'
WHERE provider_preference IS NULL;

-- 5. Create validation function
CREATE OR REPLACE FUNCTION validate_provider_preference(preference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference');
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION validate_provider_preference TO authenticated;
GRANT EXECUTE ON FUNCTION validate_provider_preference TO anon;

-- 7. Success message
SELECT
  '✅ Provider Preference Migration Applied Successfully!' as status,
  'Now restart Hotel App to see the UI' as next_step;
```

6. **กด "RUN"**
7. **เช็คว่าได้ผลลัพธ์:** `✅ Provider Preference Migration Applied Successfully!`

## ขั้นตอนที่ 2: Restart Hotel App

1. **ปิด Hotel App browser tab**
2. **เปิดใหม่:** http://localhost:3003
3. **ทดสอบการจอง:**
   - เลือกบริการ → ถัดไป
   - **ในหน้า "ข้อมูลผู้รับบริการ"** จะเห็น:
     ```
     ความต้องการผู้ให้บริการ
     🔘 ผู้หญิงเท่านั้น
     🔘 ผู้ชายเท่านั้น
     🔘 ต้องการผู้หญิง
     🔘 ต้องการผู้ชาย
     🔘 ไม่ระบุ
     ```

## ✅ ผลลัพธ์ที่คาดหวัง:

- เห็น UI สำหรับเลือก Provider Preference
- สามารถเลือกได้ทั้ง 5 ตัวเลือก
- ข้อมูลถูกบันทึกใน database
- Booking history แสดง preference ที่เลือก

## 🔧 หาก Error:

1. **Column already exists**: ✅ ปกติ - migration ถูก apply แล้ว
2. **Permission denied**: ตรวจสอบว่าใช้ Service Role key
3. **Syntax error**: Copy SQL ใหม่อีกครั้ง

---
📅 Updated: 2026-02-20
🎯 Feature: Provider Preference Selection
📍 Location: Hotel App → Booking Modal → Step 1