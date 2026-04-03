# แผนทดสอบ: Staff Payout Schedule — ทดสอบผ่าน UI ด้วย Playwright MCP

## Prompt สำหรับสั่ง Claude AI ทดสอบ

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home
อ่านไฟล์ docs/TEST_PLAN_STAFF_PAYOUT_SCHEDULE.md แล้วทดสอบตาม Test Cases ทั้งหมด

เงื่อนไข:
- ทดสอบผ่าน UI ด้วย Playwright MCP แบบ full flow step by step
- ห้ามทดสอบด้วยการอัปเดต DB โดยตรง ให้ทำผ่าน UI เท่านั้น
- ทดสอบบน localhost ก่อน แก้ไขจนถูกต้อง แล้วค่อยทดสอบบน production
- ถ้า FAIL ให้แก้โค้ดแล้วทดสอบซ้ำจนผ่าน
- สรุปผลเป็นตาราง PASS/FAIL
- หากต้องการล็อกอินสามารถแจ้งฉันได้

Dev Servers (หากยังไม่รัน):
cd /c/chitpon59/dev/project/theblissathome.com/the-bliss-at-home
nohup npx turbo run dev --parallel > /tmp/bliss-dev.log 2>&1 &

Staff tunnel (หาก expire ให้สร้างใหม่แล้วแจ้งฉัน):
cloudflared tunnel --url http://localhost:3004
```

---

## URLs

### Localhost
| App | URL |
|-----|-----|
| Admin | http://localhost:3001 |
| Customer | http://localhost:3008 |
| Hotel | http://localhost:3003 |
| Staff | ใช้ cloudflare tunnel → ถ้า expire ให้รัน `cloudflared tunnel --url http://localhost:3004` แล้วแจ้งผู้ใช้นำ URL ไปตั้งค่าบน LINE Developer Console |

### Production
| App | URL |
|-----|-----|
| Admin | https://admin.theblissmassageathome.com |
| Customer | https://customer.theblissmassageathome.com |
| Hotel | https://hotel.theblissmassageathome.com |
| Staff | https://staff.theblissmassageathome.com |

---

## Login Credentials (ใช้ได้ทั้ง localhost และ production)

| App | Username | Password | หมายเหตุ |
|-----|----------|----------|---------|
| Admin | admintest@theblissathome.com | Admin@12345 | — |
| Customer | mazmakerdesign@gmail.com | U9B*B2LE#8-q!m8 | วิชัย มีชัย |
| Hotel | reservations@hilton.com | Hotel123. | โรงแรมฮิลตัน กรุงเทพฯ |
| Staff | — | — | LINE LIFF auto-login ผ่าน tunnel — แจ้งผู้ใช้ล็อกอินให้ |

---

## Test Cases

---

### PART A: Staff App — เลือกรอบการรับเงิน (11 TCs)

---

#### TC-01: Staff — เลือกรอบ "ครึ่งเดือน" → บันทึก → refresh ยังอยู่

**วัตถุประสงค์:** ตรวจสอบว่า Staff เลือกรอบจ่ายเงิน "ครึ่งเดือน" ได้ และค่าคงอยู่หลัง refresh

**ขั้นตอน:**
1. Login Staff app (แจ้งผู้ใช้ล็อกอินให้ผ่าน LINE)
2. ไปหน้า ตั้งค่า (Settings) → tab ล่างสุดของ bottom nav
3. เลื่อนไปที่ section "รอบการรับเงิน"
4. เลือก "ครึ่งเดือน (รับ 2 ครั้ง: วันที่ 16 + วันที่ 1)"
5. ระบบบันทึกอัตโนมัติ (หรือกดบันทึก)
6. Refresh หน้า (F5)
7. ดูว่ายังเลือก "ครึ่งเดือน" อยู่หรือไม่

**ผลลัพธ์ที่คาดหวัง:**
- [ ] เลือก "ครึ่งเดือน" → บันทึกสำเร็จ (มี toast/feedback)
- [ ] Refresh หน้า → ยังเลือก "ครึ่งเดือน" อยู่

---

#### TC-02: Staff — เลือกรอบ "รายเดือน" → บันทึก → refresh ยังอยู่

**วัตถุประสงค์:** ตรวจสอบว่า Staff เลือกรอบจ่ายเงิน "รายเดือน" ได้ และค่าคงอยู่หลัง refresh

**ขั้นตอน:**
1. จาก TC-01 → เปลี่ยนเป็น "รายเดือน (รับ 1 ครั้ง: วันที่ 1 เดือนถัดไป)"
2. ระบบบันทึก
3. Refresh หน้า (F5)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] เลือก "รายเดือน" → บันทึกสำเร็จ
- [ ] Refresh หน้า → ยังเลือก "รายเดือน" อยู่

---

#### TC-03: Staff — Default เป็น "รายเดือน" (Staff ที่ยังไม่เคยเลือก)

**วัตถุประสงค์:** Staff ใหม่ที่ยังไม่เคยตั้งค่า ค่า default ต้องเป็น "รายเดือน"

**ขั้นตอน:**
1. ตรวจจาก DB ว่า staff.payout_schedule default = 'monthly'
2. หรือดู Staff คนอื่นที่ยังไม่เคยตั้งค่า → ไปหน้า Settings

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Default = "รายเดือน" ถูกเลือกอยู่
- [ ] ไม่มี error ถ้ายังไม่เคยเลือก

---

#### TC-04: Staff — แสดงรอบถัดไป: วันตัดรอบถูกต้อง

**วัตถุประสงค์:** ข้อมูลวันตัดรอบถัดไปแสดงถูกต้องตามรอบที่เลือก

**ขั้นตอน:**
1. Staff → Settings → section "รอบการรับเงิน"
2. เลือก "ครึ่งเดือน" → ดูวันตัดรอบ
3. เลือก "รายเดือน" → ดูวันตัดรอบ

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ครึ่งเดือน → วันตัดรอบแสดง วันที่ 10 หรือ 25 ของเดือน (แล้วแต่ว่าวันไหนถึงก่อน)
- [ ] รายเดือน → วันตัดรอบแสดง วันที่ 25 ของเดือน (จ่ายวันที่ 1 เดือนถัดไป)

---

#### TC-05: Staff — แสดงรอบถัดไป: วันรับเงินถูกต้อง

**วัตถุประสงค์:** ข้อมูลวันรับเงินถัดไปแสดงถูกต้องตามรอบที่เลือก

**ขั้นตอน:**
1. Staff → Settings → section "รอบการรับเงิน"
2. เลือก "ครึ่งเดือน" → ดูวันรับเงิน
3. เลือก "รายเดือน" → ดูวันรับเงิน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ครึ่งเดือน → วันรับเงินแสดง วันที่ 16 หรือ วันที่ 1 เดือนถัดไป (แล้วแต่ว่าวันไหนถึงก่อน)
- [ ] รายเดือน → วันรับเงินแสดง วันที่ 1 เดือนถัดไป

---

#### TC-06: Staff — แสดงยอดสะสมปัจจุบัน (฿)

**วัตถุประสงค์:** ยอดสะสมปัจจุบันแสดงเป็นจำนวนเงินบาทถูกต้อง

**ขั้นตอน:**
1. Staff → Settings → section "รอบการรับเงิน"
2. ดูช่อง "ยอดสะสม"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงยอดสะสมเป็น ฿ (format เช่น ฿2,400)
- [ ] ยอดตรงกับ completed jobs ที่ยังไม่ได้สร้าง payout

---

#### TC-07: Staff — เปลี่ยนรอบจาก ครึ่งเดือน → รายเดือน → วันตัดรอบ/รับเงิน อัปเดต

**วัตถุประสงค์:** เมื่อเปลี่ยนจากครึ่งเดือนเป็นรายเดือน วันตัดรอบ/รับเงิน อัปเดตทันที

**ขั้นตอน:**
1. Staff → Settings → เลือก "ครึ่งเดือน" → จดวันตัดรอบ/รับเงิน
2. เปลี่ยนเป็น "รายเดือน"
3. ดูวันตัดรอบ/รับเงิน ว่าเปลี่ยนหรือไม่

**ผลลัพธ์ที่คาดหวัง:**
- [ ] วันตัดรอบเปลี่ยนเป็น วันที่ 25 (ถ้าเดิมแสดง วันที่ 10)
- [ ] วันรับเงินเปลี่ยนเป็น วันที่ 1 เดือนถัดไป (ถ้าเดิมแสดง วันที่ 16)

---

#### TC-08: Staff — เปลี่ยนรอบจาก รายเดือน → ครึ่งเดือน → วันตัดรอบ/รับเงิน อัปเดต

**วัตถุประสงค์:** เมื่อเปลี่ยนจากรายเดือนเป็นครึ่งเดือน วันตัดรอบ/รับเงิน อัปเดตทันที

**ขั้นตอน:**
1. Staff → Settings → เลือก "รายเดือน" → จดวันตัดรอบ/รับเงิน
2. เปลี่ยนเป็น "ครึ่งเดือน"
3. ดูวันตัดรอบ/รับเงิน ว่าเปลี่ยนหรือไม่

**ผลลัพธ์ที่คาดหวัง:**
- [ ] วันตัดรอบอาจเปลี่ยนเป็น วันที่ 10 (ถ้าถึงก่อน 25)
- [ ] วันรับเงินอาจเปลี่ยนเป็น วันที่ 16 (ถ้าถึงก่อนวันที่ 1 เดือนถัดไป)

---

#### TC-09: Staff — DB: staff.payout_schedule อัปเดตถูกต้อง

**วัตถุประสงค์:** ค่าที่บันทึกใน DB ตรงกับที่ UI แสดง

**ขั้นตอน:**
1. Staff → Settings → เลือก "ครึ่งเดือน" → บันทึก
2. ตรวจ DB: `SELECT payout_schedule FROM staff WHERE profile_id = '<staff_profile_id>'`
3. เปลี่ยนเป็น "รายเดือน" → บันทึก
4. ตรวจ DB อีกครั้ง

**ผลลัพธ์ที่คาดหวัง:**
- [ ] เลือก "ครึ่งเดือน" → DB = 'bi-monthly'
- [ ] เลือก "รายเดือน" → DB = 'monthly'

---

#### TC-10: Staff — Section อยู่ในหน้า Settings ระหว่าง job reminders กับ logout

**วัตถุประสงค์:** ตำแหน่งของ section "รอบการรับเงิน" อยู่ถูกที่

**ขั้นตอน:**
1. Staff → Settings → เลื่อนดูลำดับ section ทั้งหมด

**ผลลัพธ์ที่คาดหวัง:**
- [ ] section "รอบการรับเงิน" อยู่หลัง section การแจ้งเตือน/เตือนก่อนงาน
- [ ] section "รอบการรับเงิน" อยู่ก่อน "ออกจากระบบ"

---

#### TC-11: Staff — มี 2 ตัวเลือก: ครึ่งเดือน / รายเดือน

**วัตถุประสงค์:** UI แสดง radio buttons 2 ตัวเลือกถูกต้อง

