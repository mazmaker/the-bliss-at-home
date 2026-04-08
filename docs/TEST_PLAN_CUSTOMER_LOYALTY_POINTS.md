# แผนทดสอบ: Customer Loyalty Points — ทดสอบผ่าน UI ด้วย Playwright MCP

## Prompt สำหรับสั่ง Claude AI ทดสอบ

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home
อ่านไฟล์ docs/TEST_PLAN_CUSTOMER_LOYALTY_POINTS.md แล้วทดสอบตาม Test Cases ทั้งหมด

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

### PART A: Admin Settings — ตั้งค่าระบบแต้ม (15 TCs)

---

#### TC-01: Admin — แสดง tab ระบบแต้มสะสมและค่า default

**วัตถุประสงค์:** ตรวจว่ามี tab "ระบบแต้มสะสม" และค่า default ครบทุกฟิลด์

**ขั้นตอน:**
1. Login Admin app
2. ไปหน้า Settings → tab "ระบบแต้มสะสม"
3. ตรวจสอบฟิลด์ทั้งหมดและค่า default

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี tab "ระบบแต้มสะสม" ใน Settings
- [ ] toggle เปิด/ปิดระบบ แสดงสถานะ "เปิด" (default)
- [ ] ทุกกี่บาทได้ 1 แต้ม = 100 (default)
- [ ] โบนัสจองครั้งแรก = 50 (default)
- [ ] กี่แต้มเท่ากับ ฿1 = 10 (default)
- [ ] แลกขั้นต่ำ = 100 (default)
- [ ] ส่วนลดสูงสุด = 50% (default)
- [ ] แต้มหมดอายุหลัง = 365 วัน (default)
- [ ] แจ้งเตือนก่อนหมดอายุ = 30 วัน (default)

---

#### TC-02: Admin — แก้ค่า points_per_baht + บันทึก + refresh ยังอยู่

**วัตถุประสงค์:** แก้ค่า "ทุกกี่บาทได้ 1 แต้ม" แล้วบันทึก ค่าคงอยู่หลัง refresh

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. แก้ "ทุกกี่บาทได้ 1 แต้ม" = 200
3. กดบันทึก
4. Refresh หน้า (F5)
5. ตรวจค่าในฟิลด์

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ → แสดง toast/message ยืนยัน
- [ ] หลัง refresh → ค่ายังเป็น 200

**Cleanup:** Reset กลับเป็น 100

---

#### TC-03: Admin — แก้ค่า points_to_baht + บันทึก

**วัตถุประสงค์:** แก้ค่า "กี่แต้มเท่ากับ ฿1" แล้วบันทึกสำเร็จ

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. แก้ "กี่แต้มเท่ากับ ฿1" = 20
3. กดบันทึก
4. Refresh หน้า

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ
- [ ] หลัง refresh → ค่ายังเป็น 20

**Cleanup:** Reset กลับเป็น 10

---

#### TC-04: Admin — แก้ค่า min_redeem_points + บันทึก

**วัตถุประสงค์:** แก้ค่า "แลกขั้นต่ำ" แล้วบันทึกสำเร็จ

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. แก้ "แลกขั้นต่ำ" = 50
3. กดบันทึก
4. Refresh หน้า

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ
- [ ] หลัง refresh → ค่ายังเป็น 50

**Cleanup:** Reset กลับเป็น 100

---

#### TC-05: Admin — แก้ค่า max_discount_percent + บันทึก

**วัตถุประสงค์:** แก้ค่า "ส่วนลดสูงสุด %" แล้วบันทึกสำเร็จ

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. แก้ "ส่วนลดสูงสุด" = 30
3. กดบันทึก
4. Refresh หน้า

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ
- [ ] หลัง refresh → ค่ายังเป็น 30

**Cleanup:** Reset กลับเป็น 50

---

#### TC-06: Admin — แก้ค่า first_booking_bonus + บันทึก

**วัตถุประสงค์:** แก้ค่า "โบนัสจองครั้งแรก" แล้วบันทึกสำเร็จ

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. แก้ "โบนัสจองครั้งแรก" = 100
3. กดบันทึก
4. Refresh หน้า

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ
- [ ] หลัง refresh → ค่ายังเป็น 100

**Cleanup:** Reset กลับเป็น 50

---

#### TC-07: Admin — แก้ค่า points_expiry_days + บันทึก

**วัตถุประสงค์:** แก้ค่า "แต้มหมดอายุหลังกี่วัน" แล้วบันทึกสำเร็จ

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. แก้ "แต้มหมดอายุหลัง" = 180
3. กดบันทึก
4. Refresh หน้า

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ
- [ ] หลัง refresh → ค่ายังเป็น 180

**Cleanup:** Reset กลับเป็น 365

---

#### TC-08: Admin — แก้ค่า points_expiry_warning_days + บันทึก

**วัตถุประสงค์:** แก้ค่า "แจ้งเตือนก่อนหมดอายุกี่วัน" แล้วบันทึกสำเร็จ

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. แก้ "แจ้งเตือนก่อนหมดอายุ" = 14
3. กดบันทึก
4. Refresh หน้า

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ
- [ ] หลัง refresh → ค่ายังเป็น 14

**Cleanup:** Reset กลับเป็น 30

---

#### TC-09: Admin — Validation กรอกค่าว่าง (empty)

**วัตถุประสงค์:** ฟิลด์ตัวเลขไม่ยอมรับค่าว่าง

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. ลบค่าในฟิลด์ "ทุกกี่บาทได้ 1 แต้ม" ให้เป็นค่าว่าง
3. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error (เช่น "กรุณากรอกค่า")
- [ ] ไม่บันทึก

---

#### TC-10: Admin — Validation กรอกค่า 0

**วัตถุประสงค์:** ฟิลด์ตัวเลขไม่ยอมรับค่า 0 (ยกเว้น first_booking_bonus ที่ 0 = ปิดโบนัส)

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. กรอก "ทุกกี่บาทได้ 1 แต้ม" = 0
3. กดบันทึก
4. กรอก "กี่แต้มเท่ากับ ฿1" = 0
5. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] points_per_baht = 0 → validation error "ค่าต้องมากกว่า 0"
- [ ] points_to_baht = 0 → validation error "ค่าต้องมากกว่า 0"

---

#### TC-11: Admin — Validation กรอกค่าลบ

**วัตถุประสงค์:** ฟิลด์ตัวเลขไม่ยอมรับค่าลบ

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. กรอก "ทุกกี่บาทได้ 1 แต้ม" = -100
3. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error "ค่าต้องมากกว่า 0"
- [ ] ไม่บันทึก

---

#### TC-12: Admin — Validation กรอกตัวอักษร

**วัตถุประสงค์:** ฟิลด์ตัวเลขไม่ยอมรับตัวอักษร

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. กรอก "ทุกกี่บาทได้ 1 แต้ม" = "abc"
3. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ฟิลด์ไม่ยอมรับตัวอักษร (input type=number) หรือแสดง validation error
- [ ] ไม่บันทึก

---

#### TC-13: Admin — Validation กรอกค่าใหญ่มาก

**วัตถุประสงค์:** ระบบรองรับค่าตัวเลขที่ใหญ่มากโดยไม่ error

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. กรอก "ทุกกี่บาทได้ 1 แต้ม" = 999999
3. กดบันทึก

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ หรือแสดง validation error ถ้ามี boundary
- [ ] ระบบไม่ crash

**Cleanup:** Reset กลับเป็น 100

---

#### TC-14: Admin — เปิด/ปิดระบบแต้ม → Customer app ซ่อน section

**วัตถุประสงค์:** Admin ปิดระบบแต้ม → Customer BookingWizard ไม่แสดง section ใช้แต้ม

**ขั้นตอน:**
1. Admin → Settings → tab "ระบบแต้มสะสม"
2. ปิดระบบ (toggle off)
3. บันทึก
4. Customer app → จอง → ไปถึง Step 5 Confirmation
5. ตรวจว่าไม่มี section "ใช้แต้มสะสม"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ปิดระบบ → บันทึกสำเร็จ
- [ ] Customer BookingWizard Step 5 → ไม่แสดง section "ใช้แต้มสะสม"

**Cleanup:** เปิดระบบกลับ

---

#### TC-15: Admin — ปิดระบบแต้ม → Booking completed ไม่ได้แต้ม

**วัตถุประสงค์:** เมื่อระบบปิด booking completed จะไม่ได้แต้ม

**ขั้นตอน:**
1. Admin → Settings → ปิดระบบแต้ม → บันทึก
2. Customer → จองบริการ
3. Admin → เปลี่ยน booking เป็น completed
4. ตรวจยอดแต้ม Customer

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดแต้มไม่เพิ่มขึ้น
- [ ] ไม่มี point_transactions record ใหม่

**Cleanup:** เปิดระบบกลับ

---

### PART B: Earn Points — ได้รับแต้ม (16 TCs)

---

#### TC-16: Earn — Booking completed ฿800 → ได้ 8 แต้ม

