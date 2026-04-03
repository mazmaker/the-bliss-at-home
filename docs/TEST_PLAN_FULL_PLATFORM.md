# แผนทดสอบ: Full Platform Test — ทดสอบทุกฟังก์ชันผ่าน UI ด้วย Playwright MCP

## Prompt สำหรับสั่ง Claude AI ทดสอบ

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home
อ่านไฟล์ docs/TEST_PLAN_FULL_PLATFORM.md แล้วทดสอบตาม Test Cases ทั้งหมด

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

### MODULE 1: Authentication (ทุก App)

| TC | App | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----|-----------|---------|-------------|----------|
| 1.01 | Admin | Login สำเร็จ | กรอก email/password → กด login | เข้า Dashboard ได้ | HIGH |
| 1.02 | Admin | Login ผิด password | กรอก password ผิด → กด login | แสดง error "รหัสผ่านไม่ถูกต้อง" | HIGH |
| 1.03 | Admin | Logout | กดปุ่ม "ออกจากระบบ" | กลับหน้า login | HIGH |
| 1.04 | Admin | Session persistence | Login → ปิด tab → เปิดใหม่ | ยังอยู่ใน Dashboard (ไม่ต้อง login ใหม่) | MEDIUM |
| 1.05 | Customer | Login email/password | กรอก email/password → กด login | เข้า Home ได้ | HIGH |
| 1.06 | Customer | Login ผิด password | กรอก password ผิด | แสดง error | HIGH |
| 1.07 | Customer | Logout | กดชื่อ → logout | กลับหน้า login | HIGH |
| 1.08 | Hotel | Login สำเร็จ | กรอก email/password → กด login | เข้า Dashboard ของโรงแรม | HIGH |
| 1.09 | Hotel | Login ผิด password | กรอก password ผิด | แสดง error | HIGH |
| 1.10 | Hotel | Logout | กดปุ่ม "ออกจากระบบ" | กลับหน้า login | HIGH |
| 1.11 | Staff | LINE LIFF Login | เปิด tunnel URL → LINE login | เข้า Jobs Dashboard | HIGH |
| 1.12 | Staff | Logout | Settings → ออกจากระบบ | กลับหน้า login | HIGH |

---

### MODULE 2: Admin — Dashboard

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 2.01 | Dashboard โหลด | Login → ดู Dashboard | แสดง stats, SOS widget, job alerts, การจองล่าสุด | HIGH |
| 2.02 | Stats ถูกต้อง | ดู cards: การจองวันนี้, รายได้, ผู้ใช้ใหม่, พนักงาน, โรงแรม, บริการ | ตัวเลขแสดงถูกต้อง (ไม่ใช่ NaN/undefined) | HIGH |
| 2.03 | SOS Widget | ดู SOS section | แสดงจำนวน SOS รอดำเนินการ + รายละเอียดล่าสุด | MEDIUM |
| 2.04 | Job Escalation Widget | ดู section งานยังไม่มี Staff | แสดงจำนวน + รายละเอียด + ปุ่มรับทราบ | MEDIUM |

---

### MODULE 3: Admin — จัดการบริการ

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 3.01 | แสดงรายการบริการ | ไปหน้า Services | แสดงรายการบริการทั้งหมด | HIGH |
| 3.02 | ค้นหาบริการ | พิมพ์ชื่อในช่อง search | แสดงผลที่ตรง + จำนวนอัปเดต | HIGH |
| 3.03 | Filter ตาม category | เลือก category (massage/nail/spa) | แสดงเฉพาะ category ที่เลือก | MEDIUM |
| 3.04 | ดูรายละเอียดบริการ | คลิกบริการ | แสดงข้อมูล: ชื่อ, ราคาหลาย duration, สถานะ | HIGH |
| 3.05 | แก้ไขบริการ | คลิกแก้ไข → เปลี่ยนราคา → บันทึก | ราคาอัปเดต | MEDIUM |

---

### MODULE 4: Admin — พนักงาน

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 4.01 | แสดงรายการ Staff | ไปหน้า Staff | แสดงรายชื่อ Staff ทั้งหมด | HIGH |
| 4.02 | ค้นหา Staff | พิมพ์ชื่อในช่อง search | แสดงผลที่ตรง | HIGH |
| 4.03 | Filter ตาม skill | เลือก skill (massage/nail/spa) | แสดงเฉพาะ skill ที่เลือก | MEDIUM |
| 4.04 | Filter ตาม status | เลือก status (active/inactive/pending) | แสดงเฉพาะ status ที่เลือก | MEDIUM |
| 4.05 | ดู Staff Detail | คลิก Staff → ดูรายละเอียด | แสดง tabs: Overview, Documents, Earnings ฯลฯ | HIGH |
| 4.06 | Staff Detail — Earnings tab | คลิก tab "รายได้" | แสดง earnings summary + payout history | HIGH |
| 4.07 | Staff Detail — Documents tab | คลิก tab "เอกสาร" | แสดงรายการเอกสาร + สถานะ | MEDIUM |