**ขั้นตอน:**
1. Staff → Settings → section "รอบการรับเงิน"
2. ดูตัวเลือกที่มี

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี 2 ตัวเลือก: "ครึ่งเดือน" และ "รายเดือน"
- [ ] "ครึ่งเดือน" แสดงคำอธิบาย "รับ 2 ครั้ง: วันที่ 16 + วันที่ 1"
- [ ] "รายเดือน" แสดงคำอธิบาย "รับ 1 ครั้ง: วันที่ 1 เดือนถัดไป"

---

### PART B: Cron Job — ตัดรอบ + สร้าง Payout (21 TCs)

---

#### TC-12: Cron — ตัดรอบงวดแรก (วันที่ 10): Staff bi-monthly → สร้าง payout, round=mid-month

**วัตถุประสงค์:** Cron ตัดรอบงวดแรก → สร้าง payout สำหรับ Staff ที่เลือก "ครึ่งเดือน" เท่านั้น

**เตรียมข้อมูล:**
1. ตรวจว่ามี Staff อย่างน้อย 1 คนเลือก "ครึ่งเดือน" และมี completed jobs ในช่วงวันที่ 26 เดือนก่อน ถึง 10

**ขั้นตอน:**
1. Admin → Settings → ตั้งวันตัดรอบงวดแรก = วันนี้ (สำหรับทดสอบ)
2. POST trigger cron: `http://localhost:3000/api/dev/trigger-payout-cutoff`
3. ตรวจ payout records ใน DB หรือ Admin Dashboard

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Staff ที่เลือก "ครึ่งเดือน" → มี payout record ใหม่
- [ ] payout record: status = 'pending'
- [ ] payout record: payout_round = 'mid-month'

---

#### TC-13: Cron — ตัดรอบงวดแรก: Staff monthly → ไม่สร้าง payout

**วัตถุประสงค์:** Staff ที่เลือก "รายเดือน" ไม่ถูกสร้าง payout ในงวดแรก

**เตรียมข้อมูล:**
1. ตรวจว่ามี Staff อย่างน้อย 1 คนเลือก "รายเดือน"

**ขั้นตอน:**
1. จาก TC-12 (trigger cron งวดแรกแล้ว)
2. ตรวจ payout records ของ Staff ที่เลือก "รายเดือน"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Staff ที่เลือก "รายเดือน" → ไม่มี payout record ในงวดนี้

---

#### TC-14: Cron — ตัดรอบงวดแรก: คำนวณรายได้ช่วงวันที่ 26-10 ถูกต้อง

**วัตถุประสงค์:** ยอดเงินใน payout ตรงกับ completed jobs ในช่วงวันที่ 26 เดือนก่อน ถึง 10 เดือนนี้

**ขั้นตอน:**
1. จาก TC-12 (trigger cron งวดแรกแล้ว)
2. ตรวจ payout record: amount
3. เทียบกับ SUM(staff_earning) ของ completed jobs วันที่ 26 เดือนก่อน ถึง 10

**ผลลัพธ์ที่คาดหวัง:**
- [ ] payout amount ตรงกับ SUM(staff_earning) ของ completed jobs ในช่วงวันที่ 26 เดือนก่อน ถึง 10

---

#### TC-15: Cron — ตัดรอบงวดหลัง (วันที่ 25): Staff bi-monthly → สร้าง payout นับ 11-25, round=end-month

**วัตถุประสงค์:** Cron ตัดรอบงวดหลัง → Staff bi-monthly นับรายได้ วันที่ 11-25

**ขั้นตอน:**
1. Admin → Settings → ตั้งวันตัดรอบงวดหลัง = วันนี้
2. POST trigger cron
3. ตรวจ payout record ของ Staff ที่เลือก "ครึ่งเดือน"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] สร้าง payout record สำหรับ Staff bi-monthly
- [ ] period_start = วันที่ 11, period_end = วันที่ 25
- [ ] payout_round = 'end-month'

---

#### TC-16: Cron — ตัดรอบงวดหลัง: Staff monthly → สร้าง payout นับ 26 เดือนก่อน ถึง 25

**วัตถุประสงค์:** Cron ตัดรอบงวดหลัง → Staff monthly นับรายได้ วันที่ 26 เดือนก่อน ถึง 25 เดือนนี้

**ขั้นตอน:**
1. จาก TC-15 (trigger cron งวดหลังแล้ว)
2. ตรวจ payout record ของ Staff ที่เลือก "รายเดือน"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] สร้าง payout record สำหรับ Staff monthly
- [ ] period_start = วันที่ 26 เดือนก่อน, period_end = วันที่ 25
- [ ] payout_round = 'end-month'
- [ ] จ่ายวันที่ 1 เดือนถัดไป

---

#### TC-17: Cron — ตัดรอบงวดหลัง: bi-monthly ที่มี carry forward จากงวดแรก → ยอดรวมถูกต้อง

**วัตถุประสงค์:** ยอดจากงวดแรกที่ถูกยกมา + รายได้ใหม่งวดหลัง → ยอดรวมถูกต้อง

**เตรียมข้อมูล:**
1. ต้องมี Staff bi-monthly ที่งวดแรกถูก carry forward

**ขั้นตอน:**
1. Trigger cron ตัดรอบงวดหลัง
2. ตรวจ payout record → amount

**ผลลัพธ์ที่คาดหวัง:**
- [ ] payout amount = carry_forward_amount + รายได้ วันที่ 11-25

---

#### TC-18: Cron — Carry forward: ยอดต่ำกว่าขั้นต่ำ → ไม่สร้าง payout + ยกยอด

**วัตถุประสงค์:** Staff ที่มีรายได้น้อยกว่ายอดขั้นต่ำ → ไม่สร้าง payout แต่ยกยอดไปรอบถัดไป

**เตรียมข้อมูล:**
1. Admin → Settings → ตั้งยอดขั้นต่ำ = ฿500 (ให้สูงกว่ารายได้ Staff ทดสอบ)

**ขั้นตอน:**
1. Trigger cron ตัดรอบ
2. ตรวจ payout records

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่สร้าง payout record (ยอดต่ำกว่าขั้นต่ำ)
- [ ] ยอดถูกยกไปรอบถัดไป (carry forward)

**Cleanup:** Reset ยอดขั้นต่ำกลับ ฿100

---

#### TC-19: Cron — Carry forward: ยกยอดข้ามรอบ → ยอดรวมสะสมถูกต้อง

**วัตถุประสงค์:** ยอดที่ยกข้ามรอบสะสมถูกต้อง

**ขั้นตอน:**
1. จาก TC-18 (มี carry forward แล้ว)
2. Trigger cron ตัดรอบอีกครั้ง (ยอดขั้นต่ำยังสูง)
3. ตรวจ carry forward amount

**ผลลัพธ์ที่คาดหวัง:**
- [ ] carry forward amount = ยอดรอบก่อน + รายได้ใหม่

---

#### TC-20: Cron — Carry forward: ยกยอดหลายรอบต่อเนื่อง → ยอดรวมถูกต้อง

**วัตถุประสงค์:** ยกยอดต่อเนื่อง 3+ รอบ → ยอดสะสมถูกต้อง

**ขั้นตอน:**
1. ตั้งยอดขั้นต่ำสูงมาก (เช่น ฿10,000)
2. Trigger cron 3 รอบ ต่อเนื่อง
3. ตรวจ carry forward amount แต่ละรอบ

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดสะสม carry forward เพิ่มขึ้นทุกรอบ
- [ ] ยอดรวม = SUM รายได้ทุกรอบที่ยก

**Cleanup:** Reset ยอดขั้นต่ำกลับ ฿100

---

#### TC-21: Cron — Carry forward: ยอดรวม carry + รายได้ใหม่ >= ขั้นต่ำ → สร้าง payout

**วัตถุประสงค์:** เมื่อยอดรวม carry forward + รายได้ใหม่ถึงขั้นต่ำ → สร้าง payout

**ขั้นตอน:**
1. จาก TC-18/19 (มี carry forward แล้ว)
2. Admin → Settings → ตั้งยอดขั้นต่ำ = ฿50 (ให้ต่ำกว่ายอดรวม)
3. Trigger cron ตัดรอบ

**ผลลัพธ์ที่คาดหวัง:**
- [ ] สร้าง payout record (ยอดรวม carry + รายได้ใหม่ >= ขั้นต่ำ)
- [ ] carry_forward_amount แสดงยอดที่ยกมา
- [ ] is_carry_forward = true

---

#### TC-22: Cron — payout record: payout_round ถูกต้อง (mid-month / end-month)

**วัตถุประสงค์:** payout_round บันทึกถูกต้องตามงวดที่ตัด

**ขั้นตอน:**
1. Trigger cron ที่วันตัดรอบงวดแรก → ตรวจ payout_round
2. Trigger cron ที่วันตัดรอบงวดหลัง → ตรวจ payout_round

**ผลลัพธ์ที่คาดหวัง:**
- [ ] งวดแรก → payout_round = 'mid-month'
- [ ] งวดหลัง → payout_round = 'end-month'

---

#### TC-23: Cron — payout record: carry_forward_amount บันทึกถูกต้อง

**วัตถุประสงค์:** ค่า carry_forward_amount ใน payout record ถูกต้อง

**ขั้นตอน:**
1. จาก TC-21 (สร้าง payout จาก carry forward)
2. ตรวจ payout record: carry_forward_amount

**ผลลัพธ์ที่คาดหวัง:**
- [ ] carry_forward_amount = ยอดที่ยกมาจากรอบก่อน (ไม่ใช่ 0)

---

#### TC-24: Cron — payout record: is_carry_forward = true เมื่อมียกยอด

**วัตถุประสงค์:** flag is_carry_forward ถูกตั้งเป็น true เมื่อ payout มียอดยกมา

**ขั้นตอน:**
1. จาก TC-21 (สร้าง payout จาก carry forward)
2. ตรวจ payout record: is_carry_forward

**ผลลัพธ์ที่คาดหวัง:**
- [ ] is_carry_forward = true
- [ ] payout ปกติ (ไม่มี carry) → is_carry_forward = false

---

#### TC-25: Cron — payout record: status = pending

**วัตถุประสงค์:** payout ที่สร้างจาก cron มี status = pending เสมอ

**ขั้นตอน:**
1. Trigger cron ตัดรอบ → ตรวจ payout records ที่สร้างใหม่

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ทุก payout ที่สร้างจาก cron มี status = 'pending'

---

#### TC-26: Cron — payout record: period_start + period_end ถูกต้อง

**วัตถุประสงค์:** ช่วงเวลาที่บันทึกใน payout record ถูกต้อง

**ขั้นตอน:**
1. Trigger cron งวดแรก → ตรวจ period_start, period_end
2. Trigger cron งวดหลัง → ตรวจ period_start, period_end

**ผลลัพธ์ที่คาดหวัง:**
- [ ] งวดแรก (bi-monthly): period_start = วันที่ 26 เดือนก่อน, period_end = วันที่ 10
- [ ] งวดหลัง (bi-monthly): period_start = วันที่ 11, period_end = วันที่ 25
- [ ] งวดหลัง (monthly): period_start = วันที่ 26 เดือนก่อน, period_end = วันที่ 25

---

