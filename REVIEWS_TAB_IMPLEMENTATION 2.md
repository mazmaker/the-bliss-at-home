# การใช้งาน Reviews Tab - คำแนะนำ

## ขั้นตอนการติดตั้ง

### 1. รัน SQL Migrations

รันใน Supabase SQL Editor ตามลำดับ:

#### 1.1 แก้ไข RLS Policies
```sql
-- ไฟล์: supabase/migrations/20260208_fix_reviews_rls.sql
```

#### 1.2 Seed ข้อมูล Mock Reviews
```sql
-- ไฟล์: supabase/migrations/20260208_seed_reviews.sql
```

### 2. อัพเดท StaffDetail.tsx

เพิ่ม import ที่บรรทัด 66 (หลัง useAdminAuth):

```typescript
import { ReviewsTabContent } from '../components/ReviewsTabContent'
```

แทนที่ function `ReviewsTab` (บรรทัด 1266-1275) ด้วย:

```typescript
// Reviews Tab Component
function ReviewsTab({ staff }: { staff: Staff }) {
  return <ReviewsTabContent staff={staff} />
}
```

## ฟีเจอร์ที่มี

### 1. แสดงรีวิวจากลูกค้า
- คะแนนดาว (1-5)
- ข้อความรีวิว
- คะแนนย่อย (ความสะอาด, ความเป็นมืออาชีพ, ทักษะ)
- วันที่รีวิว (แสดงเป็น relative time)

### 2. สถิติรีวิว
- คะแนนเฉลี่ย
- จำนวนรีวิวทั้งหมด
- การกระจายของคะแนน (1-5 ดาว)

### 3. ตัวกรองและการจัดเรียง
- กรองตามคะแนน (1-5 ดาว)
- เรียงตามวันที่ (ล่าสุด/เก่าสุด)
- เรียงตามคะแนน (สูงสุด/ต่ำสุด)

### 4. สรุปและข้อเสนอแนะ
- วิเคราะห์คะแนนเฉลี่ย
- แสดงข้อเสนอแนะเชิงบวก/เชิงปรับปรุง

## ตัวอย่างการใช้งาน

1. เปิดหน้า Staff Detail
2. คลิกที่แท็บ "รีวิว"
3. ดูรีวิวทั้งหมดพร้อมสถิติ
4. ใช้ตัวกรองเพื่อดูรีวิวตามเงื่อนไข

## หมายเหตุ

- ข้อมูล reviews จะถูก seed แบบ mock (5-15 รีวิวต่อพนักงาน)
- คะแนนส่วนใหญ่จะอยู่ที่ 3-5 ดาว (เป็นรีวิวเชิงบวก)
- ข้อความรีวิวเป็นภาษาไทยจริง
- วันที่รีวิวจะสุ่มภายใน 6 เดือนที่ผ่านมา
