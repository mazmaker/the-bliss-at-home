# แผนทดสอบ: Hotel Credit System — ทดสอบผ่าน UI ด้วย Playwright MCP

## Prompt สำหรับสั่ง Claude AI ทดสอบ

```
อ่านไฟล์ docs/TEST_PLAN_HOTEL_CREDIT.md เพื่อเข้าใจแผนทดสอบ แล้วทดสอบตาม Test Cases ทั้งหมด

เงื่อนไข:
- ปิด Chrome browser ก่อนเริ่ม
- ใช้ Playwright MCP ทดสอบผ่าน UI
- รัน localhost ด้วย: cd the-bliss-at-home && npx turbo run dev --parallel
- ทดสอบทีละ Test Case ตามลำดับ
- บันทึกผลลัพธ์ PASS/FAIL พร้อมหมายเหตุ
- ถ้า FAIL ให้แก้ไขโค้ดแล้วทดสอบซ้ำจนผ่าน
- เมื่อผ่านทุก Test Case แล้วค่อย commit + push + deploy

Localhost URLs:
- Admin: http://localhost:3001/admin/login
- Hotel: http://localhost:3003/login
- Server: http://localhost:3000

Login Credentials:
- Admin: admintest@theblissathome.com / Admin@12345
- Hotel (ดุสิต เชียงใหม่): mazmakerv3.sup@gmail.com / Hotel123.

Test Hotel: โรงแรมดุสิต เชียงใหม่ (ID: 43589021-c3ff-46b5-9084-95d08b85a46e)
```

---

## Test Cases

### TC-01: Admin — ตั้งค่าเครดิตโรงแรมใหม่

**วัตถุประสงค์:** ตรวจสอบว่า Admin สามารถตั้งค่าเครดิตให้โรงแรมได้

**ขั้นตอน:**
1. Login Admin app → http://localhost:3001/admin/login
2. ไปหน้า Hotels → http://localhost:3001/admin/hotels
3. คลิก "แก้ไข" ที่โรงแรม "โรงแรมดุสิต เชียงใหม่"
4. เลื่อนลงไปที่ section "ตั้งค่าเครดิต"
5. ตรวจสอบว่ามี 3 fields:
   - จำนวนวันเครดิต (default 30)
   - วันเริ่มรอบเครดิต
   - วันครบรอบในเดือน
6. กรอก: credit_days = 30, credit_start_date = 2026-04-01, credit_cycle_day = 15
7. กด "บันทึกการแก้ไข"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ฟอร์มมี section "ตั้งค่าเครดิต" พร้อม 3 fields
- [ ] Default credit_days = 30
- [ ] บันทึกสำเร็จ ไม่มี error
- [ ] กลับไปหน้า Hotels list

---

### TC-02: Admin — ตรวจสอบข้อมูลเครดิตใน Hotel Detail

**วัตถุประสงค์:** ตรวจสอบว่าหน้า Hotel Detail แสดงข้อมูลเครดิตถูกต้อง

**ขั้นตอน:**
1. จาก TC-01 → คลิก "ดูรายละเอียด" ที่โรงแรมดุสิต เชียงใหม่
2. ดู section "ตั้งค่าเครดิต" ด้านขวา

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง "จำนวนวันเครดิต: 30 วัน"
- [ ] แสดง "วันเริ่มรอบเครดิต: 1 เมษายน 2569"
- [ ] แสดง "วันครบรอบในเดือน: วันที่ 15"
- [ ] แสดง "ครบกำหนดชำระอีก X วัน (15 เม.ย.)" พร้อมสี (เขียว/เหลือง/แดง)

---

### TC-03: Admin — แก้ไขรอบเครดิต

**วัตถุประสงค์:** ตรวจสอบว่าแก้ไขเครดิตแล้วข้อมูลอัปเดต

**ขั้นตอน:**
1. จากหน้า Hotels → คลิก "แก้ไข" ที่โรงแรมดุสิต เชียงใหม่
2. เปลี่ยน credit_days = 45, credit_cycle_day = 20
3. กด "บันทึกการแก้ไข"
4. คลิก "ดูรายละเอียด" อีกครั้ง

**ผลลัพธ์ที่คาดหวัง:**
- [ ] บันทึกสำเร็จ
- [ ] Hotel Detail แสดง "จำนวนวันเครดิต: 45 วัน"
- [ ] แสดง "วันครบรอบในเดือน: วันที่ 20"
- [ ] วันครบกำหนดคำนวณใหม่ถูกต้อง

