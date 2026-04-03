# แผนทดสอบ: Cross-App Integration, Server API, Cron Jobs & External Services

> ทดสอบการทำงานข้ามแอป, Server API, Cron Jobs และ External Services ผ่าน UI ด้วย Playwright MCP
> จำนวน Test Cases: 115 TCs | 20 Modules
> อัปเดตล่าสุด: 31 มีนาคม 2569

## Prompt สำหรับสั่ง Claude AI ทดสอบ

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home
อ่านไฟล์ docs/TEST_PLAN_INTEGRATION_FULL.md แล้วทดสอบตาม Test Cases ทั้งหมด

เงื่อนไข:
- ทดสอบผ่าน UI ด้วย Playwright MCP แบบ full flow step by step
- ห้ามทดสอบด้วยการอัปเดต DB โดยตรง ให้ทำผ่าน UI เท่านั้น
- ทดสอบบน localhost ก่อน แก้ไขจนถูกต้อง แล้วค่อยทดสอบบน production
- ถ้า FAIL ให้แก้โค้ดแล้วทดสอบซ้ำจนผ่าน
- สรุปผลเป็นตาราง PASS/FAIL
- หากต้องการล็อกอินสามารถแจ้งฉันได้
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
| Server API | http://localhost:3000 |

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

## แผนการทดสอบ 2 รอบ

| รอบ | สภาพแวดล้อม | เป้าหมาย |
|-----|-------------|---------|
| **รอบ 1** | Localhost (dev servers) | ทดสอบ + แก้ไขโค้ดจน PASS ทุก TC |
| **รอบ 2** | Production | ยืนยันว่าทำงานบน production ได้ถูกต้อง |

---

## Dev Servers (หากยังไม่รัน)

```bash
cd /c/chitpon59/dev/project/theblissathome.com/the-bliss-at-home
nohup npx turbo run dev --parallel > /tmp/bliss-dev.log 2>&1 &
```

Staff tunnel (หาก expire ให้สร้างใหม่แล้วแจ้งผู้ใช้):
```bash
cloudflared tunnel --url http://localhost:3004
```

---

## Test Cases

---

### MODULE 1: Booking Full Flow (Customer จอง → Admin confirm → Staff รับงาน → Complete)

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 1.01 | Customer | Customer สร้างการจองใหม่ (Single) | Login → เลือกบริการ (เช่น นวดไทย) → เลือก Single → เลือกวัน/เวลา → เลือก duration 60 นาที → กรอกที่อยู่ → เลือกวิธีชำระเงิน → ยืนยัน | สร้าง booking สำเร็จ, แสดงหน้า confirmation, สถานะ = pending | HIGH |
| 1.02 | Admin | Admin เห็นการจองใหม่บน Dashboard | Login Admin → ดู Dashboard → ดูรายการจองล่าสุด | แสดงการจองที่ Customer เพิ่งสร้าง (สถานะ pending) | HIGH |
| 1.03 | Admin | Admin ยืนยันการจอง | ไปหน้า Bookings → คลิกการจอง → กด confirm | สถานะเปลี่ยนเป็น confirmed, สร้าง jobs สำหรับ staff | HIGH |
| 1.04 | Staff | Staff ได้รับ notification งานใหม่ | Login Staff → ดูหน้า Jobs Dashboard | แสดงงานใหม่ใน Pending jobs พร้อมรายละเอียด (บริการ, วัน/เวลา, ที่อยู่) | HIGH |
| 1.05 | Staff | Staff รับงาน | กดปุ่ม "รับงาน" ที่งานที่แสดง | สถานะงานเปลี่ยนเป็น accepted, ปุ่มเปลี่ยนเป็น "เริ่มงาน" | HIGH |
| 1.06 | Staff | Staff เริ่มงาน | กดปุ่ม "เริ่มงาน" | สถานะเปลี่ยนเป็น in_progress, ServiceTimer เริ่มนับถอยหลัง, แสดง SOS button | HIGH |
| 1.07 | Staff | Staff ทำงานเสร็จ | รอ timer หรือกดปุ่ม "เสร็จสิ้น" | สถานะเปลี่ยนเป็น completed, แสดง earnings summary | HIGH |
| 1.08 | Customer | Customer ได้รับ notification งานเสร็จ | เปิด Customer app → ดู Notifications | แสดง notification ว่างานเสร็จแล้ว | HIGH |
| 1.09 | Admin | Admin เห็นการจองสถานะ completed | ไปหน้า Bookings → filter สถานะ completed | แสดงการจองที่เพิ่ง complete พร้อมรายละเอียดครบ | HIGH |
| 1.10 | Customer | Customer รีวิวหลังจบงาน | ไปหน้า Booking Details ของงานที่ complete → กดรีวิว → ให้คะแนน + ข้อความ → ส่ง | รีวิวบันทึกสำเร็จ, แสดงบนหน้า Reviews | MEDIUM |