#### TC-27: Cron — Duplicate prevention: trigger ซ้ำวันเดียวกัน → ไม่สร้างซ้ำ

**วัตถุประสงค์:** Trigger cron ซ้ำในวันเดียวกัน ไม่สร้าง payout ซ้ำ

**ขั้นตอน:**
1. Trigger cron ตัดรอบ (ครั้งแรก → สร้าง payout)
2. Trigger cron ตัดรอบอีกครั้ง (ครั้งที่ 2 ในวันเดียวกัน)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ครั้งที่ 2 ไม่สร้าง payout ซ้ำ
- [ ] Response หรือ Log แสดงว่า "Already processed" หรือจำนวน payout ใหม่ = 0

---

#### TC-28: Cron — Staff inactive → force payout ทั้งหมดไม่ว่ายอดเท่าไหร่

**วัตถุประสงค์:** Staff ที่ inactive/ลาออก ได้รับ force payout ไม่ว่ายอดจะน้อยแค่ไหน

**ขั้นตอน:**
1. มี Staff ที่ status = inactive และมียอดค้าง (แม้ต่ำกว่าขั้นต่ำ)
2. Trigger cron ตัดรอบ

**ผลลัพธ์ที่คาดหวัง:**
- [ ] สร้าง payout record ให้ Staff inactive (ไม่ว่ายอดจะเท่าไหร่)

---

#### TC-29: Cron — ตัดรอบ ก.พ. (28/29 วัน) → วันจ่ายเงินงวดหลังถูกต้อง

**วัตถุประสงค์:** เดือนกุมภาพันธ์ ตัดรอบวันที่ 25 → จ่ายวันที่ 1 มี.ค. ถูกต้อง

**ขั้นตอน:**
1. ตรวจ logic การคำนวณวันจ่ายเงินสำหรับเดือน ก.พ.

**ผลลัพธ์ที่คาดหวัง:**
- [ ] วันจ่ายเงินงวดหลัง = 1 มี.ค. (ไม่ใช่สิ้นเดือน ก.พ.)
- [ ] วันจ่ายเงินงวดแรก (bi-monthly) = 16 ก.พ.

---

#### TC-30: Cron — ตัดรอบ เม.ย. → วันจ่ายเงินงวดหลังถูกต้อง

**วัตถุประสงค์:** เดือนที่มี 30 วัน → วันจ่ายเงินงวดหลัง = 1 พ.ค.

**ขั้นตอน:**
1. ตรวจ logic การคำนวณวันจ่ายเงินสำหรับเดือน เม.ย.

**ผลลัพธ์ที่คาดหวัง:**
- [ ] วันจ่ายเงินงวดหลัง = 1 พ.ค.
- [ ] วันจ่ายเงินงวดแรก (bi-monthly) = 16 เม.ย.

---

#### TC-31: Cron — ตัดรอบ มี.ค. → วันจ่ายเงินงวดหลังถูกต้อง

**วัตถุประสงค์:** เดือนที่มี 31 วัน → วันจ่ายเงินงวดหลัง = 1 เม.ย.

**ขั้นตอน:**
1. ตรวจ logic การคำนวณวันจ่ายเงินสำหรับเดือน มี.ค.

**ผลลัพธ์ที่คาดหวัง:**
- [ ] วันจ่ายเงินงวดหลัง = 1 เม.ย.
- [ ] วันจ่ายเงินงวดแรก (bi-monthly) = 16 มี.ค.

---

#### TC-32: Cron — Staff ไม่มี completed jobs ในรอบ → ไม่สร้าง payout (ยอด 0)

**วัตถุประสงค์:** Staff ที่ไม่มี completed jobs ในช่วงตัดรอบ ไม่ถูกสร้าง payout

**ขั้นตอน:**
1. Trigger cron ตัดรอบ (มี Staff ที่ไม่มี completed jobs ในรอบ)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่สร้าง payout record (ยอด = 0)
- [ ] ไม่ส่ง notification
- [ ] ไม่แสดงใน Admin Dashboard

---

### PART C: Notifications — แจ้งเตือน (14 TCs)

---

#### TC-33: Notify — ล่วงหน้า 1 วันก่อนตัดรอบงวดแรก (วันที่ 9): Staff ได้ in-app notification

**วัตถุประสงค์:** Staff ได้รับแจ้งเตือน in-app 1 วันก่อนตัดรอบงวดแรก

**เตรียมข้อมูล:**
1. Admin → Settings → ตั้งวันตัดรอบงวดแรก = พรุ่งนี้

**ขั้นตอน:**
1. Trigger cron
2. Staff → ดูหน้า Notifications

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Staff ได้รับ in-app notification เกี่ยวกับการตัดรอบพรุ่งนี้

---

#### TC-34: Notify — ล่วงหน้า 1 วัน: Admin ได้ in-app notification "พรุ่งนี้ตัดรอบ X คน"

**วัตถุประสงค์:** Admin ได้รับแจ้งเตือน in-app 1 วันก่อนตัดรอบ

**ขั้นตอน:**
1. จาก TC-33 (trigger cron แล้ว)
2. Admin → ดู notification bell (มุมขวาบน)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Admin ได้รับ in-app notification "พรุ่งนี้ตัดรอบจ่ายเงิน Staff X คน"

---

#### TC-35: Notify — ล่วงหน้า 1 วัน: ข้อความ notification มียอดสะสม + วันตัดรอบถูกต้อง

**วัตถุประสงค์:** เนื้อหา notification ล่วงหน้ามีข้อมูลครบถ้วน

**ขั้นตอน:**
1. จาก TC-33 → ดูข้อความ notification ของ Staff

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ข้อความมี "ยอดสะสม ฿X" (ตัวเลขถูกต้อง)
- [ ] ข้อความมีวันตัดรอบที่ถูกต้อง

---

#### TC-36: Notify — ล่วงหน้า 1 วันก่อนตัดรอบงวดหลัง (วันที่ 24): Staff + Admin ได้แจ้ง

**วัตถุประสงค์:** แจ้งเตือนล่วงหน้า 1 วันก่อนตัดรอบงวดหลัง ส่งถึงทั้ง Staff + Admin

**เตรียมข้อมูล:**
1. Admin → Settings → ตั้งวันตัดรอบงวดหลัง = พรุ่งนี้

**ขั้นตอน:**
1. Trigger cron
2. ตรวจ notification ของ Staff + Admin

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Staff ได้รับ notification ล่วงหน้างวดหลัง
- [ ] Admin ได้รับ notification ล่วงหน้างวดหลัง

---

#### TC-36b: Notify — ล่วงหน้า 1 วันก่อนจ่ายเงินงวดแรก (วันที่ 15): Admin ได้ in-app notification

**วัตถุประสงค์:** Admin ได้รับแจ้งเตือน in-app 1 วันก่อนถึงกำหนดจ่ายเงินงวดแรก (วันที่ 16)

**เตรียมข้อมูล:**
1. ต้องมี payout records ที่ status = pending, round = mid-month (จาก cron ตัดรอบวันที่ 10 แล้ว)

**ขั้นตอน:**
1. Admin → Settings → ตั้งวันจ่ายเงินงวดแรก = พรุ่งนี้ (สำหรับทดสอบ)
2. Trigger cron
3. Admin → ดู notification bell

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Admin ได้รับ in-app notification "พรุ่งนี้ถึงกำหนดจ่ายเงินงวดแรก Staff X คน ยอดรวม ฿X"
- [ ] ข้อความมีจำนวน Staff ที่ครบกำหนดถูกต้อง
- [ ] ข้อความมียอดรวมถูกต้อง

**Cleanup:** Reset วันจ่ายเงินงวดแรกกลับ 16

---

#### TC-36c: Notify — ล่วงหน้า 1 วันก่อนจ่ายเงินงวดหลัง (วันสิ้นเดือน): Admin ได้ in-app notification

**วัตถุประสงค์:** Admin ได้รับแจ้งเตือน in-app 1 วันก่อนถึงกำหนดจ่ายเงินงวดหลัง (วันที่ 1 เดือนถัดไป)

**เตรียมข้อมูล:**
1. ต้องมี payout records ที่ status = pending, round = end-month (จาก cron ตัดรอบวันที่ 25 แล้ว)

**ขั้นตอน:**
1. Trigger cron ในวันสิ้นเดือน (หรือตั้งค่า payout day = พรุ่งนี้)
2. Admin → ดู notification bell

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Admin ได้รับ in-app notification "พรุ่งนี้ถึงกำหนดจ่ายเงินงวดหลัง Staff X คน ยอดรวม ฿X"
- [ ] ข้อความมีจำนวน Staff ที่ครบกำหนดถูกต้อง
- [ ] ข้อความมียอดรวมถูกต้อง

---

#### TC-36d: Notify — แจ้งก่อนจ่ายเงิน: Duplicate prevention → ไม่แจ้งซ้ำ

**วัตถุประสงค์:** Trigger cron ซ้ำไม่ส่ง notification ก่อนจ่ายเงินซ้ำ

**ขั้นตอน:**
1. Trigger cron ในวันที่ 15 (ครั้งแรก → ส่ง notification)
2. Trigger cron ซ้ำในวันเดียวกัน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ครั้งที่ 2 ไม่ส่ง notification ซ้ำ
- [ ] ตาราง payout_notifications มี record notification_type = 'payout_due_reminder' ป้องกันซ้ำ

---

#### TC-36e: Notify — แจ้งก่อนจ่ายเงิน: ไม่มี pending payout → ไม่ส่ง notification

**วัตถุประสงค์:** ถ้าไม่มี payout ที่ pending อยู่ ก็ไม่ต้องแจ้ง Admin ก่อนวันจ่ายเงิน

**ขั้นตอน:**
1. ลบ/จ่าย payout ทั้งหมด (ไม่มี pending)
2. Trigger cron ในวันที่ 15 หรือ สิ้นเดือน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่ส่ง notification เพราะไม่มี pending payout

---

#### TC-37: Notify — Carry forward: Staff ได้ "ยอด ฿X ต่ำกว่าขั้นต่ำ ฿100 ยกยอดไปรอบถัดไป"

**วัตถุประสงค์:** Staff ได้รับแจ้งเมื่อยอดถูกยกไปรอบถัดไป

**ขั้นตอน:**
1. ตั้งยอดขั้นต่ำสูง → Trigger cron (ให้เกิด carry forward)
2. Staff → ดูหน้า Notifications

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Staff ได้รับ notification "ยอดรายได้ ฿X ต่ำกว่าขั้นต่ำ ฿Y ยกยอดไปรอบถัดไป"

---

#### TC-38: Notify — Carry forward: ข้อความมียอด + ขั้นต่ำถูกต้อง

**วัตถุประสงค์:** ตัวเลขในข้อความ carry forward notification ถูกต้อง

**ขั้นตอน:**
1. จาก TC-37 → ดูข้อความ notification

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอด ฿X ตรงกับรายได้จริงของ Staff ในรอบนั้น
- [ ] ขั้นต่ำ ฿Y ตรงกับค่าที่ตั้งใน payout_settings

---

#### TC-39: Notify — จ่ายเงินสำเร็จ: Staff ได้ in-app notification "โอนเงิน ฿X เรียบร้อย"

