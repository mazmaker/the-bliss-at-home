# แผนพัฒนา: Staff Payout Schedule — ระบบรอบจ่ายเงิน Staff

## Prompt สำหรับสั่ง Claude AI พัฒนา

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home
อ่านไฟล์ docs/PLAN_STAFF_PAYOUT_SCHEDULE.md แล้วพัฒนาทีละ Phase ตามแผน
- พัฒนาบน localhost ทดสอบให้ผ่านก่อน commit
- ทดสอบผ่าน UI ด้วย Playwright MCP ทุก Phase
- ถ้า FAIL ให้แก้โค้ดแล้วทดสอบซ้ำจนผ่าน

Dev Servers: npx turbo run dev --parallel
Ports: Admin=3001, Hotel=3003, Staff=3004, Server=3000, Customer=3008
Staff tunnel: cloudflared tunnel --url http://localhost:3004

Login:
- Admin: admintest@theblissathome.com / Admin@12345
- Staff: LINE LIFF (ทดสอบ999) ผ่าน tunnel
```

---

## 1. Business Requirements (ความต้องการ)

### 1.1 ภาพรวม
Staff แต่ละคนสามารถเลือก **รอบการรับชำระเงิน** ระหว่าง:
- **ครึ่งเดือน (bi-monthly)** — รับเงิน 2 ครั้ง/เดือน (วันที่ 16 และ วันที่ 1 เดือนถัดไป)
- **รายเดือน (monthly)** — รับเงิน 1 ครั้ง/เดือน (วันที่ 1 เดือนถัดไป)

### 1.2 วันจ่ายเงิน (Payout Days) — ตายตัวสำหรับ Staff ทุกคน
| รอบ | วันจ่ายเงิน | วันตัดรอบ (Cutoff) | งวดที่นับ |
|-----|------------|-------------------|----------|
| งวดแรก (Mid-month) | **วันที่ 16** | วันที่ 10 | วันที่ 26 เดือนก่อน — 10 ของเดือน |
| งวดหลัง (End-month) | **วันที่ 1 เดือนถัดไป** | วันที่ 25 | วันที่ 11 — 25 ของเดือน |

- Staff ที่เลือก **"ครึ่งเดือน"** → รับทั้ง 2 งวด
- Staff ที่เลือก **"รายเดือน"** → รับงวดหลังอย่างเดียว (นับจากวันที่ 26 เดือนก่อน ถึง 25 ของเดือน)

### 1.3 ทำไมต้องตัดรอบก่อนวันจ่าย 5 วัน?
เพื่อให้ Admin มีเวลา:
1. ตรวจสอบยอดรายได้แต่ละ Staff
2. อนุมัติรายการจ่ายเงิน
3. ดำเนินการโอนเงินจริง (manual/bank transfer)

### 1.4 กรณี Staff มีรายได้น้อย (Minimum Payout Threshold)

**Solution: ยอดขั้นต่ำในการจ่าย + ยกยอดไปรอบถัดไป**

| สถานการณ์ | การจัดการ |
|-----------|----------|
| รายได้ >= ยอดขั้นต่ำ (เช่น ฿100) | จ่ายปกติ |
| รายได้ < ยอดขั้นต่ำ | **ยกยอด (carry forward)** ไปรอบถัดไป + แจ้ง Staff |
| ยกยอดข้ามรอบ แต่ยอดรวมยังไม่ถึงขั้นต่ำ | ยกยอดต่อไปเรื่อยๆ |
| Staff ลาออก/inactive แต่มียอดค้าง | **จ่ายทั้งหมด** ไม่ว่ายอดจะน้อยแค่ไหน (force payout) |

**หมายเหตุ:** ยอดขั้นต่ำ configurable ใน Admin Settings (default ฿100)

---

## 2. System Design (ออกแบบระบบ)

### 2.1 Database Changes

```sql
-- 1. เพิ่มคอลัมน์ใน staff table
ALTER TABLE staff ADD COLUMN payout_schedule TEXT DEFAULT 'monthly'
  CHECK (payout_schedule IN ('bi-monthly', 'monthly'));