---

### TC-04: Admin — Validation ค่าเครดิต

**วัตถุประสงค์:** ตรวจสอบว่า form validation ทำงานถูกต้อง

**ขั้นตอน:**
1. แก้ไขโรงแรม → ลอง set credit_days = 0 → บันทึก
2. ลอง set credit_days = 400 → บันทึก
3. ลอง set credit_cycle_day = 0 → บันทึก
4. ลอง set credit_cycle_day = 32 → บันทึก
5. Reset กลับเป็นค่าปกติ: credit_days = 30, credit_cycle_day = 15, credit_start_date = 2026-04-01

**ผลลัพธ์ที่คาดหวัง:**
- [ ] credit_days = 0 → validation error (min 1)
- [ ] credit_days = 400 → validation error (max 365)
- [ ] credit_cycle_day = 0 → validation error (min 1)
- [ ] credit_cycle_day = 32 → validation error (max 31)
- [ ] ค่าปกติ → บันทึกสำเร็จ

---

### TC-05: Hotel Dashboard — แสดง Credit Widget

**วัตถุประสงค์:** ตรวจสอบว่า Hotel Dashboard แสดง widget เครดิตถูกต้อง

**ขั้นตอน:**
1. Login Hotel app → http://localhost:3003/login
2. กรอก mazmakerv3.sup@gmail.com / Hotel123.
3. ดู Dashboard

**ผลลัพธ์ที่คาดหวัง:**
- [ ] แสดง widget "รอบเครดิต" ระหว่าง Stats Grid กับ Quick Action
- [ ] แสดง "30 วัน" (หรือค่าที่ตั้งไว้)
- [ ] แสดงช่วงเวลา เช่น "16 มี.ค. — 15 เม.ย."
- [ ] แสดง "เหลือ X วัน" พร้อมสีถูกต้อง
- [ ] สีเขียว ถ้าเหลือ >7 วัน

---

### TC-06: Hotel Dashboard — ไม่แสดง Widget ถ้าไม่ได้ตั้งค่า

**วัตถุประสงค์:** ตรวจสอบว่า widget ไม่แสดงถ้าโรงแรมไม่ได้ตั้งค่าเครดิต

**ขั้นตอน:**
1. Admin → แก้ไขโรงแรมอื่นที่ไม่ได้ตั้งค่า credit_start_date / credit_cycle_day
2. Login Hotel app ด้วยโรงแรมนั้น (ถ้ามี account)
3. หรือตรวจ DB ว่าโรงแรมที่ credit_start_date = NULL ไม่แสดง widget

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่แสดง Credit Widget ถ้า credit_start_date หรือ credit_cycle_day เป็น NULL

---

### TC-07: Admin — ปฏิทินเครดิต (Calendar View) — แสดงข้อมูล

**วัตถุประสงค์:** ตรวจสอบว่าหน้าปฏิทินเครดิตแสดงข้อมูลถูกต้อง

**ขั้นตอน:**
1. Login Admin → ไปเมนู "ปฏิทินเครดิต" http://localhost:3001/admin/credit-calendar
2. ตรวจสอบ layout

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Sidebar มีเมนู "ปฏิทินเครดิต" (หลัง "โรงแรม" ก่อน "การจอง")
- [ ] หัวข้อ "ปฏิทินเครดิต" + subtitle
- [ ] Summary stats 4 boxes: โรงแรมที่ตั้งค่า, ครบกำหนดเดือนนี้, เลยกำหนด, ยอดค้างรวม
- [ ] Calendar grid แสดงปฏิทินเดือนปัจจุบัน (format: ชื่อเดือน พ.ศ.)
- [ ] Legend: จ่ายแล้ว / ใกล้ครบกำหนด / เลยกำหนด
- [ ] Day headers: อา จ อ พ พฤ ศ ส

---

### TC-08: Admin — ปฏิทินเครดิต — Badge วันที่ครบกำหนด

**วัตถุประสงค์:** ตรวจสอบว่า badge โรงแรมแสดงในวันที่ถูกต้อง

**ขั้นตอน:**
1. จาก TC-07 → ดูปฏิทิน
2. หาวันที่ 15 (credit_cycle_day ที่ตั้งไว้)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] วันที่ 15 มี badge "โรงแรมดุสิต เชียงใหม่"
- [ ] Badge มีสีถูกต้อง (เขียว/เหลือง/แดง ตามสถานะ)
- [ ] วันอื่นที่ไม่มีโรงแรมครบกำหนด → ไม่มี badge