**วัตถุประสงค์:** Staff ได้รับแจ้งเตือน in-app เมื่อ Admin จ่ายเงินสำเร็จ

**ขั้นตอน:**
1. Admin → Payout Dashboard → เลือก Staff → กดจ่ายเงิน → กรอก reference → ยืนยัน
2. Staff → ดูหน้า Notifications

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Staff ได้รับ in-app notification "โอนเงิน ฿X เรียบร้อย"

---

#### TC-40: Notify — จ่ายเงินสำเร็จ: Staff ได้ LINE notification

**วัตถุประสงค์:** Staff ได้รับแจ้งเตือนผ่าน LINE เมื่อ Admin จ่ายเงินสำเร็จ

**ขั้นตอน:**
1. จาก TC-39 (Admin จ่ายเงินแล้ว)
2. ตรวจ LINE ของ Staff

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Staff ได้รับ LINE notification เรื่องการโอนเงิน

---

#### TC-41: Notify — จ่ายเงินสำเร็จ: ข้อความมี transfer reference

**วัตถุประสงค์:** ข้อความ notification จ่ายเงินมี transfer reference

**ขั้นตอน:**
1. จาก TC-39 → ดูข้อความ notification

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ข้อความมี transfer reference ที่ Admin กรอก

---

#### TC-42: Notify — Staff ไม่มี bank account: ได้ notification "กรุณาเพิ่มบัญชีธนาคาร"

**วัตถุประสงค์:** Staff ที่ไม่มี bank account ได้รับแจ้งเตือนให้เพิ่ม

**ขั้นตอน:**
1. Trigger cron (มี Staff ที่ไม่มี bank account แต่มี completed jobs)
2. Staff → ดู Notifications

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Staff ได้รับ notification "กรุณาเพิ่มบัญชีธนาคาร"

---

#### TC-43: Notify — Duplicate prevention: trigger ซ้ำ → ไม่ส่ง notification ซ้ำ

**วัตถุประสงค์:** Trigger cron ซ้ำไม่ส่ง notification ซ้ำ

**ขั้นตอน:**
1. Trigger cron (ครั้งแรก → ส่ง notification)
2. นับจำนวน notifications ของ Staff
3. Trigger cron อีกครั้ง
4. นับจำนวน notifications อีกครั้ง

**ผลลัพธ์ที่คาดหวัง:**
- [ ] จำนวน notifications ไม่เพิ่มขึ้นหลัง trigger ครั้งที่ 2

---

#### TC-44: Notify — ตรวจ payout_notifications table มี record ป้องกันซ้ำ

**วัตถุประสงค์:** ตาราง payout_notifications บันทึก record เพื่อป้องกันการแจ้งเตือนซ้ำ

**ขั้นตอน:**
1. Trigger cron ที่ส่ง notification
2. ตรวจ payout_notifications table

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี record ใน payout_notifications ที่มี staff_id, notification_type, payout_round, period_month ครบ
- [ ] UNIQUE constraint ป้องกันการ insert ซ้ำ

---

#### TC-45: Notify — Email notification ส่งถึง Staff (ถ้ามี email)

**วัตถุประสงค์:** Staff ที่มี email ได้รับ email notification

**ขั้นตอน:**
1. Admin จ่ายเงินให้ Staff ที่มี email
2. ตรวจ email ของ Staff (หรือ log ว่าส่ง email แล้ว)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Email ถูกส่ง (หรือ log แสดงว่าส่งสำเร็จ)

---

#### TC-46: Notify — Email notification ไม่ error ถ้า Staff ไม่มี email

**วัตถุประสงค์:** ระบบไม่ error ถ้า Staff ไม่มี email

**ขั้นตอน:**
1. Admin จ่ายเงินให้ Staff ที่ไม่มี email
2. ตรวจว่าไม่มี error

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่เกิด error
- [ ] in-app + LINE notification ยังส่งปกติ

---

### PART D: Admin — Payout Dashboard (22 TCs)

---

#### TC-47: Admin — Sidebar มีเมนู "รอบจ่ายเงิน" (หลัง "พนักงาน")

**วัตถุประสงค์:** เมนู "รอบจ่ายเงิน" อยู่ใน Sidebar ตำแหน่งถูกต้อง

**ขั้นตอน:**
1. Login Admin → ดู Sidebar

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มีเมนู "รอบจ่ายเงิน" ใน Sidebar
- [ ] อยู่หลังเมนู "พนักงาน"

---

#### TC-48: Admin — Dashboard page load: หัวข้อ + subtitle

**วัตถุประสงค์:** หน้า Payout Dashboard แสดงหัวข้อและ subtitle ถูกต้อง

**ขั้นตอน:**
1. Admin → คลิกเมนู "รอบจ่ายเงิน"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงหัวข้อ "รอบจ่ายเงิน Staff" (หรือคล้ายกัน)
- [ ] แสดง subtitle "Staff Payout Management" (หรือคำอธิบายสั้น)

---

#### TC-49: Admin — Stats box 1: Staff ทั้งหมด (ตัวเลขถูกต้อง)

**วัตถุประสงค์:** Stats box แสดงจำนวน Staff ทั้งหมดถูกต้อง

**ขั้นตอน:**
1. Admin → Payout Dashboard → ดู Stats box "Staff ทั้งหมด"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ตัวเลขตรงกับจำนวน Staff active ในระบบ

---

#### TC-50: Admin — Stats box 2: ครบกำหนดรอบนี้ (ตัวเลขถูกต้อง)

**วัตถุประสงค์:** Stats box แสดงจำนวน Staff ที่ครบกำหนดจ่ายรอบนี้ถูกต้อง

**ขั้นตอน:**
1. Admin → Payout Dashboard → ดู Stats box "ครบกำหนดรอบนี้"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ตัวเลขตรงกับจำนวน Staff ที่มี pending payout ในรอบปัจจุบัน

---

#### TC-51: Admin — Stats box 3: ยอดรวมรอจ่าย (฿ format ถูกต้อง)

**วัตถุประสงค์:** Stats box แสดงยอดรวมรอจ่ายในรูปแบบ ฿ ถูกต้อง

**ขั้นตอน:**
1. Admin → Payout Dashboard → ดู Stats box "ยอดรวมรอจ่าย"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงยอดรวมเป็น ฿ format (เช่น ฿24,600)
- [ ] ยอดรวมตรงกับ SUM amount ของ pending payouts

---

#### TC-52: Admin — Stats box 4: ยกยอด/ต่ำกว่าขั้นต่ำ (ตัวเลขถูกต้อง)

**วัตถุประสงค์:** Stats box แสดงจำนวน Staff ที่ถูกยกยอดถูกต้อง

**ขั้นตอน:**
1. Admin → Payout Dashboard → ดู Stats box "ยกยอด"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ตัวเลขตรงกับจำนวน Staff ที่มี carry forward ในรอบนี้

---

#### TC-53: Admin — แสดงรอบปัจจุบัน: ข้อความ "งวดแรก/งวดหลัง เดือน ปี"

**วัตถุประสงค์:** แสดงข้อความรอบปัจจุบันถูกต้อง

**ขั้นตอน:**
1. Admin → Payout Dashboard → ดูข้อความรอบปัจจุบัน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงข้อความเช่น "งวดแรก เม.ย. 2569 (ตัดรอบ 10 เม.ย. จ่าย 16 เม.ย.)" หรือ "งวดหลัง เม.ย. 2569 (ตัดรอบ 25 เม.ย. จ่าย 1 พ.ค.)"

---

#### TC-54: Admin — ตาราง: คอลัมน์ครบ (checkbox, ชื่อ, รอบ, ยอด, สถานะ, จัดการ)

**วัตถุประสงค์:** ตาราง Staff มีคอลัมน์ครบตามที่ออกแบบ

**ขั้นตอน:**
1. Admin → Payout Dashboard → ดูหัวคอลัมน์ตาราง

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มีคอลัมน์: checkbox, ชื่อ, รอบ, ยอด, สถานะ, จัดการ

---

#### TC-55: Admin — ตาราง: Staff "รอจ่าย" แสดงปุ่ม [จ่าย]

**วัตถุประสงค์:** Staff ที่มีสถานะ "รอจ่าย" มีปุ่มจ่ายเงิน

**ขั้นตอน:**
1. Admin → Payout Dashboard → ดูแถว Staff ที่มีสถานะ "รอจ่าย"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงปุ่ม [จ่าย] ที่คอลัมน์จัดการ

---

#### TC-56: Admin — ตาราง: Staff "ยกยอด" แสดงสถานะ + ปุ่ม [ดู]

**วัตถุประสงค์:** Staff ที่ถูกยกยอดแสดงสถานะและปุ่มดูรายละเอียด

**ขั้นตอน:**
1. Admin → Payout Dashboard → ดูแถว Staff ที่มีสถานะ "ยกยอด"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงสถานะ "ยกยอด"
- [ ] แสดงปุ่ม [ดู]

---

#### TC-57: Admin — ตาราง: Staff "ยังไม่ถึงรอบ" แสดงสถานะ

**วัตถุประสงค์:** Staff ที่ยังไม่ถึงรอบ (เช่น monthly ในงวดแรก) แสดงสถานะ

**ขั้นตอน:**
1. Admin → Payout Dashboard (ขณะเป็นงวดแรก) → ดูแถว Staff ที่เลือกรายเดือน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงสถานะ "ยังไม่ถึงรอบ"
- [ ] ไม่มีปุ่ม [จ่าย]

---

#### TC-58: Admin — ตาราง: Staff ไม่มี bank account → แสดงเตือน "ยังไม่มีบัญชีธนาคาร"

**วัตถุประสงค์:** Staff ที่ไม่มี bank account แสดงเตือนในตาราง

**ขั้นตอน:**
1. Admin → Payout Dashboard → ดูแถว Staff ที่ไม่มี bank account

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงข้อความเตือน "ยังไม่มีบัญชีธนาคาร" หรือ icon เตือน

---

#### TC-59: Admin — Filter รอบ (งวดแรก/งวดหลัง) → แสดงถูกต้อง

**วัตถุประสงค์:** Filter ตามรอบ (งวดแรก/งวดหลัง) ทำงานถูกต้อง

**ขั้นตอน:**
1. Admin → Payout Dashboard → เลือก filter รอบ = "งวดแรก"
2. ดูผลลัพธ์

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงเฉพาะ Staff ที่มี payout round = mid-month

---

#### TC-60: Admin — Filter สถานะ (รอจ่าย/ยกยอด/โอนแล้ว) → แสดงถูกต้อง

**วัตถุประสงค์:** Filter ตามสถานะทำงานถูกต้อง

**ขั้นตอน:**
1. Admin → Payout Dashboard → เลือก filter สถานะ = "รอจ่าย"
2. ดูผลลัพธ์
3. เปลี่ยนเป็น "โอนแล้ว" → ดูผลลัพธ์

**ผลลัพธ์ที่คาดหวัง:**
- [ ] "รอจ่าย" → แสดงเฉพาะ Staff ที่ status = pending
- [ ] "โอนแล้ว" → แสดงเฉพาะ Staff ที่ status = completed

---

