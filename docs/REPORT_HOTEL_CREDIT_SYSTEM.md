# รายงานการพัฒนา: Hotel Credit 30 วัน + แจ้งเตือน + Calendar View

**วันที่พัฒนา:** 30 มีนาคม 2569
**Developer:** Claude AI + Chitpon

---

## สรุปภาพรวม

พัฒนาระบบเครดิต 30 วันสำหรับโรงแรมพาร์ทเนอร์ ประกอบด้วย 4 Phase:

| Phase | รายละเอียด | สถานะ |
|-------|-----------|-------|
| 1 | DB + Credit Settings + Hotel Dashboard Widget | DONE |
| 2 | Cron Job (09:00 ICT) + Email + In-app Notification | DONE |
| 3 | Admin Calendar View + Sidebar Menu | DONE |
| 4 | Google Calendar API Integration + Admin Settings | DONE |

---

## 1. Database Changes

### 1.1 เพิ่ม columns ใน `hotels` table
```sql
ALTER TABLE hotels ADD COLUMN credit_days INTEGER DEFAULT 30;
ALTER TABLE hotels ADD COLUMN credit_start_date DATE;
ALTER TABLE hotels ADD COLUMN credit_cycle_day INTEGER;
CREATE INDEX idx_hotels_credit_cycle ON hotels(credit_cycle_day) WHERE credit_cycle_day IS NOT NULL;
```

### 1.2 สร้าง table `hotel_credit_notifications`
```sql
CREATE TABLE hotel_credit_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  bill_id UUID REFERENCES monthly_bills(id),
  notification_type TEXT NOT NULL,  -- 'credit_due_reminder', 'credit_overdue'
  channel TEXT NOT NULL,            -- 'email', 'in_app', 'google_calendar'
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',    -- 'pending', 'sent', 'failed'
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_hcn_hotel ON hotel_credit_notifications(hotel_id);
CREATE INDEX idx_hcn_type ON hotel_credit_notifications(notification_type);
```

### 1.3 เพิ่ม settings keys
- `google_calendar_id` — Calendar ID สำหรับ Google Calendar
- `google_service_account_key` — Base64-encoded Service Account JSON key

---

## 2. ไฟล์ที่แก้ไข/สร้างใหม่

### Admin App (apps/admin/src/)

| ไฟล์ | สถานะ | รายละเอียดการเปลี่ยนแปลง |
|------|-------|------------------------|
| `pages/CreditCalendar.tsx` | **NEW** | หน้าปฏิทินเครดิต — Calendar grid, summary stats, day detail modal |
| `pages/HotelDetail.tsx` | MODIFIED | เพิ่ม section "ตั้งค่าเครดิต" แสดง credit_days, credit_start_date, credit_cycle_day + คำนวณวันเหลือ |
| `components/HotelForm.tsx` | MODIFIED | เพิ่ม 3 fields ใน zod schema + form UI: credit_days, credit_start_date, credit_cycle_day |
| `App.tsx` | MODIFIED | เพิ่ม import CreditCalendar + route `/admin/credit-calendar` |
| `layouts/AdminLayout.tsx` | MODIFIED | เพิ่มเมนู "ปฏิทินเครดิต" ใน sidebar (หลังโรงแรม) ใช้ icon CalendarCheck |
| `pages/Settings.tsx` | MODIFIED | เพิ่ม Google Calendar section ใน tab "การชำระเงิน" (Calendar ID + Service Account Key + status indicator) |

### Hotel App (apps/hotel/src/)

| ไฟล์ | สถานะ | รายละเอียดการเปลี่ยนแปลง |
|------|-------|------------------------|
| `hooks/useHotelContext.ts` | MODIFIED | เพิ่ม credit_days, credit_start_date, credit_cycle_day ใน HotelData interface + select query ทั้ง 2 ที่ |
| `pages/Dashboard.tsx` | MODIFIED | เพิ่ม Credit Info Widget ระหว่าง Stats Grid กับ Quick Action — แสดงรอบเครดิต, วันเหลือ, สีตาม urgency |

### Server App (apps/server/src/)

| ไฟล์ | สถานะ | รายละเอียดการเปลี่ยนแปลง |
|------|-------|------------------------|
| `index.ts` | MODIFIED | เพิ่ม import processCreditDueReminders + cron schedule `0 2 * * *` (09:00 ICT) + console log |
| `services/notificationService.ts` | MODIFIED | เพิ่ม function `processCreditDueReminders()` ~130 บรรทัด — query hotels, send email, in-app notification, Google Calendar event, duplicate prevention |
| `services/emailService.ts` | MODIFIED | เพิ่ม `creditDueReminderEmailTemplate()` ~60 บรรทัด — urgency color, bill table, outstanding summary |
| `services/googleCalendarService.ts` | **NEW** | Google Calendar API service — createCreditDueEvent, updateCreditDueEvent, deleteCreditDueEvent, config from env/DB |