---

### MODULE 2: Booking Cancellation Flow

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 2.01 | Customer | ยกเลิกล่วงหน้า >24 ชม. → Full Refund | สร้าง booking วันพรุ่งนี้ (>24 ชม.) → ไปหน้า Booking Details → กดยกเลิก → ยืนยัน | แสดง refund preview = 100%, สถานะเปลี่ยนเป็น cancelled, refund เต็มจำนวน | HIGH |
| 2.02 | Customer | ยกเลิกล่วงหน้า 3-24 ชม. → 50% Refund | สร้าง booking อีก 4-5 ชม. → ยกเลิก | แสดง refund preview = 50%, หัก 50% ค่ายกเลิก | HIGH |
| 2.03 | Customer | ยกเลิกล่วงหน้า <3 ชม. → No Refund | สร้าง booking อีก 1-2 ชม. → ยกเลิก | แสดง refund preview = 0%, ไม่ได้รับเงินคืน | HIGH |
| 2.04 | Customer | ดู refund preview ก่อนยกเลิก | กดปุ่มยกเลิก → ดู Modal | Modal แสดงจำนวนเงินคืน, เปอร์เซ็นต์, เหตุผล policy ครบถ้วน | MEDIUM |
| 2.05 | Admin | Admin ยกเลิกการจอง | ไปหน้า Bookings → เลือกการจอง → กดยกเลิก → เลือกเหตุผล → ยืนยัน | สถานะเปลี่ยนเป็น cancelled, ยกเลิก jobs ทั้งหมด | HIGH |
| 2.06 | Staff | Staff ยกเลิกงาน (ก่อนเริ่มงาน) | ดูงาน pending → กดยกเลิก → เลือกเหตุผล → ยืนยัน | งานถูกยกเลิก, สร้าง replacement job, แจ้ง staff คนอื่น | HIGH |
| 2.07 | Staff | Staff ยกเลิกกลางงาน (Mid-service) | ขณะงาน in_progress → กดยกเลิก → กรอกเหตุผล → ยืนยัน | แสดง MidServiceCancellationModal, งานยกเลิก, สร้าง replacement, แจ้ง admin | HIGH |
| 2.08 | Admin | ดู replacement job ที่สร้างใหม่ | หลัง Staff ยกเลิก → ไปหน้า Bookings → ดูการจองเดิม | มี job ใหม่สร้างขึ้นแทน, สถานะ pending, staff คนเดิมไม่ถูก assign | MEDIUM |

---

### MODULE 3: Booking Reschedule Flow

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 3.01 | Customer | เลื่อนการจอง (ภายใน policy) | ไปหน้า Booking Details → กดเลื่อน → เลือกวันเวลาใหม่ → ยืนยัน | Reschedule สำเร็จ, วันเวลาอัปเดต, แจ้ง staff | HIGH |
| 3.02 | Customer | เลื่อนการจอง — แสดง fee calculation | กดเลื่อน → ดู Modal | แสดง fee (ถ้ามี) ตาม policy, แสดงวันเวลาเดิม vs ใหม่ | MEDIUM |
| 3.03 | Customer | เลื่อนการจอง — ไม่อนุญาต (<3 ชม.) | พยายามเลื่อนการจองที่เหลือ <3 ชม. | แสดงข้อความว่าไม่สามารถเลื่อนได้ หรือปุ่มเลื่อน disabled | HIGH |
| 3.04 | Hotel | Hotel เลื่อนการจอง | ไปหน้า Booking History → เลือกการจอง → กดเลื่อน → เลือกวันเวลาใหม่ → ยืนยัน | Reschedule สำเร็จ, อัปเดตข้อมูล, แจ้ง staff | MEDIUM |
| 3.05 | Staff | Staff เห็นงานที่ถูกเลื่อน | หลัง Customer เลื่อน → ดู Jobs Dashboard | งานแสดงวันเวลาใหม่ที่อัปเดตแล้ว | MEDIUM |

---