#### TC-61: Admin — Filter เดือน → แสดงถูกต้อง

**วัตถุประสงค์:** Filter ตามเดือนทำงานถูกต้อง

**ขั้นตอน:**
1. Admin → Payout Dashboard → เลือก filter เดือน (เช่น เม.ย. 2569)
2. ดูผลลัพธ์

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงเฉพาะ payout ของเดือนที่เลือก

---

#### TC-62: Admin — จ่ายเงินทีละคน: modal แสดง ชื่อ, ยอด, ข้อมูลธนาคาร

**วัตถุประสงค์:** Modal จ่ายเงินแสดงข้อมูลครบถ้วน

**ขั้นตอน:**
1. Admin → Payout Dashboard → คลิกปุ่ม [จ่าย] ของ Staff คนหนึ่ง
2. ดู modal ที่เปิดขึ้น

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Modal แสดง: ชื่อ Staff
- [ ] Modal แสดง: ยอดเงิน
- [ ] Modal แสดง: ข้อมูลบัญชีธนาคาร (ธนาคาร, เลขบัญชี, ชื่อบัญชี)

---

#### TC-63: Admin — จ่ายเงินทีละคน: กรอก transfer reference → ยืนยัน → สถานะเปลี่ยน "โอนแล้ว"

**วัตถุประสงค์:** จ่ายเงินสำเร็จ → สถานะเปลี่ยนเป็น "โอนแล้ว"

**ขั้นตอน:**
1. จาก TC-62 → กรอก Transfer Reference (เช่น "TRF-20260401-001")
2. กดยืนยัน
3. ดูสถานะใน Dashboard

**ผลลัพธ์ที่คาดหวัง:**
- [ ] สถานะเปลี่ยนจาก "รอจ่าย" เป็น "โอนแล้ว"
- [ ] ยอดรวมรอจ่ายลดลง

---

#### TC-64: Admin — จ่ายเงินทีละคน: ไม่กรอก reference → validation error

**วัตถุประสงค์:** ไม่ให้จ่ายเงินโดยไม่กรอก transfer reference

**ขั้นตอน:**
1. Admin → Payout Dashboard → คลิกปุ่ม [จ่าย]
2. ไม่กรอก Transfer Reference → กดยืนยัน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error "กรุณากรอก transfer reference" หรือข้อความคล้ายกัน
- [ ] ไม่อัปเดตสถานะ

---

#### TC-65: Admin — Batch payout: เลือก checkbox หลายคน → ปุ่ม "จ่ายเงินที่เลือก" active

**วัตถุประสงค์:** เลือก checkbox หลาย Staff แล้วปุ่ม batch payout จะ active

**ขั้นตอน:**
1. Admin → Payout Dashboard → เลือก checkbox ของ Staff 2-3 คนที่มีสถานะ "รอจ่าย"
2. ดูปุ่ม "จ่ายเงินที่เลือก"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ปุ่ม "จ่ายเงินที่เลือก" เปลี่ยนเป็น active (clickable)
- [ ] แสดงจำนวนที่เลือก

---

#### TC-66: Admin — Batch payout: modal แสดง จำนวน Staff + ยอดรวม

**วัตถุประสงค์:** Modal batch payout แสดงข้อมูลสรุปถูกต้อง

**ขั้นตอน:**
1. จาก TC-65 → กดปุ่ม "จ่ายเงินที่เลือก"
2. ดู modal

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Modal แสดง: จำนวน Staff ที่เลือก (เช่น "3 คน")
- [ ] Modal แสดง: ยอดรวม (เช่น "฿6,200")

---

#### TC-67: Admin — Batch payout: ยืนยัน → ทุก Staff สถานะเปลี่ยน "โอนแล้ว"

**วัตถุประสงค์:** Batch payout ยืนยันแล้ว ทุก Staff ที่เลือกเปลี่ยนสถานะ

**ขั้นตอน:**
1. จาก TC-66 → กรอก Transfer Reference → ยืนยัน
2. ดูสถานะทุก Staff ที่เลือก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ทุก Staff ที่เลือก → สถานะเปลี่ยนเป็น "โอนแล้ว"
- [ ] ทุก Staff ได้รับ notification

---

#### TC-68: Admin — Export CSV: กดปุ่ม → ดาวน์โหลดไฟล์

**วัตถุประสงค์:** กดปุ่ม Export CSV → ดาวน์โหลดไฟล์ CSV สำเร็จ

**ขั้นตอน:**
1. Admin → Payout Dashboard → กดปุ่ม "Export CSV"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ดาวน์โหลดไฟล์ CSV สำเร็จ
- [ ] ชื่อไฟล์มีวันที่ (เช่น payout-2026-04.csv)

---

### PART E: Admin — Settings (12 TCs)

---

#### TC-69: Admin — Tab "รอบจ่ายเงิน Staff" มีอยู่ใน Settings

**วัตถุประสงค์:** หน้า Settings มี tab "รอบจ่ายเงิน Staff"

**ขั้นตอน:**
1. Admin → Settings → ดู tabs ที่มี

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี tab "รอบจ่ายเงิน Staff"
- [ ] คลิกแล้วแสดงฟอร์มตั้งค่า

---

#### TC-70: Admin — แก้วันจ่ายงวดแรก (default 16) → บันทึก → refresh ค่ายังอยู่

**วัตถุประสงค์:** แก้ค่าวันจ่ายงวดแรก → บันทึก → ค่าคงอยู่หลัง refresh

**ขั้นตอน:**
1. Admin → Settings → tab "รอบจ่ายเงิน Staff"
2. แก้วันจ่ายงวดแรก จาก 16 เป็น 18
3. บันทึก
4. Refresh หน้า

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ
- [ ] Refresh → ค่า = 18 (ไม่กลับเป็น 16)

**Cleanup:** Reset กลับ 16

---

#### TC-71: Admin — แก้วันตัดรอบงวดแรก (default 10) → บันทึก → Staff Settings แสดงค่าใหม่

**วัตถุประสงค์:** แก้วันตัดรอบงวดแรก → Staff Settings แสดงวันตัดรอบใหม่

**ขั้นตอน:**
1. Admin → Settings → แก้วันตัดรอบงวดแรก จาก 10 เป็น 12
2. บันทึก
3. Staff → Settings → ดูวันตัดรอบ

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Admin บันทึกสำเร็จ
- [ ] Staff Settings → วันตัดรอบแสดง 12 (ไม่ใช่ 10)

**Cleanup:** Reset กลับ 10

---

#### TC-72: Admin — แก้วันตัดรอบงวดหลัง (default 25) → บันทึก

**วัตถุประสงค์:** แก้ค่าวันตัดรอบงวดหลัง → บันทึก → ค่าคงอยู่

**ขั้นตอน:**
1. Admin → Settings → แก้วันตัดรอบงวดหลัง จาก 25 เป็น 23
2. บันทึก
3. Refresh หน้า

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ
- [ ] Refresh → ค่า = 23

**Cleanup:** Reset กลับ 25

---

#### TC-73: Admin — แก้ยอดขั้นต่ำ (default ฿100) → บันทึก → Cron ใช้ค่าใหม่

**วัตถุประสงค์:** แก้ยอดขั้นต่ำ → Cron ใช้ค่าใหม่ในการตัดสินว่าจะ carry forward หรือไม่

**ขั้นตอน:**
1. Admin → Settings → แก้ยอดขั้นต่ำ จาก ฿100 เป็น ฿200
2. บันทึก
3. Trigger cron ตัดรอบ (Staff มีรายได้ ฿150)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ
- [ ] Cron ใช้ ฿200 เป็นเกณฑ์ → Staff ที่มีรายได้ ฿150 ถูก carry forward

**Cleanup:** Reset กลับ ฿100

---

#### TC-74: Admin — เปิด/ปิด carry forward → บันทึก

**วัตถุประสงค์:** toggle carry forward เปิด/ปิดได้

**ขั้นตอน:**
1. Admin → Settings → ปิด carry forward (toggle off)
2. บันทึก
3. Refresh → ตรวจว่ายังปิดอยู่
4. เปิดกลับ (toggle on) → บันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ปิดได้ → Refresh → ยังปิดอยู่
- [ ] เปิดกลับได้ → Refresh → ยังเปิดอยู่

---

#### TC-75: Admin Settings — Validation: ค่าว่าง → error

**วัตถุประสงค์:** ไม่ให้บันทึกค่าว่าง

**ขั้นตอน:**
1. Admin → Settings → ลบค่าวันตัดรอบงวดแรกให้ว่าง
2. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error
- [ ] ไม่บันทึกค่าว่าง

---

#### TC-76: Admin Settings — Validation: ค่า 0 → error

**วัตถุประสงค์:** ไม่ให้ใส่ค่า 0

**ขั้นตอน:**
1. Admin → Settings → ใส่วันตัดรอบงวดแรก = 0
2. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error
- [ ] ไม่บันทึก

---

#### TC-77: Admin Settings — Validation: ค่าลบ → error

**วัตถุประสงค์:** ไม่ให้ใส่ค่าลบ

**ขั้นตอน:**
1. Admin → Settings → ใส่วันตัดรอบงวดแรก = -5
2. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error
- [ ] ไม่บันทึก

---

#### TC-78: Admin Settings — Validation: ตัวอักษร → error

**วัตถุประสงค์:** ไม่ให้ใส่ตัวอักษรในช่องที่รับตัวเลข

**ขั้นตอน:**
1. Admin → Settings → ใส่วันตัดรอบงวดแรก = "abc"
2. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error หรือ input ไม่ยอมรับตัวอักษร
- [ ] ไม่บันทึก

---

#### TC-79: Admin Settings — Validation: วันตัดรอบ > 31 → error

**วัตถุประสงค์:** ไม่ให้ใส่วันตัดรอบ > 31

**ขั้นตอน:**
1. Admin → Settings → ใส่วันตัดรอบงวดแรก = 35
2. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error "วันต้องอยู่ระหว่าง 1-31"
- [ ] ไม่บันทึก

---

#### TC-80: Admin Settings — Validation: ยอดขั้นต่ำ > 100,000 → boundary test

**วัตถุประสงค์:** ทดสอบ boundary ของยอดขั้นต่ำ

**ขั้นตอน:**
1. Admin → Settings → ใส่ยอดขั้นต่ำ = 100,001
2. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error "ยอดขั้นต่ำไม่เกิน ฿100,000" หรือบันทึกสำเร็จ (ขึ้นกับ business rule)

---

### PART F: Staff App — Earnings Integration (10 TCs)

---

#### TC-81: Staff — Earnings page แสดง payout history จาก cron (รายการใหม่)

**วัตถุประสงค์:** หน้า Earnings แสดง payout ที่สร้างจาก cron

**ขั้นตอน:**
1. หลังจากมี payout record จาก cron
2. Staff → ไปหน้า "รายได้" (Earnings)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง payout history รายการใหม่ (จาก cron)

---

#### TC-82: Staff — Payout status "รอดำเนินการ" (pending) → สีเหลือง

**วัตถุประสงค์:** สถานะ pending แสดงด้วยสีเหลือง

