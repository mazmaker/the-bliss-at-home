# Prompt สำหรับแก้ Bug — staff_earnings = 0 สำหรับ Completed Jobs

คัดลอก Prompt ด้านล่างทั้งหมด (ภายใน ```) แล้วส่งให้ Claude AI ใน chat ใหม่:

---

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home

## บริบท — The Bliss at Home Platform

โปรเจค monorepo สำหรับแพลตฟอร์มจองบริการนวด/สปา/ทำเล็บถึงบ้าน ใช้ Supabase (PostgreSQL) เป็น backend

### Apps & Ports
| App | Port | URL (Production) |
|-----|------|-------------------|
| Server (API) | 3000 | - |
| Admin | 3001 | admin.theblissmassageathome.com |
| Customer | 3002/3008 | customer.theblissmassageathome.com |
| Hotel | 3003 | hotel.theblissmassageathome.com |
| Staff | 3004 | staff.theblissmassageathome.com (LINE LIFF) |

### Supabase
- Project ref: `rbdvlfriqjnwpxmmgisf`
- ใช้ `mcp__supabase__execute_sql` สำหรับ query/migration
- ใช้ `mcp__supabase__apply_migration` สำหรับ DDL changes

---

## Bug Description

**Completed jobs มี `staff_earnings = 0.00` และ `total_staff_earnings = null`**
ทำให้ Staff เห็นรายได้เป็น ฿0 ทั้งที่มีงาน completed หลายรายการ

### ข้อมูลจาก DB (ณ วันที่ 6 เม.ย. 2569)

**Completed jobs ที่มีปัญหา (staff_earnings = 0):**
| Job ID | Booking # | Staff | staff_earnings | total_staff_earnings | final_price |
|--------|-----------|-------|---------------|---------------------|-------------|
| b3a59804... | BK20260402-0278 | เตย | 0.00 | null | 934.15 |
| fe6e2b4c... | BK20260402-0277 | เตย | 0.00 | null | 679.15 |

**สำคัญ: ไม่มี completed job ใดในระบบที่มี staff_earnings > 0 เลย — bug นี้กระทบทุก completed job**

**In-progress job (มี total_staff_earnings จาก extension):**
| Job ID | Booking # | staff_earnings | total_staff_earnings | final_price |
|--------|-----------|---------------|---------------------|-------------|
| d3961609... | BK20260403-0279 | 0.00 | 115.50 | 1,064.15 |

**Staff record ของเตย:**
- staff.id: `f0035df4...`
- profile_id: `9f0c62fe-c821-44e1-86ae-892282396028`
- total_earnings: 0.00 (ผิด — ควรมีค่า)

**Commission rate:**
- Column `staff_commission_rate` อยู่บน `services` table (default: 25.00)
- **ค่าใน DB เก็บเป็นเปอร์เซ็นต์** (เช่น 25.00 = 25%) — ต้องหาร 100 ก่อนคำนวณ
- ไม่มี commission_rate บน staff table

---

## Root Cause Analysis (วิเคราะห์แล้ว)

### Flow ปัจจุบัน: Customer Booking → Job

1. Customer สร้าง booking → `bookingService.createBookingWithServices()` insert เข้า `bookings` table
   - **ไม่มี code ที่คำนวณ `bookings.staff_earnings`** → ค่าเป็น null
2. DB trigger `sync_booking_to_job()` fires AFTER INSERT on bookings
   - สร้าง job row โดยใช้ `COALESCE(NEW.staff_earnings, 0)` → ได้ **0** เพราะ booking ไม่มี staff_earnings
3. Staff รับงาน → เริ่มงาน → complete งาน ผ่าน `updateJobStatus()` ใน `jobService.ts:286-319`
   - **ไม่มี code คำนวณ staff_earnings ตอน complete** — แค่ set status + completed_at
4. DB trigger `update_staff_job_stats` fires → sum staff_earnings จาก jobs → ได้ 0

### สรุป Root Cause: ไม่มีจุดใดในระบบที่คำนวณ staff_earnings สำหรับ customer bookings

**เปรียบเทียบกับ Hotel Bookings:**
- `apps/server/src/routes/secure-bookings-v2.ts:284-304` — คำนวณ earnings จาก `price * commissionRate` แล้ว set ตอนสร้าง job → **ทำงานถูกต้อง**
- `apps/server/src/routes/bookings.ts:367` — คำนวณเมื่อ reschedule → **ทำงานถูกต้อง**

---

## ไฟล์ที่เกี่ยวข้อง (ต้องอ่านก่อนแก้)

### Application Code
| ไฟล์ | บรรทัด | หน้าที่ |
|------|--------|---------|
| `packages/supabase/src/jobs/jobService.ts` | 286-319 | `updateJobStatus()` — เปลี่ยนสถานะ job (ไม่คำนวณ earnings) |
| `packages/supabase/src/jobs/jobService.ts` | 358-398 | `getStaffStats()` — ดึง stats ใช้ `total_staff_earnings \|\| staff_earnings \|\| 0` |
| `packages/supabase/src/earnings/earningsService.ts` | ทั้งไฟล์ | ดึงรายได้ staff — ใช้ `total_staff_earnings \|\| staff_earnings \|\| 0` |
| `packages/supabase/src/services/bookingService.ts` | 261+ | `createBookingWithServices()` — สร้าง booking (ไม่ set staff_earnings) |
| `apps/server/src/services/payoutService.ts` | 85-134 | `calculateStaffEarnings()` — คำนวณ payout จาก staff_earnings |
| `apps/server/src/routes/secure-bookings-v2.ts` | 275-315 | Hotel booking → job creation **พร้อม earnings** (ตัวอย่างที่ถูกต้อง) |
| `apps/server/src/routes/bookings.ts` | 367 | Reschedule → set staff_earnings (ตัวอย่างที่ถูกต้อง) |

### DB Triggers (ลำดับที่ fire)
| Trigger | Table | Event | Function | หน้าที่ |
|---------|-------|-------|----------|---------|
| `trigger_sync_booking_to_job` | bookings | INSERT | `sync_booking_to_job()` | สร้าง job จาก booking (ใช้ booking.staff_earnings → ได้ 0) |
| `update_job_from_booking` | bookings | UPDATE | `sync_booking_update_to_job()` | Sync status booking→job (ไม่คำนวณ earnings) |
| `sync_job_to_booking_trigger` | jobs | UPDATE | `sync_job_status_to_booking()` | Sync status job→booking |
| `trigger_update_staff_job_stats` | jobs | INSERT/UPDATE | `update_staff_job_stats()` | Sum staff_earnings → staff.total_earnings |
| `trigger_job_totals_on_extension` | booking_services | INSERT/UPDATE | `trigger_update_job_totals_on_extension()` | คำนวณ total_staff_earnings จาก extensions |

### Migrations ที่เกี่ยวข้อง
| Migration | หน้าที่ |
|-----------|---------|
| `20260220_fix_job_trigger_security.sql` | sync_booking_to_job + sync_booking_update_to_job |
| `20260220_fix_staff_earnings_calculation.sql` | อัปเดต sync_booking_to_job ให้คำนวณ commission (แต่อาจไม่ได้ apply) |
| `20260325_130000_fix_extension_earnings_and_duration.sql` | เพิ่ม total_staff_earnings + extension trigger |
| `20260325150000_fix_extension_commission_calculation.sql` | แก้ commission calculation สำหรับ extensions |

---

## แผนการแก้ไข (Step-by-Step)

### Phase 1: วิเคราะห์เพิ่มเติม (ก่อนแก้)

**Step 1.1** — ตรวจสอบ trigger function ปัจจุบัน
```sql
-- ดู sync_booking_to_job ที่ใช้งานจริงตอนนี้
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'sync_booking_to_job';
```
ตรวจว่ามี commission rate calculation หรือไม่ — ถ้ามีแล้ว แสดงว่า migration `20260220_fix_staff_earnings_calculation.sql` apply แล้วแต่อาจมีปัญหาอื่น

**Step 1.2** — ตรวจ commission rate ของ services ที่เกี่ยวข้อง
```sql
SELECT id, name_th, name_en, staff_commission_rate, price
FROM services
WHERE id IN (
  SELECT service_id FROM bookings WHERE id IN (
    SELECT booking_id FROM jobs WHERE status = 'completed' AND staff_earnings = 0
  )
);
```

**Step 1.3** — ตรวจ bookings.staff_earnings ของ booking ที่มีปัญหา
```sql
SELECT id, booking_number, staff_earnings, final_price, total_price, service_id
FROM bookings
WHERE id IN (
  SELECT booking_id FROM jobs WHERE status = 'completed' AND staff_earnings = 0
);
```

**Step 1.4** — นับ scope ของ bug (ทุก job ที่มีปัญหา)
```sql
SELECT 
  COUNT(*) as total_affected,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_affected,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_affected,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_affected
FROM jobs
WHERE staff_earnings = 0 OR staff_earnings IS NULL;
```

---

### Phase 2: แก้ DB Trigger — ให้คำนวณ staff_earnings ตอนสร้าง job

**Step 2.1** — อัปเดต `sync_booking_to_job()` trigger function

ให้คำนวณ `staff_earnings` จาก `bookings.final_price * services.staff_commission_rate / 100` แทนการใช้ `COALESCE(NEW.staff_earnings, 0)` ที่ได้ 0 เสมอ

**Logic ที่ถูกต้อง:**
```
staff_earnings = ROUND(booking.final_price * service.staff_commission_rate / 100)
```
- ใช้ `final_price` (ราคาหลังหักส่วนลด)
- ใช้ `staff_commission_rate / 100` (เก็บเป็น % ใน DB เช่น 25.00 = 25%)
- ถ้าไม่มี commission rate → fallback เป็น 30% (0.30)

---

### Phase 3: แก้ Application Code — คำนวณ earnings ตอน complete job

**Step 3.1** — แก้ `updateJobStatus()` ใน `packages/supabase/src/jobs/jobService.ts:286-319`

เมื่อ `status === 'completed'` ให้:
1. ดึง job.booking_id → ดึง booking.final_price + booking.service_id
2. ดึง service.staff_commission_rate
3. คำนวณ `staff_earnings = Math.round(final_price * commission_rate / 100)`
4. Update job.staff_earnings พร้อมกับ status change

**เหตุผลที่ต้องคำนวณตอน complete ด้วย (ไม่ใช่แค่ตอนสร้าง job):**
- Job อาจถูกสร้างก่อนที่จะรู้ final_price (เช่น มี promotion ทีหลัง)
- เป็น safety net ป้องกัน staff_earnings = 0 หลุดไปถึง payout

---

### Phase 4: แก้ข้อมูลเดิมใน DB — Backfill staff_earnings

**Step 4.1** — Migration เพื่อ backfill ทุก job ที่ staff_earnings = 0

```sql
-- คำนวณ staff_earnings สำหรับทุก job ที่ยังเป็น 0
UPDATE jobs j SET
  staff_earnings = ROUND(b.final_price * COALESCE(s.staff_commission_rate, 30) / 100),
  total_staff_earnings = ROUND(b.final_price * COALESCE(s.staff_commission_rate, 30) / 100)
FROM bookings b
JOIN services s ON b.service_id = s.id
WHERE j.booking_id = b.id
  AND (j.staff_earnings = 0 OR j.staff_earnings IS NULL)
  AND b.final_price > 0;
```

**Step 4.2** — รัน `update_staff_job_stats` trigger ใหม่เพื่ออัปเดต staff.total_earnings
```sql
-- Force trigger recalculation by touching updated_at
UPDATE jobs SET updated_at = NOW()
WHERE status = 'completed' AND staff_earnings > 0;
```

---

### Phase 5: ทดสอบ

**Step 5.1** — ตรวจผลลัพธ์หลัง backfill
```sql
-- ตรวจว่าไม่มี completed job ที่ staff_earnings = 0 อีก
SELECT COUNT(*) FROM jobs WHERE status = 'completed' AND (staff_earnings = 0 OR staff_earnings IS NULL);

-- ตรวจ staff เตย
SELECT j.id, j.staff_earnings, j.total_staff_earnings, b.final_price, b.booking_number
FROM jobs j JOIN bookings b ON j.booking_id = b.id
WHERE j.staff_id = '9f0c62fe-c821-44e1-86ae-892282396028';

-- ตรวจ staff.total_earnings อัปเดตแล้ว
SELECT s.id, p.first_name, s.total_earnings, s.total_jobs
FROM staff s JOIN profiles p ON s.profile_id = p.id
WHERE s.profile_id = '9f0c62fe-c821-44e1-86ae-892282396028';
```

**Step 5.2** — ทดสอบ flow ใหม่ (E2E)
1. สร้าง booking ใหม่ผ่าน Customer app → ตรวจ job.staff_earnings ว่า > 0
2. Staff รับงาน → complete → ตรวจ staff_earnings ถูกคำนวณ
3. ดูหน้า Staff Earnings → ยอดรายได้แสดงถูกต้อง
4. ดู Admin Payout → ยอดจ่ายเงินคำนวณถูกต้อง

**Step 5.3** — ทดสอบ edge cases
- Booking ที่มี promotion/discount (final_price < total_price)
- Booking ที่มี extension (total_staff_earnings ต้องรวม extension ด้วย)
- Service ที่ไม่มี staff_commission_rate (ต้อง fallback 30%)

---

### Phase 6: Deploy

1. Commit + Push ไฟล์ที่แก้:
   - `packages/supabase/src/jobs/jobService.ts` (earnings calculation on complete)
   - Migration file ใหม่ (trigger update + backfill)
2. Verify deployment บน Vercel
3. ตรวจ production data

---

## ข้อควรระวัง

1. **staff_commission_rate เก็บเป็น %** (25.00 = 25%) — ต้องหาร 100 เสมอ
2. **อย่าใช้ FOR ALL** ใน RLS policy — ใช้ explicit per-operation
3. **UPDATE policy ต้องมีทั้ง USING + WITH CHECK**
4. **ใช้ final_price** (ราคาหลังหักส่วนลด) ไม่ใช่ total_price
5. **total_staff_earnings** ใช้สำหรับ job + extensions รวมกัน — ถ้าไม่มี extension ให้ = staff_earnings
6. **jobs.staff_id** FK references `profiles(id)` ไม่ใช่ `staff(id)` — ต้อง lookup staff.id จาก profile_id
7. **Migration ต้อง idempotent** — รันซ้ำได้ไม่พัง (ใช้ CREATE OR REPLACE, IF NOT EXISTS)

## Login Credentials
| App | Username | Password |
|-----|----------|----------|
| Admin | admintest@theblissathome.com | Admin@12345 |
| Customer | mazmakerdesign@gmail.com | U9B*B2LE#8-q!m8 |
| Hotel | reservations@hilton.com | Hotel123. |
| Staff | LINE LIFF auto-login (ทดสอบ999) — ต้องให้ผู้ใช้ login ให้ |

## สำคัญ
- อ่าน memory ใน MEMORY.md ก่อนเริ่มงาน
- ทดสอบผ่าน Playwright MCP + Supabase MCP
- Staff app ต้อง login ผ่าน LINE LIFF — ต้องแจ้งผู้ใช้ login ให้
- Branch ปัจจุบัน: `feature/staff`
```

---

*สร้างเมื่อ: 6 เม.ย. 2569 — จากการวิเคราะห์ DB triggers, application code, และข้อมูลจริงใน production*