---

### TC-09: Admin — ปฏิทินเครดิต — คลิกวันที่ดู Modal

**วัตถุประสงค์:** ตรวจสอบ modal detail เมื่อคลิกวันที่

**ขั้นตอน:**
1. คลิกวันที่ 15 (ที่มี badge)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Modal แสดง: "วันที่ 15 [เดือน] [พ.ศ.]"
- [ ] แสดง "X โรงแรมครบกำหนด"
- [ ] รายชื่อโรงแรม: ชื่อไทย + อังกฤษ
- [ ] Status badge (จ่ายแล้ว / ใกล้ครบกำหนด / เลยกำหนด)
- [ ] ยอดค้างชำระ (฿ format)
- [ ] ปุ่ม "ดูบิล" → ลิงก์ไป /admin/hotels/{id}/billing
- [ ] ปุ่ม "ส่งอีเมล" → mailto link
- [ ] กดปิด modal (ปุ่ม X หรือคลิกนอก modal)

---

### TC-10: Admin — ปฏิทินเครดิต — เลื่อนเดือน

**วัตถุประสงค์:** ตรวจสอบ navigation เดือน

**ขั้นตอน:**
1. กดปุ่ม ">" (เดือนถัดไป) → ดูเดือนเปลี่ยน
2. กดปุ่ม "<" (เดือนก่อนหน้า) → กลับ
3. กดปุ่ม "วันนี้" → กลับเดือนปัจจุบัน

**ผลลัพธ์ที่คาดหวัง:**
- [ ] เดือนเปลี่ยนถูกต้อง (ชื่อเดือน + พ.ศ.)
- [ ] Badge โรงแรมยังแสดงถูกต้องในเดือนอื่น
- [ ] ปุ่ม "วันนี้" กลับเดือนปัจจุบัน

---

### TC-11: Cron — Credit Due Reminder (แจ้งเตือนล่วงหน้า 1 วัน)

**วัตถุประสงค์:** ตรวจสอบว่า cron ส่งแจ้งเตือนล่วงหน้า 1 วันก่อนครบกำหนด

**เตรียมข้อมูล:**
1. ใช้ Supabase MCP: `UPDATE hotels SET credit_cycle_day = [พรุ่งนี้] WHERE id = '43589021-...'`
2. ลบ notification เก่า: `DELETE FROM hotel_credit_notifications WHERE hotel_id = '43589021-...'`
3. ลบ notification เก่า: `DELETE FROM notifications WHERE type IN ('credit_due_reminder','credit_overdue')`

**ขั้นตอน:**
1. เพิ่ม dev endpoint ชั่วคราวใน index.ts (ถ้ายังไม่มี):
   ```
   app.post('/api/dev/trigger-credit-reminders', ...)
   ```
2. POST http://localhost:3000/api/dev/trigger-credit-reminders
3. ตรวจ server log
4. ตรวจ DB: `SELECT * FROM notifications WHERE type = 'credit_due_reminder'`
5. ตรวจ DB: `SELECT * FROM hotel_credit_notifications`

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Response: `{ success: true, remindersSent: 1 }`
- [ ] Server log: "📋 [CreditReminder] Found 1 hotel(s)"
- [ ] Server log: "📧 [CreditReminder] Email sent to mazmakerv3.sup@gmail.com"
- [ ] Server log: "✅ [CreditReminder] Processed โรงแรมดุสิต เชียงใหม่: credit_due_reminder"
- [ ] DB notifications: มี record สำหรับ hotel user + admin users
- [ ] DB hotel_credit_notifications: มี record channel = 'email' + 'in_app'

---

### TC-12: Cron — Duplicate Prevention (ไม่ส่งซ้ำ)

**วัตถุประสงค์:** ตรวจสอบว่า trigger ซ้ำไม่ส่ง notification ซ้ำ

**ขั้นตอน:**
1. POST http://localhost:3000/api/dev/trigger-credit-reminders อีกครั้ง (ไม่ลบ data)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Response: `{ success: true, remindersSent: 0 }`
- [ ] Server log: "⏭️ [CreditReminder] Already sent credit_due_reminder for โรงแรมดุสิต เชียงใหม่ today"

---

### TC-13: Cron — Credit Overdue (ครบกำหนดวันนี้)