**ขั้นตอน:**
1. Staff → Earnings → ดู payout ที่ status = pending

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงสถานะ "รอดำเนินการ" ด้วยสีเหลือง/amber

---

#### TC-83: Staff — Payout status "กำลังโอน" (processing) → สีน้ำเงิน

**วัตถุประสงค์:** สถานะ processing แสดงด้วยสีน้ำเงิน

**ขั้นตอน:**
1. Staff → Earnings → ดู payout ที่ status = processing (ถ้ามี)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงสถานะ "กำลังโอน" ด้วยสีน้ำเงิน/blue

---

#### TC-84: Staff — Payout status "โอนแล้ว" (completed) → สีเขียว

**วัตถุประสงค์:** สถานะ completed แสดงด้วยสีเขียว

**ขั้นตอน:**
1. Staff → Earnings → ดู payout ที่ status = completed

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงสถานะ "โอนแล้ว" ด้วยสีเขียว/green

---

#### TC-85: Staff — Payout status "ไม่สำเร็จ" (failed) → สีแดง

**วัตถุประสงค์:** สถานะ failed แสดงด้วยสีแดง

**ขั้นตอน:**
1. Staff → Earnings → ดู payout ที่ status = failed (ถ้ามี)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงสถานะ "ไม่สำเร็จ" ด้วยสีแดง/red

---

#### TC-86: Staff — Pending payout ยอดตรงกับ payout record

**วัตถุประสงค์:** ยอด pending payout ใน Earnings ตรงกับ payout record ใน DB

**ขั้นตอน:**
1. Staff → หน้า Earnings → ดูยอด "รอจ่าย"
2. เทียบกับ payout record ที่ status = pending

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดตรงกัน

---

#### TC-87: Staff — หลัง Admin จ่าย → สถานะเปลี่ยน real-time

**วัตถุประสงค์:** สถานะ payout อัปเดตแบบ real-time (หรือหลัง refresh) เมื่อ Admin จ่ายเงิน

**ขั้นตอน:**
1. Staff เปิดหน้า Earnings ทิ้งไว้
2. Admin → จ่ายเงินให้ Staff คนนี้
3. Staff → ดูสถานะเปลี่ยนหรือไม่ (refresh ถ้าจำเป็น)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] สถานะเปลี่ยนจาก "รอดำเนินการ" เป็น "โอนแล้ว" (real-time หรือหลัง refresh)

---

#### TC-88: Staff — หลัง Admin จ่าย → ยอด "รอจ่าย" ลดลง

**วัตถุประสงค์:** ยอด "รอจ่าย" ลดลงหลัง Admin จ่ายเงิน

**ขั้นตอน:**
1. Staff → Earnings → จดยอด "รอจ่าย"
2. Admin จ่ายเงิน
3. Staff → Earnings → ดูยอด "รอจ่าย" อีกครั้ง

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอด "รอจ่าย" ลดลงตามยอดที่ Admin จ่าย

---

#### TC-89: Staff — Transfer reference แสดง + copy ได้

**วัตถุประสงค์:** Transfer reference แสดงใน payout detail และ copy ได้

**ขั้นตอน:**
1. Staff → Earnings → คลิก payout ที่ status = completed
2. ดู transfer reference
3. กด copy (ถ้ามีปุ่ม)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง transfer reference ถูกต้อง
- [ ] copy ได้ (ถ้ามีปุ่ม copy)

---

#### TC-90: Staff — Payout detail: แสดง jobs ที่อยู่ใน payout

**วัตถุประสงค์:** รายละเอียด payout แสดง jobs ที่รวมอยู่ใน payout นั้น

**ขั้นตอน:**
1. Staff → Earnings → คลิก payout → ดูรายละเอียด

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงรายการ jobs ที่อยู่ใน payout (ชื่อลูกค้า, วันที่, ยอด)

---

### PART G: Regression Tests (8 TCs)

---

#### TC-91: Regression — Login Admin

**วัตถุประสงค์:** Admin login ยังทำงานปกติ

**ขั้นตอน:**
1. Login Admin → ดู Dashboard

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Login สำเร็จ → Dashboard โหลดปกติ

---

#### TC-92: Regression — Login Customer

**วัตถุประสงค์:** Customer login ยังทำงานปกติ

**ขั้นตอน:**
1. Login Customer → ดู Home

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Login สำเร็จ → Home page โหลดปกติ

---

#### TC-93: Regression — Login Hotel

**วัตถุประสงค์:** Hotel login ยังทำงานปกติ

**ขั้นตอน:**
1. Login Hotel → ดู Dashboard

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Login สำเร็จ → Dashboard โหลดปกติ

---

#### TC-94: Regression — Login Staff

**วัตถุประสงค์:** Staff login ยังทำงานปกติ

**ขั้นตอน:**
1. Login Staff → ดู Jobs

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Login สำเร็จ → Jobs page โหลดปกติ

---

#### TC-95: Regression — Staff Earnings page เดิมยังทำงาน

**วัตถุประสงค์:** หน้า Earnings เดิมยังทำงานปกติ

**ขั้นตอน:**
1. Staff → ไปหน้า "รายได้" (Earnings)
2. สลับ period: วัน / สัปดาห์ / เดือน
3. ดู charts + payout history

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Earnings summary แสดงถูกต้อง
- [ ] Charts โหลดได้
- [ ] Payout history แสดงถูกต้อง (ทั้ง manual + cron payouts)

---

#### TC-96: Regression — Admin StaffDetail earnings tab ยังใช้ได้

**วัตถุประสงค์:** Admin ดูรายได้ Staff ทีละคนยังใช้ได้

**ขั้นตอน:**
1. Admin → พนักงาน → เลือก Staff → tab "รายได้"
2. ดู earnings summary + payout history

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Earnings summary ถูกต้อง
- [ ] Payout history แสดงทั้ง manual + cron payouts
- [ ] ปุ่ม "สร้างรอบจ่าย" ยังใช้ได้
- [ ] ปุ่ม "ดำเนินการจ่าย" ยังใช้ได้

---

#### TC-97: Regression — Hotel Credit system ไม่กระทบ

**วัตถุประสงค์:** ระบบ Hotel Credit ยังทำงานปกติ

**ขั้นตอน:**
1. Admin → ปฏิทินเครดิต → ดู calendar
2. Hotel → Dashboard → ดู Credit Widget

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ปฏิทินเครดิต แสดงถูกต้อง
- [ ] Hotel Credit Widget แสดงถูกต้อง

---

#### TC-98: Regression — Customer booking flow + Staff job management ไม่กระทบ

**วัตถุประสงค์:** Booking flow + job management ยังทำงานปกติ

**ขั้นตอน:**
1. Customer → ดูหน้า booking (ไม่จำเป็นต้อง book จริง)
2. Staff → ดูหน้า Jobs → ดูรายละเอียดงาน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Customer booking page โหลดปกติ
- [ ] Staff Jobs page โหลดปกติ + รายละเอียดงานดูได้

---

### PART H: Edge Cases (10 TCs)

---

#### TC-99: Edge — Staff ไม่มี bank account → สร้าง payout ได้ (bank_account_id=null) + เตือน

**วัตถุประสงค์:** Cron ยังสร้าง payout ได้แม้ Staff ไม่มี bank account

**ขั้นตอน:**
1. Trigger cron ตัดรอบ (มี Staff ที่ไม่มี bank account แต่มี completed jobs)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] สร้าง payout record ได้ (bank_account_id = null)
- [ ] Admin → Payout Dashboard → แสดงเตือน "ยังไม่มีบัญชีธนาคาร"
- [ ] Staff ได้รับ notification "กรุณาเพิ่มบัญชีธนาคาร"

---

#### TC-100: Edge — Staff ไม่มี completed jobs → ไม่สร้าง payout

**วัตถุประสงค์:** Staff ที่ไม่มี completed jobs ในรอบไม่ถูกสร้าง payout

**ขั้นตอน:**
1. Trigger cron ตัดรอบ (Staff ที่ไม่มี completed jobs)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่สร้าง payout record
- [ ] ไม่ส่ง notification

---

#### TC-101: Edge — เปลี่ยนรอบกลางเดือน (หลังตัดงวดแรกแล้ว): payout เดิมไม่ถูกลบ + งวดหลังนับไม่ซ้ำ

**วัตถุประสงค์:** เปลี่ยนรอบหลังตัดงวดแรก → payout เดิมอยู่ + งวดหลังไม่นับซ้ำ

**ขั้นตอน:**
1. Staff เลือก "ครึ่งเดือน" → cron ตัดรอบงวดแรก (มี payout แล้ว)
2. Staff เปลี่ยนเป็น "รายเดือน"
3. Cron ตัดรอบงวดหลัง

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Payout งวดแรกที่สร้างแล้วยังอยู่ (ไม่ถูกลบ)
- [ ] งวดหลัง (ถ้าเปลี่ยนเป็น monthly) → นับวันที่ 26 เดือนก่อน ถึง 25 แต่ไม่นับซ้ำกับ payout งวดแรกที่สร้างแล้ว

---

#### TC-102: Edge — Staff หลายคน bi-monthly + monthly ปนกัน → cron จัดการถูกต้อง

**วัตถุประสงค์:** Cron จัดการ Staff ที่มี schedule ต่างกันได้ถูกต้องพร้อมกัน

**ขั้นตอน:**
1. มี Staff A = bi-monthly, Staff B = monthly
2. Trigger cron ตัดรอบงวดแรก
3. Trigger cron ตัดรอบงวดหลัง

**ผลลัพธ์ที่คาดหวัง:**
- [ ] งวดแรก: Staff A สร้าง payout (นับ 26-10, จ่าย 16), Staff B ไม่สร้าง
- [ ] งวดหลัง: ทั้ง Staff A + B สร้าง payout (จ่าย 1 เดือนถัดไป)
- [ ] period ของ Staff A งวดหลัง = 11-25, period ของ Staff B = 26 เดือนก่อน ถึง 25

---

#### TC-103: Edge — ปิด carry forward → ยอดต่ำกว่าขั้นต่ำ → สร้าง payout อยู่ดี (ไม่ยกยอด)

**วัตถุประสงค์:** เมื่อปิด carry forward → จ่ายทุกยอดไม่ว่าจะต่ำกว่าขั้นต่ำ

**ขั้นตอน:**
1. Admin → Settings → ปิด carry forward
2. ตั้งยอดขั้นต่ำสูง (เช่น ฿10,000)
3. Trigger cron ตัดรอบ (Staff มีรายได้น้อย)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] สร้าง payout record อยู่ดี (ไม่ carry forward)
- [ ] is_carry_forward = false

**Cleanup:** เปิด carry forward กลับ + reset ยอดขั้นต่ำ

---

#### TC-104: Edge — Admin แก้ cutoff day เป็นวันนี้ → trigger cron → ตัดรอบทันที

**วัตถุประสงค์:** แก้ cutoff day เป็นวันนี้แล้ว trigger cron → ตัดรอบได้ทันที

**ขั้นตอน:**
1. Admin → Settings → ตั้งวันตัดรอบงวดแรก = วันที่ปัจจุบัน
2. Trigger cron

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Cron ตัดรอบทันที → สร้าง payout records