-- 2. สร้างตาราง payout_settings (Admin config)
CREATE TABLE payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default settings
INSERT INTO payout_settings (setting_key, setting_value, description) VALUES
  ('mid_month_payout_day', '16', 'วันจ่ายเงินงวดแรก'),
  ('end_month_payout_day', '1', 'วันจ่ายเงินงวดหลัง (1=วันที่ 1 เดือนถัดไป)'),
  ('mid_month_cutoff_day', '10', 'วันตัดรอบงวดแรก'),
  ('end_month_cutoff_day', '25', 'วันตัดรอบงวดหลัง'),
  ('minimum_payout_amount', '100', 'ยอดขั้นต่ำในการจ่าย (บาท)'),
  ('carry_forward_enabled', 'true', 'เปิดใช้ยกยอดข้ามรอบ');

-- 3. เพิ่มคอลัมน์ใน payouts table
ALTER TABLE payouts ADD COLUMN payout_round TEXT
  CHECK (payout_round IN ('mid-month', 'end-month'));
ALTER TABLE payouts ADD COLUMN is_carry_forward BOOLEAN DEFAULT false;
ALTER TABLE payouts ADD COLUMN carry_forward_amount DECIMAL(12,2) DEFAULT 0;

-- 4. สร้างตาราง payout_notifications (ป้องกันแจ้งเตือนซ้ำ)
CREATE TABLE payout_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id),
  notification_type TEXT NOT NULL, -- 'payout_upcoming', 'payout_due_reminder', 'payout_carry_forward', 'payout_completed'
  payout_round TEXT NOT NULL,
  period_month TEXT NOT NULL, -- '2026-04'
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX idx_payout_notif_unique
  ON payout_notifications(staff_id, notification_type, payout_round, period_month);
```

### 2.2 Data Flow

```
                    Staff เลือกรอบจ่าย
                           │
                    ┌──────┴──────┐
                    │ staff table │
                    │ payout_     │
                    │ schedule    │
                    └──────┬──────┘
                           │
              Cron ทุกวัน 08:00 ICT
                           │
            ┌──────────────┼──────────────┐
            │              │              │
    วันที่ 9 (ล่วงหน้า)  วันที่ 10     วันที่ 15 (ล่วงหน้า)
    แจ้ง Staff+Admin    ตัดรอบงวดแรก   แจ้ง Admin
    "พรุ่งนี้ตัดรอบ"    สร้าง payout   "พรุ่งนี้จ่ายเงิน
                        records         งวดแรก Staff X คน"
                        จ่ายวันที่ 16          │
                           │           วันที่ 24 (ล่วงหน้า)
                           │           แจ้ง Staff+Admin
                           │           "พรุ่งนี้ตัดรอบ"
                           │                  │
                           │           วันที่ 25
                           │           ตัดรอบงวดหลัง
                           │           สร้าง payout records
                           │           จ่ายวันที่ 1 เดือนถัดไป
                           │                  │
                           │           วันสิ้นเดือน (ล่วงหน้า)
                           │           แจ้ง Admin
                           │           "พรุ่งนี้จ่ายเงิน
                           │            งวดหลัง Staff X คน"
                           │                  │
                    ┌──────┴──────────────────┘
                    │
              Admin Dashboard
              แสดง Staff ที่ครบกำหนด
              → ตรวจสอบ → อนุมัติ → โอนเงิน
```

### 2.3 Cron Logic (processPayout)

```
ทุกวัน 08:00 ICT:

1. ดึง payout_settings (cutoff days, min amount)

2. ถ้าวันนี้ = cutoff_day - 1 (ล่วงหน้า 1 วัน):
   → แจ้งเตือน Staff + Admin "พรุ่งนี้ตัดรอบจ่ายเงิน"

2b. ถ้าวันนี้ = payout_day - 1 (ล่วงหน้า 1 วันก่อนจ่ายเงิน):
   → วันที่ 15 → แจ้ง Admin "พรุ่งนี้ถึงกำหนดจ่ายเงินงวดแรก Staff X คน ยอดรวม ฿X"
   → วันสิ้นเดือน → แจ้ง Admin "พรุ่งนี้ถึงกำหนดจ่ายเงินงวดหลัง Staff X คน ยอดรวม ฿X"

3. ถ้าวันนี้ = mid_month_cutoff_day (10):
   → ดึง Staff ที่ payout_schedule = 'bi-monthly'
   → คำนวณรายได้ วันที่ 26 เดือนก่อน ถึง 10 เดือนนี้
   → ถ้า >= min_amount → สร้าง payout (status=pending, round=mid-month, จ่ายวันที่ 16)
   → ถ้า < min_amount → ยกยอด (carry_forward) + แจ้ง Staff