### MODULE 4: Hotel Booking Flow

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 4.01 | Hotel | Hotel จองบริการให้แขก | Login Hotel → ไปหน้า Services → เลือกบริการ → กรอกข้อมูลแขก (ชื่อ, ห้อง) → เลือกวัน/เวลา → ยืนยัน | Booking สร้างสำเร็จ, แสดงในรายการจอง, สถานะ pending | HIGH |
| 4.02 | Staff | Staff ได้รับ notification จาก Hotel booking | Login Staff → ดู Jobs Dashboard | แสดงงานจาก Hotel booking พร้อมข้อมูลโรงแรม + ห้อง | HIGH |
| 4.03 | Staff | Staff รับงาน Hotel → Complete | รับงาน → เริ่มงาน → เสร็จสิ้น | งาน complete, แจ้ง Hotel | HIGH |
| 4.04 | Hotel | Hotel เห็นการจองสถานะ completed | ไปหน้า Booking History → filter completed | แสดงการจองที่ complete แล้ว | MEDIUM |
| 4.05 | Hotel | Hotel Billing — ยอดสะสม | ไปหน้า Monthly Bill | แสดงยอด bookings, revenue, discounts, fees ของเดือนนี้ | MEDIUM |
| 4.06 | Hotel | Hotel Booking พร้อม Provider Preference | สร้าง booking → เลือก Provider Preference (female only) → ยืนยัน | Booking สร้างสำเร็จพร้อม preference, staff ที่ assign ต้องเป็นผู้หญิง | HIGH |

---

### MODULE 5: Payment Flow

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 5.01 | Customer | ชำระผ่านบัตรเครดิต (Omise) | สร้าง booking → เลือกชำระด้วยบัตรเครดิต → กรอกหมายเลขบัตร test (4242424242424242) → ยืนยัน | Charge สร้างสำเร็จผ่าน Omise, สถานะ payment = paid | HIGH |
| 5.02 | Customer | ชำระด้วยบัตรที่บันทึกไว้ (Saved Card) | สร้าง booking → เลือกบัตรที่บันทึกไว้ → ยืนยัน | Charge สร้างจาก saved card สำเร็จ | HIGH |
| 5.03 | Customer | หน้า Payment Confirmation | หลังชำระเงินสำเร็จ → ดูหน้า confirmation | แสดง checkmark สำเร็จ, ยอดเงิน, ปุ่ม download receipt, ปุ่มส่ง email | HIGH |
| 5.04 | Customer | Download Receipt (PDF) | หน้า confirmation หรือ Booking Details → กดปุ่ม download receipt | ดาวน์โหลด PDF สำเร็จ, เนื้อหาถูกต้อง (ชื่อ, ยอด, วันที่, เลขที่ receipt) | HIGH |
| 5.05 | Customer | ส่ง Receipt ทาง Email | กดปุ่ม "ส่ง email" | ส่ง email สำเร็จ, แสดง toast "ส่งแล้ว" | MEDIUM |
| 5.06 | Customer | ดูประวัติธุรกรรม | ไปหน้า Transactions | แสดงรายการธุรกรรมทั้งหมด, filter ตาม status, แสดง payment method icon | MEDIUM |

---

### MODULE 6: Invoice & Email Flow (Hotel Billing)

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 6.01 | Admin | สร้าง Invoice สำหรับ Hotel | ไปหน้า Hotel Detail → tab Billing → กดสร้างบิล → กรอกรายละเอียด (เดือน, ยอด) → บันทึก | Invoice สร้างสำเร็จ, แสดงในรายการ, สถานะ = pending | HIGH |
| 6.02 | Admin | ส่ง Invoice ทาง Email | เลือก Invoice → กดส่ง email | ส่ง email สำเร็จพร้อม PDF attachment, แสดง toast ยืนยัน | HIGH |
| 6.03 | Hotel | Hotel ดู Invoice | Login Hotel → ไปหน้า Monthly Bill | แสดง Invoice ที่ Admin สร้าง พร้อมยอดเงิน, สถานะ, วันครบกำหนด | HIGH |
| 6.04 | Admin | Download Invoice PDF/CSV/Excel | เลือก Invoice → กด Download → เลือก format | ดาวน์โหลดสำเร็จในทุก format (PDF, CSV, Excel) | MEDIUM |
| 6.05 | Admin | บันทึกการชำระ Invoice | ไปหน้า Hotel Payments → กดบันทึกการชำระ → กรอกวิธีชำระ/ยอด/วันที่ → บันทึก | Payment record สร้าง, Invoice สถานะเปลี่ยนเป็น paid | MEDIUM |

---

### MODULE 7: Hotel Credit System

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 7.01 | Admin | ตั้ง Credit ให้ Hotel | ไปหน้า Hotel Detail → ตั้งวงเงินเครดิต + วันครบกำหนด → บันทึก | Credit อัปเดตสำเร็จ, แสดงวงเงินและวันครบกำหนด | HIGH |
| 7.02 | Admin | Credit Calendar แสดงโรงแรมครบกำหนด | ไปหน้า Credit Calendar | แสดงปฏิทินรายเดือน, Badge โรงแรมที่ใกล้/ครบกำหนด, สี urgency ถูกต้อง (แดง=ครบกำหนด, เหลือง=ใกล้) | HIGH |
| 7.03 | Admin | Credit Calendar — Day Detail | คลิกวันที่มี badge | แสดง Modal รายชื่อโรงแรมครบกำหนดวันนั้น + ยอดค้างชำระ | MEDIUM |
| 7.04 | Hotel | Hotel Dashboard แสดง Credit Widget | Login Hotel → ดู Dashboard | แสดง Credit Widget: วงเงินเครดิต, ยอดที่ใช้, วันครบกำหนด, สี urgency | HIGH |
| 7.05 | Admin | Cron แจ้งเตือน Credit Due | (ตรวจ log) Cron `processCreditDueReminders()` ทำงาน 09:00 ICT | ส่ง email + Google Calendar event สำหรับโรงแรมที่เครดิตครบกำหนดใน 7 วัน | MEDIUM |