**วัตถุประสงค์:** ตรวจสอบว่าส่ง notification เมื่อครบกำหนดวันนี้

**เตรียมข้อมูล:**
1. `UPDATE hotels SET credit_cycle_day = [วันนี้] WHERE id = '43589021-...'`
2. ลบ notification เก่า: `DELETE FROM hotel_credit_notifications WHERE hotel_id = '43589021-...'`
3. ลบ notification เก่า: `DELETE FROM notifications WHERE type IN ('credit_due_reminder','credit_overdue')`

**ขั้นตอน:**
1. POST http://localhost:3000/api/dev/trigger-credit-reminders

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Response: `{ success: true, remindersSent: 1 }`
- [ ] notification_type = 'credit_overdue'
- [ ] Email subject มี "🔴 ครบกำหนดชำระวันนี้"
- [ ] In-app title: "ครบกำหนดชำระเครดิตวันนี้"

---

### TC-14: In-app Notification — แสดงใน Hotel App

**วัตถุประสงค์:** ตรวจสอบว่า notification แสดงใน Hotel App

**ขั้นตอน:**
1. จาก TC-11 หรือ TC-13 (มี notification ใน DB แล้ว)
2. Login Hotel app → ไปหน้า Notifications

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Sidebar: เมนู "การแจ้งเตือน" มี badge ตัวเลข (unread count)
- [ ] หน้า Notifications: แสดงข้อความ "แจ้งเตือน: ครบกำหนดชำระเครดิตพรุ่งนี้" หรือ "ครบกำหนดชำระเครดิตวันนี้"
- [ ] ข้อความแสดงยอดค้างชำระ + วันที่

---

### TC-15: In-app Notification — แสดงใน Admin App

**วัตถุประสงค์:** ตรวจสอบว่า notification แสดงใน Admin App

**ขั้นตอน:**
1. Login Admin app
2. ตรวจ notification bell (มุมขวาบน) หรือตรวจ DB

**ผลลัพธ์ที่คาดหวัง:**
- [ ] DB: มี notifications record สำหรับ admin users (role = 'ADMIN')
- [ ] title มีชื่อโรงแรม + สถานะ

---

### TC-16: Email — ส่งแจ้งเตือนจริง

**วัตถุประสงค์:** ตรวจสอบว่า email ส่งจริงผ่าน Resend API

**ขั้นตอน:**
1. ตรวจ server log หลัง trigger cron
2. ดู email ที่ inbox ของ mazmakerv3.sup@gmail.com (ถ้า access ได้)

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Server log: "[Email] Sent successfully: {resend_id}"
- [ ] Email subject: "🟡 แจ้งเตือน: ครบกำหนดชำระพรุ่งนี้ — โรงแรมดุสิต เชียงใหม่"
- [ ] Email body: ชื่อโรงแรม, วันครบกำหนด, ตารางบิลค้างชำระ (ถ้ามี), ยอดค้างรวม

---

### TC-17: Admin Settings — Google Calendar Config

**วัตถุประสงค์:** ตรวจสอบว่า Admin สามารถ config Google Calendar ได้

**ขั้นตอน:**
1. Login Admin → Settings → tab "การชำระเงิน"
2. เลื่อนลงไปที่ section "Google Calendar (เครดิตโรงแรม)"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] มี section "Google Calendar (เครดิตโรงแรม)"
- [ ] มี Calendar ID input (มีค่ากรอกอยู่แล้ว)
- [ ] มี Service Account Key textarea (มีค่า base64 อยู่แล้ว)
- [ ] Status: "เชื่อมต่อแล้ว" (สีเขียว)

---

### TC-18: Admin Settings — ลบ Google Calendar Config

**วัตถุประสงค์:** ตรวจสอบว่าลบ config แล้ว status เปลี่ยน

**ขั้นตอน:**
1. ลบค่า Calendar ID → บันทึก
2. ดู status indicator

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Status เปลี่ยนเป็น "ยังไม่ได้เชื่อมต่อ" (สีเทา)
- [ ] กรอกค่ากลับ → status กลับเป็น "เชื่อมต่อแล้ว"

---

### TC-19: Cron — ไม่ส่งถ้าโรงแรม inactive

**วัตถุประสงค์:** ตรวจสอบว่าไม่ส่ง notification ให้โรงแรมที่ status ไม่ใช่ 'active'

**เตรียมข้อมูล:**
1. ตั้ง credit_cycle_day = พรุ่งนี้ ให้โรงแรมที่ status = 'pending' หรือ 'suspended'