**วัตถุประสงค์:** ลูกค้าจองบริการ ฿800 ได้แต้มหลัง completed (฿800 / ฿100 = 8)

**ขั้นตอน:**
1. Customer → จองบริการราคา ฿800 (ไม่ใช้แต้ม, ไม่ใช้ promo)
2. Admin → เปลี่ยน booking status เป็น "completed"
3. Customer → Profile → ดูยอดแต้ม

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดแต้มเพิ่มขึ้น 8 แต้ม
- [ ] bookings.points_earned = 8

---

#### TC-17: Earn — Booking completed ฿250 → ได้ 2 แต้ม (ปัดลง ไม่ใช่ 2.5)

**วัตถุประสงค์:** แต้มปัดลงเสมอ (฿250 / ฿100 = 2.5 → ปัดลงเป็น 2)

**ขั้นตอน:**
1. Customer → จองบริการราคา ฿250 (หรือใช้ promo ให้ final_price = ฿250)
2. Admin → เปลี่ยน booking เป็น completed
3. ตรวจแต้มที่ได้

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ได้ 2 แต้ม (ไม่ใช่ 2.5 หรือ 3)

---

#### TC-18: Earn — Booking completed ฿999 → ได้ 9 แต้ม (ปัดลง)

**วัตถุประสงค์:** แต้มปัดลง (฿999 / ฿100 = 9.99 → ปัดลงเป็น 9)

**ขั้นตอน:**
1. Customer → จองบริการที่ final_price = ฿999 (ใช้ promo ปรับราคาให้ใกล้เคียง)
2. Admin → completed
3. ตรวจแต้มที่ได้

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ได้ 9 แต้ม (ไม่ใช่ 10)

---

#### TC-19: Earn — Booking completed ฿50 → ได้ 0 แต้ม (ต่ำกว่า 100)

**วัตถุประสงค์:** final_price ต่ำกว่า points_per_baht → ได้ 0 แต้ม

**ขั้นตอน:**
1. Customer → จองบริการที่ final_price = ฿50 (ใช้ promo ลดราคาจนเหลือน้อย)
2. Admin → completed
3. ตรวจแต้มที่ได้

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ได้ 0 แต้ม (฿50 / ฿100 = 0.5 → ปัดลง = 0)
- [ ] bookings.points_earned = 0

---

#### TC-20: Earn — คำนวณจาก final_price ไม่ใช่ base_price

**วัตถุประสงค์:** แต้มคำนวณจาก final_price (หลังหัก promo)

**ขั้นตอน:**
1. Customer → จอง ฿800 + ใช้ promo ลด ฿200 → final_price = ฿600
2. Admin → completed
3. ตรวจแต้มที่ได้

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ได้ 6 แต้ม (จาก ฿600 ไม่ใช่ 8 จาก ฿800)

---

#### TC-21: Earn — โบนัสจองครั้งแรก → ได้ 50 แต้มพิเศษ

**วัตถุประสงค์:** ลูกค้าที่จองครั้งแรกได้รับโบนัสแต้ม

**ขั้นตอน:**
1. ใช้ลูกค้าที่ยังไม่เคยจอง (หรือสร้าง account ใหม่)
2. จองบริการ ฿800
3. Admin → completed
4. ดูยอดแต้ม

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ได้แต้มปกติ 8 แต้ม + โบนัส 50 แต้ม = รวม 58 แต้ม
- [ ] point_transactions มี 2 records: type=earn (+8) และ type=bonus (+50)

---

#### TC-22: Earn — จองครั้งที่ 2 → ไม่ได้โบนัสอีก

**วัตถุประสงค์:** โบนัสจองครั้งแรกได้เพียงครั้งเดียว

**ขั้นตอน:**
1. ลูกค้าที่เคยได้โบนัสแล้ว → จองบริการ ฿800
2. Admin → completed
3. ดูยอดแต้ม

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ได้เฉพาะแต้มปกติ 8 แต้ม (ไม่มีโบนัส 50)
- [ ] point_transactions มีเฉพาะ type=earn (+8) ไม่มี type=bonus

---

#### TC-23: Earn — Hotel booking (is_hotel_booking=true) → ไม่ได้แต้ม

**วัตถุประสงค์:** Booking ผ่าน Hotel App ไม่ได้แต้ม

**ขั้นตอน:**
1. Hotel app → จอง (Book for Guest) สำหรับลูกค้า
2. Admin → เปลี่ยน booking เป็น completed
3. ตรวจยอดแต้มของลูกค้า

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดแต้มไม่เพิ่มขึ้น
- [ ] ไม่มี point_transactions record สำหรับ booking นี้
- [ ] bookings.points_earned = 0

---

#### TC-24: Earn — Cancelled booking → ไม่ได้แต้ม

**วัตถุประสงค์:** Booking ที่ยกเลิก (ก่อน completed) ไม่ได้แต้ม

**ขั้นตอน:**
1. Customer → จองบริการ
2. ยกเลิก booking (ก่อน completed)
3. ตรวจยอดแต้ม

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดแต้มไม่เปลี่ยนแปลง
- [ ] ไม่มี point_transactions record สำหรับ booking นี้

---

#### TC-25: Earn — Pending/confirmed booking → ยังไม่ได้แต้ม

**วัตถุประสงค์:** แต้มได้รับเฉพาะเมื่อ booking completed เท่านั้น ไม่ใช่ตอนสร้าง booking

**ขั้นตอน:**
1. Customer → จองบริการ (status = pending)
2. Admin → เปลี่ยนเป็น confirmed
3. ตรวจยอดแต้ม

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดแต้มไม่เพิ่มขึ้น (ยังไม่ completed)
- [ ] ไม่มี point_transactions record type=earn

---

#### TC-26: Earn — customer_points.total_points อัปเดตถูกต้อง

**วัตถุประสงค์:** ยอดแต้มคงเหลือรวมอัปเดตหลัง earn

**ขั้นตอน:**
1. จดยอด total_points ก่อน (เช่น 100)
2. Customer → จอง ฿800 → Admin → completed
3. ตรวจ total_points

**ผลลัพธ์ที่คาดหวัง:**
- [ ] total_points = 100 + 8 = 108

---

#### TC-27: Earn — customer_points.lifetime_earned อัปเดต

**วัตถุประสงค์:** ยอดสะสมตลอดกาลอัปเดตหลัง earn

**ขั้นตอน:**
1. จดยอด lifetime_earned ก่อน
2. Customer → จอง ฿800 → Admin → completed
3. ตรวจ lifetime_earned (ผ่าน Admin Customer Detail)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] lifetime_earned เพิ่มขึ้น 8

---

#### TC-28: Earn — point_transactions record: type=earn, expires_at ถูกต้อง

**วัตถุประสงค์:** ระบบสร้าง transaction record ถูกต้องรวมถึงวันหมดอายุ

**ขั้นตอน:**
1. Customer → จอง ฿800 → Admin → completed
2. ตรวจ point_transactions ล่าสุด (ผ่าน Admin Customer Detail หรือ Customer Points History)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] type = "earn"
- [ ] points = +8
- [ ] booking_id ตรงกับ booking ที่ทำ
- [ ] expires_at = วันที่ได้รับ + 365 วัน (ตาม settings)
- [ ] balance_after ถูกต้อง

---

#### TC-29: Earn — Notification "ได้รับ X แต้มจากการจอง BK-XXXX"

**วัตถุประสงค์:** ลูกค้าได้รับ notification เมื่อได้แต้ม

**ขั้นตอน:**
1. Customer → จอง ฿800 → Admin → completed
2. Customer → ดูหน้า Notifications

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี notification ข้อความประมาณ "ได้รับ 8 แต้มจากการจอง BK-XXXX"
- [ ] ข้อความมี booking reference ถูกต้อง

---

#### TC-30: Earn — Notification โบนัสครั้งแรกแยกรายการ

**วัตถุประสงค์:** โบนัสจองครั้งแรกมี notification แยกจากแต้มปกติ

**ขั้นตอน:**
1. ลูกค้าใหม่ → จองครั้งแรก → Admin → completed
2. Customer → ดูหน้า Notifications

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี notification แต้มปกติ: "ได้รับ X แต้มจากการจอง BK-XXXX"
- [ ] มี notification โบนัสแยก: "ได้รับโบนัส 50 แต้มสำหรับการจองครั้งแรก"

---

#### TC-31: Earn — bookings.points_earned อัปเดต

**วัตถุประสงค์:** คอลัมน์ points_earned ใน bookings table บันทึกถูกต้อง

**ขั้นตอน:**
1. Customer → จอง ฿800 → Admin → completed
2. ตรวจ booking record (ผ่าน Admin Booking Detail)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] bookings.points_earned = 8

---

### PART C: Redeem Points — ใช้แต้มแลกส่วนลด (20 TCs)

---

#### TC-32: Redeem — ใช้แต้มสำเร็จ → ราคาลดลง