---

### MODULE 5: Admin — ลูกค้า

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 5.01 | แสดงรายการลูกค้า | ไปหน้า Customers | แสดงรายชื่อลูกค้าทั้งหมด | HIGH |
| 5.02 | ค้นหาลูกค้า | พิมพ์ชื่อ/email | แสดงผลที่ตรง | HIGH |
| 5.03 | ดูรายละเอียดลูกค้า | คลิกลูกค้า | แสดง modal: ข้อมูล, ประวัติจอง, ที่อยู่ | MEDIUM |

---

### MODULE 6: Admin — SOS Alerts

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 6.01 | แสดงรายการ SOS | ไปหน้า SOS Alerts | แสดง SOS ทั้งหมด + filter status/source | HIGH |
| 6.02 | Filter SOS | เลือก status "pending" | แสดงเฉพาะ SOS ที่รอดำเนินการ | MEDIUM |
| 6.03 | Acknowledge SOS | กดปุ่ม Acknowledge ที่ SOS alert | สถานะเปลี่ยนเป็น "acknowledged" | HIGH |

---

### MODULE 7: Admin — โรงแรม

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 7.01 | แสดงรายการโรงแรม | ไปหน้า Hotels | แสดงโรงแรมทั้งหมด + stats | HIGH |
| 7.02 | ค้นหาโรงแรม | พิมพ์ชื่อ | แสดงผลที่ตรง | HIGH |
| 7.03 | สลับ Grid/List | กดปุ่ม Grid / List | เปลี่ยน layout | LOW |
| 7.04 | ดู Hotel Detail | คลิก "ดูรายละเอียด" | แสดงข้อมูลโรงแรม + credit section | HIGH |
| 7.05 | แก้ไขโรงแรม | คลิก "แก้ไข" → เปลี่ยนข้อมูล → บันทึก | ข้อมูลอัปเดต | HIGH |
| 7.06 | Hotel Billing | ไปหน้า Billing ของโรงแรม | แสดงรายการบิล + stats | HIGH |
| 7.07 | ส่ง Invoice Email | กดปุ่มส่งอีเมลที่บิล | ส่งสำเร็จ + toast notification | HIGH |

---

### MODULE 8: Admin — ปฏิทินเครดิต

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 8.01 | แสดงปฏิทิน | ไปเมนู "ปฏิทินเครดิต" | แสดง calendar grid + stats + legend | HIGH |
| 8.02 | Badge โรงแรม | ดูวันที่มีโรงแรมครบกำหนด | แสดง badge ชื่อโรงแรม + สีถูกต้อง | HIGH |
| 8.03 | Day detail modal | คลิกวันที่มี badge | แสดง modal: รายชื่อโรงแรม, ยอดค้าง, ปุ่มดูบิล | MEDIUM |
| 8.04 | เลื่อนเดือน | กด < > วันนี้ | เดือนเปลี่ยนถูกต้อง, badge ยังแสดง | MEDIUM |

---

### MODULE 9: Admin — การจอง

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 9.01 | แสดงรายการจอง | ไปหน้า Bookings | แสดงการจองทั้งหมด | HIGH |
| 9.02 | ค้นหาการจอง | พิมพ์ booking number | แสดงผลที่ตรง | HIGH |
| 9.03 | Filter status | เลือก status (pending/confirmed/completed) | แสดงเฉพาะ status ที่เลือก | HIGH |
| 9.04 | ดูรายละเอียดจอง | คลิก booking | แสดง modal: customer, service, staff, payment | HIGH |

---

### MODULE 10: Admin — โปรโมชั่น

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 10.01 | แสดงรายการโปรโมชั่น | ไปหน้า Promotions | แสดง promotions ทั้งหมด | HIGH |
| 10.02 | Filter ตาม type | เลือก type (percentage/fixed) | แสดงเฉพาะ type ที่เลือก | MEDIUM |
| 10.03 | Filter ตาม status | เลือก status (active/expired) | แสดงเฉพาะ status ที่เลือก | MEDIUM |

---