**ขั้นตอน:**
1. POST trigger cron

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่นับโรงแรม inactive ในผลลัพธ์

---

### TC-20: Cron — โรงแรมไม่มี email

**วัตถุประสงค์:** ตรวจสอบว่าถ้าโรงแรมไม่มี email ก็ยังส่ง in-app notification ได้

**เตรียมข้อมูล (Supabase SQL):**
1. `UPDATE hotels SET email = NULL WHERE id = '43589021-...'`
2. ลบ notification เก่า
3. ตั้ง credit_cycle_day = พรุ่งนี้

**ขั้นตอน:**
1. POST trigger cron
2. ตรวจ log + DB

**ผลลัพธ์ที่คาดหวัง:**
- [ ] ไม่ส่ง email (ข้าม)
- [ ] ยังส่ง in-app notification
- [ ] remindersSent = 1

**Cleanup:**
- `UPDATE hotels SET email = 'mazmakerv3.sup@gmail.com' WHERE id = '43589021-...'`

---

### TC-21: ปฏิทินเครดิต — หลายโรงแรมครบกำหนดวันเดียวกัน

**วัตถุประสงค์:** ตรวจสอบว่าปฏิทินแสดงหลายโรงแรมในวันเดียวกัน

**เตรียมข้อมูล:**
1. ตั้ง credit_cycle_day = 15 ให้โรงแรม 2 แห่ง:
   ```sql
   UPDATE hotels SET credit_cycle_day = 15, credit_start_date = '2026-04-01', credit_days = 30
   WHERE id IN ('43589021-c3ff-46b5-9084-95d08b85a46e', '550e8400-e29b-41d4-a716-446655440003');
   ```

**ขั้นตอน:**
1. ไปหน้าปฏิทินเครดิต
2. ดูวันที่ 15

**ผลลัพธ์ที่คาดหวัง:**
- [ ] วันที่ 15 แสดง badge 2 โรงแรม
- [ ] คลิก → modal แสดง 2 โรงแรม
- [ ] Summary "ครบกำหนดเดือนนี้" = 2

**Cleanup:**
- Reset โรงแรมที่ 2: `UPDATE hotels SET credit_cycle_day = NULL, credit_start_date = NULL WHERE id = '550e8400-...'`

---

### TC-22: Credit Widget — สีตาม urgency

**วัตถุประสงค์:** ตรวจสอบว่าสีเปลี่ยนตามจำนวนวันที่เหลือ

**เตรียมข้อมูล + ทดสอบ 3 กรณี:**

**กรณี 1: เหลือ >7 วัน (เขียว)**
1. ตั้ง credit_cycle_day ให้ห่างจากวันนี้ >7 วัน
2. Login Hotel → ดู Dashboard → สีเขียว

**กรณี 2: เหลือ 2-7 วัน (เหลือง)**
1. ตั้ง credit_cycle_day ให้ห่างจากวันนี้ 3 วัน
2. Login Hotel → ดู Dashboard → สีเหลือง

**กรณี 3: เหลือ ≤1 วัน (แดง)**
1. ตั้ง credit_cycle_day = วันนี้ หรือ พรุ่งนี้
2. Login Hotel → ดู Dashboard → สีแดง + "กรุณาชำระเงิน"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] >7 วัน: พื้นหลังเขียว (bg-emerald-50)
- [ ] 2-7 วัน: พื้นหลังเหลือง (bg-amber-50)
- [ ] ≤1 วัน: พื้นหลังแดง (bg-red-50) + ข้อความ "กรุณาชำระเงิน"

---

### TC-23: Google Calendar — สร้าง Event (ถ้า configured)

**วัตถุประสงค์:** ตรวจสอบว่า Google Calendar event ถูกสร้างเมื่อ trigger cron

**เตรียมข้อมูล:**
1. ตรวจว่า Admin Settings มี Calendar ID + Service Account Key กรอกอยู่
2. ตั้ง credit_cycle_day = พรุ่งนี้
3. ลบ notification เก่า

**ขั้นตอน:**
1. POST trigger cron
2. ตรวจ server log
3. เปิด Google Calendar → ดูปฏิทิน "Bliss Credit Reminders"

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Server log: "[GoogleCalendar] Event created: credit-..."
- [ ] Google Calendar: มี event "💰 ครบกำหนดชำระ: โรงแรมดุสิต เชียงใหม่"
- [ ] Event time: 09:00-10:00 Bangkok
- [ ] Event description: ยอดค้างชำระ + bill info
- [ ] DB hotel_credit_notifications: channel = 'google_calendar', status = 'sent'