---

### MODULE 8: Staff Payout Flow (อัปเดต 2026-04-03 — เพิ่ม Payout Schedule System)

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority | ผล |
|----|-----|-----------|---------|-------------|----------|-----|
| 8.01 | Admin | สร้าง Payout ให้ Staff (Manual) | Staff Detail → tab Earnings → กดสร้าง Payout | สร้างสำเร็จ, status=pending | HIGH | — |
| 8.02 | Admin | ดำเนินการ Payout (Process) | เลือก Payout pending → กด Process → กรอกข้อมูลโอนเงิน | status=completed | HIGH | — |
| 8.03 | Staff | Staff ได้รับ notification Payout | Admin จ่ายเงิน → Staff ดู Notifications | in-app + LINE notification | HIGH | ✅ PASS |
| 8.04 | Staff | Staff ดู Payout History | หน้า Earnings → Payout History | แสดง payout ทั้งหมด + งวดแรก/งวดหลัง label + payout jobs detail | HIGH | ✅ PASS |
| 8.05 | Staff | Staff ดู Earnings Summary | หน้า Earnings → เลือก period | แสดงยอดรวม, กราฟ, สถานะสีถูกต้อง | MEDIUM | ✅ PASS |
| 8.06 | Staff | Real-time Payout Update | Admin process payout → Staff refresh | สถานะเปลี่ยน pending→completed | MEDIUM | ✅ PASS |
| **8.07** | **Server** | **Cron ตัดรอบอัตโนมัติ (ใหม่)** | Cron ทุกวัน 08:00 ICT ตรวจวันที่ 10+25 | สร้าง payout records อัตโนมัติ, carry forward, notifications | **HIGH** | **✅ PASS** |
| **8.08** | **Admin** | **Payout Dashboard (ใหม่)** | /admin/payout → Stats + ตาราง + Filter + Batch payout | จัดการจ่ายเงินหลายคนพร้อมกัน + export CSV | **HIGH** | **✅ PASS** |
| **8.09** | **Staff** | **เลือกรอบจ่ายเงิน (ใหม่)** | Staff Settings → เลือก ครึ่งเดือน/รายเดือน | บันทึก + แสดงรอบถัดไป + ยอดสะสม | **HIGH** | **✅ PASS** |
| **8.10** | **Admin** | **Payout Settings (ใหม่)** | Admin Settings → tab รอบจ่ายเงิน Staff | ตั้งค่าวันตัดรอบ/จ่าย/ขั้นต่ำ + validation | **MEDIUM** | **✅ PASS** |

> **หมายเหตุ:** TC 8.07-8.10 เพิ่มจาก Staff Payout Schedule feature (implement 2026-04-03)
> รายละเอียดเต็ม: `docs/TEST_PLAN_STAFF_PAYOUT_SCHEDULE.md` (108 TCs, 106 PASS)

---

### MODULE 9: Notification System

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 9.01 | Customer | Notification เมื่อ booking confirmed | Admin confirm booking → Customer เปิดหน้า Notifications | แสดง notification "การจองได้รับการยืนยัน" พร้อมรายละเอียด | HIGH |
| 9.02 | Staff | Notification เมื่อมีงานใหม่ | Admin confirm booking → Staff เปิด Jobs Dashboard | แสดงงานใหม่ใน pending + notification | HIGH |
| 9.03 | Admin | Notification เมื่อ SOS alert | Customer/Staff กด SOS → Admin เปิด Dashboard | SOS Widget อัปเดต, แสดง alert ใหม่ | HIGH |
| 9.04 | Hotel | Notification เมื่อ staff รับงาน | Staff accept job ของ Hotel → Hotel เปิด Notifications | แสดง notification ว่า staff รับงานแล้ว | MEDIUM |
| 9.05 | Hotel | Notification เมื่องานเสร็จ | Staff complete job ของ Hotel → Hotel เปิด Notifications | แสดง notification ว่างานเสร็จ | MEDIUM |
| 9.06 | Customer | Unread badge อัปเดต real-time | มี notification ใหม่ขณะเปิด app | Badge ตัวเลขบน notification bell อัปเดตทันที | MEDIUM |
| 9.07 | Customer | Mark as read | คลิก notification → mark as read | Badge ลดลง, notification ไม่แสดงเป็น unread อีก | LOW |