### MODULE 11: Admin — รีวิว

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 11.01 | แสดงรายการรีวิว | ไปหน้า Reviews | แสดงรีวิวทั้งหมด + ratings | HIGH |
| 11.02 | ค้นหารีวิว | พิมพ์ keyword | แสดงผลที่ตรง | MEDIUM |

---

### MODULE 12: Admin — รายงาน

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 12.01 | แสดงรายงาน | ไปหน้า Reports | แสดง section Overview/Sales/Hotels/Staff/Services | HIGH |
| 12.02 | เลือก period | เปลี่ยน period (daily/weekly/monthly) | ข้อมูลอัปเดตตาม period | MEDIUM |

---

### MODULE 13: Admin — ตั้งค่า

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 13.01 | Tab ทั่วไป | ไป Settings → tab ทั่วไป | แสดง company name, logo, email, address, phone | HIGH |
| 13.02 | Tab การชำระเงิน | เลือก tab การชำระเงิน | แสดง Omise keys, Google Calendar config | HIGH |
| 13.03 | Google Calendar status | ดู section Google Calendar | แสดง "เชื่อมต่อแล้ว" (สีเขียว) | MEDIUM |
| 13.04 | Tab เงื่อนไขคืนเงิน | เลือก tab เงื่อนไขการคืนเงิน | แสดงเนื้อหา plain text + version | MEDIUM |
| 13.05 | บันทึก settings | แก้ค่า → บันทึก → refresh | ค่ายังอยู่ | HIGH |

---

### MODULE 14: Customer — Home + บริการ

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 14.01 | Home page โหลด | Login Customer → ดู Home | แสดง hero, promotions, services, reviews | HIGH |
| 14.02 | ค้นหาบริการ | พิมพ์ในช่อง search | แสดงผลที่ตรง | MEDIUM |
| 14.03 | Service Catalog | คลิก "บริการ" | แสดงรายการบริการ + filter + sort | HIGH |
| 14.04 | Service Detail | คลิกบริการ | แสดงรายละเอียด: ราคา, durations, reviews | HIGH |
| 14.05 | Promotions page | คลิก "โปรโมชั่น" | แสดง active promotions + search/sort | HIGH |

---

### MODULE 15: Customer — การจอง (BookingWizard)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 15.01 | เริ่มจอง | คลิก "จอง" ที่บริการ | เข้า BookingWizard Step 1 | HIGH |
| 15.02 | Step 1: Customer type | เลือก Single/Couple | ไปขั้นตอนถัดไป | HIGH |
| 15.03 | Step 2: Date/Time | เลือกวันที่ + เวลา | ไปขั้นตอนถัดไป | HIGH |
| 15.04 | Step 3: Duration | เลือก duration + add-ons | ไปขั้นตอนถัดไป | HIGH |
| 15.05 | Step 4: Address | เลือกที่อยู่ที่บันทึกไว้ หรือกรอกใหม่ | ไปขั้นตอนถัดไป | HIGH |
| 15.06 | Step 5: Confirmation | ดูสรุป + ใส่ promo code (optional) | แสดง price breakdown ถูกต้อง | HIGH |
| 15.07 | Voucher code | กรอก promo code → Apply | ส่วนลดแสดงถูกต้อง | HIGH |
| 15.08 | Step 6: Payment | เลือกวิธีชำระ → ชำระเงิน | Booking สร้างสำเร็จ | HIGH |

---

### MODULE 16: Customer — จัดการการจอง

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 16.01 | Booking History | คลิก "การจอง" | แสดงรายการจองทั้งหมด + status filter | HIGH |
| 16.02 | Booking Detail | คลิก booking | แสดงรายละเอียด: service, date, staff, price | HIGH |
| 16.03 | ยกเลิก booking | กดปุ่มยกเลิก | แสดง cancellation policy + refund preview → ยืนยัน | HIGH |
| 16.04 | เลื่อน booking | กดปุ่มเลื่อน | เลือกวันที่/เวลาใหม่ → ยืนยัน | HIGH |

---

### MODULE 17: Customer — โปรไฟล์

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 17.01 | Profile page | คลิก "โปรไฟล์" | แสดง: ข้อมูลส่วนตัว, ที่อยู่, วิธีชำระ, ภาษี | HIGH |
| 17.02 | แก้ไขข้อมูลส่วนตัว | แก้ชื่อ/โทร → บันทึก | ข้อมูลอัปเดต | MEDIUM |
| 17.03 | จัดการที่อยู่ | เพิ่ม/แก้ไข/ลบ/ตั้งค่าเริ่มต้น | CRUD ทำงานถูกต้อง | HIGH |
| 17.04 | Refund Policy consent | Login → เห็น consent modal | แสดง plain text + scroll + checkbox + ยืนยัน | HIGH |