**Cleanup:** Reset วันตัดรอบกลับ default

---

#### TC-105: Edge — Admin แก้ minimum amount หลังมี carry forward → ยอด carry ใช้ค่าใหม่

**วัตถุประสงค์:** เปลี่ยน minimum amount → carry forward ใช้ค่าใหม่ในการตัดสิน

**ขั้นตอน:**
1. มี carry forward อยู่แล้ว (ยอด ฿80, min เดิม ฿100)
2. Admin → Settings → แก้ minimum = ฿50
3. Trigger cron ตัดรอบ

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอด carry ฿80 + รายได้ใหม่ → ใช้ minimum ฿50 ในการตัดสิน → สร้าง payout

**Cleanup:** Reset minimum กลับ ฿100

---

#### TC-106: Edge — Jobs ที่อยู่ใน payout แล้ว → ไม่ถูกนับซ้ำในรอบถัดไป

**วัตถุประสงค์:** Jobs ที่ถูกรวมใน payout แล้วไม่ถูกนับซ้ำ

**ขั้นตอน:**
1. Trigger cron ตัดรอบ → สร้าง payout (มี jobs X, Y, Z)
2. Trigger cron ตัดรอบอีกรอบ (มี jobs ใหม่ A, B)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Payout รอบที่ 2 มีเฉพาะ jobs A, B (ไม่มี X, Y, Z ซ้ำ)

---

#### TC-107: Edge — Staff มี jobs ข้ามวันตัดรอบ (completed วันที่ 11 แต่ booking วันที่ 9) → นับตาม completed_at

**วัตถุประสงค์:** Jobs นับตาม completed_at ไม่ใช่ booking date

**ขั้นตอน:**
1. มี job ที่ booking วันที่ 9 แต่ completed วันที่ 11
2. Trigger cron ตัดรอบงวดแรก (วันที่ 26 เดือนก่อน ถึง 10) + งวดหลัง (วันที่ 11-25)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Job ดังกล่าวอยู่ใน payout งวดหลัง (วันที่ 11-25) ไม่ใช่งวดแรก
- [ ] นับตาม completed_at ไม่ใช่ booking date

---

#### TC-108: Edge — Batch payout เลือก Staff ที่มีทั้ง "รอจ่าย" + "ยกยอด" → จ่ายเฉพาะ "รอจ่าย"

**วัตถุประสงค์:** Batch payout จ่ายเฉพาะ Staff ที่มีสถานะ "รอจ่าย"

**ขั้นตอน:**
1. Admin → Payout Dashboard → เลือก checkbox ของ Staff ที่มีสถานะ "รอจ่าย" + Staff ที่มีสถานะ "ยกยอด"
2. กด "จ่ายเงินที่เลือก"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] จ่ายเฉพาะ Staff ที่มีสถานะ "รอจ่าย"
- [ ] Staff ที่ "ยกยอด" ไม่ถูกจ่าย (หรือ checkbox ถูก disable ตั้งแต่แรก)

---

### PART I: Cleanup (1 TC)

---

#### TC-109: Cleanup — Reset settings กลับ default + ลบ test payout records + ลบ test notifications

**วัตถุประสงค์:** ทำความสะอาดข้อมูลทดสอบ

**ขั้นตอน:**
1. Admin → Settings → Reset ค่า payout settings กลับ default:
   - วันจ่ายงวดแรก = 16
   - วันจ่ายงวดหลัง = 1 (เดือนถัดไป)
   - วันตัดรอบงวดแรก = 10
   - วันตัดรอบงวดหลัง = 25
   - ยอดขั้นต่ำ = ฿100
   - carry forward = เปิด
2. ลบ payout records ทดสอบ (ถ้าจำเป็น)
3. ลบ test notifications (ถ้าจำเป็น)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Settings กลับ default
- [ ] ข้อมูลทดสอบถูกทำความสะอาด

---

---

## ขั้นตอนการทดสอบ — แบ่ง 2 รอบ

### รอบที่ 1: ทดสอบบน Localhost (พัฒนา + แก้ไข)

**เป้าหมาย:** ทดสอบทุก TC บน localhost ถ้า FAIL ให้แก้โค้ดแล้วทดสอบซ้ำจนผ่านทุก TC
**เมื่อผ่านครบ:** Commit + Push + Merge main + Deploy Vercel

```
ลำดับการทดสอบ Localhost:

1. เตรียม environment
   - รัน dev servers: nohup npx turbo run dev --parallel > /tmp/bliss-dev.log 2>&1 &
   - รัน tunnel: cloudflared tunnel --url http://localhost:3004
   - แจ้งผู้ใช้นำ tunnel URL ไปตั้งค่า LINE Developer Console
   - เปิด browser ทุก app แยก tab ด้วย Playwright

2. Login ทุก app
   - Admin: http://localhost:3001 → admintest@theblissathome.com / Admin@12345
   - Customer: http://localhost:3008 → mazmakerdesign@gmail.com / U9B*B2LE#8-q!m8
   - Hotel: http://localhost:3003 → reservations@hilton.com / Hotel123.
   - Staff: tunnel URL → แจ้งผู้ใช้ล็อกอินผ่าน LINE

3. ทดสอบ TC-01 → TC-109 ตามลำดับ
   - PART A (TC-01~11): Staff UI — เลือกรอบ
   - PART B (TC-12~32): Cron — ตัดรอบ + payout
   - PART C (TC-33~46): Notifications
   - PART D (TC-47~68): Admin Dashboard
   - PART E (TC-69~80): Admin Settings
   - PART F (TC-81~90): Staff Earnings integration
   - PART G (TC-91~98): Regression
   - PART H (TC-99~108): Edge Cases
   - PART I (TC-109): Cleanup

4. ถ้า FAIL → แก้โค้ด → ทดสอบ TC นั้นซ้ำจนผ่าน

5. สรุปผล Localhost เป็นตาราง PASS/FAIL

6. เมื่อผ่านครบทุก TC → Commit + Push + Merge main
```

---

### รอบที่ 2: ทดสอบบน Production (ยืนยันหลัง deploy)

**เป้าหมาย:** ยืนยันว่า feature ทำงานถูกต้องบน production จริง
**ทำหลัง:** Vercel deploy สำเร็จทุก app

```
ลำดับการทดสอบ Production:

1. ตรวจ Vercel deployment สำเร็จ (ใช้ vercel-deploy MCP)

2. Login ทุก app บน production
   - Admin: https://admin.theblissmassageathome.com → admintest@theblissathome.com / Admin@12345
   - Customer: https://customer.theblissmassageathome.com → mazmakerdesign@gmail.com / U9B*B2LE#8-q!m8
   - Hotel: https://hotel.theblissmassageathome.com → reservations@hilton.com / Hotel123.
   - Staff: https://staff.theblissmassageathome.com → แจ้งผู้ใช้ล็อกอินผ่าน LINE

3. ทดสอบ TC ที่ทำผ่าน UI ได้ (ไม่รวม TC ที่ต้อง trigger dev endpoint)
   - TC-01~11: Staff UI — เลือกรอบ + แสดงข้อมูล
   - TC-47~48, 49~54: Admin Dashboard — หัวข้อ + Stats + ตาราง
   - TC-59~61: Admin Dashboard — Filter
   - TC-62~64: Admin — จ่ายเงินทีละคน (ถ้ามี pending payout)
   - TC-68: Admin — Export CSV
   - TC-69~74: Admin Settings — ตั้งค่า
   - TC-75~80: Admin Settings — Validation
   - TC-81~90: Staff Earnings — payout history
   - TC-91~98: Regression ทุก app

4. TC ที่ข้ามบน production (ต้องใช้ dev endpoint / mock data):
   - TC-12~32: Cron trigger (dev endpoint ไม่มีบน production)
   - TC-33~46: Notifications จาก cron (รอ cron ทำงานจริง 08:00 ICT)
   - TC-99~108: Edge cases (ต้อง setup data เฉพาะ)

5. สรุปผล Production เป็นตาราง PASS/FAIL แยกจาก Localhost
```

---

## สรุป Test Cases

