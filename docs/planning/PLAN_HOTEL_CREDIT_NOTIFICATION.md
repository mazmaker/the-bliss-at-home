# แผนพัฒนา: Hotel Credit 30 วัน + แจ้งเตือน + Admin Calendar View

## Prompt สำหรับสั่ง Claude AI พัฒนา

```
อ่านไฟล์ docs/PLAN_HOTEL_CREDIT_NOTIFICATION.md เพื่อเข้าใจ Requirement และแผนพัฒนา แล้วเริ่มพัฒนาตาม Phase ที่กำหนด

เงื่อนไข:
- พัฒนาบน localhost ให้สำเร็จก่อน
- ทดสอบทุก Phase ด้วย Playwright ผ่าน UI
- เมื่อทุก Phase ผ่านแล้ว ค่อย commit + push + deploy ขึ้น Production
- ถ้าติดปัญหาให้แก้ไขจน pass แล้วทดสอบซ้ำ
```

---

## Requirement

โรงแรมแต่ละบัญชีมี **เครดิต 30 วัน** (จองบริการก่อน ชำระเงินภายหลัง)
- แต่ละโรงแรมมีรอบเครดิตต่างกัน (เริ่มนับจากวันที่ Admin กำหนด)
- Cron นับวันเครดิต + แจ้งเตือนล่วงหน้า 1 วันก่อนครบกำหนด
- แจ้งเตือน In-app + Email ทั้ง Hotel App และ Admin App
- Admin มี Calendar View แสดงรอบเครดิตทุกโรงแรม
- เชื่อม Google Calendar API

---

## การออกแบบระบบ

### 1. Database Schema

#### เพิ่ม columns ใน `hotels` table:
```sql
ALTER TABLE hotels ADD COLUMN credit_days integer DEFAULT 30;
ALTER TABLE hotels ADD COLUMN credit_start_date date;  -- วันเริ่มรอบเครดิต (Admin กำหนด)
ALTER TABLE hotels ADD COLUMN credit_cycle_day integer; -- วันที่ครบรอบในแต่ละเดือน (เช่น วันที่ 15)
```

#### เพิ่ม table `hotel_credit_notifications`:
```sql
CREATE TABLE hotel_credit_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id),
  bill_id uuid REFERENCES monthly_bills(id),
  notification_type text NOT NULL, -- 'credit_due_reminder', 'credit_overdue'
  channel text NOT NULL,           -- 'email', 'in_app', 'google_calendar'
  sent_at timestamptz,
  status text DEFAULT 'pending',   -- 'pending', 'sent', 'failed'
  created_at timestamptz DEFAULT now()
);
```

### 2. Flow การทำงาน

```
Admin กำหนดรอบเครดิตให้โรงแรม (เช่น เริ่ม 1 มี.ค., ครบ 30 วัน = 31 มี.ค.)
  ↓
โรงแรมจองบริการ → สร้าง booking → billing สะสมระหว่างเดือน
  ↓
Cron ทุกวัน 09:00 ICT ตรวจสอบ:
  - โรงแรมไหนครบกำหนดภายใน 1 วัน?
  - ส่ง In-app notification + Email แจ้งเตือนทั้ง Hotel + Admin
  - สร้าง Google Calendar event สำหรับ Admin
  ↓
วันครบกำหนด: เปลี่ยนสถานะเป็น overdue ถ้ายังไม่ชำระ
```

### 3. Admin Calendar View

```
Admin → เมนูใหม่ "ปฏิทินเครดิต" หรือ ใน Dashboard
  ↓
แสดง Calendar เดือน:
  - แต่ละวันแสดงโรงแรมที่ครบกำหนดชำระ
  - สี: เขียว (จ่ายแล้ว), เหลือง (ใกล้ครบ), แดง (เลยกำหนด)
  - คลิกวันที่ → เห็นรายชื่อโรงแรม + ยอดค้างชำระ
  - Sync กับ Google Calendar (สร้าง event อัตโนมัติ)
```

---

## แผนพัฒนาแบ่ง Phase

### Phase 1: Database + Hotel Credit Settings (3-4 ชม.)

**DB Migration:**
- เพิ่ม `credit_days`, `credit_start_date`, `credit_cycle_day` ใน `hotels`
- สร้าง `hotel_credit_notifications` table

**Admin Hotel Detail:**
- เพิ่มช่องตั้งค่ารอบเครดิตในหน้า Hotel Detail / Hotel Form
  - `credit_days` (default 30, แก้ไขได้)
  - `credit_start_date` (วันเริ่มรอบ)
  - `credit_cycle_day` (วันที่ครบรอบในเดือน เช่น 15)