---

### MODULE 18: Customer — Transactions + Notifications

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 18.01 | Transaction History | ไปหน้า Transactions | แสดงรายการชำระ + filter status | MEDIUM |
| 18.02 | Notifications | คลิกกระดิ่ง | แสดง notifications + mark as read | HIGH |

---

### MODULE 19: Hotel — Dashboard + บริการ

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 19.01 | Dashboard โหลด | Login Hotel → ดู Dashboard | แสดง stats, Credit Widget, Guest Activity, Recent bookings | HIGH |
| 19.02 | Credit Widget | ดู section "รอบเครดิต" | แสดง: จำนวนวัน, ช่วงเวลา, เหลือ X วัน, สีถูกต้อง | HIGH |
| 19.03 | Guest Activity Snapshot | ดู section Guest Activity | แสดง: แขกทั้งหมด, แขกประจำ, คะแนนเฉลี่ย | MEDIUM |
| 19.04 | Services page | ไปหน้า บริการ | แสดงบริการ + ราคาหลังส่วนลดโรงแรม | HIGH |

---

### MODULE 20: Hotel — การจอง + บิล

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 20.01 | Booking History | ไปหน้า ประวัติการจอง | แสดงรายการจอง + filter + search | HIGH |
| 20.02 | Monthly Bill | ไปหน้า บิลรายเดือน | แสดง revenue data + invoices | HIGH |
| 20.03 | Notifications | ไปหน้า แจ้งเตือน | แสดง notifications + unread badge | HIGH |

---

### MODULE 21: Hotel — โปรไฟล์ + ตั้งค่า

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 21.01 | Hotel Profile | ไปหน้า ข้อมูลโรงแรม | แสดง contact, tax, banking info + map | HIGH |
| 21.02 | Hotel Settings | ไปหน้า ตั้งค่า | แสดง notification toggles + preferences | MEDIUM |

---

### MODULE 22: Staff — งาน (Jobs)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 22.01 | Jobs Dashboard | Login Staff → ดู Dashboard | แสดง: profile, stats, pending jobs, in-progress job | HIGH |
| 22.02 | ดูรายละเอียดงาน | คลิกงาน | แสดง: customer info, address, service, duration, ราคา | HIGH |
| 22.03 | รับงาน | กดปุ่ม "รับงาน" (ถ้ามี pending) | สถานะเปลี่ยน → ยืนยันแล้ว | HIGH |
| 22.04 | เริ่มงาน | กดปุ่ม "เริ่มงาน" | Timer เริ่มนับ + background music | HIGH |
| 22.05 | SOS Button | กดปุ่ม SOS | แสดง emergency contact / ส่ง alert | HIGH |

---

### MODULE 23: Staff — ตารางงาน + ประวัติ

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 23.01 | Schedule | ไปหน้า ตารางงาน | แสดง calendar (day/week/month) + jobs | HIGH |
| 23.02 | สลับ view | กด day/week/month | แสดง view ที่เลือก | MEDIUM |
| 23.03 | History | ไปหน้า ประวัติงาน | แสดง completed/cancelled + earnings | HIGH |

---

### MODULE 24: Staff — รายได้

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 24.01 | Earnings page | ไปหน้า รายได้ | แสดง earnings summary + charts + payout history | HIGH |
| 24.02 | สลับ period | กด day/week/month | ข้อมูลอัปเดตตาม period | MEDIUM |
| 24.03 | Payout status | ดู payout history | แสดง status badges (รอ/กำลังโอน/โอนแล้ว/ไม่สำเร็จ) | HIGH |

---

### MODULE 25: Staff — โปรไฟล์ + ตั้งค่า

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 25.01 | Profile page | ไปหน้า โปรไฟล์ | แสดง: ข้อมูลส่วนตัว, bank accounts, skills, documents | HIGH |
| 25.02 | Bank accounts | ดู section บัญชีธนาคาร | แสดงรายการ bank accounts + เพิ่ม/แก้ไข/ลบ | HIGH |
| 25.03 | Settings page | ไปหน้า ตั้งค่า | แสดง: notification toggles, job reminders, logout | HIGH |
| 25.04 | Toggle notifications | เปิด/ปิด เสียงแจ้งเตือน | สถานะเปลี่ยน + บันทึก | MEDIUM |

---