| # | หมวด | Test Case | Priority | Localhost | Production |
|---|------|-----------|----------|-----------|------------|
| 01 | Staff UI | เลือกรอบ "ครึ่งเดือน" → บันทึก → refresh ยังอยู่ | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 02 | Staff UI | เลือกรอบ "รายเดือน" → บันทึก → refresh ยังอยู่ | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 03 | Staff UI | Default เป็น "รายเดือน" (Staff ยังไม่เคยเลือก) | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 04 | Staff UI | แสดงรอบถัดไป: วันตัดรอบถูกต้อง | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 05 | Staff UI | แสดงรอบถัดไป: วันรับเงินถูกต้อง | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 06 | Staff UI | แสดงยอดสะสมปัจจุบัน (฿) | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 07 | Staff UI | เปลี่ยนรอบ ครึ่งเดือน → รายเดือน → วันตัดรอบ/รับเงิน อัปเดต | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 08 | Staff UI | เปลี่ยนรอบ รายเดือน → ครึ่งเดือน → วันตัดรอบ/รับเงิน อัปเดต | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 09 | Staff UI | DB: staff.payout_schedule อัปเดตถูกต้อง | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 10 | Staff UI | Section อยู่ในหน้า Settings ระหว่าง job reminders กับ logout | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 11 | Staff UI | มี 2 ตัวเลือก: ครึ่งเดือน / รายเดือน (พร้อมคำอธิบาย) | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 12 | Cron | ตัดรอบงวดแรก: bi-monthly → สร้าง payout, round=mid-month | HIGH | ✅ ทดสอบ | ⏭️ ข้าม (ไม่มี dev endpoint) |
| 13 | Cron | ตัดรอบงวดแรก: monthly → ไม่สร้าง payout | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 14 | Cron | ตัดรอบงวดแรก: คำนวณรายได้ วันที่ 1-10 ถูกต้อง | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 15 | Cron | ตัดรอบงวดหลัง: bi-monthly → สร้าง payout นับ 11-25 | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 16 | Cron | ตัดรอบงวดหลัง: monthly → สร้าง payout นับ 1-25 | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 17 | Cron | ตัดรอบงวดหลัง: bi-monthly carry forward → ยอดรวมถูกต้อง | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 18 | Cron | Carry forward: ยอดต่ำกว่าขั้นต่ำ → ไม่สร้าง payout + ยกยอด | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 19 | Cron | Carry forward: ยกยอดข้ามรอบ → ยอดรวมสะสมถูกต้อง | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 20 | Cron | Carry forward: ยกยอดหลายรอบต่อเนื่อง → ยอดรวมถูกต้อง | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 21 | Cron | Carry forward: ยอดรวม carry + รายได้ >= ขั้นต่ำ → สร้าง payout | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 22 | Cron | payout_round ถูกต้อง (mid-month / end-month) | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 23 | Cron | carry_forward_amount บันทึกถูกต้อง | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 24 | Cron | is_carry_forward = true เมื่อมียกยอด | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 25 | Cron | payout status = pending | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 26 | Cron | period_start + period_end ถูกต้อง | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 27 | Cron | Duplicate prevention: trigger ซ้ำ → ไม่สร้างซ้ำ | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 28 | Cron | Staff inactive → force payout | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 29 | Cron | สิ้นเดือน 28 (ก.พ.) → วันจ่ายเงินถูกต้อง | LOW | ✅ ทดสอบ | ⏭️ ข้าม |
| 30 | Cron | สิ้นเดือน 30 (เม.ย.) → วันจ่ายเงินถูกต้อง | LOW | ✅ ทดสอบ | ⏭️ ข้าม |
| 31 | Cron | สิ้นเดือน 31 (มี.ค.) → วันจ่ายเงินถูกต้อง | LOW | ✅ ทดสอบ | ⏭️ ข้าม |
| 32 | Cron | Staff ไม่มี completed jobs → ไม่สร้าง payout (ยอด 0) | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 33 | Notify | ล่วงหน้า 1 วัน (วันที่ 9): Staff ได้ in-app notification | HIGH | ✅ ทดสอบ | ⏭️ ข้าม (รอ cron จริง) |
| 34 | Notify | ล่วงหน้า 1 วัน: Admin ได้ notification "พรุ่งนี้ตัดรอบ X คน" | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 35 | Notify | ล่วงหน้า 1 วัน: ข้อความมียอดสะสม + วันตัดรอบถูกต้อง | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 36 | Notify | ล่วงหน้า 1 วันก่อนงวดหลัง (วันที่ 24): Staff + Admin ได้แจ้ง | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 37 | Notify | Carry forward: Staff ได้ "ยอด ฿X ต่ำกว่าขั้นต่ำ ยกยอด" | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 38 | Notify | Carry forward: ข้อความมียอด + ขั้นต่ำถูกต้อง | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 39 | Notify | จ่ายเงินสำเร็จ: Staff ได้ in-app notification | HIGH | ✅ ทดสอบ | ✅ ทดสอบ (ถ้ามี pending) |
| 40 | Notify | จ่ายเงินสำเร็จ: Staff ได้ LINE notification | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 41 | Notify | จ่ายเงินสำเร็จ: ข้อความมี transfer reference | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 42 | Notify | Staff ไม่มี bank account: ได้ notification เตือนเพิ่มบัญชี | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 43 | Notify | Duplicate prevention: trigger ซ้ำ → ไม่ส่ง notification ซ้ำ | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 44 | Notify | payout_notifications table มี record ป้องกันซ้ำ | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 45 | Notify | Email notification ส่งถึง Staff (ถ้ามี email) | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 46 | Notify | Email ไม่ error ถ้า Staff ไม่มี email | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 47 | Admin | Sidebar มีเมนู "รอบจ่ายเงิน" (หลัง "พนักงาน") | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 48 | Admin | Dashboard page load: หัวข้อ + subtitle | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 49 | Admin | Stats box 1: Staff ทั้งหมด (ตัวเลขถูกต้อง) | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 50 | Admin | Stats box 2: ครบกำหนดรอบนี้ (ตัวเลขถูกต้อง) | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 51 | Admin | Stats box 3: ยอดรวมรอจ่าย (฿ format ถูกต้อง) | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 52 | Admin | Stats box 4: ยกยอด/ต่ำกว่าขั้นต่ำ (ตัวเลขถูกต้อง) | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 53 | Admin | แสดงรอบปัจจุบัน: "งวดแรก/งวดหลัง เดือน ปี" | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 54 | Admin | ตาราง: คอลัมน์ครบ (checkbox, ชื่อ, รอบ, ยอด, สถานะ, จัดการ) | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 55 | Admin | ตาราง: Staff "รอจ่าย" แสดงปุ่ม [จ่าย] | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 56 | Admin | ตาราง: Staff "ยกยอด" แสดงสถานะ + ปุ่ม [ดู] | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 57 | Admin | ตาราง: Staff "ยังไม่ถึงรอบ" แสดงสถานะ | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 58 | Admin | ตาราง: Staff ไม่มี bank account → แสดงเตือน | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 59 | Admin | Filter รอบ (งวดแรก/งวดหลัง) → แสดงถูกต้อง | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 60 | Admin | Filter สถานะ (รอจ่าย/ยกยอด/โอนแล้ว) → แสดงถูกต้อง | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 61 | Admin | Filter เดือน → แสดงถูกต้อง | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 62 | Admin | จ่ายเงินทีละคน: modal แสดง ชื่อ, ยอด, ข้อมูลธนาคาร | HIGH | ✅ ทดสอบ | ✅ ทดสอบ (ถ้ามี pending) |
| 63 | Admin | จ่ายเงินทีละคน: กรอก reference → ยืนยัน → สถานะ "โอนแล้ว" | HIGH | ✅ ทดสอบ | ✅ ทดสอบ (ถ้ามี pending) |
| 64 | Admin | จ่ายเงินทีละคน: ไม่กรอก reference → validation error | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 65 | Admin | Batch payout: เลือก checkbox → ปุ่ม active | HIGH | ✅ ทดสอบ | ⏭️ ข้าม (ต้องมี data) |
| 66 | Admin | Batch payout: modal แสดง จำนวน + ยอดรวม | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 67 | Admin | Batch payout: ยืนยัน → ทุก Staff สถานะ "โอนแล้ว" | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 68 | Admin | Export CSV: ดาวน์โหลดไฟล์ | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 69 | Admin | Settings: Tab "รอบจ่ายเงิน Staff" มีอยู่ | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 70 | Admin | Settings: แก้วันจ่ายงวดแรก → บันทึก → refresh ค่ายังอยู่ | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 71 | Admin | Settings: แก้วันตัดรอบงวดแรก → Staff เห็นค่าใหม่ | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 72 | Admin | Settings: แก้วันตัดรอบงวดหลัง → บันทึก | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 73 | Admin | Settings: แก้ยอดขั้นต่ำ → Cron ใช้ค่าใหม่ | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 74 | Admin | Settings: เปิด/ปิด carry forward | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 75 | Admin | Settings Validation: ค่าว่าง → error | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 76 | Admin | Settings Validation: ค่า 0 → error | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 77 | Admin | Settings Validation: ค่าลบ → error | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 78 | Admin | Settings Validation: ตัวอักษร → error | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 79 | Admin | Settings Validation: วันตัดรอบ > 31 → error | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 80 | Admin | Settings Validation: ยอดขั้นต่ำ > 100,000 → boundary test | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 81 | Staff | Earnings page แสดง payout history จาก cron | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 82 | Staff | Payout status "รอดำเนินการ" → สีเหลือง | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 83 | Staff | Payout status "กำลังโอน" → สีน้ำเงิน | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 84 | Staff | Payout status "โอนแล้ว" → สีเขียว | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 85 | Staff | Payout status "ไม่สำเร็จ" → สีแดง | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 86 | Staff | Pending payout ยอดตรงกับ payout record | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 87 | Staff | หลัง Admin จ่าย → สถานะเปลี่ยน real-time | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 88 | Staff | หลัง Admin จ่าย → ยอด "รอจ่าย" ลดลง | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 89 | Staff | Transfer reference แสดง + copy ได้ | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 90 | Staff | Payout detail: แสดง jobs ที่อยู่ใน payout | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 91 | Regression | Login Admin | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 92 | Regression | Login Customer | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 93 | Regression | Login Hotel | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 94 | Regression | Login Staff | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 95 | Regression | Staff Earnings page เดิมยังทำงาน | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 96 | Regression | Admin StaffDetail earnings tab + ปุ่ม manual | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 97 | Regression | Hotel Credit system ไม่กระทบ | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 98 | Regression | Customer booking + Staff job management ไม่กระทบ | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 99 | Edge | Staff ไม่มี bank account → สร้าง payout + เตือน | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 100 | Edge | Staff ไม่มี completed jobs → ไม่สร้าง payout | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 101 | Edge | เปลี่ยนรอบกลางเดือน → payout เดิมอยู่ + ไม่นับซ้ำ | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 102 | Edge | Staff bi-monthly + monthly ปนกัน → cron จัดการถูกต้อง | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 103 | Edge | ปิด carry forward → ยอดต่ำกว่าขั้นต่ำ → สร้าง payout อยู่ดี | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 104 | Edge | Admin แก้ cutoff day = วันนี้ → trigger cron → ตัดรอบทันที | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 105 | Edge | Admin แก้ minimum หลังมี carry → ยอด carry ใช้ค่าใหม่ | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 106 | Edge | Jobs ที่อยู่ใน payout แล้ว → ไม่ถูกนับซ้ำ | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 107 | Edge | Jobs ข้ามวันตัดรอบ → นับตาม completed_at | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 108 | Edge | Batch payout เลือก "รอจ่าย" + "ยกยอด" → จ่ายเฉพาะ "รอจ่าย" | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 109 | Cleanup | Reset settings + ลบ test data | — | ✅ ทำ | ✅ ทำ |

### สรุปจำนวน TC แต่ละรอบ
| รอบ | ทดสอบ | ข้าม | รวม |
|-----|-------|------|-----|
| **Localhost** | 109 TC | 0 | 109 |
| **Production** | 65 TC | 44 (cron/edge/notification) | 109 |

### สรุปจำนวน TC แต่ละหมวด
| หมวด | จำนวน TC |
|------|---------|
| PART A: Staff UI — เลือกรอบ | 11 |
| PART B: Cron Job — ตัดรอบ + Payout | 21 |
| PART C: Notifications — แจ้งเตือน | 14 |
| PART D: Admin — Payout Dashboard | 22 |
| PART E: Admin — Settings | 12 |
| PART F: Staff — Earnings Integration | 10 |
| PART G: Regression | 8 |
| PART H: Edge Cases | 10 |
| PART I: Cleanup | 1 |
| **รวมทั้งหมด** | **109** |

---

## Test Results Summary (ทดสอบ 2026-04-03)

| สถานะ | จำนวน | หมายเหตุ |
|-------|-------|---------|
| ✅ **PASS** | **106** | ทดสอบผ่าน Playwright MCP + dev endpoint + DB verification |
| ❌ **N/A** | **2** | TC-45/46 — Email notification (ยังไม่ได้เชื่อมต่อ emailService) |
| ❌ **FAIL** | **0** | — |

**106/108 PASS (98%) — 0 FAIL**

### Bugs พบและแก้ไขระหว่าง Testing

| Bug | สาเหตุ | แก้ไข | Commit |
|-----|--------|-------|--------|
| วันที่แสดง -1 วัน | toISOString() UTC offset | formatDate() local time | 5920638 |
| payout_jobs insert ล้มเหลว | column `tip` ไม่มี | ลบ tip ออก | 5920638 |
| null profile_id UUID error | ไม่ filter null | `.not('profile_id', 'is', null)` | 5920638 |
| `.onConflict()` not a function | Supabase JS v2 syntax | `.upsert({}, { onConflict })` | 5920638 |
| Admin Dashboard ว่าง | import supabase client ผิด | เปลี่ยนเป็น `../lib/supabase` | 5920638 |
| setMessage crash (object) | message state เป็น string | เปลี่ยนเป็น string | 5920638 |
| Staff Earnings ไม่แสดง payout | usePayouts ใช้ staff.id | เปลี่ยนเป็น profileId | 3264bc8 |