**วัตถุประสงค์:** ลูกค้าใช้แต้มลดราคาใน BookingWizard สำเร็จ

**ขั้นตอน:**
1. Customer (มีแต้ม >= 500) → จองบริการ ฿800
2. ไป Step 5 Confirmation
3. กรอกแต้ม 500
4. ชำระเงิน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ส่วนลด = 500 / 10 = ฿50
- [ ] final_price = ฿800 - ฿50 = ฿750
- [ ] ชำระเงินสำเร็จ

---

#### TC-33: Redeem — ใช้แต้ม + promo code พร้อมกัน (ลำดับ: base → promo → points → final)

**วัตถุประสงค์:** ใช้แต้มร่วมกับ promo code ลดซ้อนกันถูกลำดับ

**ขั้นตอน:**
1. Customer → จอง ฿1,200
2. กรอก promo code (ลด ฿200)
3. กรอกแต้ม 500 (= ฿50)
4. ชำระเงิน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Promo ลดก่อน: ฿1,200 - ฿200 = ฿1,000
- [ ] Points ลดทีหลัง: ฿1,000 - ฿50 = ฿950
- [ ] final_price = ฿950
- [ ] booking record: discount_amount = ฿200, points_discount = ฿50

---

#### TC-34: Redeem — กรอก 0 แต้ม → ไม่ลดราคา

**วัตถุประสงค์:** กรอก 0 แต้มไม่มีผลต่อราคา

**ขั้นตอน:**
1. Customer → จอง ฿800
2. Step 5 → กรอกแต้ม = 0

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ส่วนลดจากแต้ม = ฿0
- [ ] final_price = ฿800 (ไม่เปลี่ยน)

---

#### TC-35: Redeem — กรอกต่ำกว่าขั้นต่ำ (99 แต้ม) → validation error

**วัตถุประสงค์:** กรอกแต้มต่ำกว่าขั้นต่ำ (100) ไม่ผ่าน validation

**ขั้นตอน:**
1. Customer (มีแต้ม >= 500) → จอง ฿800
2. Step 5 → กรอกแต้ม = 99

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error เช่น "ขั้นต่ำ 100 แต้ม"
- [ ] ไม่สามารถดำเนินการต่อ

---

#### TC-36: Redeem — กรอกพอดีขั้นต่ำ (100 แต้ม) → ใช้ได้

**วัตถุประสงค์:** กรอกพอดีขั้นต่ำผ่าน validation

**ขั้นตอน:**
1. Customer (มีแต้ม >= 100) → จอง ฿800
2. Step 5 → กรอกแต้ม = 100

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ใช้ได้สำเร็จ
- [ ] ส่วนลด = 100 / 10 = ฿10
- [ ] final_price = ฿790

---

#### TC-37: Redeem — กรอกเกินแต้มที่มี → validation error "แต้มไม่เพียงพอ"

**วัตถุประสงค์:** กรอกแต้มเกินกว่าที่มีไม่ผ่าน validation

**ขั้นตอน:**
1. Customer (มี 500 แต้ม) → จอง ฿800
2. Step 5 → กรอกแต้ม = 600

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error "แต้มไม่เพียงพอ" หรือ "คุณมีเพียง 500 แต้ม"

---

#### TC-38: Redeem — กรอกตัวอักษร → validation error

**วัตถุประสงค์:** ฟิลด์แต้มรับเฉพาะตัวเลข

**ขั้นตอน:**
1. Customer → จอง → Step 5
2. กรอกแต้ม = "abc"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ฟิลด์ไม่รับตัวอักษร (input type=number) หรือแสดง validation error

---

#### TC-39: Redeem — กรอกทศนิยม → validation error

**วัตถุประสงค์:** แต้มต้องเป็นจำนวนเต็มเท่านั้น

**ขั้นตอน:**
1. Customer → จอง → Step 5
2. กรอกแต้ม = 100.5

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error "กรุณากรอกจำนวนเต็ม" หรือฟิลด์ปัดเป็น 100

---

#### TC-40: Redeem — กรอกค่าลบ → validation error

**วัตถุประสงค์:** แต้มต้องเป็นจำนวนบวก

**ขั้นตอน:**
1. Customer → จอง → Step 5
2. กรอกแต้ม = -100

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error หรือฟิลด์ไม่รับค่าลบ

---

#### TC-41: Redeem — ส่วนลดไม่เกิน max % (cap ที่ 50%)

**วัตถุประสงค์:** ใช้แต้มจำนวนมากแต่ส่วนลดไม่เกินเปอร์เซ็นต์สูงสุด

**ขั้นตอน:**
1. Customer (มี 10,000 แต้ม = ฿1,000) → จอง ฿800
2. กดปุ่ม "ใช้แต้มทั้งหมด"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ส่วนลดสูงสุด = 50% ของ ฿800 = ฿400
- [ ] ใช้ได้สูงสุด 4,000 แต้ม (4,000 / 10 = ฿400)
- [ ] ฟิลด์แสดงแต้ม = 4,000 (ไม่ใช่ 10,000)
- [ ] final_price = ฿400 (ไม่ใช่ ฿0)

---

#### TC-42: Redeem — ปุ่ม "ใช้แต้มทั้งหมด" → กรอกแต้มทั้งหมด (หรือ max ที่ใช้ได้)

**วัตถุประสงค์:** ปุ่ม "ใช้แต้มทั้งหมด" กรอกค่าที่ถูกต้อง

**ขั้นตอน:**
1. Customer (มี 500 แต้ม) → จอง ฿800
2. กดปุ่ม "ใช้แต้มทั้งหมด"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ฟิลด์กรอก 500 แต้ม (ทั้งหมดที่มี เพราะไม่เกิน 50% cap)
- [ ] ส่วนลด = ฿50
- [ ] final_price = ฿750

---

#### TC-43: Redeem — ปุ่ม "ล้าง" → clear แต้ม + ส่วนลดหายไป

**วัตถุประสงค์:** ปุ่ม "ล้าง" ลบค่าแต้มที่กรอกและส่วนลดหายไป

**ขั้นตอน:**
1. Customer → จอง ฿800
2. กรอกแต้ม 500
3. ดูส่วนลด (฿50)
4. กดปุ่ม "ล้าง"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ฟิลด์แต้มกลับเป็น 0 หรือว่าง
- [ ] ส่วนลดจากแต้มหายไป
- [ ] final_price กลับเป็น ฿800

---

#### TC-44: Redeem — customer_points.total_points หักทันทีตอนจอง

**วัตถุประสงค์:** แต้มถูกหักทันทีเมื่อสร้าง booking (ไม่ต้องรอ completed)

**ขั้นตอน:**
1. Customer (มี 1,000 แต้ม) → จอง → ใช้ 500 แต้ม → ชำระเงิน
2. ตรวจยอดแต้มทันทีหลังจอง (ก่อน completed)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดแต้ม = 500 (หักทันที ไม่ต้องรอ completed)

---

#### TC-45: Redeem — customer_points.lifetime_redeemed อัปเดต

**วัตถุประสงค์:** ยอดใช้แต้มตลอดกาลอัปเดตหลัง redeem

**ขั้นตอน:**
1. จดยอด lifetime_redeemed ก่อน
2. Customer → จอง → ใช้ 500 แต้ม → ชำระเงิน
3. ตรวจ lifetime_redeemed (ผ่าน Admin Customer Detail)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] lifetime_redeemed เพิ่มขึ้น 500

---

#### TC-46: Redeem — bookings.points_redeemed + points_discount บันทึกถูกต้อง

**วัตถุประสงค์:** คอลัมน์ใน bookings table บันทึกถูกต้อง

**ขั้นตอน:**
1. Customer → จอง ฿800 → ใช้ 500 แต้ม → ชำระเงิน
2. ตรวจ booking record (ผ่าน Admin Booking Detail)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] bookings.points_redeemed = 500
- [ ] bookings.points_discount = 50

---

#### TC-47: Redeem — point_transactions record: type=redeem

**วัตถุประสงค์:** ระบบสร้าง transaction record สำหรับ redeem ถูกต้อง

**ขั้นตอน:**
1. Customer → จอง → ใช้ 500 แต้ม → ชำระเงิน
2. ตรวจ point_transactions (ผ่าน Customer Points History)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] type = "redeem"
- [ ] points = -500
- [ ] booking_id ตรงกับ booking
- [ ] balance_after ถูกต้อง

---

#### TC-48: Redeem — ยกเลิก booking → คืนแต้ม (type=refund, +X)

**วัตถุประสงค์:** เมื่อยกเลิก booking ที่ใช้แต้ม แต้มถูกคืน

**ขั้นตอน:**
1. Customer (มี 1,000 แต้ม) → จอง → ใช้ 500 แต้ม (เหลือ 500)
2. ยกเลิก booking
3. ตรวจยอดแต้ม

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดแต้มกลับเป็น 1,000
- [ ] point_transactions: type=refund, points=+500
- [ ] customer_points.total_points เพิ่มกลับ

---