---

### MODULE 10: LINE Integration

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 10.01 | Staff | LINE notification เมื่อมีงานใหม่ | Admin confirm booking ที่มี staff assigned → ตรวจ LINE ของ Staff | Staff ได้รับ LINE push message (flex message) แสดง: ชื่อบริการ, วัน/เวลา, สถานที่, ปุ่มดูรายละเอียด | HIGH |
| 10.02 | Staff | LINE notification — Flex Message format | ดู LINE message ที่ได้รับ | แสดงเป็น Flex Message (ไม่ใช่ text ธรรมดา), มี header/body/footer ถูกต้อง | MEDIUM |
| 10.03 | Staff | LINE notification — งาน Couple (2 staff) | สร้าง Couple booking → confirm | Staff ทั้ง 2 คนได้รับ LINE notification (multicast), แสดงข้อมูล couple format | HIGH |
| 10.04 | Staff | LINE notification — งานถูกยกเลิก | Staff ถูก assign งาน → Admin ยกเลิก booking | Staff ได้รับ LINE notification แจ้งงานถูกยกเลิก | MEDIUM |
| 10.05 | Staff | LINE notification — Extension request | Hotel/Customer ขอ extend → Staff ได้รับ LINE | Staff ได้รับ LINE notification แจ้ง extension request | MEDIUM |

---

### MODULE 11: Email Integration

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 11.01 | Customer | Receipt Email | ชำระเงินสำเร็จ → กดส่ง receipt email | Email ถูกส่งไปที่ email ลูกค้า, มี receipt details (เลขที่, ยอด, วันที่), format ถูกต้อง | HIGH |
| 11.02 | Admin | Invoice Email ถึง Hotel | สร้าง Invoice → กดส่ง email | Hotel ได้รับ email พร้อม PDF attachment, เนื้อหาถูกต้อง (ยอด, รายการ, วันครบกำหนด) | HIGH |
| 11.03 | Admin | Credit Reminder Email | (ตรวจ log) Cron ส่ง credit reminder | โรงแรมที่เครดิตใกล้ครบกำหนดได้รับ email แจ้งเตือน | MEDIUM |
| 11.04 | Admin | Hotel Invitation Email | ไปหน้า Hotels → กดส่ง invitation → กรอก email โรงแรม → ส่ง | Email invitation ถูกส่ง, มีลิงก์สำหรับตั้งรหัสผ่าน | MEDIUM |
| 11.05 | Customer | Credit Note Email (Refund) | ยกเลิก booking ที่มี refund → ระบบส่ง credit note | ลูกค้าได้รับ email credit note พร้อมรายละเอียดเงินคืน | MEDIUM |

---

### MODULE 12: Cron Jobs

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 12.01 | Server | Staff LINE Reminder (ทุก 1 นาที) | สร้าง booking ที่จะเริ่มอีก 1 ชม. → รอ cron ทำงาน → ตรวจ LINE Staff | Staff ได้รับ LINE reminder "งานจะเริ่มอีก 1 ชั่วโมง" | HIGH |
| 12.02 | Server | Customer Email Reminder (ทุก 5 นาที) | สร้าง booking ที่จะเริ่มเร็วๆ นี้ → รอ cron → ตรวจ email Customer | Customer ได้รับ email reminder แจ้งนัดหมายที่จะมาถึง | HIGH |
| 12.03 | Server | Job Escalation (ทุก 5 นาที) | สร้าง booking + confirm → ไม่มี staff รับงาน → รอ cron | Job ถูก escalate, Admin ได้รับ notification ใน Dashboard (Job Escalation Widget) | HIGH |
| 12.04 | Server | Cleanup Old Reminders (รายวัน 03:00 ICT) | (ตรวจ DB/log) | Reminder records ที่เก่ากว่ากำหนดถูกลบ, ไม่กระทบ records ที่ยังใช้งาน | LOW |
| 12.05 | Server | Credit Due Reminders (รายวัน 09:00 ICT) | (ตรวจ log + email) โรงแรมที่เครดิตครบกำหนดใน 7 วัน | ส่ง email แจ้ง Hotel + Admin, สร้าง Google Calendar event | MEDIUM |

---