---

### TC-24: Regression — Login ทุก App ยังทำงานปกติ

**วัตถุประสงค์:** ตรวจสอบว่าการเปลี่ยนแปลงไม่ส่งผลกระทบต่อระบบเดิม

**ขั้นตอน:**
1. Login Admin app → ดู Dashboard
2. Login Hotel app → ดู Dashboard
3. ไปหน้า Hotels list
4. ดู Hotel Detail (ที่ไม่ได้ตั้งค่าเครดิต)
5. ดู Hotel Billing

**ผลลัพธ์ที่คาดหวัง:**
- [ ] Admin Dashboard โหลดปกติ
- [ ] Hotel Dashboard โหลดปกติ (ไม่ error แม้ไม่มี credit data)
- [ ] Hotels list แสดงครบ
- [ ] Hotel Detail แสดงปกติ (ไม่มี credit section ถ้าไม่ได้ตั้งค่า)
- [ ] Hotel Billing ทำงานปกติ

---

### TC-25: Cleanup — Reset ข้อมูลทดสอบ

**วัตถุประสงค์:** ทำความสะอาดข้อมูลทดสอบ

**ขั้นตอน (Supabase SQL):**
```sql
-- Reset credit settings ของโรงแรมดุสิต เชียงใหม่
UPDATE hotels SET credit_cycle_day = 15, credit_start_date = '2026-03-01', credit_days = 30
WHERE id = '43589021-c3ff-46b5-9084-95d08b85a46e';

-- ลบ dev endpoint ถ้ามี
-- (ตรวจ index.ts ว่าลบ /api/dev/trigger-credit-reminders แล้ว)

-- ลบ test notifications
DELETE FROM hotel_credit_notifications WHERE hotel_id = '43589021-c3ff-46b5-9084-95d08b85a46e';
DELETE FROM notifications WHERE type IN ('credit_due_reminder', 'credit_overdue');
```

---

## สรุป Test Cases

| # | หมวด | Test Case | Priority |
|---|------|-----------|----------|
| 01 | Admin Form | ตั้งค่าเครดิตโรงแรมใหม่ | HIGH |
| 02 | Admin Detail | ตรวจสอบข้อมูลเครดิตใน Hotel Detail | HIGH |
| 03 | Admin Form | แก้ไขรอบเครดิต | HIGH |
| 04 | Admin Form | Validation ค่าเครดิต | MEDIUM |
| 05 | Hotel Dashboard | แสดง Credit Widget | HIGH |
| 06 | Hotel Dashboard | ไม่แสดง Widget ถ้าไม่ตั้งค่า | MEDIUM |
| 07 | Calendar | ปฏิทินเครดิต — แสดงข้อมูล | HIGH |
| 08 | Calendar | Badge วันที่ครบกำหนด | HIGH |
| 09 | Calendar | คลิกวันที่ดู Modal | HIGH |
| 10 | Calendar | เลื่อนเดือน + ปุ่มวันนี้ | MEDIUM |
| 11 | Cron | Credit Due Reminder (ล่วงหน้า 1 วัน) | HIGH |
| 12 | Cron | Duplicate Prevention | HIGH |
| 13 | Cron | Credit Overdue (ครบกำหนดวันนี้) | HIGH |
| 14 | Notification | In-app แสดงใน Hotel App | HIGH |
| 15 | Notification | In-app แสดงใน Admin App | MEDIUM |
| 16 | Email | ส่งแจ้งเตือนจริง | HIGH |
| 17 | Settings | Google Calendar Config | MEDIUM |
| 18 | Settings | ลบ Google Calendar Config | LOW |
| 19 | Cron | ไม่ส่งถ้าโรงแรม inactive | MEDIUM |
| 20 | Cron | โรงแรมไม่มี email | MEDIUM |
| 21 | Calendar | หลายโรงแรมครบกำหนดวันเดียวกัน | MEDIUM |
| 22 | Widget | สีตาม urgency (3 กรณี) | HIGH |
| 23 | Google Calendar | สร้าง Event | MEDIUM |
| 24 | Regression | Login ทุก App ยังทำงานปกติ | HIGH |
| 25 | Cleanup | Reset ข้อมูลทดสอบ | — |