#### TC-49: Redeem — ยกเลิก booking → Notification คืนแต้ม

**วัตถุประสงค์:** ลูกค้าได้รับ notification เมื่อแต้มถูกคืน

**ขั้นตอน:**
1. Customer → จอง → ใช้ 500 แต้ม → ยกเลิก booking
2. Customer → ดูหน้า Notifications

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี notification "คืนแต้ม 500 จากการยกเลิก BK-XXXX"

---

#### TC-50: Redeem — Price breakdown แสดงถูกต้อง 4 กรณี

**วัตถุประสงค์:** Price breakdown แสดงถูกต้องในทุกการรวมส่วนลด

**ขั้นตอน:**
1. จอง ฿1,200 + ไม่ใช้อะไร → ตรวจ breakdown
2. จอง ฿1,200 + promo -฿200 → ตรวจ breakdown
3. จอง ฿1,200 + points 500 (= -฿50) → ตรวจ breakdown
4. จอง ฿1,200 + promo -฿200 + points 500 (= -฿50) → ตรวจ breakdown

**ผลลัพธ์ที่คาดหวัง:**
- [ ] กรณี 1: base ฿1,200 → final ฿1,200
- [ ] กรณี 2: base ฿1,200 → promo -฿200 → final ฿1,000
- [ ] กรณี 3: base ฿1,200 → points -฿50 → final ฿1,150
- [ ] กรณี 4: base ฿1,200 → promo -฿200 → points -฿50 → final ฿950
- [ ] ลำดับการลด: base → promo → points → final

---

#### TC-51: Redeem — ใช้แต้มเกินราคา booking → cap ที่ราคา booking

**วัตถุประสงค์:** ส่วนลดจากแต้มไม่เกินราคา booking (ไม่เป็นลบ)

**ขั้นตอน:**
1. Customer (มี 50,000 แต้ม = ฿5,000) → จอง ฿800
2. กดปุ่ม "ใช้แต้มทั้งหมด"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ส่วนลด cap ที่ 50% = ฿400 (ตาม max_discount_percent)
- [ ] final_price = ฿400 (ไม่ใช่ ฿0 หรือติดลบ)

---

### PART D: Customer UI — แสดงแต้ม (13 TCs)

---

#### TC-52: UI — Profile widget แสดงยอดแต้ม + มูลค่าบาท

**วัตถุประสงค์:** หน้า Profile แสดง widget แต้มสะสมถูกต้อง

**ขั้นตอน:**
1. Login Customer → ไปหน้า Profile

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี section/widget "แต้มสะสม"
- [ ] แสดงยอดแต้มคงเหลือ (ตัวเลขถูกต้อง)
- [ ] แสดงมูลค่าเป็นบาท (แต้ม / points_to_baht)

---

#### TC-53: UI — Profile widget แสดงแต้มใกล้หมดอายุ

**วัตถุประสงค์:** Profile widget แสดงข้อมูลแต้มที่ใกล้หมดอายุเร็วสุด

**ขั้นตอน:**
1. Login Customer (มีแต้มที่มีวันหมดอายุ) → ไปหน้า Profile

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง "หมดอายุเร็วสุด: DD เดือน YYYY" (หรือข้อความคล้ายกัน)
- [ ] วันที่แสดงรูปแบบไทย

---

#### TC-54: UI — Profile widget ลิงก์ "ดูประวัติ" → ไปหน้า /points

**วัตถุประสงค์:** กดลิงก์ "ดูประวัติ" ไปหน้าประวัติแต้ม

**ขั้นตอน:**
1. Customer → Profile → section แต้มสะสม
2. กด "ดูประวัติ"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] navigate ไปหน้า /points (Points History)
- [ ] หน้า Points History โหลดถูกต้อง

---

#### TC-55: UI — Points History แสดงรายการทุก type

**วัตถุประสงค์:** หน้าประวัติแต้มแสดงรายการครบทุกประเภท

**ขั้นตอน:**
1. Customer → หน้า /points
2. ตรวจรายการที่แสดง (ต้องมี transactions หลายประเภท)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงรายการ earn, redeem, expire, refund, bonus, admin_adjust ถูกต้อง
- [ ] แต่ละรายการมี: ประเภท, จำนวนแต้ม (+/-), description

---

#### TC-56: UI — Points History icon/สี ถูกต้องตามประเภท

**วัตถุประสงค์:** แต่ละประเภท transaction แสดง icon และสีถูกต้อง

**ขั้นตอน:**
1. Customer → หน้า /points
2. ตรวจ icon และสีของแต่ละประเภท

**ผลลัพธ์ที่คาดหวัง:**
- [ ] earn → สีเขียว (+)
- [ ] redeem → สีแดง (-)
- [ ] expire → สีเทา (-)
- [ ] refund → สีน้ำเงิน (+)
- [ ] bonus → สีทอง (+)
- [ ] admin_adjust → สีม่วง (+/-)

---

#### TC-57: UI — Points History แสดง booking reference + วันที่รูปแบบไทย

**วัตถุประสงค์:** แต่ละรายการแสดง booking reference และวันที่ในรูปแบบไทย

**ขั้นตอน:**
1. Customer → หน้า /points
2. ดูรายการ earn จาก booking

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง booking reference (เช่น BK-0270)
- [ ] วันที่แสดงรูปแบบไทย (เช่น "30 มี.ค. 2569")

---

#### TC-58: UI — Points History Filter ทั้งหมด/ได้รับ/ใช้/หมดอายุ

**วัตถุประสงค์:** Filter ทำงานถูกต้อง

**ขั้นตอน:**
1. Customer → หน้า /points
2. กด filter "ทั้งหมด" → ตรวจ
3. กด filter "ได้รับ" → ตรวจ
4. กด filter "ใช้" → ตรวจ
5. กด filter "หมดอายุ" → ตรวจ

**ผลลัพธ์ที่คาดหวัง:**
- [ ] "ทั้งหมด" → แสดงทุกรายการ
- [ ] "ได้รับ" → แสดงเฉพาะ earn + bonus
- [ ] "ใช้" → แสดงเฉพาะ redeem
- [ ] "หมดอายุ" → แสดงเฉพาะ expire

---

#### TC-59: UI — BookingWizard Step 5 section "ใช้แต้มสะสม" แสดงเมื่อมีแต้ม

**วัตถุประสงค์:** ลูกค้าที่มีแต้มเห็น section ใช้แต้มใน BookingWizard

**ขั้นตอน:**
1. Customer (มีแต้ม >= 100) → จอง → Step 5 Confirmation

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี section "ใช้แต้มสะสม" ใต้ส่วน voucher code
- [ ] มี input กรอกจำนวนแต้ม
- [ ] มีปุ่ม "ใช้แต้มทั้งหมด" และ "ล้าง"

---

#### TC-60: UI — BookingWizard Step 5 ไม่แสดง section เมื่อ 0 แต้ม

**วัตถุประสงค์:** ลูกค้าที่มี 0 แต้มไม่แสดง section ที่ไม่จำเป็น

**ขั้นตอน:**
1. Customer (0 แต้ม) → จอง → Step 5 Confirmation

**ผลลัพธ์ที่คาดหวัง:**
- [ ] section "ใช้แต้มสะสม" ซ่อน หรือแสดงข้อความ "ยังไม่มีแต้มสะสม"
- [ ] ไม่มี error, booking flow ยังทำงานปกติ

---

#### TC-61: UI — BookingWizard Step 5 ไม่แสดง section เมื่อระบบปิด

**วัตถุประสงค์:** เมื่อ Admin ปิดระบบ ไม่แสดง section ใช้แต้มแม้ลูกค้ามีแต้ม

**ขั้นตอน:**
1. Admin → Settings → ปิดระบบแต้ม → บันทึก
2. Customer (มีแต้ม) → จอง → Step 5 Confirmation

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่แสดง section "ใช้แต้มสะสม" ทั้งที่ลูกค้ามีแต้ม

**Cleanup:** เปิดระบบกลับ

---

#### TC-62: UI — BookingWizard Step 5 แสดง "แต้มของคุณ: X แต้ม (฿Y)"

**วัตถุประสงค์:** แสดงข้อมูลแต้มถูกต้อง

**ขั้นตอน:**
1. Customer (มี 1,250 แต้ม) → จอง → Step 5

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง "แต้มของคุณ: 1,250 แต้ม (฿125)" (1,250 / 10 = ฿125)
- [ ] ยอดแต้มตรงกับ Profile

---

#### TC-63: UI — BookingWizard เปลี่ยนบริการ (กลับ step) → แต้มที่กรอก reset

**วัตถุประสงค์:** กลับไปเปลี่ยนบริการหลังกรอกแต้มแล้ว แต้ม reset

**ขั้นตอน:**
1. Customer → จอง ฿800 → Step 5 → กรอกแต้ม 500
2. กดกลับ → เปลี่ยนบริการเป็น ฿1,200
3. กลับมา Step 5

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แต้มที่กรอกถูก reset (ค่า = 0 หรือว่าง)
- [ ] Price breakdown คำนวณจากราคาใหม่ ฿1,200
- [ ] ไม่มี error