4. ถ้าวันนี้ = end_month_cutoff_day (25):
   → ดึง Staff ทุกคน (ทั้ง bi-monthly และ monthly)
   → bi-monthly: คำนวณรายได้ วันที่ 11-25 + carry_forward จากงวดแรก (ถ้ามี)
   → monthly: คำนวณรายได้ วันที่ 26 เดือนก่อน ถึง 25 เดือนนี้ + carry_forward (ถ้ามี)
   → ถ้า >= min_amount → สร้าง payout (status=pending, round=end-month, จ่ายวันที่ 1 เดือนถัดไป)
   → ถ้า < min_amount → ยกยอดไปเดือนถัดไป + แจ้ง Staff
```

### 2.4 UI Components

#### Staff App — Settings
```
┌─────────────────────────────────────┐
│ ⚙️ ตั้งค่า                          │
│                                     │
│ 🔔 การแจ้งเตือน          [เปิด]    │
│ 🔊 เสียงแจ้งเตือน         [เปิด]    │
│ ⏰ เตือนก่อนงาน     [60 นาที ▾]    │
│                                     │
│ ─────────────────────────────────── │
│ 💰 รอบการรับเงิน                    │
│                                     │
│ ┌─────────────┐ ┌─────────────┐    │
│ │ ○ ครึ่งเดือน │ │ ● รายเดือน  │    │
│ │  รับ 2 ครั้ง  │ │ รับ 1 ครั้ง  │    │
│ │ 16 + 1       │ │ วันที่ 1    │    │
│ └─────────────┘ └─────────────┘    │
│                                     │
│ 📋 รอบถัดไป:                        │
│    ตัดรอบ: 25 เม.ย. 2569            │
│    รับเงิน: 1 พ.ค. 2569             │
│    ยอดสะสม: ฿2,400                  │
│                                     │
│ ─────────────────────────────────── │
│ 🚪 ออกจากระบบ                       │
└─────────────────────────────────────┘
```

#### Admin App — Payout Dashboard (หน้าใหม่)
```
┌──────────────────────────────────────────────────────┐
│ 💰 รอบจ่ายเงิน Staff                                 │
│ Staff Payout Management                              │
│                                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ 12       │ │ 8        │ │ ฿24,600  │ │ 3        │ │
│ │ Staff    │ │ ครบกำหนด │ │ ยอดรวม   │ │ ยกยอด   │ │
│ │ ทั้งหมด   │ │ รอบนี้    │ │ รอจ่าย   │ │ (ต่ำกว่า  │ │
│ │          │ │          │ │          │ │  ขั้นต่ำ)  │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                      │
│ รอบปัจจุบัน: งวดแรก เม.ย. 2569 (ตัดรอบ 10 เม.ย. จ่าย 16 เม.ย.) │
│                                                      │
│ ┌────────────────────────────────────────────────────┐│
│ │ ☐ ชื่อ          รอบ      ยอด    สถานะ    จัดการ   ││
│ │ ☐ ทดสอบ999     ครึ่งเดือน ฿2,400 รอจ่าย   [จ่าย]  ││
│ │ ☐ สมชาย       ครึ่งเดือน ฿1,800 รอจ่าย   [จ่าย]  ││
│ │ ☐ สมหญิง      ครึ่งเดือน ฿50   ยกยอด   [ดู]     ││
│ │ ☐ วิชัย        รายเดือน  —     ยังไม่ถึงรอบ —     ││
│ └────────────────────────────────────────────────────┘│
│                                                      │
│ [☐ เลือกทั้งหมด]  [จ่ายเงินที่เลือก]  [Export CSV]   │
└──────────────────────────────────────────────────────┘
```

---

## 3. Development Phases (แผนพัฒนาทีละ Phase)

### Phase 1: Database Migration + Staff Settings UI
**ขอบเขต:** DB schema + Staff เลือกรอบจ่ายเงิน
**ประมาณเวลา:** 3-4 ชม.

#### งาน:
1. **DB Migration** — สร้าง/แก้ตารางผ่าน Supabase MCP
   - เพิ่ม `payout_schedule` column ใน `staff` table
   - สร้าง `payout_settings` table + default values
   - เพิ่ม columns ใน `payouts` table (payout_round, carry_forward)
   - สร้าง `payout_notifications` table
   - RLS policies

2. **Staff Settings UI** — เพิ่ม section "รอบการรับเงิน" ใน StaffSettings.tsx
   - Radio buttons: ครึ่งเดือน / รายเดือน
   - แสดงข้อมูลรอบถัดไป (cutoff date, payout date)
   - แสดงยอดสะสม (accumulated earnings)
   - บันทึกลง `staff.payout_schedule`

3. **Service function** — เพิ่มใน staffService.ts
   - `getPayoutSchedule(profileId)` — ดึงรอบปัจจุบัน
   - `updatePayoutSchedule(profileId, schedule)` — บันทึกรอบ
   - `getNextPayoutInfo(profileId)` — คำนวณรอบถัดไป + ยอดสะสม

#### ทดสอบ:
- Staff login → Settings → เลือกรอบ → บันทึก → refresh ยังคงอยู่
- DB: staff.payout_schedule อัปเดตถูกต้อง
- แสดงข้อมูลรอบถัดไปถูกต้อง

---

### Phase 2: Cron Job — ตัดรอบ + สร้าง Payout Records
**ขอบเขต:** Server cron ตัดรอบอัตโนมัติ + คำนวณรายได้
**ประมาณเวลา:** 4-5 ชม.

#### งาน:
1. **Service function** — `payoutService.ts` (ไฟล์ใหม่)
   - `processPayoutCutoff()` — ตรรกะหลักของ cron
   - `calculateStaffEarnings(staffId, periodStart, periodEnd)` — คำนวณรายได้จาก jobs
   - `createPayoutRecord(staffId, amount, round, carryForward)` — สร้าง payout record
   - `getPayoutSettings()` — ดึง settings จาก payout_settings table
   - `handleCarryForward(staffId, amount, round)` — จัดการยกยอด

2. **Cron registration** — เพิ่มใน index.ts
   - `cron.schedule('0 1 * * *')` → 08:00 ICT ทุกวัน (ตรวจวันตัดรอบ 10 + 25)
   - เรียก `processPayoutCutoff()`

3. **Dev endpoint** — `/api/dev/trigger-payout-cutoff`
   - สำหรับทดสอบ manual trigger (dev only)

#### ตรรกะการคำนวณรายได้:
```
รายได้ Staff = SUM(booking_items.staff_earning)
WHERE booking.status = 'completed'
AND booking.completed_at BETWEEN period_start AND period_end
AND booking_items.staff_id = staff.id
AND booking.id NOT IN (SELECT job_id FROM payout_jobs)