### Package Dependencies

| Package | App | คำสั่ง |
|---------|-----|--------|
| `googleapis` | Server | `pnpm add googleapis --filter @bliss/server` |

---

## 3. รายละเอียดแต่ละ Component

### 3.1 Admin — HotelForm Credit Settings
- **จำนวนวันเครดิต** (credit_days): Number input, range 1-365, default 30
- **วันเริ่มรอบเครดิต** (credit_start_date): Date input (YYYY-MM-DD)
- **วันครบรอบในเดือน** (credit_cycle_day): Number input, range 1-31

### 3.2 Admin — HotelDetail Credit Display
- แสดง credit_days, credit_start_date (format ไทย), credit_cycle_day
- คำนวณ "ครบกำหนดชำระอีก X วัน" + วันที่
- สี: เขียว (>7 วัน), เหลือง (2-7 วัน), แดง (≤1 วัน)

### 3.3 Hotel Dashboard — Credit Widget
- แสดงเมื่อ hotel มี credit_start_date + credit_cycle_day
- "รอบเครดิต" + จำนวนวัน
- ช่วงเวลา: "16 มี.ค. — 15 เม.ย."
- Badge: "เหลือ X วัน" หรือ "ครบกำหนดวันนี้"
- สี urgency: emerald / amber / red

### 3.4 Admin — CreditCalendar
- ปฏิทินเดือน (CSS grid 7 columns)
- แต่ละวันแสดง badge โรงแรมที่ครบกำหนด
- สี: เขียว (จ่ายแล้ว), เหลือง (ใกล้ครบ), แดง (เลยกำหนด)
- คลิกวัน → modal: รายชื่อโรงแรม + ยอดค้าง + ปุ่ม "ดูบิล" + "ส่งอีเมล"
- Summary stats: โรงแรมที่ตั้งค่า, ครบกำหนดเดือนนี้, เลยกำหนด, ยอดค้างรวม
- เลื่อนเดือน + ปุ่ม "วันนี้"

### 3.5 Server — Cron Job (processCreditDueReminders)
- รันทุกวัน 09:00 ICT (02:00 UTC)
- Query: `hotels WHERE credit_cycle_day IN (today, tomorrow) AND status = 'active'`
- Duplicate check: `hotel_credit_notifications WHERE hotel_id AND type AND created_at >= today`
- Actions:
  1. Email → hotel email (via Resend API)
  2. In-app notification → hotel user (via hotels.auth_user_id)
  3. In-app notification → admin users (role = 'ADMIN')
  4. Google Calendar event (if configured)
- Records ทุก channel ลง hotel_credit_notifications

### 3.6 Server — Email Template (creditDueReminderEmailTemplate)
- Header: gradient สีตาม urgency
- ข้อความ: "ครบกำหนดพรุ่งนี้" หรือ "เลยกำหนดชำระ"
- ตารางบิลค้างชำระ (bill number, period, amount)
- Box สรุปยอดค้างชำระรวม
- Footer: ข้อมูลติดต่อบริษัท

### 3.7 Server — Google Calendar Service
- Auth: Service Account (base64 JSON key)
- Config: อ่านจาก env vars ก่อน → fallback DB settings
- Cache: 5 นาที
- Event ID format: `credit-{hotelId20}-{YYYYMMDD}`
- Event: 09:00-10:00 Bangkok, title "💰 ครบกำหนดชำระ: {hotelName}"
- Color: red (ค้างชำระ), green (จ่ายแล้ว)
- Reminders: 1 วันก่อน (popup + email)

### 3.8 Admin — Settings (Google Calendar)
- Section ใน tab "การชำระเงิน"
- Calendar ID input
- Service Account Key textarea (base64)
- Status indicator: "เชื่อมต่อแล้ว" (เขียว) / "ยังไม่ได้เชื่อมต่อ" (เทา)

---

## 4. Google Calendar Setup ที่ทำแล้ว

| รายการ | ค่า |
|--------|-----|
| Google Cloud Project | billboardmap (billboardmap-395702) |
| Calendar API | Enabled |
| Service Account | bliss-calendar@billboardmap-395702.iam.gserviceaccount.com |
| JSON Key File | billboardmap-395702-c5192f8b9a58.json |
| Calendar Name | Bliss Credit Reminders |
| Calendar ID | ed13fc04bec6ed2c9f28b820983b1b462dadb753465e8ab222b93e7d68ac90bd@group.calendar.google.com |
| Permission | แก้ไขกิจกรรม (Writer) |
| Config saved in | Admin Settings → การชำระเงิน → Google Calendar |
