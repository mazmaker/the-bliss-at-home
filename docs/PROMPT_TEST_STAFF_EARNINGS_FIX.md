# Prompt สำหรับทดสอบ — Fix staff_earnings = 0

คัดลอก Prompt ด้านล่างทั้งหมด (ภายใน ```) แล้วส่งให้ Claude AI ใน chat ใหม่:

---

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home

## บริบท

โปรเจค The Bliss at Home — แพลตฟอร์มจองนวด/สปาถึงบ้าน
เพิ่งแก้ bug ที่ทำให้ completed jobs มี staff_earnings = 0 สำหรับ customer bookings

### สิ่งที่แก้ไป
1. **DB Trigger `sync_booking_to_job()`** — เปลี่ยนจาก `COALESCE(NEW.staff_earnings, 0)` เป็นคำนวณจาก `final_price * service.staff_commission_rate`
2. **Application Code `updateJobStatus()`** ใน `packages/supabase/src/jobs/jobService.ts` — เพิ่ม safety net คำนวณ staff_earnings ตอน complete job ถ้ายังเป็น 0
3. **Backfill** — UPDATE ทุก job เดิมที่ staff_earnings = 0

### Commission Rate
- เก็บเป็น decimal บน `services.staff_commission_rate` (0.30 = 30%, 0.25 = 25%)
- Services ส่วนใหญ่: 0.30 (30%)
- Foot & Oil Massage, Foot & Back Massage: 0.25 (25%)
- สูตร: `staff_earnings = ROUND(final_price * staff_commission_rate)`

---

## URLs & Credentials

### Localhost
| App | URL |
|-----|-----|
| Admin | http://localhost:3001 |
| Customer | http://localhost:3008 |
| Hotel | http://localhost:3003 |
| Staff | https://coral-industries-match-airlines.trycloudflare.com |

### Production
| App | URL |
|-----|-----|
| Admin | https://admin.theblissmassageathome.com |
| Customer | https://customer.theblissmassageathome.com |
| Hotel | https://hotel.theblissmassageathome.com |
| Staff | https://staff.theblissmassageathome.com |

### Login (ใช้ได้ทั้ง localhost และ production)
| App | Username | Password |
|-----|----------|----------|
| Admin | admintest@theblissathome.com | Admin@12345 |
| Customer | mazmakerdesign@gmail.com | U9B*B2LE#8-q!m8 |
| Hotel | reservations@hilton.com | Hotel123. |
| Staff | LINE LIFF — แจ้งผู้ใช้ login ให้ |

### Supabase
- Project ref: `rbdvlfriqjnwpxmmgisf`
- ใช้ `mcp__supabase__execute_sql` สำหรับ verify ข้อมูลหลังทดสอบ UI

---

## วิธีทดสอบ

1. **ทดสอบผ่าน Playwright MCP เท่านั้น** — ไม่อัปเดต DB โดยตรง
2. **ทดสอบ localhost ก่อน** → แก้ไขจนผ่าน → ค่อยทดสอบ production
3. **ถ้า FAIL** → แก้โค้ด → ทดสอบซ้ำจนผ่าน
4. **ใช้ Supabase SQL** เฉพาะ verify ผลลัพธ์ (SELECT เท่านั้น ไม่ UPDATE/INSERT)
5. **Staff app ต้องให้ผู้ใช้ login** — แจ้งเมื่อต้องการทดสอบ
6. **สรุปผลเป็นตาราง PASS/FAIL** ท้ายทุก section

---

## Test Plan — Localhost

### Section A: Verify Backfill (Admin UI)

**เปิด Admin app → หน้าพนักงาน**

#### TC-A01: Staff เตย แสดงรายได้ถูกต้อง
1. ไปที่ Admin → พนักงาน (http://localhost:3001/admin/staff)
2. หา "เตย ʕᵔᴥᵔʔ" ในตาราง
3. **Expected:** งานที่เสร็จ = 2, รายได้รวม = ฿484

#### TC-A02: Staff ทดสอบ999 รายได้ไม่เปลี่ยน (ไม่ได้กระทบจาก fix)
1. หา "ทดสอบ999" ในตาราง
2. **Expected:** งานที่เสร็จ = 13, รายได้รวม = ฿8,990

#### TC-A03: Staff สมหญิง รายได้ไม่เปลี่ยน
1. หา "สมหญิง นวดเก่ง" ในตาราง
2. **Expected:** งานที่เสร็จ = 192, รายได้รวม = ฿101,460

---

### Section B: Verify Admin Payout Dashboard

**ไปที่ Admin → รอบจ่ายเงิน**

#### TC-B01: Payout Dashboard โหลดสำเร็จ
1. ไปที่ http://localhost:3001/admin/payout
2. **Expected:** เห็นหัวข้อ "รอบจ่ายเงิน Staff" พร้อม stats cards 4 ใบ

#### TC-B02: Stats cards แสดงข้อมูลถูกต้อง
1. ตรวจ "Staff ทั้งหมด" card — ต้อง > 0
2. ตรวจ "ยอดรวมรอจ่าย" card — ต้องแสดงตัวเลข

#### TC-B03: Payout table แสดง staff ที่มี earnings
1. ตรวจตาราง payout — ต้องมี staff เตย (ถ้าอยู่ในรอบปัจจุบัน)
2. ตรวจว่ายอดเงินแสดงถูกต้อง (ไม่เป็น ฿0 สำหรับ staff ที่มีงาน completed)

#### TC-B04: Payout Detail Modal แสดงรายละเอียดงาน
1. คลิกที่ row ของ staff ที่มี earnings > 0
2. **Expected:** Modal "รายละเอียดการจ่ายเงิน" เปิดขึ้น
3. ตรวจตารางรายการงาน — แต่ละงานต้องมียอด earnings > 0
4. ตรวจยอดรวม — ต้องตรงกับ staff_earnings ที่ backfill ไว้

---

### Section C: Staff Earnings Page (ต้องให้ผู้ใช้ login LINE ก่อน)

**แจ้งผู้ใช้ login Staff app ก่อนทำ section นี้**

#### TC-C01: Staff Earnings page โหลดสำเร็จ
1. ไปที่ Staff app → หน้ารายได้ (tab "รายได้" ด้านล่าง)
2. **Expected:** เห็นหัวข้อ "รายได้" พร้อม period selector (วัน/สัปดาห์/เดือน)

#### TC-C02: รายได้เดือนนี้แสดงถูกต้อง (Staff ทดสอบ999)
1. เลือก tab "เดือน"
2. **Expected:** "รายได้เดือนนี้" แสดงยอด > ฿0 (ถ้ามีงาน completed เดือนนี้)
3. จำนวนงาน, ชั่วโมง ต้อง > 0

#### TC-C03: Daily earnings chart แสดงข้อมูล
1. ตรวจ chart "รายได้รายวัน"
2. **Expected:** มี bar chart แสดง (ไม่ใช่หน้าว่างเปล่า)

#### TC-C04: Service breakdown แสดงรายบริการ
1. ตรวจ section "แยกตามบริการ"
2. **Expected:** แสดงรายการบริการพร้อม earnings > 0

#### TC-C05: Payout history แสดง (ถ้ามี)
1. ตรวจ section "ประวัติการโอนเงิน"
2. **Expected:** แสดงรายการ payout หรือ empty state

---

### Section D: New Customer Booking — Full E2E Flow

**ทดสอบว่า booking ใหม่ได้ staff_earnings > 0 จาก trigger**

#### TC-D01: Customer สร้าง booking ใหม่
1. เปิด Customer app (http://localhost:3008)
2. Login ด้วย mazmakerdesign@gmail.com
3. ไปที่หน้าบริการ → เลือก "นวดเท้า" (Foot Massage, commission 30%)
4. เลือกวัน/เวลาในอนาคต
5. กรอกข้อมูลที่อยู่ + จองเลย
6. **Expected:** Booking สร้างสำเร็จ — จดเลข booking number

#### TC-D02: Verify job มี staff_earnings > 0 (SQL)
```sql
SELECT j.id, j.staff_earnings, j.total_staff_earnings, j.status, j.amount,
       b.booking_number, b.final_price
FROM jobs j
JOIN bookings b ON j.booking_id = b.id
WHERE b.booking_number = '<BOOKING_NUMBER_FROM_TC-D01>'
```
- **Expected:** staff_earnings > 0, total_staff_earnings > 0
- **Expected calculation:** staff_earnings = ROUND(final_price * 0.30)

#### TC-D03: Admin เห็น booking ใหม่
1. ไปที่ Admin → การจอง (http://localhost:3001/admin/bookings)
2. หา booking number จาก TC-D01
3. **Expected:** booking แสดงในรายการ, สถานะ "รอดำเนินการ" หรือ "pending"

---

### Section E: Job Completion Safety Net — Full E2E Flow

**ทดสอบว่า safety net ใน updateJobStatus() ทำงาน**

> Note: ต้อง Staff login + accept + complete job ผ่าน UI
> ถ้า Staff login ไม่ได้ → แจ้งผู้ใช้ → skip section นี้ไปก่อน

#### TC-E01: Staff รับงาน
1. Staff app → หน้างาน → หางาน pending จาก TC-D01
2. กด "รับงาน"
3. **Expected:** สถานะเปลี่ยนเป็น "assigned" หรือ "confirmed"

#### TC-E02: Staff เริ่มงาน
1. กด "เริ่มงาน"
2. **Expected:** สถานะเปลี่ยนเป็น "in_progress"

#### TC-E03: Staff complete งาน
1. กด "เสร็จงาน"
2. **Expected:** สถานะเปลี่ยนเป็น "completed"

#### TC-E04: Verify earnings หลัง complete (SQL)
```sql
SELECT j.staff_earnings, j.total_staff_earnings, j.status
FROM jobs j
JOIN bookings b ON j.booking_id = b.id
WHERE b.booking_number = '<BOOKING_NUMBER_FROM_TC-D01>'
```
- **Expected:** status = 'completed', staff_earnings > 0

#### TC-E05: Staff Earnings page อัปเดตหลัง complete
1. Staff app → หน้ารายได้
2. **Expected:** ยอดรายได้เพิ่มขึ้นจากก่อน complete

---

### Section F: Edge Cases (SQL verify หลัง UI action)

#### TC-F01: Booking ที่มี promotion/discount
1. Customer app → สร้าง booking ใหม่
2. ใช้ promo code "DISCOUNT15%" หรือ "SAVE200" (ถ้ามี)
3. **Expected:** staff_earnings คำนวณจาก `final_price` (ราคาหลังลด) ไม่ใช่ `total_price`
4. Verify ด้วย SQL:
```sql
SELECT j.staff_earnings, b.final_price, b.total_price, b.discount_amount
FROM jobs j JOIN bookings b ON j.booking_id = b.id
WHERE b.booking_number = '<BOOKING_NUMBER>'
```
- **Expected:** staff_earnings = ROUND(final_price * commission_rate) (ไม่ใช่ total_price)

#### TC-F02: Service ที่มี commission rate ต่างกัน (25%)
1. Customer app → สร้าง booking เลือก "Foot & Oil Massage" (commission 25%)
2. Verify ด้วย SQL — staff_earnings ต้องคำนวณจาก 0.25 ไม่ใช่ 0.30
```sql
SELECT j.staff_earnings, b.final_price,
       ROUND(b.final_price * 0.25) as expected_earnings
FROM jobs j JOIN bookings b ON j.booking_id = b.id
WHERE b.booking_number = '<BOOKING_NUMBER>'
```
- **Expected:** staff_earnings = expected_earnings (ใช้ 25% ไม่ใช่ 30%)

#### TC-F03: Hotel booking ยังทำงานถูกต้อง (regression)
1. Hotel app → Login → ดู Dashboard
2. **Expected:** Hotel app ยังเข้าใช้งานได้ปกติ ไม่ error
3. (Hotel booking สร้าง job ผ่าน secure-bookings-v2.ts ไม่ผ่าน trigger — ไม่ควรกระทบ)

#### TC-F04: Admin Staff page ไม่มี staff ที่มี earnings ผิดปกติ
1. Admin → พนักงาน → scroll ดูทุกคน
2. **Expected:** ไม่มี staff ที่แสดง "รายได้รวม" เป็นตัวเลขติดลบหรือค่าแปลกๆ

---

### Section G: Admin Payout — Calculation Accuracy

#### TC-G01: Payout ยอดตรงกับ staff_earnings
1. Admin → รอบจ่ายเงิน
2. เลือกดู staff ที่มี pending payout
3. คลิกดู detail
4. **Expected:** ยอดรวมในรอบ = SUM(staff_earnings) ของ completed jobs ในช่วงวันที่ของรอบนั้น

#### TC-G02: Carry forward ทำงานถูกต้อง (ถ้ายอด < 100)
1. ดูตาราง payout — หา staff ที่มี status "ยกยอด"
2. **Expected:** ยอดยกต้อง < minimum_payout_amount (฿100)

---

## Test Plan — Production

**ทำหลังจาก localhost ผ่านทุก TC แล้ว**
**ต้อง commit + push + deploy ก่อน** (สำหรับ application code changes)
**DB trigger + backfill ถูก apply ผ่าน migration แล้ว (ทำงานบน production โดยตรง)**

### Section H: Production — Verify Backfill

#### TC-H01: Staff เตย แสดงรายได้ถูกต้องบน Production
1. เปิด https://admin.theblissmassageathome.com → login → พนักงาน
2. หา "เตย ʕᵔᴥᵔʔ"
3. **Expected:** งานที่เสร็จ = 2, รายได้รวม = ฿484

#### TC-H02: Staff ทดสอบ999 ไม่เปลี่ยน
1. หา "ทดสอบ999"
2. **Expected:** งานที่เสร็จ = 13, รายได้รวม = ฿8,990

#### TC-H03: Staff สมหญิง ไม่เปลี่ยน
1. หา "สมหญิง นวดเก่ง"
2. **Expected:** งานที่เสร็จ = 192, รายได้รวม = ฿101,460

---

### Section I: Production — Payout Dashboard

#### TC-I01: Payout Dashboard โหลดสำเร็จ
1. https://admin.theblissmassageathome.com → รอบจ่ายเงิน
2. **Expected:** หน้าโหลดสำเร็จ, stats cards แสดงข้อมูล

#### TC-I02: Payout table ไม่มี staff ที่ยอด ฿0 ผิดปกติ
1. ตรวจตาราง — staff ที่มีงาน completed ต้องมียอดเงิน > 0
2. **Expected:** ไม่มีแถวที่ควรมี earnings แต่แสดง ฿0

---

### Section J: Production — Staff Earnings

#### TC-J01: Staff Earnings page (ทดสอบ999) แสดงถูกต้อง
1. แจ้งผู้ใช้ login Staff app production
2. ไปที่หน้ารายได้
3. **Expected:** "รายได้เดือนนี้" แสดงยอดถูกต้อง (> ฿0 ถ้ามีงานเดือนนี้)

#### TC-J02: เตย — Earnings page แสดง ฿484 (ถ้า login ได้)
1. (อาจต้อง skip ถ้าไม่มี LINE account ของเตย)
2. **Expected:** รายได้รวมสะสม = ฿484

---

### Section K: Production — New Booking E2E

#### TC-K01: Customer สร้าง booking ใหม่บน Production
1. เปิด https://customer.theblissmassageathome.com
2. Login → จอง "นวดเท้า" → วัน/เวลาในอนาคต → กรอกที่อยู่ → ยืนยัน
3. **Expected:** Booking สร้างสำเร็จ

#### TC-K02: Verify job.staff_earnings > 0 (SQL)
```sql
SELECT j.staff_earnings, j.total_staff_earnings, b.booking_number, b.final_price
FROM jobs j JOIN bookings b ON j.booking_id = b.id
WHERE b.booking_number = '<BOOKING_NUMBER>'
```
- **Expected:** staff_earnings = ROUND(final_price * 0.30) > 0

#### TC-K03: Admin เห็น booking ใหม่พร้อมยอด
1. Admin production → การจอง → หา booking number
2. **Expected:** booking แสดงในรายการ

---

### Section L: Production — Regression

#### TC-L01: Hotel app ยังทำงานปกติ
1. เปิด https://hotel.theblissmassageathome.com → login
2. **Expected:** Dashboard โหลดสำเร็จ ไม่ error

#### TC-L02: Customer app browsing ปกติ
1. เปิด https://customer.theblissmassageathome.com
2. เปิดดูบริการ, โปรโมชั่น
3. **Expected:** ทุกหน้าโหลดปกติ

#### TC-L03: Admin app ทุกเมนูปกติ
1. เปิด Admin → คลิกทุกเมนูหลัก (ภาพรวม, บริการ, พนักงาน, การจอง, โรงแรม)
2. **Expected:** ทุกหน้าโหลดสำเร็จ ไม่ error

---

## Cleanup (หลังทดสอบ)

#### TC-Z01: ลบ booking ทดสอบ (ถ้าต้องการ)
- จด booking numbers ที่สร้างระหว่างทดสอบ
- ยกเลิกผ่าน Admin UI (ไม่ลบ DB โดยตรง)
- หรือ ปล่อยไว้เป็น test data

---

## สรุปผลที่ต้องรายงาน

รายงานผลเป็นตาราง 2 ตาราง:

### Localhost Results
| TC | Description | Expected | Actual | PASS/FAIL |
|----|------------|----------|--------|-----------|
| TC-A01 | เตย earnings ฿484 | ... | ... | ... |
| ... | ... | ... | ... | ... |

### Production Results
| TC | Description | Expected | Actual | PASS/FAIL |
|----|------------|----------|--------|-----------|
| TC-H01 | เตย earnings ฿484 | ... | ... | ... |
| ... | ... | ... | ... | ... |

**Total: XX/YY PASS, X FAIL, X SKIP**

---

## ข้อควรระวัง

1. **Session หายเมื่อ navigate ไป URL ใหม่** — ต้อง login ใหม่ทุกครั้งที่เปลี่ยน app
2. **Staff app ต้อง LINE login** — แจ้งผู้ใช้ทุกครั้ง
3. **Cloudflare tunnel อาจ expire** — ถ้า Staff app เข้าไม่ได้ แจ้งผู้ใช้สร้าง tunnel ใหม่
4. **Production data เป็นของจริง** — ระวังเรื่อง booking ทดสอบ ให้ยกเลิกหลังทดสอบ
5. **ใช้ browser_snapshot ก่อน interact** — ตาม Playwright MCP best practice
6. **แยก tab สำหรับแต่ละ app** — ใช้ browser_tabs เพื่อ manage
7. **อ่าน memory** — อ่าน MEMORY.md ก่อนเริ่มงาน

## สำคัญ
- Branch: `feature/staff`
- ต้อง commit + push ก่อนทดสอบ production (application code changes)
- DB migration ถูก apply แล้ว (trigger + backfill ทำงานบน production แล้ว)
```

---

*สร้างเมื่อ: 6 เม.ย. 2569*
*Test Cases: 28 TCs (Localhost: 17, Production: 11) + Cleanup*