---

#### TC-64: UI — Profile widget แต้ม 0 → แสดง "ยังไม่มีแต้ม"

**วัตถุประสงค์:** ลูกค้าที่มี 0 แต้ม widget แสดงข้อความเหมาะสม

**ขั้นตอน:**
1. Customer (0 แต้ม) → หน้า Profile

**ผลลัพธ์ที่คาดหวัง:**
- [ ] widget แสดง "0 แต้ม" หรือ "ยังไม่มีแต้มสะสม"
- [ ] มูลค่า = ฿0
- [ ] ไม่มี error

---

### PART E: Points Expiry — แต้มหมดอายุ (11 TCs)

---

#### TC-65: Expiry — Cron ตัดแต้มที่หมดอายุ

**วัตถุประสงค์:** Cron ตัดแต้มที่ expires_at <= วันนี้

**เตรียมข้อมูล:**
1. Admin → ให้แต้มพิเศษลูกค้า (สร้างแต้มที่จะหมดอายุ)
2. Admin Settings → ตั้ง points_expiry_days = 1 (หมดอายุ 1 วัน สำหรับทดสอบ)

**ขั้นตอน:**
1. Trigger cron: POST `http://localhost:3000/api/dev/trigger-points-expiry`
2. ตรวจยอดแต้ม Customer

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แต้มที่หมดอายุถูกตัด
- [ ] customer_points.total_points ลดลง

**Cleanup:** Reset points_expiry_days = 365

---

#### TC-66: Expiry — FIFO: แต้มเก่าหมดก่อนแต้มใหม่

**วัตถุประสงค์:** แต้มที่ได้ก่อนหมดอายุก่อน (First In First Out)

**เตรียมข้อมูล:**
1. ให้แต้มรอบที่ 1 (100 แต้ม, expires_at = เร็วกว่า)
2. ให้แต้มรอบที่ 2 (200 แต้ม, expires_at = ทีหลัง)

**ขั้นตอน:**
1. ตั้ง expiry ให้แต้มรอบที่ 1 หมดอายุ
2. Trigger cron
3. ตรวจแต้มคงเหลือ

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แต้มรอบที่ 1 (100) ถูกตัด → เหลือแต้มรอบที่ 2 (200)
- [ ] point_transactions: type=expire สำหรับแต้ม 100 เท่านั้น

---

#### TC-67: Expiry — แต้มที่ใช้ไปแล้ว (redeemed) ไม่ถูกตัดซ้ำ

**วัตถุประสงค์:** แต้มที่ redeem ไปแล้วไม่ถูก expire อีก

**ขั้นตอน:**
1. ลูกค้าได้ 500 แต้ม → ใช้ 300 แต้ม → คงเหลือ 200
2. แต้ม batch นี้ถึงวันหมดอายุ
3. Trigger cron

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ตัดเฉพาะแต้มที่เหลือ 200 (ไม่ใช่ 500)
- [ ] lifetime_expired เพิ่ม 200

---

#### TC-68: Expiry — แต้มหมดอายุบางส่วน (ไม่ใช่ทั้งหมด)

**วัตถุประสงค์:** เฉพาะแต้มที่ถึงวันหมดอายุถูกตัด แต้มอื่นยังอยู่

**เตรียมข้อมูล:**
1. ลูกค้ามี 2 batch: batch A (100 แต้ม, หมดอายุวันนี้) + batch B (200 แต้ม, ยังไม่หมด)

**ขั้นตอน:**
1. Trigger cron

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ตัดเฉพาะ batch A (100 แต้ม)
- [ ] batch B (200 แต้ม) ยังคงอยู่
- [ ] total_points = (เดิม) - 100

---

#### TC-69: Expiry — customer_points: total_points ลด, lifetime_expired เพิ่ม

**วัตถุประสงค์:** ยอดสรุปอัปเดตถูกต้องหลังหมดอายุ

**ขั้นตอน:**
1. จดยอด total_points และ lifetime_expired ก่อน
2. Trigger cron (มีแต้มหมดอายุ)
3. ตรวจยอด

**ผลลัพธ์ที่คาดหวัง:**
- [ ] total_points ลดลงตามจำนวนที่หมดอายุ
- [ ] lifetime_expired เพิ่มขึ้นตามจำนวนที่หมดอายุ

---

#### TC-70: Expiry — point_transactions: type=expire

**วัตถุประสงค์:** ระบบสร้าง transaction record สำหรับ expire

**ขั้นตอน:**
1. Trigger cron (มีแต้มหมดอายุ)
2. ตรวจ point_transactions

**ผลลัพธ์ที่คาดหวัง:**
- [ ] type = "expire"
- [ ] points = -(จำนวนที่หมดอายุ)
- [ ] balance_after ถูกต้อง

---

#### TC-71: Expiry — Notification 30 วันก่อนหมดอายุ

**วัตถุประสงค์:** แจ้งเตือน Customer ก่อนแต้มหมดอายุ

**ขั้นตอน:**
1. Trigger cron (มีแต้มที่จะหมดอายุภายใน 30 วัน)
2. Customer → ดูหน้า Notifications

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี notification "แต้มสะสม X แต้มจะหมดอายุในวันที่ DD/MM/YYYY"
- [ ] วันที่ถูกต้อง

---

#### TC-72: Expiry — Notification duplicate prevention

**วัตถุประสงค์:** Trigger cron ซ้ำไม่ส่ง notification ซ้ำ

**ขั้นตอน:**
1. Trigger cron (ส่ง warning notification ครั้งแรก)
2. Trigger cron อีกครั้ง

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ครั้งที่ 2 ไม่ส่ง notification ซ้ำ
- [ ] Customer ไม่เห็น notification ซ้อนกัน

---

#### TC-73: Expiry — Cron trigger ซ้ำ → ไม่ตัดแต้มซ้ำ

**วัตถุประสงค์:** Trigger cron ซ้ำไม่ตัดแต้มซ้ำ

**ขั้นตอน:**
1. Trigger cron (ตัดแต้มครั้งแรก) → จดยอดแต้ม
2. Trigger cron อีกครั้ง → ตรวจยอดแต้ม

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ครั้งที่ 2 ไม่ตัดแต้มเพิ่ม
- [ ] ยอดแต้มคงเดิมจากครั้งที่ 1

---

#### TC-74: Expiry — แต้มที่ยังไม่ถึงวันหมดอายุ → ไม่ถูกตัด

**วัตถุประสงค์:** แต้มที่ยังไม่ถึง expires_at ไม่ถูกตัด

**ขั้นตอน:**
1. ลูกค้ามีแต้มที่ expires_at = 300 วันข้างหน้า
2. Trigger cron

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แต้มยังคงอยู่ ไม่ถูกตัด
- [ ] total_points ไม่เปลี่ยน

---

#### TC-75: Expiry — แต้ม type=earn expired=true ถูก mark ถูกต้อง

**วัตถุประสงค์:** Transaction record ที่ถูกตัดมี expired = true

**ขั้นตอน:**
1. Trigger cron (มีแต้มหมดอายุ)
2. ตรวจ point_transactions record ต้นฉบับ (type=earn ตัวที่หมดอายุ)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] record ต้นฉบับ expired = true

---

### PART F: Admin — จัดการแต้มลูกค้า (12 TCs)

---

#### TC-76: Admin — Customer Detail แสดง section แต้ม

**วัตถุประสงค์:** Admin ดูแต้มสะสมของลูกค้าแต่ละคน

**ขั้นตอน:**
1. Admin → ลูกค้า → เลือก "วิชัย มีชัย"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี section "แต้มสะสม"
- [ ] แสดง: คงเหลือ (total_points)
- [ ] แสดง: สะสมทั้งหมด (lifetime_earned)
- [ ] แสดง: ใช้ไปแล้ว (lifetime_redeemed)
- [ ] แสดง: หมดอายุ (lifetime_expired)

---

#### TC-77: Admin — Customer Detail แสดงประวัติล่าสุด

**วัตถุประสงค์:** แสดงประวัติแต้มล่าสุด 5-10 รายการ

**ขั้นตอน:**
1. Admin → ลูกค้า → เลือก customer

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดงประวัติล่าสุด 5-10 รายการ
- [ ] แต่ละรายการ: ประเภท, จำนวนแต้ม, description, วันที่

---

#### TC-78: Admin — ให้แต้มพิเศษ: modal + กรอกจำนวน + เหตุผล

**วัตถุประสงค์:** Admin ให้แต้มพิเศษลูกค้าผ่าน modal

**ขั้นตอน:**
1. Admin → ลูกค้า → เลือก customer → กดปุ่ม "ให้แต้มพิเศษ"
2. กรอก: 100 แต้ม, เหตุผล: "ชดเชยบริการล่าช้า"
3. ยืนยัน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Modal เปิด: มีฟิลด์กรอกจำนวน + เหตุผล
- [ ] ยอดแต้ม Customer เพิ่ม 100