### MODULE 26: Cross-App Integration

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 26.01 | Booking → Staff notification | Customer จอง → Admin confirm | Staff ได้รับ notification + งานปรากฏใน Dashboard | HIGH |
| 26.02 | Hotel Credit → Admin Calendar | Admin ตั้งเครดิตโรงแรม | ปฏิทินเครดิตแสดง badge วันครบกำหนด | HIGH |
| 26.03 | Admin → Hotel Invoice Email | Admin ส่ง invoice email | Email ถึง + PDF แนบ | HIGH |
| 26.04 | Staff complete → Earnings | Staff complete job → Admin ดู earnings | Earnings อัปเดตทั้ง Staff app + Admin StaffDetail | HIGH |

---

## ขั้นตอนการทดสอบ — แบ่ง 2 รอบ

### รอบที่ 1: ทดสอบบน Localhost (พัฒนา + แก้ไข)

**เป้าหมาย:** ทดสอบทุก TC บน localhost ถ้า FAIL ให้แก้โค้ดแล้วทดสอบซ้ำจนผ่าน
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

3. ทดสอบ Module 1-26 ตามลำดับ

4. ถ้า FAIL → แก้โค้ด → ทดสอบ TC นั้นซ้ำจนผ่าน

5. สรุปผล Localhost เป็นตาราง PASS/FAIL
```

---

### รอบที่ 2: ทดสอบบน Production (ยืนยันหลัง deploy)

**เป้าหมาย:** ยืนยันว่าทุกฟังก์ชันทำงานถูกต้องบน production
**ทำหลัง:** Vercel deploy สำเร็จทุก app

```
ลำดับการทดสอบ Production:

1. ตรวจ Vercel deployment สำเร็จ (ใช้ vercel-deploy MCP)

2. Login ทุก app บน production
   - Admin: https://admin.theblissmassageathome.com
   - Customer: https://customer.theblissmassageathome.com
   - Hotel: https://hotel.theblissmassageathome.com
   - Staff: https://staff.theblissmassageathome.com → แจ้งผู้ใช้ล็อกอิน

3. ทดสอบทุก TC ที่ทำผ่าน UI ได้ (ข้าม TC ที่ต้อง trigger cron/dev endpoint)

4. สรุปผล Production เป็นตาราง PASS/FAIL แยกจาก Localhost
```

---

## สรุป Test Cases

| Module | App | จำนวน TC | Priority HIGH |
|--------|-----|---------|--------------|
| 1. Authentication | ทุก App | 12 | 10 |
| 2. Admin Dashboard | Admin | 4 | 2 |
| 3. Admin บริการ | Admin | 5 | 3 |
| 4. Admin พนักงาน | Admin | 7 | 4 |
| 5. Admin ลูกค้า | Admin | 3 | 2 |
| 6. Admin SOS | Admin | 3 | 2 |
| 7. Admin โรงแรม | Admin | 7 | 5 |
| 8. Admin ปฏิทินเครดิต | Admin | 4 | 2 |
| 9. Admin การจอง | Admin | 4 | 4 |
| 10. Admin โปรโมชั่น | Admin | 3 | 1 |
| 11. Admin รีวิว | Admin | 2 | 1 |
| 12. Admin รายงาน | Admin | 2 | 1 |
| 13. Admin ตั้งค่า | Admin | 5 | 3 |
| 14. Customer Home+บริการ | Customer | 5 | 4 |
| 15. Customer BookingWizard | Customer | 8 | 8 |
| 16. Customer จัดการจอง | Customer | 4 | 4 |
| 17. Customer โปรไฟล์ | Customer | 4 | 3 |
| 18. Customer Transactions | Customer | 2 | 1 |
| 19. Hotel Dashboard | Hotel | 4 | 3 |
| 20. Hotel จอง+บิล | Hotel | 3 | 3 |
| 21. Hotel โปรไฟล์ | Hotel | 2 | 1 |
| 22. Staff งาน | Staff | 5 | 5 |
| 23. Staff ตาราง+ประวัติ | Staff | 3 | 2 |
| 24. Staff รายได้ | Staff | 3 | 2 |
| 25. Staff โปรไฟล์+ตั้งค่า | Staff | 4 | 3 |
| 26. Cross-App Integration | ทุก App | 4 | 4 |
| **รวม** | | **112 TC** | **83 HIGH** |

### สรุปจำนวน TC แต่ละรอบ
| รอบ | ทดสอบ | ข้าม | รวม |
|-----|-------|------|-----|
| **Localhost** | 112 TC | 0 | 112 |
| **Production** | 100+ TC | ~12 (cron/dev endpoint) | 112 |