- แสดงข้อมูลเครดิตปัจจุบัน:
  - วันเริ่มรอบ, วันครบกำหนด, จำนวนวันที่เหลือ

**Hotel App:**
- แสดงข้อมูลเครดิตใน Dashboard:
  - "รอบเครดิต: 1 มี.ค. - 31 มี.ค."
  - "เหลืออีก X วัน"
  - สีตาม urgency (เขียว/เหลือง/แดง)

**ไฟล์ที่ต้องแก้ไข:**
- `supabase/migrations/` — migration ใหม่
- `apps/admin/src/pages/HotelDetail.tsx` — เพิ่ม credit settings section
- `apps/admin/src/components/HotelForm.tsx` — เพิ่ม credit fields
- `apps/hotel/src/pages/Dashboard.tsx` — แสดง credit info

---

### Phase 2: Cron Job + Notification (4-6 ชม.)

**Server Cron:**
- เพิ่ม cron job ใน `apps/server/src/index.ts`
- รันทุกวัน 09:00 ICT (`0 2 * * *` UTC)
- ตรวจสอบ `hotels` ที่ `credit_cycle_day` = พรุ่งนี้ หรือวันนี้
- สร้าง notification records

**Notification Service:**
- เพิ่ม function `processCreditDueReminders()` ใน `notificationService.ts`
- ตรรกะ:
  1. Query โรงแรมที่ครบกำหนดภายใน 1 วัน
  2. Query `monthly_bills` ที่ status = 'pending' ของโรงแรมนั้น
  3. ส่ง In-app notification ไปยัง:
     - Hotel user (profiles ที่เชื่อมกับ hotel)
     - Admin users ทุกคน
  4. ส่ง Email แจ้งเตือนไปยัง hotel email
  5. บันทึกลง `hotel_credit_notifications`

**Email Template:**
- สร้าง `creditDueReminderEmailTemplate()` ใน `emailService.ts`
- เนื้อหา: ชื่อโรงแรม, ยอดค้างชำระ, วันครบกำหนด, ช่องทางชำระเงิน

**In-app Notification:**
- สร้าง notification type: `credit_due_reminder`, `credit_overdue`
- แสดงใน notification bell ของ Hotel App + Admin App

**ไฟล์ที่ต้องแก้ไข:**
- `apps/server/src/index.ts` — เพิ่ม cron schedule
- `apps/server/src/services/notificationService.ts` — เพิ่ม credit reminder logic
- `apps/server/src/services/emailService.ts` — เพิ่ม email template
- `apps/server/src/routes/invoices.ts` — อาจเพิ่ม API สำหรับ credit status

---

### Phase 3: Admin Calendar View (6-8 ชม.)

**Calendar Component:**
- สร้าง `apps/admin/src/pages/CreditCalendar.tsx`
- ใช้ custom calendar component (ไม่ต้องติดตั้ง library เพิ่ม — ใช้ CSS grid + logic)
- แสดง:
  - ปฏิทินเดือน (เลื่อนเดือนได้)
  - แต่ละวันแสดง badge จำนวนโรงแรมที่ครบกำหนด
  - สี: 🟢 จ่ายแล้ว / 🟡 ใกล้ครบ / 🔴 เลยกำหนด
  - คลิกวันที่ → modal แสดงรายชื่อโรงแรม + ยอดค้างชำระ + ปุ่มส่งอีเมลแจ้งหนี้

**Admin Navigation:**
- เพิ่มเมนู "ปฏิทินเครดิต" ใน sidebar (หลัง "โรงแรม")
- Route: `/admin/credit-calendar`

**Data Query:**
- Query `hotels` JOIN `monthly_bills` WHERE status = 'pending'
- คำนวณวันครบกำหนดจาก `credit_cycle_day` + `credit_days`
- Group by due_date เพื่อแสดงบน calendar

**ไฟล์ที่ต้องแก้ไข:**
- `apps/admin/src/pages/CreditCalendar.tsx` — **ไฟล์ใหม่**
- `apps/admin/src/App.tsx` — เพิ่ม route
- `apps/admin/src/components/Sidebar.tsx` หรือ layout — เพิ่มเมนู

---

### Phase 4: Google Calendar Integration (4-6 ชม.)

**Google Calendar API Setup:**
- ใช้ Google Calendar API v3
- สร้าง Google Cloud project + enable Calendar API
- สร้าง Service Account หรือ OAuth2 credentials
- เก็บ credentials ใน environment variables