---

#### TC-79: Admin — ให้แต้มพิเศษ: point_transactions type=admin_adjust, +X

**วัตถุประสงค์:** ระบบสร้าง transaction record ถูกต้อง

**ขั้นตอน:**
1. Admin ให้แต้มพิเศษ 100 แต้ม (ตาม TC-78)
2. ตรวจ point_transactions

**ผลลัพธ์ที่คาดหวัง:**
- [ ] type = "admin_adjust"
- [ ] points = +100
- [ ] description = "ชดเชยบริการล่าช้า"
- [ ] balance_after ถูกต้อง

---

#### TC-80: Admin — ให้แต้มพิเศษ: Notification ถึง customer

**วัตถุประสงค์:** ลูกค้าได้รับ notification เมื่อ Admin ให้แต้มพิเศษ

**ขั้นตอน:**
1. Admin ให้แต้มพิเศษ 100 แต้ม
2. Customer → ดูหน้า Notifications

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี notification แจ้งว่าได้รับแต้มพิเศษ 100 แต้ม

---

#### TC-81: Admin — หักแต้ม: modal + กรอกจำนวน + เหตุผล → ยอดลด

**วัตถุประสงค์:** Admin หักแต้มลูกค้าผ่าน modal

**ขั้นตอน:**
1. Admin → ลูกค้า → เลือก customer → กดปุ่ม "หักแต้ม"
2. กรอก: 50 แต้ม, เหตุผล: "แก้ไขยอดผิดพลาด"
3. ยืนยัน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Modal เปิด: มีฟิลด์กรอกจำนวน + เหตุผล
- [ ] ยอดแต้ม Customer ลด 50

---

#### TC-82: Admin — หักแต้ม: validation ไม่เกินแต้มที่มี

**วัตถุประสงค์:** Admin ไม่สามารถหักแต้มเกินกว่าที่ลูกค้ามี

**ขั้นตอน:**
1. Customer มี 100 แต้ม
2. Admin → กด "หักแต้ม" → กรอก 200 แต้ม
3. ยืนยัน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error "ไม่สามารถหักเกินแต้มที่มี (100 แต้ม)"
- [ ] ไม่บันทึก

---

#### TC-83: Admin — หักแต้ม: กรอก 0 → validation error

**วัตถุประสงค์:** ไม่สามารถหักแต้ม 0

**ขั้นตอน:**
1. Admin → กด "หักแต้ม" → กรอก 0 แต้ม
2. ยืนยัน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error "กรุณากรอกจำนวนมากกว่า 0"

---

#### TC-84: Admin — หักแต้ม: point_transactions type=admin_adjust, -X

**วัตถุประสงค์:** ระบบสร้าง transaction record ถูกต้องสำหรับการหักแต้ม

**ขั้นตอน:**
1. Admin หักแต้ม 50 แต้ม (ตาม TC-81)
2. ตรวจ point_transactions

**ผลลัพธ์ที่คาดหวัง:**
- [ ] type = "admin_adjust"
- [ ] points = -50
- [ ] description = "แก้ไขยอดผิดพลาด"

---

#### TC-85: Admin — Customer เห็นยอดอัปเดตทันทีหลัง admin adjust

**วัตถุประสงค์:** ลูกค้าเห็นยอดแต้มอัปเดตหลัง Admin ปรับ

**ขั้นตอน:**
1. Admin ให้แต้มพิเศษ 200 แต้ม
2. Customer → refresh Profile → ตรวจยอดแต้ม

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดแต้มเพิ่มขึ้น 200 ทันที (หลัง refresh)

---

#### TC-86: Admin — ให้แต้มพิเศษ: กรอก 0 → validation error

**วัตถุประสงค์:** ไม่สามารถให้แต้มพิเศษ 0

**ขั้นตอน:**
1. Admin → กด "ให้แต้มพิเศษ" → กรอก 0 แต้ม
2. ยืนยัน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error "กรุณากรอกจำนวนมากกว่า 0"

---

#### TC-87: Admin — ให้แต้มพิเศษ: ไม่กรอกเหตุผล → validation error

**วัตถุประสงค์:** เหตุผลเป็นฟิลด์บังคับ

**ขั้นตอน:**
1. Admin → กด "ให้แต้มพิเศษ" → กรอก 100 แต้ม, เหตุผลว่าง
2. ยืนยัน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง validation error "กรุณากรอกเหตุผล"

---

### PART G: Regression Tests (8 TCs)

---

#### TC-88: Regression — Login Admin app

**วัตถุประสงค์:** Login Admin ยังทำงานปกติ

**ขั้นตอน:**
1. Login Admin → admintest@theblissathome.com / Admin@12345

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Login สำเร็จ → Dashboard โหลดถูกต้อง

---

#### TC-89: Regression — Login Customer app

**วัตถุประสงค์:** Login Customer ยังทำงานปกติ

**ขั้นตอน:**
1. Login Customer → mazmakerdesign@gmail.com / U9B*B2LE#8-q!m8

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Login สำเร็จ → Home โหลดถูกต้อง

---

#### TC-90: Regression — Login Hotel app

**วัตถุประสงค์:** Login Hotel ยังทำงานปกติ

**ขั้นตอน:**
1. Login Hotel → reservations@hilton.com / Hotel123.

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Login สำเร็จ → Dashboard โหลดถูกต้อง

---

#### TC-91: Regression — Login Staff app

**วัตถุประสงค์:** Login Staff ยังทำงานปกติ

**ขั้นตอน:**
1. Login Staff via LINE LIFF (แจ้งผู้ใช้ล็อกอินให้)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Login สำเร็จ → Jobs โหลดถูกต้อง

---

#### TC-92: Regression — Booking flow ปกติ (ไม่ใช้แต้ม) ยังทำงาน

**วัตถุประสงค์:** จองโดยไม่ใช้แต้มยังทำงานปกติ

**ขั้นตอน:**
1. Customer → จอง → ไม่ใช้แต้ม → ไม่ใช้ promo → ชำระเงิน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Booking สร้างสำเร็จ
- [ ] points_redeemed = 0, points_discount = 0
- [ ] final_price = base_price

---

#### TC-93: Regression — Promo code ยังใช้ได้ (ไม่ใช้แต้ม)

**วัตถุประสงค์:** ระบบ promo code เดิมยังทำงาน

**ขั้นตอน:**
1. Customer → จอง → กรอก promo code → ไม่ใช้แต้ม → ชำระเงิน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Promo code ลดราคาถูกต้อง
- [ ] Booking สร้างสำเร็จ
- [ ] discount_amount ถูกต้อง

---

#### TC-94: Regression — Hotel Credit system ไม่กระทบ

**วัตถุประสงค์:** ระบบ Hotel Credit ยังทำงาน

**ขั้นตอน:**
1. Admin → ปฏิทินเครดิต → ดู calendar
2. Hotel → Dashboard → ดู Credit Widget

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ปฏิทินเครดิต แสดงถูกต้อง
- [ ] Hotel Credit Widget แสดงถูกต้อง

---

#### TC-95: Regression — Staff Earnings ไม่กระทบ

**วัตถุประสงค์:** ระบบ Staff Earnings ยังทำงาน

**ขั้นตอน:**
1. Staff → หน้า "รายได้" → ดู earnings

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Earnings summary แสดงถูกต้อง
- [ ] Payout history แสดงถูกต้อง

---

### PART H: Edge Cases (10 TCs)

---

#### TC-96: Edge — ลูกค้าใหม่ไม่มี customer_points record → auto-create

**วัตถุประสงค์:** ลูกค้าใหม่ที่ยังไม่มี record ยังใช้งานได้ ระบบ auto-create

**ขั้นตอน:**
1. Customer ใหม่ (ไม่มี customer_points record) → จอง → ดู BookingWizard Step 5

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่ error
- [ ] แสดง "0 แต้ม" หรือ "ยังไม่มีแต้มสะสม"
- [ ] Booking flow ทำงานปกติ
- [ ] หลัง booking completed → customer_points record ถูกสร้างอัตโนมัติ

---

#### TC-97: Edge — ใช้แต้มเต็มจำนวน (แต้ม = ขั้นต่ำพอดี = 100)

**วัตถุประสงค์:** ใช้แต้มพอดียอดขั้นต่ำและเหลือ 0 หลังใช้

**ขั้นตอน:**
1. Customer (มี 100 แต้ม) → จอง ฿800
2. กรอกแต้ม = 100

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ใช้ได้ (= ขั้นต่ำพอดี)
- [ ] ส่วนลด = ฿10 (100 / 10)
- [ ] หลังจอง: ยอดแต้ม = 0

---

#### TC-98: Edge — Admin หักแต้มจนเหลือ 0

**วัตถุประสงค์:** Admin หักแต้มจนเหลือ 0 ได้

