# Prompt สำหรับ Continue งาน — Staff Payout Schedule Testing

คัดลอก Prompt ด้านล่างทั้งหมด (ภายใน ```) แล้วส่งให้ Claude AI ใน chat ใหม่:

---

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home

## บริบท — Staff Payout Schedule Feature

เราพัฒนาฟีเจอร์ "รอบจ่ายเงิน Staff" (Staff Payout Schedule) สำหรับโปรเจค The Bliss at Home — แพลตฟอร์มจองบริการนวด/สปา/ทำเล็บถึงบ้าน

### Test Plan
อ่าน `docs/TEST_PLAN_STAFF_PAYOUT_SCHEDULE.md` — มี 107 TCs + 2 cleanup (TC-01 ถึง TC-109)

### ผลทดสอบที่ผ่านมา

#### รอบ 1 — Localhost (เสร็จแล้ว)
- **105/107 PASS, 0 FAIL, 2 N/A** (TC-45/46 email notification)
- Bug ที่พบและแก้แล้ว:
  1. `payoutService.ts` carry forward logic — ยอดยกไม่ถูกนับสะสม
  2. `useEarnings.ts` profile_id vs staff_id mismatch — Staff Earnings ดึงข้อมูลผิด ID

#### รอบ 2 — Production (เสร็จแล้ว — 3 เม.ย. 2569)
- **50/50 PASS, 0 FAIL, 3 N/A** (TC-82/83/85 ไม่มีข้อมูล pending/processing/failed)
- URL ที่ใช้:
  - Admin: https://admin.theblissmassageathome.com
  - Customer: https://customer.theblissmassageathome.com
  - Hotel: https://hotel.theblissmassageathome.com
  - Staff: https://staff.theblissmassageathome.com (LINE LIFF login)

##### TC ที่ทดสอบแล้วบน Production:
- **TC-01~11** (Staff Settings — รอบการรับเงิน): 11/11 PASS
- **TC-47~68** (Admin Payout Dashboard): 19/19 PASS
  - ข้อมูล test ที่สร้าง: จ่ายเงิน สมหญิง 3 รายการ (Ref: TRF-PROD-TEST-001, TRF-PROD-BATCH-001)
- **TC-81~90** (Staff Earnings Integration): 7/7 PASS, 3 N/A
- **TC-91~98** (Regression): 8/8 PASS

##### TC ที่ผ่านบน Localhost แล้ว (ไม่ได้ทดสอบซ้ำบน Production):
- TC-12~32 (Cron Job), TC-33~46 (Notifications), TC-69~80 (Admin Settings), TC-99~108 (Edge Cases)

---

### สิ่งที่แก้แล้วแต่ยังไม่ได้ commit/deploy

#### 1. Bug fix: Modal "รายละเอียดการโอนเงิน" ล้นจอมือถือ
**ไฟล์:** `apps/staff/src/pages/StaffEarnings.tsx`
**สิ่งที่แก้:**
- Modal container: เปลี่ยนจาก `p-4` → `p-4 pb-20` และ `max-h-[80vh]` → `max-h-[75vh]` (ตาม pattern modal อื่นใน Staff app เช่น StaffProfile.tsx line 1267)
- รายการงานใน payout detail: เอา `max-h-40 overflow-y-auto` ออก ให้แสดงยาวๆ ทั้งหมด แล้วใช้ scroll ของ modal ชั้นเดียวแทน (ไม่ scroll ซ้อน)
**สถานะ:** แก้แล้ว ทดสอบบน localhost ผ่าน cloudflare tunnel แล้ว ยังไม่ commit

#### 2. ไฟล์ใหม่: `docs/PROMPT_CONTINUE_PAYOUT_TESTING.md`
**สถานะ:** ยังไม่ commit (ไฟล์นี้เอง)

---

### Issue ที่พบเพิ่มเติม (ยังไม่ได้แก้)

#### Staff "เตย ʕᵔᴥᵔʔ" — รายได้เดือนนี้เป็น ฿0 ทั้งที่มี 2 งาน completed
**สาเหตุจาก DB:**
- `jobs.staff_id` FK → `profiles(id)` (ไม่ใช่ `staff(id)`)
- staff_id ของเตย (profile_id): `9f0c62fe-c821-44e1-86ae-892282396028`
- มี 3 jobs: 2 completed + 1 in_progress แต่ทุกงานมี `staff_earnings = 0.00` และ `total_staff_earnings = null`
- Booking มี `final_price` ถูกต้อง (฿934, ฿1064, ฿679) แต่ไม่ได้คำนวณ staff_earnings ให้
**ต้องตรวจ:** Logic ที่คำนวณ `staff_earnings` ตอน assign job หรือ complete job — ทำไมบาง job ไม่ถูกคำนวณ
**Note:** นี่เป็น issue แยกจาก Payout Schedule feature — เป็นปัญหาของ job assignment/completion flow

#### งานรอมอบหมาย (pending jobs) แสดง ฿0
**สาเหตุ:** ไม่ใช่ bug — งาน pending ยังไม่ assign staff จึงยังไม่คำนวณ staff_earnings (DB ยืนยัน `staff_earnings = 0.00, total_staff_earnings = null` สำหรับทุก pending job)

---

### สิ่งที่ต้องทำต่อ (เรียงตามความสำคัญ)

1. **Commit + Push + Deploy** — modal fix ที่แก้แล้ว
   - Branch: `feature/staff`
   - ไฟล์: `apps/staff/src/pages/StaffEarnings.tsx` + `docs/PROMPT_CONTINUE_PAYOUT_TESTING.md`

2. **เปลี่ยน LIFF Endpoint URL กลับ Production** — ตอนนี้อาจยังชี้ไปที่ cloudflare tunnel URL
   - Production URL: `https://staff.theblissmassageathome.com/staff/login`
   - ตั้งค่าบน LINE Developer Console → LIFF app `2009151241-K0vref5C`

3. **แก้ bug staff_earnings = 0** ของ Staff เตย (และอาจมี Staff อื่นด้วย)
   - ตรวจ logic คำนวณ staff_earnings ใน job assignment/completion flow
   - ตรวจ jobs อื่นที่อาจมีปัญหาเดียวกัน: `SELECT * FROM jobs WHERE status = 'completed' AND (staff_earnings = 0 OR staff_earnings IS NULL)`

4. **TC-109 Cleanup Production** — ลบ test payout records:
   - สมหญิง 3 payout ที่ Ref: TRF-PROD-TEST-001, TRF-PROD-BATCH-001
   - ตรวจ payout_settings ยัง default

5. **Feature อื่นที่ค้าง** — ดู `docs/CHECKLIST.md`

### Login Credentials
| App | Username | Password |
|-----|----------|----------|
| Admin | admintest@theblissathome.com | Admin@12345 |
| Customer | mazmakerdesign@gmail.com | U9B*B2LE#8-q!m8 |
| Hotel | reservations@hilton.com | Hotel123. |
| Staff | LINE LIFF auto-login (ทดสอบ999) — ต้องให้ผู้ใช้ login ให้ |

### Supabase
- Project ref: `rbdvlfriqjnwpxmmgisf`
- ใช้ mcp__supabase__execute_sql สำหรับ query/verify ข้อมูล

### สำคัญ
- อ่าน memory ใน MEMORY.md ก่อนเริ่มงาน
- ทดสอบผ่าน Playwright MCP
- Staff app ต้อง login ผ่าน LINE LIFF — ต้องแจ้งผู้ใช้ login ให้
- LIFF Endpoint URL (production): `https://staff.theblissmassageathome.com/staff/login`
```

---

*อัปเดตล่าสุด: 3 เม.ย. 2569 เวลา 17:30 — เพิ่ม modal fix, staff_earnings bug, LIFF endpoint reminder*