**Server Integration:**
- สร้าง `apps/server/src/services/googleCalendarService.ts`
- Functions:
  - `createCreditDueEvent(hotel, dueDate, amount)` — สร้าง event
  - `updateCreditDueEvent(eventId, status)` — อัปเดต event (จ่ายแล้ว)
  - `deleteCreditDueEvent(eventId)` — ลบ event

**Event Format:**
```
Title: "💰 ครบกำหนดชำระ: {ชื่อโรงแรม}"
Date: วันครบกำหนด
Time: 09:00 - 10:00
Description: "ยอดค้างชำระ: ฿{amount}\nเลขที่บิล: {billNumber}\nช่วงเวลา: {period}"
Color: แดง (ค้างชำระ), เขียว (จ่ายแล้ว)
Reminder: 1 วันก่อน (popup + email)
```

**Admin Settings:**
- เพิ่มช่อง Google Calendar ID ใน Admin Settings
- ปุ่ม "เชื่อมต่อ Google Calendar" / "ยกเลิกการเชื่อมต่อ"

**ไฟล์ที่ต้องแก้ไข:**
- `apps/server/src/services/googleCalendarService.ts` — **ไฟล์ใหม่**
- `apps/server/src/services/notificationService.ts` — เรียก Google Calendar API
- `apps/admin/src/pages/Settings.tsx` — เพิ่ม Google Calendar config
- `.env` / Vercel env vars — เพิ่ม Google credentials

---

## ประเมิน Man-Hours

| Phase | งาน | Man-Hours |
|-------|-----|-----------|
| 1 | DB + Hotel Credit Settings | 3-4 |
| 2 | Cron Job + Notification | 4-6 |
| 3 | Admin Calendar View | 6-8 |
| 4 | Google Calendar Integration | 4-6 |
| **รวม** | | **17-24 ชม.** |

---

## ลำดับการพัฒนา

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
(DB)      (Cron)    (Calendar) (Google)
   ↓         ↓          ↓          ↓
ทดสอบ    ทดสอบ      ทดสอบ      ทดสอบ
   ↓         ↓          ↓          ↓
        Commit + Push + Deploy
```

---

## Test Cases สำหรับแต่ละ Phase

### Phase 1 Tests:
- Admin ตั้งค่ารอบเครดิตให้โรงแรม (credit_days, credit_start_date)
- Hotel Dashboard แสดงข้อมูลเครดิต (วันเหลือ, สี)
- แก้ไขรอบเครดิต → ข้อมูลอัปเดต

### Phase 2 Tests:
- Cron job ตรวจจับโรงแรมที่ครบกำหนดภายใน 1 วัน
- In-app notification แสดงใน Hotel App + Admin App
- Email แจ้งเตือนส่งไปยัง hotel email
- ไม่ส่งซ้ำสำหรับบิลที่แจ้งเตือนไปแล้ว

### Phase 3 Tests:
- Admin Calendar แสดงรอบเครดิตทุกโรงแรม
- คลิกวันที่ → แสดงรายชื่อโรงแรม
- สีถูกต้อง (เขียว/เหลือง/แดง)
- เลื่อนเดือนได้

### Phase 4 Tests:
- Google Calendar event สร้างสำเร็จ
- Event อัปเดตเมื่อจ่ายแล้ว
- Reminder 1 วันก่อนทำงาน

---

## Dependencies & Prerequisites

### Phase 1-3 (ไม่ต้องติดตั้งอะไรเพิ่ม):
- ใช้ Supabase MCP สำหรับ DB migration
- ใช้ code patterns ที่มีอยู่

### Phase 4 (ต้องเตรียมก่อน):
- Google Cloud project + Calendar API enabled
- Service Account key (JSON) หรือ OAuth2 credentials
- ติดตั้ง `googleapis` package: `pnpm add googleapis -w --filter @bliss/server`
- ตั้ง env vars: `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY`

---

## สอดคล้องกับระบบเดิม

| ระบบเดิม | ใช้ร่วมกับ Feature ใหม่ |
|----------|------------------------|
| `monthly_bills` table | ใช้เป็นฐานข้อมูลยอดค้างชำระ |
| `billing_settings` table | ใช้ config due_date, late_fee |
| `notifications` table | ใช้สร้าง in-app notifications |
| `emailService.ts` | ใช้ส่ง credit reminder email |
| `notificationService.ts` cron | เพิ่ม cron ใหม่ตาม pattern เดิม |
| Overdue calculator | ใช้ logic คำนวณสถานะ |
| Admin sidebar | เพิ่มเมนูใหม่ตาม pattern เดิม |
| Hotel dashboard | เพิ่ม widget ตาม layout เดิม |