**ขั้นตอน:**
1. Customer มี 50 แต้ม
2. Admin → หักแต้ม 50 แต้ม

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ยอดแต้ม = 0
- [ ] ไม่ error
- [ ] Customer Profile แสดง 0 แต้มถูกต้อง

---

#### TC-99: Edge — Booking refund บางส่วน (50%) → คืนแต้มเท่าไหร่

**วัตถุประสงค์:** ยกเลิก booking บางส่วน → คืนแต้มตามสัดส่วน

**ขั้นตอน:**
1. Customer → จอง → ใช้ 500 แต้ม → ชำระเงิน
2. Admin → refund บางส่วน (50%)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] คืนแต้ม 250 (50% ของ 500) หรือคืนทั้งหมด 500 (ขึ้นอยู่กับ business rule)
- [ ] point_transactions: type=refund, +250 (หรือ +500)
- [ ] ยอดแต้มอัปเดตถูกต้อง

---

#### TC-100: Edge — เปลี่ยน settings (points_per_baht) → booking ใหม่ใช้ค่าใหม่

**วัตถุประสงค์:** เปลี่ยน settings ไม่กระทบ booking เก่า แต่ booking ใหม่ใช้ค่าใหม่

**ขั้นตอน:**
1. Admin → Settings → แก้ points_per_baht = 200
2. Customer → จอง ฿800 → Admin → completed
3. ตรวจแต้มที่ได้

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Booking ใหม่: ฿800 / ฿200 = 4 แต้ม (ใช้ค่าใหม่)
- [ ] Booking เก่าที่ completed ก่อนหน้า: แต้มไม่เปลี่ยน

**Cleanup:** Reset points_per_baht = 100

---

#### TC-101: Edge — Concurrent usage: 2 browser tab จองพร้อมกัน ใช้แต้มเดียวกัน

**วัตถุประสงค์:** ป้องกัน race condition เมื่อใช้แต้มจาก 2 session พร้อมกัน

**ขั้นตอน:**
1. Customer (มี 500 แต้ม) → เปิด 2 tab จองบริการ
2. Tab 1: กรอกแต้ม 500 → ชำระเงิน
3. Tab 2: กรอกแต้ม 500 → ชำระเงิน (ทำเกือบพร้อมกัน)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Tab แรกสำเร็จ: ใช้ 500 แต้ม
- [ ] Tab ที่ 2: แสดง error "แต้มไม่เพียงพอ" (เพราะถูกหักไปแล้ว)
- [ ] ยอดแต้มไม่ติดลบ (total_points >= 0)

---

#### TC-102: Edge — Booking cancel/reschedule ไม่ได้ใช้แต้ม → ไม่คืนแต้ม

**วัตถุประสงค์:** ยกเลิก booking ที่ไม่ได้ใช้แต้ม ไม่สร้าง refund record

**ขั้นตอน:**
1. Customer → จอง ฿800 (ไม่ใช้แต้ม)
2. ยกเลิก booking

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่มี point_transactions record type=refund
- [ ] ยอดแต้มไม่เปลี่ยน

---

#### TC-103: Edge — ใช้แต้มมากกว่าราคา booking → cap ที่ราคา booking (ก่อน max %)

**วัตถุประสงค์:** ส่วนลดจากแต้มไม่เกินราคา booking จริง

**ขั้นตอน:**
1. สมมุติ max_discount_percent = 100 (ชั่วคราว)
2. Customer (มี 20,000 แต้ม = ฿2,000) → จอง ฿800
3. กด "ใช้แต้มทั้งหมด"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ใช้ได้สูงสุด 8,000 แต้ม (= ฿800 = ราคา booking)
- [ ] final_price = ฿0 (หรือยอดขั้นต่ำถ้ามี)

**Cleanup:** Reset max_discount_percent = 50

---

#### TC-104: Edge — Booking ที่ใช้แต้ม + completed → ได้แต้มจาก final_price (หลังหักแต้ม)

**วัตถุประสงค์:** แต้มที่ได้จาก completed คำนวณจาก final_price (รวมหัก points_discount แล้ว)

**ขั้นตอน:**
1. Customer → จอง ฿800 → ใช้ 500 แต้ม (ลด ฿50) → final_price = ฿750
2. Admin → completed
3. ตรวจแต้มที่ได้

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ได้ 7 แต้ม (฿750 / ฿100 = 7.5 → ปัดลง = 7)
- [ ] ไม่ใช่ 8 (จาก ฿800)

---

#### TC-105: Edge — ลูกค้ามีแต้มต่ำกว่าขั้นต่ำ (80 แต้ม) → section แสดงแต่ disable

**วัตถุประสงค์:** ลูกค้าที่มีแต้มแต่ต่ำกว่าขั้นต่ำ section แสดงแต่ไม่สามารถใช้ได้

**ขั้นตอน:**
1. Customer (มี 80 แต้ม) → จอง → Step 5

**ผลลัพธ์ที่คาดหวัง:**
- [ ] section "ใช้แต้มสะสม" แสดง (เพราะมีแต้ม > 0)
- [ ] แสดงข้อความ "ขั้นต่ำ 100 แต้ม" หรือ disable input
- [ ] ไม่สามารถกรอกแต้มได้

---

### PART I: Cleanup (1 TC)

---

#### TC-106: Cleanup — Reset ข้อมูลทดสอบ

**วัตถุประสงค์:** ทำความสะอาดข้อมูลทดสอบ

**ขั้นตอน:**
1. Admin → Settings → Reset loyalty settings กลับ default ทุกฟิลด์
   - points_per_baht = 100
   - points_to_baht = 10
   - min_redeem_points = 100
   - max_discount_percent = 50
   - first_booking_bonus = 50
   - points_expiry_days = 365
   - points_expiry_warning_days = 30
   - loyalty_enabled = true
2. ลบ/ยกเลิก bookings ทดสอบที่ค้าง (ถ้ามี)
3. ลบ test notifications (ถ้าจำเป็น)

---

## ขั้นตอนการทดสอบ — แบ่ง 2 รอบ

### รอบที่ 1: ทดสอบบน Localhost (พัฒนา + แก้ไข)

**เป้าหมาย:** ทดสอบทุก TC บน localhost ถ้า FAIL ให้แก้โค้ดแล้วทดสอบซ้ำจนผ่านทุก TC
**เมื่อผ่านครบ:** Commit + Push + Merge main + Deploy Vercel

```
ลำดับการทดสอบ Localhost:

1. เตรียม environment
   - รัน dev servers: nohup npx turbo run dev --parallel > /tmp/bliss-dev.log 2>&1 &
   - เปิด browser ทุก app แยก tab ด้วย Playwright

2. Login ทุก app
   - Admin: http://localhost:3001 → admintest@theblissathome.com / Admin@12345
   - Customer: http://localhost:3008 → mazmakerdesign@gmail.com / U9B*B2LE#8-q!m8
   - Hotel: http://localhost:3003 → reservations@hilton.com / Hotel123.
   - Staff: tunnel URL → แจ้งผู้ใช้ล็อกอินผ่าน LINE

3. ทดสอบ TC-01 → TC-106 ตามลำดับ
   - PART A (TC-01~15): Admin Settings
   - PART B (TC-16~31): Earn Points
   - PART C (TC-32~51): Redeem Points
   - PART D (TC-52~64): Customer UI
   - PART E (TC-65~75): Points Expiry
   - PART F (TC-76~87): Admin Points Management
   - PART G (TC-88~95): Regression
   - PART H (TC-96~105): Edge Cases
   - PART I (TC-106): Cleanup

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

3. ทดสอบ TC ที่ทำผ่าน UI ได้
   - TC-01~15: Admin Settings ระบบแต้ม (ทุก TC)
   - TC-32~33, TC-41~43, TC-50: Redeem — ใช้แต้ม + promo, validation, ปุ่ม
   - TC-35~40: Redeem Validation
   - TC-52~64: Customer UI (Profile, History, BookingWizard)
   - TC-76~87: Admin Customer Points Management
   - TC-88~95: Regression ทุก app

4. TC ที่ข้ามบน production (ต้องใช้ dev endpoint / mock data):
   - TC-16~31: Earn points (ต้อง complete booking จริง)
   - TC-44~49: Redeem — หัก/คืนแต้ม (ต้อง setup data เฉพาะ)
   - TC-65~75: Points expiry cron (ต้องใช้ dev endpoint)
   - TC-96~105: Edge cases (ต้อง setup data เฉพาะ)

5. สรุปผล Production เป็นตาราง PASS/FAIL แยกจาก Localhost
```

---

## สรุป Test Cases