period สำหรับแต่ละงวด:
- mid-month (bi-monthly): วันที่ 26 เดือนก่อน — วันที่ 10 เดือนนี้
- end-month (bi-monthly): วันที่ 11 — วันที่ 25 เดือนนี้
- end-month (monthly): วันที่ 26 เดือนก่อน — วันที่ 25 เดือนนี้
```

#### ทดสอบ:
- Trigger cron ด้วย dev endpoint
- ตรวจ DB: payout records ถูกสร้างตาม schedule
- Staff ที่เลือก bi-monthly → สร้าง payout ในงวดแรก (นับ 26-10, จ่าย 16)
- Staff ที่เลือก monthly → ไม่สร้างในงวดแรก
- ยอดต่ำกว่าขั้นต่ำ → ยกยอด + ไม่สร้าง payout

---

### Phase 3: Notifications — แจ้งเตือน Staff + Admin
**ขอบเขต:** แจ้งเตือน in-app + email ก่อนตัดรอบ + ก่อนจ่ายเงิน
**ประมาณเวลา:** 3-4 ชม.

#### งาน:
1. **แจ้งเตือนล่วงหน้า 1 วันก่อนตัดรอบ** (วันที่ 9 และ 24)
   - In-app notification → Staff: "พรุ่งนี้ตัดรอบจ่ายเงิน ยอดสะสม ฿X"
   - In-app notification → Admin: "พรุ่งนี้ตัดรอบจ่ายเงิน Staff X คน"
   - Duplicate prevention ผ่าน `payout_notifications` table

2. **แจ้งเตือนล่วงหน้า 1 วันก่อนจ่ายเงิน** (วันที่ 15 และ วันสิ้นเดือน)
   - In-app notification → Admin: "พรุ่งนี้ถึงกำหนดจ่ายเงินงวดแรก Staff X คน ยอดรวม ฿X" (วันที่ 15)
   - In-app notification → Admin: "พรุ่งนี้ถึงกำหนดจ่ายเงินงวดหลัง Staff X คน ยอดรวม ฿X" (วันสิ้นเดือน)
   - Duplicate prevention ผ่าน `payout_notifications` table (notification_type = 'payout_due_reminder')

3. **แจ้งเตือนเมื่อยกยอด** (วันตัดรอบ ถ้ายอดต่ำ)
   - In-app notification → Staff: "ยอดรายได้ ฿X ต่ำกว่าขั้นต่ำ ฿100 ยกยอดไปรอบถัดไป"

4. **แจ้งเตือนเมื่อจ่ายเงินสำเร็จ** (Admin กดจ่าย)
   - ใช้ระบบเดิม (ProcessPayoutModal → LINE + in-app)

#### ทดสอบ:
- Set cutoff = พรุ่งนี้ → trigger cron → ตรวจ notifications
- Set payout day = พรุ่งนี้ → trigger cron → ตรวจ Admin notification ก่อนจ่ายเงิน
- ยอดต่ำกว่าขั้นต่ำ → ตรวจ carry forward notification
- Trigger ซ้ำ → ไม่ส่งซ้ำ (duplicate prevention)

---

### Phase 4: Admin Payout Dashboard
**ขอบเขต:** หน้า Dashboard ใหม่แสดง Staff ที่ครบกำหนดจ่าย
**ประมาณเวลา:** 4-5 ชม.

#### งาน:
1. **หน้าใหม่** — `apps/admin/src/pages/PayoutDashboard.tsx`
   - Stats: Staff ทั้งหมด, ครบกำหนดรอบนี้, ยอดรวมรอจ่าย, ยกยอด
   - ตารางรายชื่อ Staff พร้อมสถานะ
   - Filter: รอบ (งวดแรก/งวดหลัง), เดือน, สถานะ
   - Batch actions: เลือกหลายคน → จ่ายพร้อมกัน
   - Export CSV

2. **Route** — เพิ่มใน App.tsx
   - `/admin/payout-dashboard`

3. **Sidebar menu** — เพิ่มใน AdminLayout.tsx
   - เมนู "รอบจ่ายเงิน" (หลังเมนู "พนักงาน")

4. **Batch Payout Modal** — `BatchPayoutModal.tsx`
   - เลือกหลาย Staff → กรอก transfer reference → จ่ายพร้อมกัน
   - อัปเดต payout status → completed
   - ส่ง notification ทีละคน

#### ทดสอบ:
- Admin login → เมนู "รอบจ่ายเงิน" → แสดง Dashboard
- Stats ถูกต้อง (จำนวน, ยอดรวม)
- Filter ทำงาน
- Batch payout → อัปเดต status ทุกคน
- Export CSV ดาวน์โหลดได้

---

### Phase 5: Admin Settings — Payout Configuration
**ขอบเขต:** Admin ตั้งค่ารอบจ่ายเงิน (วันตัด, ยอดขั้นต่ำ)
**ประมาณเวลา:** 2-3 ชม.

#### งาน:
1. **เพิ่ม tab ใน Settings** — "รอบจ่ายเงิน Staff"
   - วันจ่ายเงินงวดแรก (default: 16)
   - วันจ่ายเงินงวดหลัง (default: 1 เดือนถัดไป)
   - วันตัดรอบงวดแรก (default: 10)
   - วันตัดรอบงวดหลัง (default: 25)
   - ยอดขั้นต่ำในการจ่าย (default: ฿100)
   - เปิด/ปิด ยกยอดข้ามรอบ

2. **อ่าน/เขียน** จาก `payout_settings` table

#### ทดสอบ:
- Admin → Settings → tab "รอบจ่ายเงิน Staff"
- แก้ค่า → บันทึก → refresh → ค่ายังอยู่
- Cron ใช้ค่าจาก settings (ไม่ใช่ hardcoded)

---

### Phase 6: Integration Testing + Deploy
**ขอบเขต:** ทดสอบ full flow + commit + deploy production
**ประมาณเวลา:** 2-3 ชม.

#### ทดสอบ Full Flow:
1. Staff เลือกรอบ "ครึ่งเดือน" → บันทึก
2. Admin ตั้ง cutoff = วันพรุ่งนี้ (สำหรับทดสอบ)
3. Trigger cron → แจ้งเตือนล่วงหน้า 1 วัน
4. Trigger cron อีกครั้ง (วันตัดรอบ) → สร้าง payout records
5. Admin → Payout Dashboard → เห็น Staff ครบกำหนด
6. Admin → เลือก Staff → จ่ายเงิน → Staff ได้รับแจ้งเตือน
7. Staff → Earnings → เห็น payout history อัปเดต
8. ทดสอบ carry forward (ยอดต่ำกว่าขั้นต่ำ)

#### Deploy:
- git commit + push + merge main
- ตรวจ Vercel deploy
- ทดสอบ production

---

## 4. Files ที่ต้องสร้าง/แก้ไข

### ไฟล์ใหม่ (NEW):
| ไฟล์ | รายละเอียด |
|------|-----------|
| `apps/admin/src/pages/PayoutDashboard.tsx` | Admin Payout Dashboard |
| `apps/admin/src/components/BatchPayoutModal.tsx` | Batch payout modal |
| `apps/server/src/services/payoutService.ts` | Payout cron logic |

### ไฟล์ที่แก้ไข (MODIFIED):
| ไฟล์ | รายละเอียด |
|------|-----------|
| `apps/staff/src/pages/StaffSettings.tsx` | เพิ่ม section รอบการรับเงิน |
| `apps/admin/src/App.tsx` | เพิ่ม route `/admin/payout-dashboard` |
| `apps/admin/src/layouts/AdminLayout.tsx` | เพิ่มเมนู "รอบจ่ายเงิน" |
| `apps/admin/src/pages/Settings.tsx` | เพิ่ม tab "รอบจ่ายเงิน Staff" |
| `apps/server/src/index.ts` | เพิ่ม cron job + dev endpoint |
| `apps/server/src/services/notificationService.ts` | เพิ่ม payout notifications |
| `apps/server/src/services/emailService.ts` | เพิ่ม payout email template |
| `packages/supabase/src/earnings/types.ts` | เพิ่ม PayoutSchedule type |
| `packages/supabase/src/earnings/earningsService.ts` | เพิ่ม schedule functions |
| `packages/supabase/src/staff/staffService.ts` | เพิ่ม payout schedule CRUD |

### Database (via Supabase MCP):
| Migration | รายละเอียด |
|-----------|-----------|
| `ALTER TABLE staff` | เพิ่ม payout_schedule column |
| `CREATE TABLE payout_settings` | ตั้งค่ารอบจ่ายเงิน |
| `ALTER TABLE payouts` | เพิ่ม payout_round, carry_forward columns |
| `CREATE TABLE payout_notifications` | ป้องกันแจ้งเตือนซ้ำ |

---

## 5. ความสัมพันธ์กับระบบเดิม

### ใช้ระบบเดิมที่มีอยู่:
- **payouts table** — ใช้ table เดิม เพิ่มแค่ 3 columns
- **payout_jobs table** — ใช้เดิม ไม่แก้ไข
- **bank_accounts table** — ใช้เดิม ไม่แก้ไข
- **CreatePayoutModal** — ยังใช้ได้สำหรับ manual create
- **ProcessPayoutModal** — ยังใช้ได้สำหรับ manual process
- **StaffEarnings.tsx** — ไม่แก้ไข (แสดง payout history เดิม)
- **StaffDetail.tsx (Admin)** — ไม่แก้ไข (ดู earnings/payout per staff)
- **Notification system** — ใช้ pattern เดียวกับ Hotel Credit notifications

### ไม่กระทบ:
- Hotel Credit system (แยกกันคนละระบบ)
- Booking/Payment flow
- Customer app
- Staff job management

---

## 6. Test Cases

| TC | หมวด | ทดสอบ | Priority |
|----|------|-------|----------|
| 01 | Staff UI | เลือกรอบ "ครึ่งเดือน" → บันทึก → refresh | HIGH |
| 02 | Staff UI | เลือกรอบ "รายเดือน" → บันทึก → refresh | HIGH |
| 03 | Staff UI | แสดงรอบถัดไป + ยอดสะสมถูกต้อง | HIGH |
| 04 | Cron | ตัดรอบงวดแรก (วันที่ 10, นับ 26-10) → สร้าง payout สำหรับ bi-monthly only, จ่าย 16 | HIGH |
| 05 | Cron | ตัดรอบงวดหลัง (วันที่ 25, นับ 11-25) → สร้าง payout ทุกคน, จ่าย 1 เดือนถัดไป | HIGH |
| 06 | Cron | ยอดต่ำกว่าขั้นต่ำ → carry forward | HIGH |
| 07 | Cron | carry forward ข้ามรอบ → ยอดรวมถูกต้อง | MEDIUM |
| 08 | Notify | ล่วงหน้า 1 วันก่อนตัดรอบ → Staff + Admin ได้รับแจ้ง | HIGH |
| 08b | Notify | ล่วงหน้า 1 วันก่อนจ่ายเงิน (วันที่ 15 + สิ้นเดือน) → Admin ได้รับแจ้ง | HIGH |
| 09 | Notify | แจ้ง carry forward → Staff ได้รับแจ้ง | MEDIUM |
| 10 | Notify | Duplicate prevention → ไม่แจ้งซ้ำ | MEDIUM |
| 11 | Admin | Dashboard — Stats ถูกต้อง | HIGH |
| 12 | Admin | Dashboard — ตาราง Staff ครบกำหนด | HIGH |
| 13 | Admin | Dashboard — Filter รอบ/เดือน/สถานะ | MEDIUM |
| 14 | Admin | Batch payout → อัปเดตหลายคนพร้อมกัน | HIGH |
| 15 | Admin | Export CSV | LOW |
| 16 | Admin | Settings — ตั้งค่ายอดขั้นต่ำ | MEDIUM |
| 17 | Admin | Settings — ตั้งค่าวันตัดรอบ/วันจ่ายเงิน | MEDIUM |
| 18 | Regression | Login ทุก app ยังทำงาน | HIGH |
| 19 | Regression | Staff Earnings page ยังแสดงถูกต้อง | HIGH |
| 20 | Regression | Admin StaffDetail earnings tab ยังใช้ได้ | HIGH |

---

## 7. Implementation Report (2026-04-03)

### สถานะ: ✅ เสร็จสมบูรณ์ — 106/108 TC PASS (98%)

### 7.1 Commits

| Commit | รายละเอียด |
|--------|-----------|
| `5920638` | feat(payout): add staff payout schedule system — Phase 1-6 ครบ |
| `7aedd22` | feat(payout): add validation, LINE push, bank warning, earnings integration |
| `0ef6601` | feat(payout): force payout inactive, payout jobs detail, carry forward stats |
| `a211a34` | feat(payout): show carry-forward and not-due virtual rows in admin dashboard |
| `3264bc8` | fix(earnings): use profileId instead of staffId for payout history query |

### 7.2 ไฟล์ที่สร้าง/แก้ไข (ทั้งหมด)

#### ไฟล์ใหม่ (NEW):
| ไฟล์ | รายละเอียด |
|------|-----------|
| `apps/admin/src/pages/PayoutDashboard.tsx` | Admin Payout Dashboard + BatchPayoutModal + Export CSV |
| `apps/server/src/services/payoutService.ts` | Payout cron logic: cutoff, carry forward, notifications, force payout inactive |

#### ไฟล์ที่แก้ไข (MODIFIED):
| ไฟล์ | รายละเอียด |
|------|-----------|
| `apps/staff/src/pages/StaffSettings.tsx` | เพิ่ม section "รอบการรับเงิน" (radio cards + next payout info) |
| `apps/staff/src/pages/StaffEarnings.tsx` | เพิ่ม payout_round label, carry forward info, payout jobs detail |
| `apps/admin/src/App.tsx` | เพิ่ม route `/admin/payout` |
| `apps/admin/src/layouts/AdminLayout.tsx` | เพิ่มเมนู "รอบจ่ายเงิน" + Wallet icon |
| `apps/admin/src/pages/Settings.tsx` | เพิ่ม tab "รอบจ่ายเงิน Staff" + validation (1-28, 0-100000) |
| `apps/server/src/index.ts` | เพิ่ม cron job (08:00 ICT) + dev endpoint `/api/dev/trigger-payout-cutoff` |
| `packages/supabase/src/earnings/earningsService.ts` | เพิ่ม getPayoutSchedule, updatePayoutSchedule, getNextPayoutInfo, getPayoutSettings |
| `packages/supabase/src/earnings/types.ts` | เพิ่ม PayoutSchedule, PayoutRound, PayoutSettings, NextPayoutInfo types |
| `packages/supabase/src/earnings/useEarnings.ts` | แก้ usePayouts ให้ใช้ profileId แทน staffId |
| `packages/supabase/src/types/database.types.ts` | เพิ่ม generated types: payout_settings, payout_notifications, payout_schedule, payout_round |

#### Database Migration (via Supabase MCP):
| รายการ | รายละเอียด |
|--------|-----------|
| `ALTER TABLE staff` | เพิ่ม `payout_schedule` column (default 'monthly') |
| `CREATE TABLE payout_settings` | 6 settings: วันตัดรอบ, วันจ่าย, ยอดขั้นต่ำ, carry forward |
| `ALTER TABLE payouts` | เพิ่ม `payout_round`, `is_carry_forward`, `carry_forward_amount` |
| `CREATE TABLE payout_notifications` | Duplicate prevention (unique: staff_id+type+round+month) |
| RLS Policies | payout_settings (anyone SELECT, admin UPDATE), payout_notifications (admin+staff SELECT) |

### 7.3 ฟีเจอร์ที่ implement เพิ่มจาก Plan เดิม

ฟีเจอร์เหล่านี้ไม่ได้อยู่ใน Plan เดิม Phase 1-6 แต่ implement เพิ่มเพื่อให้ TC ผ่านครบ:

| ฟีเจอร์ | รายละเอียด | TC ที่เกี่ยวข้อง |
|---------|-----------|----------------|
| **Validation ฟอร์ม** | วัน 1-28, ยอดขั้นต่ำ 0-100,000, ป้องกันค่าว่าง/ลบ | TC-75 to TC-80 |
| **LINE Push Notification** | เรียก `/api/notifications/payout-completed` (existing endpoint) เมื่อ Admin จ่ายเงินสำเร็จ | TC-40, TC-41 |
| **Bank Account Warning** | Cron ส่ง notification "กรุณาเพิ่มบัญชีธนาคาร" + Dashboard แสดง icon เตือน | TC-42, TC-58, TC-99 |
| **Force Payout Inactive** | Cron จ่ายเงินให้ Staff ที่ inactive ทุกยอดไม่ว่าจะน้อยแค่ไหน | TC-28 |
| **Virtual Rows (ยกยอด)** | Admin Dashboard แสดงแถว Staff ที่ถูกยกยอด (status สีส้ม) จาก payout_notifications | TC-56 |
| **Virtual Rows (ยังไม่ถึงรอบ)** | Admin Dashboard แสดงแถว Staff monthly ที่ยังไม่ถึงรอบ (status สีเทา) | TC-57 |
| **Payout Jobs Detail** | Staff Earnings detail modal แสดงรายการ jobs ที่อยู่ใน payout | TC-90 |
| **Payout Round Label** | Staff Earnings แสดง "งวดแรก/งวดหลัง" ในรายการ payout + detail modal | TC-81, TC-82, TC-84 |
| **Carry Forward Info** | Staff Earnings detail modal แสดงยอดยกมาจากรอบก่อน | — |
| **usePayouts Fix** | แก้ bug: usePayouts hook ใช้ profileId แทน staffId (payouts.staff_id = profiles.id) | TC-86 to TC-88 |

### 7.4 สิ่งที่ยังไม่ได้ implement (N/A 2 TCs)

| TC | รายละเอียด | เหตุผล |
|----|-----------|--------|
| TC-45 | Email notification เมื่อจ่ายเงินสำเร็จ | ยังไม่ได้เชื่อมต่อ emailService สำหรับ payout |
| TC-46 | ไม่ error ถ้า Staff ไม่มี email | ต้อง implement TC-45 ก่อน |

### 7.5 Bug ที่พบและแก้ไขระหว่าง Testing

| Bug | สาเหตุ | แก้ไข |
|-----|--------|-------|
| วันที่แสดงผิด -1 วัน | `toISOString()` แปลงเป็น UTC (ลดวัน) | ใช้ `formatDate()` local time แทน |
| payout_jobs insert ล้มเหลว | ใส่ column `tip` ที่ไม่มีในตาราง | ลบ `tip: 0` ออก |
| Staff ที่ profile_id=null → UUID error | Cron query ไม่ filter null | เพิ่ม `.not('profile_id', 'is', null)` |
| `.onConflict()` is not a function | Supabase JS v2 syntax ต่างจาก v1 | เปลี่ยนเป็น `.upsert({}, { onConflict: '...' })` |
| Admin Dashboard ไม่แสดงข้อมูล | import supabase client ผิดตัว | เปลี่ยนจาก `@bliss/supabase/auth` เป็น `../lib/supabase` |
| setMessage({object}) crash | message state เป็น string ไม่ใช่ object | เปลี่ยนเป็น `setMessage('string')` |
| Staff Earnings ไม่แสดง payout history | usePayouts ใช้ staff.id แต่ payouts.staff_id = profile_id | เปลี่ยนเป็นใช้ profileId |
