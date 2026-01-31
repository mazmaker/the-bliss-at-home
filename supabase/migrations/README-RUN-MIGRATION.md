# วิธีรัน Migration 020: Fix Customers Insert Policy

## ปัญหา
เมื่อกดปุ่ม Book เกิด Error `403 Forbidden` เพราะ RLS policy ไม่อนุญาตให้ user สร้างข้อมูล customer record ใหม่

## วิธีแก้ไข - รัน SQL ใน Supabase Dashboard

### ขั้นตอนที่ 1: เข้า Supabase Dashboard
1. เปิด browser ไปที่ https://supabase.com/dashboard
2. Login เข้า account ของคุณ
3. เลือก Project: **rbdvlfriqjnwpxmmgisf** (The Bliss at Home)

### ขั้นตอนที่ 2: เปิด SQL Editor
1. ในเมนูด้านซ้าย คลิกที่ **SQL Editor**
2. คลิกปุ่ม **New Query** เพื่อสร้าง query ใหม่

### ขั้นตอนที่ 3: Copy & Paste SQL
Copy SQL ด้านล่างนี้ทั้งหมด และ paste ลงใน SQL Editor:

\`\`\`sql
-- Migration: Fix Customers Insert Policy
-- Description: Allow authenticated users to create their own customer record
-- Version: 020

-- ============================================
-- DROP EXISTING POLICIES (if any conflicts)
-- ============================================

DROP POLICY IF EXISTS "Customers can insert own data" ON customers;

-- ============================================
-- CREATE INSERT POLICY
-- ============================================

-- Allow authenticated users to insert their own customer record
CREATE POLICY "Customers can insert own data" ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

-- ============================================
-- GRANT INSERT PERMISSION
-- ============================================

GRANT INSERT ON customers TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Customers can insert own data" ON customers IS
  'Allow authenticated users to create their own customer record';
\`\`\`

### ขั้นตอนที่ 4: รัน SQL
1. หลัง paste SQL แล้ว ให้คลิกปุ่ม **Run** (หรือกด Ctrl+Enter)
2. รอจนเห็นข้อความ **Success** ด้านล่าง
3. ถ้าเห็น error ให้ลอง run อีกครั้ง หรือติดต่อทีมพัฒนา

### ขั้นตอนที่ 5: ทดสอบ
1. กลับไปที่ Customer App: http://localhost:3002/services
2. Login เข้าสู่ระบบ
3. เลือกบริการที่ต้องการ
4. กดปุ่ม **Book**
5. ควรจะสามารถไปหน้า Booking Wizard ได้โดยไม่มี error 403

## ตรวจสอบว่า Migration สำเร็จ

รัน SQL นี้ใน SQL Editor เพื่อตรวจสอบว่า policy ถูกสร้างแล้ว:

\`\`\`sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'customers'
ORDER BY policyname;
\`\`\`

คุณควรจะเห็น policy ชื่อ **"Customers can insert own data"** ใน list

## หาก Migration ยังไม่สำเร็จ

ถ้ายังเกิด error 403 อยู่:

1. ตรวจสอบว่า policy ถูกสร้างแล้ว (ใช้ query ด้านบน)
2. ลอง refresh browser แล้ว login ใหม่
3. ตรวจสอบ browser console ว่ามี error อะไรเพิ่มเติม
4. ติดต่อทีมพัฒนาพร้อม screenshot error