### MODULE 13: Real-time Updates

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 13.01 | Admin | Booking status real-time | เปิดหน้า Bookings → Staff complete job ใน Staff app | สถานะ booking อัปเดตเป็น completed แบบ real-time (ไม่ต้อง refresh) | HIGH |
| 13.02 | Staff | Payout status real-time | เปิดหน้า Earnings → Admin process payout | สถานะ payout อัปเดตทันทีจาก pending → completed | HIGH |
| 13.03 | Customer | Notification badge real-time | เปิด Customer app → Admin confirm booking | Notification bell badge เพิ่มขึ้นทันที | MEDIUM |
| 13.04 | Admin | SOS alert real-time | เปิด Dashboard → Customer/Staff กด SOS | SOS Widget อัปเดตทันที, แสดง alert ใหม่ พร้อมเสียง/visual cue | HIGH |
| 13.05 | Hotel | Booking update real-time | เปิด Booking History → Staff accept/complete job | สถานะ booking อัปเดตทันที | MEDIUM |

---

### MODULE 14: Provider Preference

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 14.01 | Customer | เลือก Female Only | สร้าง booking → เลือก Provider Preference = Female Only → ยืนยัน | Staff ที่ assign ต้องเป็นเพศหญิงเท่านั้น | HIGH |
| 14.02 | Customer | เลือก Male Only | สร้าง booking → เลือก Male Only → ยืนยัน | Staff ที่ assign ต้องเป็นเพศชายเท่านั้น | HIGH |
| 14.03 | Customer | เลือก Prefer Female | สร้าง booking → เลือก Prefer Female → ยืนยัน | ระบบจัดลำดับ staff หญิงก่อน แต่ถ้าไม่มีว่างจะ assign ชายได้ | MEDIUM |
| 14.04 | Customer | เลือก Prefer Male | สร้าง booking → เลือก Prefer Male → ยืนยัน | ระบบจัดลำดับ staff ชายก่อน แต่ถ้าไม่มีว่างจะ assign หญิงได้ | MEDIUM |
| 14.05 | Customer | No Preference | สร้าง booking → เลือก No Preference → ยืนยัน | ระบบ assign staff ที่ว่างโดยไม่จำกัดเพศ | MEDIUM |
| 14.06 | Hotel | Hotel เลือก Provider Preference | สร้าง booking จาก Hotel → เลือก preference → ยืนยัน | ProviderPreferenceSelector ทำงาน, staff ที่ assign ตรง preference | MEDIUM |

---

### MODULE 15: Couple Booking

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 15.01 | Customer | สร้าง Couple Booking (Simultaneous) | เลือก Couple → เลือก Simultaneous → เลือกบริการ 2 คน → เลือกวัน/เวลา → ยืนยัน | สร้าง booking สำเร็จ, สร้าง 2 jobs แยกสำหรับ staff 2 คน, เวลาเดียวกัน | HIGH |
| 15.02 | Customer | สร้าง Couple Booking (Sequential) | เลือก Couple → เลือก Sequential → ยืนยัน | สร้าง 2 jobs ต่อเนื่อง (คนที่ 2 เริ่มหลังคนที่ 1 จบ), staff อาจเป็นคนเดียวกัน | HIGH |
| 15.03 | Customer | Couple Booking — ราคา 2 คน | ดู Pricing Summary ก่อนยืนยัน | แสดงราคารวม = ราคาบริการ x 2 (+ add-ons ถ้ามี) | HIGH |
| 15.04 | Staff | Staff ได้งาน Couple — LINE notification | Admin confirm couple booking | Staff ทั้ง 2 คนได้รับ LINE notification ระบุว่าเป็นงาน couple | MEDIUM |
| 15.05 | Admin | Admin ดู Couple Booking | ไปหน้า Bookings → คลิก couple booking | แสดง 2 jobs พร้อม staff assigned แต่ละคน, format (simultaneous/sequential) | MEDIUM |

---

### MODULE 16: Extend Session

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 16.01 | Hotel | Hotel ขอ Extend Session | ขณะงาน in_progress → กดปุ่ม Extend → เลือก duration เพิ่ม → ยืนยัน | Extension request สร้างสำเร็จ, แจ้ง Staff | HIGH |
| 16.02 | Staff | Staff ได้รับ Extension request | Hotel ขอ extend → Staff ดูหน้า Job Detail | แสดง ExtensionAcceptanceCard + ExtensionAlertBanner, ปุ่มยืนยัน/ปฏิเสธ | HIGH |
| 16.03 | Staff | Staff ยอมรับ Extension | กดปุ่ม "ยืนยัน" บน ExtensionAcceptanceCard | Timer อัปเดตเพิ่มเวลา, สถานะ extension = accepted | HIGH |
| 16.04 | Staff | Staff ปฏิเสธ Extension | กดปุ่ม "ปฏิเสธ" บน ExtensionAcceptanceCard | สถานะ extension = declined, แจ้ง Hotel | MEDIUM |
| 16.05 | Hotel | Timer + Pricing อัปเดตหลัง extend | Staff accept extension | Pricing Summary อัปเดตยอดเงินเพิ่ม, เวลาจบใหม่แสดงถูกต้อง | MEDIUM |

