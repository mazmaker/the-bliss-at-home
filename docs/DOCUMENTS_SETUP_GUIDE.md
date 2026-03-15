# 📄 Documents Management Setup Guide

คู่มือการติดตั้งและตั้งค่าระบบจัดการเอกสาร KYC สำหรับ The Bliss Massage at Home

## 📋 Table of Contents
1. [Database Setup](#database-setup)
2. [Supabase Storage Setup](#supabase-storage-setup)
3. [LINE Notify Setup](#line-notify-setup)
4. [Environment Variables](#environment-variables)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## 1. Database Setup

### Step 1: Run Migration Files

เข้าไปที่ Supabase Dashboard → SQL Editor แล้วรันไฟล์ทีละไฟล์ตามลำดับ:

#### 1.1 สร้างตาราง staff_documents
```bash
# File: packages/supabase/migrations/20250205_create_staff_documents.sql
```

คัดลอกและรันใน SQL Editor:
- สร้างตาราง `staff_documents`
- สร้าง enum types สำหรับ `document_type` และ `document_status`
- สร้าง indexes สำหรับ performance
- สร้าง triggers สำหรับ auto-update timestamps

#### 1.2 สร้าง RLS Policies
```bash
# File: packages/supabase/migrations/20250205_staff_documents_rls.sql
```

คัดลอกและรันใน SQL Editor:
- เปิดใช้งาน Row Level Security
- สร้าง policies สำหรับ Staff (ดู/เพิ่ม/แก้ไข/ลบเอกสารของตัวเอง)
- สร้าง policies สำหรับ Admin (จัดการเอกสารทั้งหมด)
- สร้างตาราง audit log

### Step 2: ตรวจสอบว่า Migration สำเร็จ

```sql
-- ตรวจสอบว่าตารางถูกสร้าง
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'staff_documents';

-- ตรวจสอบ RLS policies
SELECT * FROM pg_policies WHERE tablename = 'staff_documents';

-- ทดสอบ insert ข้อมูล
INSERT INTO staff_documents (
    staff_id,
    document_type,
    file_url,
    file_name,
    file_size,
    mime_type
) VALUES (
    'your-staff-id-here',
    'id_card',
    'https://example.com/test.jpg',
    'test.jpg',
    12345,
    'image/jpeg'
);
```

---

## 2. Supabase Storage Setup

### Step 1: สร้าง Storage Bucket

1. เข้า Supabase Dashboard → Storage
2. คลิก "Create bucket"
3. ตั้งค่าดังนี้:
   - **Name**: `staff-documents`
   - **Public**: ❌ (ปิด - ควรเป็น Private)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**:
     - `image/jpeg`
     - `image/png`
     - `application/pdf`

### Step 2: สร้าง Storage Policies

ไปที่ Storage → staff-documents → Policies แล้วสร้าง policies ดังนี้:

#### 2.1 Policy: Staff Upload to Own Folder
```sql
CREATE POLICY "Staff upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'staff-documents'
    AND (storage.foldername(name))[1] = (
        SELECT id::text FROM staff WHERE user_id = auth.uid()
    )
);
```

#### 2.2 Policy: Staff View Own Documents
```sql
CREATE POLICY "Staff view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'staff-documents'
    AND (storage.foldername(name))[1] = (
        SELECT id::text FROM staff WHERE user_id = auth.uid()
    )
);
```

#### 2.3 Policy: Admin View All Documents
```sql
CREATE POLICY "Admin view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'staff-documents'
    AND auth.uid() IN (
        SELECT user_id FROM admin_users WHERE role = 'ADMIN'
    )
);
```

#### 2.4 Policy: Admin Delete Documents
```sql
CREATE POLICY "Admin delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'staff-documents'
    AND auth.uid() IN (
        SELECT user_id FROM admin_users WHERE role = 'ADMIN'
    )
);
```

### Step 3: ทดสอบ Storage

```typescript
// ทดสอบอัปโหลดไฟล์
const { data, error } = await supabase.storage
  .from('staff-documents')
  .upload('test-staff-id/test.jpg', file)

console.log('Upload result:', { data, error })

// ทดสอบดึง URL
const { data: { publicUrl } } = supabase.storage
  .from('staff-documents')
  .getPublicUrl('test-staff-id/test.jpg')

console.log('Public URL:', publicUrl)
```

---

## 3. LINE Notify Setup

### Step 1: สมัคร LINE Notify

1. ไปที่ https://notify-bot.line.me/
2. ล็อกอินด้วย LINE account
3. คลิก "My page" → "Generate token"
4. ตั้งชื่อ Token (เช่น "The Bliss Admin Notifications")
5. เลือก chat room ที่ต้องการให้ส่งการแจ้งเตือน
6. คัดลอก Token (จะแสดงครั้งเดียว!)

### Step 2: เก็บ Token ไว้ปลอดภัย

**สำหรับ Admin:**
- Token: `YOUR_ADMIN_LINE_NOTIFY_TOKEN`
- ใช้สำหรับแจ้งเตือนเมื่อมีเอกสารใหม่

**สำหรับ Staff (แต่ละคน):**
- แต่ละ staff ต้องสมัคร LINE Notify เอง
- เก็บ token ในตาราง `staff` หรือ `staff_profile`
- ใช้สำหรับแจ้งเตือนสถานะเอกสาร

### Step 3: เพิ่ม Line Token ในตาราง Staff (Optional)

```sql
-- เพิ่ม column สำหรับเก็บ LINE token
ALTER TABLE staff ADD COLUMN line_notify_token TEXT;

-- หรือถ้ามีตาราง staff_profile
ALTER TABLE staff_profile ADD COLUMN line_notify_token TEXT;
```

### Step 4: ทดสอบการส่ง Notification

```typescript
import { lineNotifyService } from '@bliss/supabase/notifications/lineNotifyService'

// ทดสอบส่งการแจ้งเตือน
const success = await lineNotifyService.testConnection('YOUR_TOKEN_HERE')
console.log('LINE Notify test:', success ? 'Success' : 'Failed')
```

---

## 4. Environment Variables

เพิ่ม environment variables ในไฟล์ `.env` ของแต่ละ app:

### Admin App (.env)
```env
# LINE Notify for Admin
VITE_LINE_NOTIFY_TOKEN_ADMIN=your_admin_line_notify_token_here
```

### Staff App (.env)
```env
# LINE Notify (Optional - if using group token)
VITE_LINE_NOTIFY_TOKEN_STAFF=your_staff_group_token_here
```

### Supabase Edge Functions (.env)
```env
LINE_NOTIFY_ADMIN_TOKEN=your_admin_line_notify_token_here
```

---

## 5. Testing

### 5.1 ทดสอบ Upload Document

1. เข้าหน้า Admin: http://localhost:3007/admin/staff
2. คลิกดูรายละเอียดพนักงาน
3. เลือกแท็บ "เอกสาร KYC"
4. คลิก "เพิ่มเอกสาร"
5. อัปโหลดไฟล์ทดสอบ (JPG, PNG, หรือ PDF)
6. ตรวจสอบว่าไฟล์ถูกสร้างใน Supabase Storage
7. ตรวจสอบว่า record ถูกสร้างในตาราง `staff_documents`

### 5.2 ทดสอบ Document Viewer

1. คลิกปุ่ม "ดูเอกสาร"
2. ตรวจสอบว่า Modal เปิดขึ้นมา
3. ทดสอบ Zoom In/Out
4. ทดสอบหมุนภาพ
5. ทดสอบดาวน์โหลด

### 5.3 ทดสอบ Approve/Reject

1. อัปโหลดเอกสารที่มีสถานะ "pending"
2. คลิกปุ่ม "อนุมัติ" (✓)
3. ตรวจสอบว่าสถานะเปลี่ยนเป็น "verified"
4. อัปโหลดเอกสารใหม่
5. คลิกปุ่ม "ปฏิเสธ" (✗)
6. ระบุเหตุผล
7. ตรวจสอบว่าสถานะเปลี่ยนเป็น "rejected" พร้อมเหตุผล

### 5.4 ทดสอบ LINE Notify

```typescript
// ทดสอบแจ้งเตือน Admin
await lineNotifyService.notifyAdminNewDocument({
  staffName: 'ทดสอบพนักงาน',
  staffPhone: '081-234-5678',
  documentType: 'สำเนาบัตรประชาชน',
  documentId: 'test-doc-id',
  status: 'uploaded',
})

// ทดสอบแจ้งเตือน Staff - Approved
await lineNotifyService.notifyStaffDocumentVerified(
  'staff_line_token',
  {
    documentType: 'สำเนาบัตรประชาชน',
    adminName: 'Admin Test',
    status: 'verified',
  }
)

// ทดสอบแจ้งเตือน Staff - Rejected
await lineNotifyService.notifyStaffDocumentRejected(
  'staff_line_token',
  {
    documentType: 'สำเนาบัตรประชาชน',
    rejectionReason: 'รูปภาพไม่ชัดเจน',
    adminName: 'Admin Test',
    status: 'rejected',
  }
)
```

---

## 6. Troubleshooting

### ปัญหา: ไม่สามารถอัปโหลดไฟล์ได้

**สาเหตุที่เป็นไปได้:**
- Storage bucket ไม่ถูกสร้าง
- Storage policies ไม่ถูกต้อง
- ไฟล์มีขนาดใหญ่เกิน 10MB
- ประเภทไฟล์ไม่ถูก allow

**วิธีแก้:**
1. ตรวจสอบว่า bucket `staff-documents` ถูกสร้างแล้ว
2. ตรวจสอบ Storage policies
3. ลองอัปโหลดไฟล์ขนาดเล็กกว่า 5MB
4. ตรวจสอบ Console ใน Browser DevTools

### ปัญหา: ไม่สามารถดูเอกสารได้

**สาเหตุที่เป็นไปได้:**
- RLS policies ไม่อนุญาต
- ไฟล์ไม่มีอยู่จริงใน Storage
- URL ไม่ถูกต้อง

**วิธีแก้:**
1. ตรวจสอบ RLS policies ในตาราง `staff_documents`
2. ตรวจสอบว่าไฟล์มีอยู่ใน Storage
3. ตรวจสอบ `file_url` ในฐานข้อมูล

### ปัญหา: LINE Notify ไม่ส่งการแจ้งเตือน

**สาเหตุที่เป็นไปได้:**
- Token ไม่ถูกต้อง
- Token หมดอายุ
- ENV variables ไม่ถูกตั้งค่า

**วิธีแก้:**
1. ตรวจสอบว่า token ยังใช้งานได้
2. Generate token ใหม่ถ้าจำเป็น
3. ตรวจสอบ `.env` file
4. Restart dev server หลังเปลี่ยน ENV

### ปัญหา: Permission Denied

**สาเหตุที่เป็นไปได้:**
- ผู้ใช้ไม่มีสิทธิ์
- RLS policies ไม่อนุญาต
- User ไม่ได้ authenticate

**วิธีแก้:**
1. ตรวจสอบว่า user login แล้ว
2. ตรวจสอบ role ของ user (ADMIN/STAFF)
3. ตรวจสอบ RLS policies อีกครั้ง

---

## 📝 Checklist

- [ ] รัน migration files ใน Supabase
- [ ] สร้าง Storage bucket `staff-documents`
- [ ] สร้าง Storage policies
- [ ] สมัคร LINE Notify token (Admin)
- [ ] เพิ่ม ENV variables
- [ ] ทดสอบอัปโหลดไฟล์
- [ ] ทดสอบ Approve/Reject
- [ ] ทดสอบ LINE Notify
- [ ] ทดสอบด้วย real user accounts

---

## 🎉 เสร็จสิ้น!

หลังจากทำตาม guide นี้แล้ว ระบบ Documents Management จะพร้อมใช้งานแล้ว!

ถ้ามีปัญหาหรือข้อสงสัย:
- ตรวจสอบ Console logs
- ตรวจสอบ Supabase logs
- ดู Troubleshooting section ด้านบน