| # | หมวด | Test Case | Priority | Localhost | Production |
|---|------|-----------|----------|-----------|------------|
| 01 | Admin Settings | แสดง tab + ค่า default ครบ | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 02 | Admin Settings | แก้ points_per_baht + บันทึก + refresh | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 03 | Admin Settings | แก้ points_to_baht + บันทึก | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 04 | Admin Settings | แก้ min_redeem_points + บันทึก | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 05 | Admin Settings | แก้ max_discount_percent + บันทึก | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 06 | Admin Settings | แก้ first_booking_bonus + บันทึก | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 07 | Admin Settings | แก้ points_expiry_days + บันทึก | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 08 | Admin Settings | แก้ points_expiry_warning_days + บันทึก | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 09 | Admin Settings | Validation กรอกค่าว่าง | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 10 | Admin Settings | Validation กรอกค่า 0 | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 11 | Admin Settings | Validation กรอกค่าลบ | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 12 | Admin Settings | Validation กรอกตัวอักษร | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 13 | Admin Settings | Validation กรอกค่าใหญ่มาก | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 14 | Admin Settings | เปิด/ปิดระบบ → Customer ซ่อน section | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 15 | Admin Settings | ปิดระบบ → Completed ไม่ได้แต้ม | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 16 | Earn | Booking ฿800 → 8 แต้ม | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 17 | Earn | Booking ฿250 → 2 แต้ม (ปัดลง) | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 18 | Earn | Booking ฿999 → 9 แต้ม (ปัดลง) | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 19 | Earn | Booking ฿50 → 0 แต้ม (ต่ำกว่า 100) | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 20 | Earn | คำนวณจาก final_price ไม่ใช่ base | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 21 | Earn | โบนัสจองครั้งแรก 50 แต้ม | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 22 | Earn | จองครั้งที่ 2 ไม่ได้โบนัส | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 23 | Earn | Hotel booking ไม่ได้แต้ม | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 24 | Earn | Cancelled booking ไม่ได้แต้ม | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 25 | Earn | Pending/confirmed ยังไม่ได้แต้ม | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 26 | Earn | total_points อัปเดตถูกต้อง | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 27 | Earn | lifetime_earned อัปเดต | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 28 | Earn | point_transactions: type=earn, expires_at | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 29 | Earn | Notification ได้รับแต้ม | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 30 | Earn | Notification โบนัสแยกรายการ | LOW | ✅ ทดสอบ | ⏭️ ข้าม |
| 31 | Earn | bookings.points_earned อัปเดต | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 32 | Redeem | ใช้แต้มสำเร็จ → ราคาลด | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 33 | Redeem | ใช้แต้ม + promo พร้อมกัน | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 34 | Redeem | กรอก 0 แต้ม → ไม่ลดราคา | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 35 | Redeem | กรอกต่ำกว่าขั้นต่ำ (99) → error | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 36 | Redeem | กรอกพอดีขั้นต่ำ (100) → ใช้ได้ | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 37 | Redeem | กรอกเกินแต้มที่มี → error | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 38 | Redeem | กรอกตัวอักษร → error | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 39 | Redeem | กรอกทศนิยม → error | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 40 | Redeem | กรอกค่าลบ → error | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 41 | Redeem | ส่วนลดไม่เกิน max % (cap 50%) | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 42 | Redeem | ปุ่ม "ใช้แต้มทั้งหมด" | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 43 | Redeem | ปุ่ม "ล้าง" | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 44 | Redeem | total_points หักทันทีตอนจอง | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 45 | Redeem | lifetime_redeemed อัปเดต | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 46 | Redeem | bookings: points_redeemed + points_discount | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 47 | Redeem | point_transactions: type=redeem | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 48 | Redeem | ยกเลิก booking → คืนแต้ม (refund) | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 49 | Redeem | ยกเลิก booking → Notification คืน | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 50 | Redeem | Price breakdown 4 กรณี | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 51 | Redeem | ใช้แต้มเกินราคา → cap ที่ราคา | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 52 | UI | Profile widget ยอดแต้ม + มูลค่าบาท | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 53 | UI | Profile widget แต้มใกล้หมดอายุ | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 54 | UI | Profile widget ลิงก์ "ดูประวัติ" | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 55 | UI | Points History แสดงรายการทุก type | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 56 | UI | Points History icon/สี ถูกต้อง | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 57 | UI | Points History booking ref + วันที่ไทย | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 58 | UI | Points History Filter ทำงานถูกต้อง | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 59 | UI | BookingWizard section แสดงเมื่อมีแต้ม | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 60 | UI | BookingWizard ไม่แสดงเมื่อ 0 แต้ม | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 61 | UI | BookingWizard ไม่แสดงเมื่อระบบปิด | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 62 | UI | BookingWizard "แต้มของคุณ: X (฿Y)" | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 63 | UI | เปลี่ยนบริการ → แต้ม reset | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 64 | UI | Profile widget แต้ม 0 | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 65 | Expiry | Cron ตัดแต้มหมดอายุ | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 66 | Expiry | FIFO: แต้มเก่าหมดก่อน | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 67 | Expiry | Redeemed ไม่ถูกตัดซ้ำ | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 68 | Expiry | หมดอายุบางส่วน | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 69 | Expiry | total_points ลด, lifetime_expired เพิ่ม | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 70 | Expiry | point_transactions: type=expire | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 71 | Expiry | Notification 30 วันก่อนหมดอายุ | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 72 | Expiry | Notification duplicate prevention | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 73 | Expiry | Cron ซ้ำ → ไม่ตัดซ้ำ | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 74 | Expiry | แต้มยังไม่หมดอายุ → ไม่ถูกตัด | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 75 | Expiry | expired=true mark ถูกต้อง | LOW | ✅ ทดสอบ | ⏭️ ข้าม |
| 76 | Admin Mgmt | Customer Detail section แต้ม | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 77 | Admin Mgmt | ประวัติล่าสุด 5-10 รายการ | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 78 | Admin Mgmt | ให้แต้มพิเศษ: modal + กรอก | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 79 | Admin Mgmt | ให้แต้มพิเศษ: transaction record | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 80 | Admin Mgmt | ให้แต้มพิเศษ: notification | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 81 | Admin Mgmt | หักแต้ม: modal + ยอดลด | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 82 | Admin Mgmt | หักแต้ม: ไม่เกินแต้มที่มี | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 83 | Admin Mgmt | หักแต้ม: กรอก 0 → error | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 84 | Admin Mgmt | หักแต้ม: transaction record | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 85 | Admin Mgmt | Customer เห็นยอดทันทีหลัง adjust | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 86 | Admin Mgmt | ให้แต้มพิเศษ: กรอก 0 → error | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 87 | Admin Mgmt | ให้แต้มพิเศษ: ไม่กรอกเหตุผล → error | LOW | ✅ ทดสอบ | ✅ ทดสอบ |
| 88 | Regression | Login Admin | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 89 | Regression | Login Customer | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 90 | Regression | Login Hotel | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 91 | Regression | Login Staff | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 92 | Regression | Booking flow ปกติ (ไม่ใช้แต้ม) | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 93 | Regression | Promo code ยังใช้ได้ | HIGH | ✅ ทดสอบ | ✅ ทดสอบ |
| 94 | Regression | Hotel Credit system | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 95 | Regression | Staff Earnings | MEDIUM | ✅ ทดสอบ | ✅ ทดสอบ |
| 96 | Edge | ลูกค้าใหม่ auto-create record | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 97 | Edge | ใช้แต้มเต็มจำนวน (100 พอดี) | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 98 | Edge | Admin หักแต้มจนเหลือ 0 | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 99 | Edge | Booking refund บางส่วน → คืนแต้ม | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 100 | Edge | เปลี่ยน settings → booking ใหม่ใช้ค่าใหม่ | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 101 | Edge | Concurrent: 2 tab ใช้แต้มพร้อมกัน | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 102 | Edge | ยกเลิก booking ไม่ใช้แต้ม → ไม่คืน | LOW | ✅ ทดสอบ | ⏭️ ข้าม |
| 103 | Edge | ใช้แต้มเกินราคา → cap ที่ราคา | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 104 | Edge | ใช้แต้ม + completed → earn จาก final | HIGH | ✅ ทดสอบ | ⏭️ ข้าม |
| 105 | Edge | แต้มต่ำกว่าขั้นต่ำ → disable | MEDIUM | ✅ ทดสอบ | ⏭️ ข้าม |
| 106 | Cleanup | Reset ข้อมูลทดสอบ | — | ✅ ทำ | ✅ ทำ |

### สรุปจำนวน TC แต่ละรอบ

| รอบ | ทดสอบ | ข้าม | รวม |
|-----|-------|------|-----|
| **Localhost** | 106 TC | 0 | 106 |
| **Production** | 60 TC | 46 (earn/cron/edge ที่ต้องใช้ dev endpoint) | 106 |

### สรุปจำนวน TC แต่ละหมวด

| หมวด | จำนวน TC |
|------|---------|
| PART A: Admin Settings | 15 |
| PART B: Earn Points | 16 |
| PART C: Redeem Points | 20 |
| PART D: Customer UI | 13 |
| PART E: Points Expiry | 11 |
| PART F: Admin Points Mgmt | 12 |
| PART G: Regression | 8 |
| PART H: Edge Cases | 10 |
| PART I: Cleanup | 1 |
| **รวม** | **106** |