---

### MODULE 17: Refund System

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 17.01 | Customer | Full Refund (ยกเลิก >24 ชม.) | ยกเลิก booking ล่วงหน้า >24 ชม. | Refund 100% ผ่าน Omise, สถานะ refund = completed, transaction record สร้าง | HIGH |
| 17.02 | Customer | Partial Refund 50% (ยกเลิก 3-24 ชม.) | ยกเลิก booking ล่วงหน้า 3-24 ชม. | Refund 50% ผ่าน Omise, แสดงยอดที่คืน vs หัก | HIGH |
| 17.03 | Customer | No Refund (ยกเลิก <3 ชม.) | ยกเลิก booking ล่วงหน้า <3 ชม. | ไม่มี refund, แสดงข้อความ policy, transaction record บันทึกยอด 0 | HIGH |
| 17.04 | Customer | Download Credit Note (PDF) | หลัง refund → ไปหน้า Booking Details → กด download credit note | ดาวน์โหลด PDF credit note สำเร็จ, เนื้อหาถูกต้อง (เลขที่, ยอดคืน, เหตุผล) | MEDIUM |
| 17.05 | Admin | ดู Refund Transaction | ไปหน้า Bookings → ดู booking ที่ถูกยกเลิก | แสดง refund details: ยอดคืน, เปอร์เซ็นต์, วันที่ refund, สถานะ Omise | MEDIUM |
| 17.06 | Customer | Refund Preview ก่อนยกเลิก | กดปุ่มยกเลิก → API `/api/bookings/:id/refund-preview` | แสดง preview: ยอดเดิม, ยอดคืน, เปอร์เซ็นต์, policy ที่ใช้ | MEDIUM |

---

### MODULE 18: OTP Verification

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 18.01 | Customer | ส่ง OTP | Register → กรอกเบอร์โทร → กดส่ง OTP | ส่ง SMS OTP 6 หลักสำเร็จ (ผ่าน Twilio), แสดงหน้า OTP input + countdown 60 วินาที | HIGH |
| 18.02 | Customer | Verify OTP ถูกต้อง | กรอก OTP 6 หลักที่ได้รับ → ยืนยัน | Verify สำเร็จ, redirect ไปหน้าถัดไป | HIGH |
| 18.03 | Customer | Verify OTP ผิด 3 ครั้ง | กรอก OTP ผิด 3 ครั้ง | แสดงข้อความ "เกินจำนวนครั้งที่กำหนด", ล็อก verify | HIGH |
| 18.04 | Customer | Resend OTP (Cooldown 60 วินาที) | ส่ง OTP → กด resend ภายใน 60 วินาที | ปุ่ม resend disabled, แสดง countdown timer | MEDIUM |
| 18.05 | Customer | OTP หมดอายุ (5 นาที) | ส่ง OTP → รอ 5 นาที → กรอก OTP | แสดงข้อความ "OTP หมดอายุ กรุณาขอใหม่" | MEDIUM |

---

### MODULE 19: SOS Emergency

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 19.01 | Customer | Customer กด SOS พร้อม GPS | เปิด Customer app → กดปุ่ม SOS → ยืนยัน | สร้าง SOS alert พร้อมพิกัด GPS, แจ้ง Admin ทันที | HIGH |
| 19.02 | Staff | Staff กด SOS พร้อม GPS | ขณะทำงาน → กดปุ่ม SOS → ยืนยัน | สร้าง SOS alert จาก staff พร้อมพิกัด GPS + ข้อมูลงานปัจจุบัน | HIGH |
| 19.03 | Admin | Admin รับทราบ SOS (Acknowledge) | ไปหน้า SOS Alerts → เลือก alert → กด Acknowledge | สถานะเปลี่ยนเป็น acknowledged, บันทึกเวลารับทราบ | HIGH |
| 19.04 | Admin | Admin แก้ไข SOS เสร็จ (Resolve) | เลือก alert ที่ acknowledge → กด Resolve → กรอกบันทึก | สถานะเปลี่ยนเป็น resolved, บันทึกการแก้ไข | HIGH |
| 19.05 | Admin | Filter SOS ตาม status/source | ไปหน้า SOS Alerts → filter ตาม status (pending/acknowledged/resolved) + source (customer/staff) | แสดงเฉพาะ alerts ที่ตรง filter, priority sorting ถูกต้อง | MEDIUM |

---

### MODULE 20: Data Export

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 20.01 | Admin | Export Bookings CSV | ไปหน้า Bookings → กดปุ่ม Export → เลือก CSV | ดาวน์โหลด CSV สำเร็จ, มีคอลัมน์ครบ (ID, ลูกค้า, บริการ, วันที่, สถานะ, ยอดเงิน) | HIGH |
| 20.02 | Admin | Export Customers CSV/Excel | ไปหน้า Customers → กดปุ่ม Export → เลือก CSV หรือ Excel | ดาวน์โหลดสำเร็จ, ข้อมูลลูกค้าครบ (ชื่อ, email, เบอร์โทร, จำนวนจอง, ยอดใช้จ่าย) | HIGH |
| 20.03 | Admin | Export Hotel Payments | ไปหน้า Hotel Payments → กด Export | ดาวน์โหลดสำเร็จ, รายการ payment ครบ (Invoice, ยอด, วิธีชำระ, วันที่, สถานะ) | MEDIUM |
| 20.04 | Admin | Export Staff Earnings | ไปหน้า Staff Detail → tab Earnings → กด Export | ดาวน์โหลดสำเร็จ, รายการ earnings ครบ (งาน, ยอด, วันที่, สถานะ payout) | MEDIUM |
| 20.05 | Admin | Export Payout CSV | หลังสร้าง payout → กด Export Payout | ดาวน์โหลด CSV สำเร็จ, รายละเอียด payout ครบ (Staff, ยอด, บัญชีธนาคาร, สถานะ) | MEDIUM |

---

## สรุปผลการทดสอบ

### รอบ 1 — Localhost

| Module | TC Range | จำนวน TC | PASS | FAIL | หมายเหตุ |
|--------|----------|----------|------|------|---------|
| 1. Booking Full Flow | 1.01-1.10 | 10 | | | |
| 2. Booking Cancellation | 2.01-2.08 | 8 | | | |
| 3. Booking Reschedule | 3.01-3.05 | 5 | | | |
| 4. Hotel Booking | 4.01-4.06 | 6 | | | |
| 5. Payment Flow | 5.01-5.06 | 6 | | | |
| 6. Invoice & Email | 6.01-6.05 | 5 | | | |
| 7. Hotel Credit | 7.01-7.05 | 5 | | | |
| 8. Staff Payout | 8.01-8.06 | 6 | | | |
| 9. Notification System | 9.01-9.07 | 7 | | | |
| 10. LINE Integration | 10.01-10.05 | 5 | | | |
| 11. Email Integration | 11.01-11.05 | 5 | | | |
| 12. Cron Jobs | 12.01-12.05 | 5 | | | |
| 13. Real-time Updates | 13.01-13.05 | 5 | | | |
| 14. Provider Preference | 14.01-14.06 | 6 | | | |
| 15. Couple Booking | 15.01-15.05 | 5 | | | |
| 16. Extend Session | 16.01-16.05 | 5 | | | |
| 17. Refund System | 17.01-17.06 | 6 | | | |
| 18. OTP Verification | 18.01-18.05 | 5 | | | |
| 19. SOS Emergency | 19.01-19.05 | 5 | | | |
| 20. Data Export | 20.01-20.05 | 5 | | | |
| **รวม** | | **115** | | | |

### รอบ 2 — Production

| Module | TC Range | จำนวน TC | PASS | FAIL | หมายเหตุ |
|--------|----------|----------|------|------|---------|
| 1. Booking Full Flow | 1.01-1.10 | 10 | | | |
| 2. Booking Cancellation | 2.01-2.08 | 8 | | | |
| 3. Booking Reschedule | 3.01-3.05 | 5 | | | |
| 4. Hotel Booking | 4.01-4.06 | 6 | | | |
| 5. Payment Flow | 5.01-5.06 | 6 | | | |
| 6. Invoice & Email | 6.01-6.05 | 5 | | | |
| 7. Hotel Credit | 7.01-7.05 | 5 | | | |
| 8. Staff Payout | 8.01-8.06 | 6 | | | |
| 9. Notification System | 9.01-9.07 | 7 | | | |
| 10. LINE Integration | 10.01-10.05 | 5 | | | |
| 11. Email Integration | 11.01-11.05 | 5 | | | |
| 12. Cron Jobs | 12.01-12.05 | 5 | | | |
| 13. Real-time Updates | 13.01-13.05 | 5 | | | |
| 14. Provider Preference | 14.01-14.06 | 6 | | | |
| 15. Couple Booking | 15.01-15.05 | 5 | | | |
| 16. Extend Session | 16.01-16.05 | 5 | | | |
| 17. Refund System | 17.01-17.06 | 6 | | | |
| 18. OTP Verification | 18.01-18.05 | 5 | | | |
| 19. SOS Emergency | 19.01-19.05 | 5 | | | |
| 20. Data Export | 20.01-20.05 | 5 | | | |
| **รวม** | | **115** | | | |
