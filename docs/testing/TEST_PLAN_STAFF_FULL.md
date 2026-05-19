# แผนทดสอบ: Staff App Full Test — ทดสอบทุกฟังก์ชัน Staff App ผ่าน UI ด้วย Playwright MCP

## Prompt สำหรับสั่ง Claude AI ทดสอบ

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home
อ่านไฟล์ docs/TEST_PLAN_STAFF_FULL.md แล้วทดสอบตาม Test Cases ทั้งหมด

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
| Admin | admintest@theblissathome.com | Admin@12345 | -- |
| Customer | mazmakerdesign@gmail.com | U9B*B2LE#8-q!m8 | วิชัย มีชัย |
| Hotel | reservations@hilton.com | Hotel123. | โรงแรมฮิลตัน กรุงเทพฯ |
| Staff | -- | -- | LINE LIFF auto-login ผ่าน tunnel -- แจ้งผู้ใช้ล็อกอินให้ |

---

## แผนการทดสอบ

### รอบที่ 1: ทดสอบบน Localhost
- ทดสอบทุก TC บน localhost
- ถ้า FAIL → แก้โค้ด → ทดสอบซ้ำจนผ่าน
- บันทึกผลลงตาราง

### รอบที่ 2: ทดสอบบน Production
- หลังจากรอบที่ 1 ผ่านทั้งหมด → commit + push + deploy
- ทดสอบทุก TC บน production
- บันทึกผลลงตาราง

---

## Test Cases

---

### MODULE 1: Authentication — LINE LIFF Login

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 1.01 | LINE LIFF Login สำเร็จ | เปิด tunnel URL ผ่าน LINE Browser → LIFF auto-login | เข้า Jobs Dashboard ได้, แสดงชื่อ Staff ถูกต้อง | HIGH |
| 1.02 | LIFF Callback Handler | Login สำเร็จ → ตรวจ URL | redirect จาก `/staff/login` ไปยัง `/staff/jobs` สำเร็จ, ไม่มี query params เหลือค้างใน URL | HIGH |
| 1.03 | LIFF Deep Link Redirect | เปิด LIFF ด้วย deep link เช่น `/staff/earnings` | หลัง login เสร็จ → redirect ไปยัง `/staff/earnings` ตาม deep link (ไม่ใช่ `/staff/jobs`) | HIGH |
| 1.04 | LIFF Deep Link ไม่ overwrite ค่าดี | เปิด LIFF ด้วย deep link `/staff/schedule` → LIFF reload ครั้งที่ 2 | ค่า deep link ใน localStorage ยังเป็น `/staff/schedule` (ไม่ถูก overwrite ด้วย `liff.state`) | MEDIUM |
| 1.05 | Session Persistence | Login สำเร็จ → ปิด LINE → เปิดใหม่ | ยังอยู่ใน Dashboard (ไม่ต้อง login ใหม่) | HIGH |
| 1.06 | Protected Route — ยังไม่ login | เปิด `/staff/jobs` โดยไม่ login (ผ่าน browser ปกติ) | redirect ไปหน้า `/staff/login` | HIGH |
| 1.07 | Protected Route — `/staff/earnings` | เปิด `/staff/earnings` โดยไม่ login | redirect ไปหน้า `/staff/login` | MEDIUM |
| 1.08 | Protected Route — `/staff/profile` | เปิด `/staff/profile` โดยไม่ login | redirect ไปหน้า `/staff/login` | MEDIUM |
| 1.09 | Logout สำเร็จ | ไปหน้า Settings → กดปุ่ม "ออกจากระบบ" → ยืนยัน | กลับหน้า login, session ถูกลบ | HIGH |
| 1.10 | Logout แล้วกดย้อนกลับ | Logout → กดปุ่ม back ของ browser | ไม่สามารถเข้าหน้า protected ได้, redirect กลับ login | MEDIUM |

---

### MODULE 2: Jobs Dashboard — แสดงข้อมูลหลัก

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 2.01 | Dashboard โหลดสำเร็จ | Login → ดู Jobs Dashboard | หน้าโหลดสำเร็จ, ไม่มี error, ไม่มี blank screen | HIGH |
| 2.02 | แสดงโปรไฟล์ Staff พร้อม stats | ดู header/profile section | แสดงชื่อ Staff, รูป, คะแนนเฉลี่ย, จำนวนงานที่ทำ | HIGH |
| 2.03 | แสดงรายการงานรอรับ (Pending) | ดู section งานรอรับ | แสดงรายการ pending jobs เรียงตามวันเวลา, แสดงชื่อบริการ/วัน/เวลา/สถานที่ | HIGH |
| 2.04 | ไม่มีงานรอรับ | กรณีไม่มี pending jobs | แสดง empty state "ยังไม่มีงานใหม่" | MEDIUM |
| 2.05 | Eligibility Check — Staff ยังไม่อนุมัติ | Staff ที่สถานะยังไม่ approved | แสดงข้อความแจ้งว่ายังไม่สามารถรับงานได้, ซ่อนปุ่มรับงาน | MEDIUM |

---

### MODULE 3: Jobs Dashboard — การจัดการงาน

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 3.01 | กดรับงาน (Accept Job) | ดู pending job → กดปุ่ม "รับงาน" | สถานะเปลี่ยนเป็น accepted, งานย้ายจาก pending ไป in-progress section | HIGH |
| 3.02 | งาน In-Progress แสดง timer | มี job ที่สถานะ in_progress | แสดง countdown timer, เวลาคงเหลือ, progress bar | HIGH |
| 3.03 | กดเสร็จงาน (Complete Job) | job in_progress → กดปุ่ม "เสร็จงาน" | สถานะเปลี่ยนเป็น completed, timer หยุด, งานย้ายไปประวัติ | HIGH |
| 3.04 | Extension Acceptance Card แสดง | มี extension request เข้ามา | แสดง ExtensionAcceptanceCard พร้อมรายละเอียด: บริการเพิ่ม/ราคา/ระยะเวลา | HIGH |
| 3.05 | ยืนยัน Extension | แสดง Extension Card → กดยืนยัน | Extension ถูกยืนยัน, timer อัปเดตเวลาใหม่ | HIGH |
| 3.06 | ปฏิเสธ Extension | แสดง Extension Card → กดปฏิเสธ | Extension ถูกปฏิเสธ, แจ้ง customer/hotel | MEDIUM |

---

### MODULE 4: Jobs Dashboard — เสียงและแจ้งเตือน

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 4.01 | Sound Notifications Toggle — เปิด | Settings → เปิดเสียงแจ้งเตือน → กลับ Dashboard | เมื่อมีงานใหม่เข้า → มีเสียงแจ้ง | MEDIUM |
| 4.02 | Sound Notifications Toggle — ปิด | Settings → ปิดเสียงแจ้งเตือน → กลับ Dashboard | เมื่อมีงานใหม่เข้า → ไม่มีเสียงแจ้ง | MEDIUM |
| 4.03 | Background Music | ตรวจสอบปุ่ม background music บน Dashboard | กดเปิด/ปิดเพลงพื้นหลังได้ | LOW |

---

### MODULE 5: Job Detail — แสดงข้อมูลงาน

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 5.01 | แสดงข้อมูลลูกค้า | กดเข้าดูรายละเอียดงาน | แสดงชื่อลูกค้า, เบอร์โทร, ข้อมูลติดต่อ | HIGH |
| 5.02 | แสดงที่อยู่/ห้อง | ดู section ที่อยู่ | แสดงที่อยู่ครบถ้วน (ถนน/แขวง/เขต/จังหวัด) หรือชื่อโรงแรม+เลขห้อง | HIGH |
| 5.03 | แสดงรายการบริการ | ดู section บริการ | แสดงรายการบริการทั้งหมดในงาน พร้อม duration ของแต่ละรายการ | HIGH |
| 5.04 | แสดงราคา | ดู section ราคา | แสดงราคาแต่ละรายการ + ยอดรวม + ส่วนแบ่ง Staff | HIGH |
| 5.05 | แสดง Extension Info | งานที่มี extension | แสดง ExtensionInfo: บริการเพิ่ม, ระยะเวลาเพิ่ม, ราคาเพิ่ม | MEDIUM |

---

### MODULE 6: Job Detail — Job Actions

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 6.01 | Accept จากหน้า Detail | เปิด pending job detail → กดรับงาน | สถานะเปลี่ยนเป็น accepted, ปุ่มเปลี่ยนเป็น "เริ่มงาน" | HIGH |
| 6.02 | Start จากหน้า Detail | เปิด accepted job detail → กดเริ่มงาน | สถานะเปลี่ยนเป็น in_progress, ServiceTimer เริ่มนับ | HIGH |
| 6.03 | Complete จากหน้า Detail | เปิด in_progress job detail → กดเสร็จงาน | สถานะเปลี่ยนเป็น completed, timer หยุด | HIGH |
| 6.04 | ServiceTimer — Countdown | job in_progress → ดู timer | timer นับถอยหลัง, แสดงชั่วโมง:นาที:วินาที | HIGH |
| 6.05 | ServiceTimer — สีเปลี่ยนตามเวลา | timer เหลือน้อย (<10 นาที) | สี timer เปลี่ยนจากเขียว → เหลือง → แดง ตามเวลาที่เหลือ | MEDIUM |
| 6.06 | ปุ่ม SOS | กดปุ่ม SOS | แสดง confirmation → ส่ง SOS alert สำเร็จ, แจ้ง Admin | HIGH |
| 6.07 | ปุ่ม SOS — ยกเลิก | กดปุ่ม SOS → กดยกเลิก | ไม่ส่ง SOS, กลับหน้าเดิม | MEDIUM |

---

### MODULE 7: Job Cancellation — ยกเลิกงาน

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 7.01 | ยกเลิกก่อนรับงาน (Pre-accept) | pending job → กดยกเลิก → เลือกเหตุผล → ยืนยัน | JobCancellationModal เปิด, เลือกเหตุผลได้, งานถูกยกเลิก, ระบบหา Staff ใหม่ | HIGH |
| 7.02 | ยกเลิกก่อนรับงาน — ไม่เลือกเหตุผล | pending job → กดยกเลิก → ไม่เลือกเหตุผล → กดยืนยัน | ปุ่มยืนยัน disabled หรือแสดง validation error "กรุณาเลือกเหตุผล" | HIGH |
| 7.03 | ยกเลิกก่อนรับงาน — กดปิด modal | pending job → กดยกเลิก → กดปิด (X) หรือกดนอก modal | modal ปิด, งานยังคงสถานะ pending | MEDIUM |
| 7.04 | ยกเลิกระหว่างให้บริการ (Mid-service) | in_progress job → กดยกเลิก → เลือกเหตุผล → ยืนยัน | MidServiceCancellationModal เปิด, เลือกเหตุผลได้, งานถูกยกเลิก, timer หยุด | HIGH |
| 7.05 | ยกเลิกระหว่างให้บริการ — ไม่เลือกเหตุผล | in_progress job → กดยกเลิก → ไม่เลือกเหตุผล → กดยืนยัน | ปุ่มยืนยัน disabled หรือแสดง validation error | HIGH |
| 7.06 | ยกเลิกระหว่างให้บริการ — Confirmation Dialog | in_progress job → กดยกเลิก → เลือกเหตุผล | แสดง confirmation dialog เตือนว่าการยกเลิกระหว่างงานจะส่งผลกระทบ | MEDIUM |
| 7.07 | ยกเลิกระหว่างให้บริการ — กดยกเลิก confirmation | Mid-service cancel → เลือกเหตุผล → confirmation → กดยกเลิก | modal ปิด, งานยังคงสถานะ in_progress, timer ยังทำงาน | MEDIUM |

---

### MODULE 8: Schedule — ตารางงาน

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 8.01 | หน้า Schedule โหลดสำเร็จ | กดเมนู "ตารางงาน" | หน้าโหลดสำเร็จ, แสดง calendar view | HIGH |
| 8.02 | Calendar Day View | เลือก view "วัน" | แสดงงานของวันที่เลือก เรียงตามเวลา | HIGH |
| 8.03 | Calendar Week View | เลือก view "สัปดาห์" | แสดง 7 วัน พร้อมงานแต่ละวัน | HIGH |
| 8.04 | Calendar Month View | เลือก view "เดือน" | แสดงปฏิทินรายเดือน มี badge จำนวนงานแต่ละวัน | HIGH |
| 8.05 | Filter สถานะ — ทั้งหมด | เลือก filter "ทั้งหมด" | แสดงงานทุกสถานะ | MEDIUM |
| 8.06 | Filter สถานะ — งานที่จะมาถึง | เลือก filter "งานที่จะมาถึง" | แสดงเฉพาะงาน upcoming (accepted/pending) | MEDIUM |
| 8.07 | Filter สถานะ — เสร็จแล้ว | เลือก filter "เสร็จแล้ว" | แสดงเฉพาะงาน completed | MEDIUM |
| 8.08 | Thai Date Labels | ดู calendar | วันที่แสดงเป็นภาษาไทย (จ. อ. พ. พฤ. ศ. ส. อา.) | MEDIUM |
| 8.09 | Navigate ไปช่วงก่อนหน้า | กดปุ่ม "<" หรือ "ก่อนหน้า" | calendar เลื่อนไปช่วงก่อนหน้า (วัน/สัปดาห์/เดือน ตาม view) | HIGH |
| 8.10 | Navigate ไปช่วงถัดไป | กดปุ่ม ">" หรือ "ถัดไป" | calendar เลื่อนไปช่วงถัดไป | HIGH |
| 8.11 | คลิกวันที่เพื่อดูงาน | คลิกวันที่ใน month view | แสดงรายการงานของวันนั้น | MEDIUM |
| 8.12 | Expand/Collapse วันที่ | คลิกวันที่ที่มีหลายงาน | งานขยาย/ยุบแสดงรายละเอียดได้ | LOW |

---

### MODULE 9: History — ประวัติงาน

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 9.01 | หน้า History โหลดสำเร็จ | กดเมนู "ประวัติงาน" | หน้าโหลดสำเร็จ, แสดงรายการงานที่ผ่านมา | HIGH |
| 9.02 | แสดงงาน Completed | ดูรายการ | แสดงงาน completed พร้อมชื่อบริการ/วันที่/ราคา/คะแนน | HIGH |
| 9.03 | แสดงงาน Cancelled | ดูรายการ | แสดงงาน cancelled พร้อมเหตุผลยกเลิก | HIGH |
| 9.04 | Filter ตามสถานะ — ทั้งหมด | เลือก filter "ทั้งหมด" | แสดงทั้ง completed และ cancelled | MEDIUM |
| 9.05 | Filter ตามสถานะ — เสร็จแล้ว | เลือก filter "เสร็จแล้ว" | แสดงเฉพาะ completed | MEDIUM |
| 9.06 | Filter ตามสถานะ — ยกเลิก | เลือก filter "ยกเลิก" | แสดงเฉพาะ cancelled | MEDIUM |
| 9.07 | Filter ตามเดือน | เลือกเดือนจาก dropdown | แสดงเฉพาะงานในเดือนที่เลือก | MEDIUM |
| 9.08 | Group by Date | ดูรายการงาน | งานจัดกลุ่มตามวันที่ มี header วันที่ (ภาษาไทย) | MEDIUM |
| 9.09 | Earnings Summary ต่องาน | ดูรายละเอียดงาน completed | แสดงรายได้ (staff earning) ของแต่ละงาน | HIGH |
| 9.10 | Monthly Totals | ดู summary ด้านบน | แสดงยอดรวมรายได้ประจำเดือน + จำนวนงาน | HIGH |

---

### MODULE 10: Earnings — รายได้

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 10.01 | หน้า Earnings โหลดสำเร็จ | กดเมนู "รายได้" | หน้าโหลดสำเร็จ, แสดง summary card | HIGH |
| 10.02 | Period Selector — วัน | เลือก "วัน" | แสดงรายได้ของวันที่เลือก | HIGH |
| 10.03 | Period Selector — สัปดาห์ | เลือก "สัปดาห์" | แสดงรายได้รวมของสัปดาห์ | HIGH |
| 10.04 | Period Selector — เดือน | เลือก "เดือน" | แสดงรายได้รวมของเดือน | HIGH |
| 10.05 | Date Navigation — ก่อนหน้า | กดปุ่ม "<" ไปช่วงก่อนหน้า | ข้อมูลอัปเดตตามช่วงเวลาใหม่ | HIGH |
| 10.06 | Date Navigation — ถัดไป | กดปุ่ม ">" ไปช่วงถัดไป | ข้อมูลอัปเดตตามช่วงเวลาใหม่ | HIGH |
| 10.07 | Earnings Summary Card — ยอดรวม | ดู summary card | แสดงรายได้รวม (total earnings) เป็นตัวเลข ไม่ใช่ NaN/undefined | HIGH |
| 10.08 | Earnings Summary Card — จำนวนงาน | ดู summary card | แสดงจำนวนงานที่ทำ (jobs count) | HIGH |
| 10.09 | Earnings Summary Card — ชั่วโมง | ดู summary card | แสดงจำนวนชั่วโมงทำงาน | MEDIUM |
| 10.10 | Earnings Summary Card — เฉลี่ยต่องาน | ดู summary card | แสดงรายได้เฉลี่ยต่องาน | MEDIUM |
| 10.11 | Earnings Summary Card — คะแนนเฉลี่ย | ดู summary card | แสดงคะแนนเฉลี่ยจากรีวิว | MEDIUM |
| 10.12 | Pending Payout Indicator | มียอดรอจ่าย | แสดง indicator "รอจ่าย" พร้อมยอดเงิน | MEDIUM |
| 10.13 | Daily Earnings Chart (Bar) | ดู chart รายวัน | แสดง bar chart รายได้แต่ละวัน (enhanced bar) | MEDIUM |
| 10.14 | Service Breakdown Chart (Pie) | ดู pie chart | แสดงสัดส่วนรายได้แยกตามประเภทบริการ | MEDIUM |
| 10.15 | Payout History Table — แสดงรายการ | ดูตาราง payout history | แสดงรายการ: วันที่จ่าย/จำนวนงาน/ยอดเงิน/สถานะ | HIGH |
| 10.16 | Payout History — Status Badges | ดูตาราง | แสดง badge สถานะ: pending (เหลือง), completed (เขียว), cancelled (แดง) | MEDIUM |
| 10.17 | Payout History — Transfer Ref Copy | มี payout completed → กดคัดลอก transfer ref | คัดลอก reference number ลง clipboard สำเร็จ | MEDIUM |
| 10.18 | Payout History — Slip Image | มี payout completed + มี slip | กดดูรูป slip → แสดงรูปภาพ transfer slip | LOW |
| 10.19 | Bank Account Link | กดลิงก์ "บัญชีธนาคาร" | navigate ไปหน้า Profile → Bank Accounts section | MEDIUM |
| 10.20 | ไม่มีข้อมูลรายได้ | Staff ใหม่ ยังไม่มีงาน | แสดง empty state "ยังไม่มีรายได้" | MEDIUM |

---

### MODULE 11: Profile — ข้อมูลส่วนตัว

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 11.01 | หน้า Profile โหลดสำเร็จ | กดเมนู "โปรไฟล์" | หน้าโหลดสำเร็จ, แสดงข้อมูลปัจจุบัน | HIGH |
| 11.02 | ดูข้อมูลส่วนตัว | ดู section ข้อมูลส่วนตัว | แสดงชื่อ, อีเมล, เบอร์โทร, ที่อยู่ | HIGH |
| 11.03 | แก้ไขชื่อ | กดแก้ไข → เปลี่ยนชื่อ → บันทึก | ชื่ออัปเดตสำเร็จ, แสดงชื่อใหม่ | HIGH |
| 11.04 | แก้ไขอีเมล | กดแก้ไข → เปลี่ยนอีเมล → บันทึก | อีเมลอัปเดตสำเร็จ | MEDIUM |
| 11.05 | แก้ไขเบอร์โทร | กดแก้ไข → เปลี่ยนเบอร์โทร → บันทึก | เบอร์โทรอัปเดตสำเร็จ | MEDIUM |
| 11.06 | แก้ไขที่อยู่ | กดแก้ไข → เปลี่ยนที่อยู่ → บันทึก | ที่อยู่อัปเดตสำเร็จ | MEDIUM |
| 11.07 | อัปโหลดรูปโปรไฟล์ | กดเปลี่ยนรูป → เลือกไฟล์ → อัปโหลด | รูปอัปเดตสำเร็จ, แสดงรูปใหม่ | HIGH |
| 11.08 | Validation — ชื่อว่าง | ลบชื่อทั้งหมด → กดบันทึก | แสดง validation error "กรุณากรอกชื่อ" | HIGH |
| 11.09 | Validation — อีเมลไม่ถูกรูปแบบ | กรอกอีเมล "abc" → กดบันทึก | แสดง validation error "รูปแบบอีเมลไม่ถูกต้อง" | HIGH |
| 11.10 | Validation — เบอร์โทรไม่ถูกรูปแบบ | กรอกเบอร์ "123" → กดบันทึก | แสดง validation error "เบอร์โทรไม่ถูกต้อง" | MEDIUM |
| 11.11 | กดยกเลิก (Cancel) | กดแก้ไข → เปลี่ยนข้อมูล → กดยกเลิก | ข้อมูลกลับเป็นค่าเดิม, ไม่บันทึก | MEDIUM |

---

### MODULE 12: Profile — บัญชีธนาคาร

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 12.01 | แสดงรายการบัญชี | ดู section บัญชีธนาคาร | แสดงรายการบัญชีทั้งหมด พร้อมชื่อธนาคาร/เลขบัญชี/ชื่อบัญชี | HIGH |
| 12.02 | เพิ่มบัญชีใหม่ — สำเร็จ | กดเพิ่มบัญชี → เลือกธนาคาร → กรอกเลขบัญชี → กรอกชื่อบัญชี → บันทึก | บัญชีใหม่ปรากฏในรายการ | HIGH |
| 12.03 | เพิ่มบัญชี — เลือกธนาคาร | กดเพิ่มบัญชี → ดู dropdown ธนาคาร | แสดง 13 ธนาคารไทย (กสิกร, กรุงเทพ, ไทยพาณิชย์, กรุงไทย ฯลฯ) | HIGH |
| 12.04 | เพิ่มบัญชี — ตั้งเป็นบัญชีหลัก | กดเพิ่มบัญชี → toggle "บัญชีหลัก" เปิด → บันทึก | บัญชีใหม่เป็นบัญชีหลัก, บัญชีเดิมที่เป็นหลักเปลี่ยนเป็นไม่หลัก | HIGH |
| 12.05 | Validation — ไม่เลือกธนาคาร | กรอกเลขบัญชี + ชื่อ แต่ไม่เลือกธนาคาร → กดบันทึก | แสดง validation error "กรุณาเลือกธนาคาร" | HIGH |
| 12.06 | Validation — เลขบัญชีว่าง | เลือกธนาคาร + ชื่อ แต่ไม่กรอกเลขบัญชี → กดบันทึก | แสดง validation error "กรุณากรอกเลขบัญชี" | HIGH |
| 12.07 | Validation — ชื่อบัญชีว่าง | เลือกธนาคาร + เลขบัญชี แต่ไม่กรอกชื่อ → กดบันทึก | แสดง validation error "กรุณากรอกชื่อบัญชี" | HIGH |
| 12.08 | แก้ไขบัญชี | กดแก้ไขบัญชีที่มีอยู่ → เปลี่ยนเลขบัญชี → บันทึก | เลขบัญชีอัปเดตสำเร็จ | HIGH |
| 12.09 | ลบบัญชี | กดลบบัญชี → ยืนยัน | บัญชีถูกลบ, หายจากรายการ | HIGH |
| 12.10 | ลบบัญชี — ยกเลิก | กดลบบัญชี → กดยกเลิก | บัญชียังคงอยู่ | MEDIUM |
| 12.11 | ตั้งบัญชีหลัก | มีหลายบัญชี → กดตั้งเป็นบัญชีหลัก | บัญชีที่เลือกเปลี่ยนเป็นหลัก, บัญชีเดิมเปลี่ยนเป็นไม่หลัก | HIGH |
| 12.12 | ไม่มีบัญชี | Staff ยังไม่เพิ่มบัญชี | แสดง empty state "ยังไม่มีบัญชีธนาคาร" + ปุ่มเพิ่ม | MEDIUM |

---

### MODULE 13: Profile — ทักษะ (Skills)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 13.01 | แสดงทักษะปัจจุบัน | ดู section ทักษะ | แสดงทักษะที่เลือกไว้ (massage/nail/spa) | HIGH |
| 13.02 | เลือกทักษะ — Massage | เลือก checkbox "นวด" → บันทึก | ทักษะ "นวด" ถูกบันทึก | HIGH |
| 13.03 | เลือกทักษะ — Nail | เลือก checkbox "ทำเล็บ" → บันทึก | ทักษะ "ทำเล็บ" ถูกบันทึก | MEDIUM |
| 13.04 | เลือกทักษะ — Spa | เลือก checkbox "สปา" → บันทึก | ทักษะ "สปา" ถูกบันทึก | MEDIUM |
| 13.05 | เลือกหลายทักษะ | เลือก massage + nail + spa → บันทึก | ทุกทักษะถูกบันทึก, refresh ยังคงอยู่ | HIGH |
| 13.06 | ยกเลิกทักษะ | uncheck ทักษะที่เลือกไว้ → บันทึก | ทักษะถูกลบออก | MEDIUM |

---

### MODULE 14: Profile — เอกสาร (Documents)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 14.01 | อัปโหลดเอกสาร — บัตรประชาชน | เลือกประเภท "บัตรประชาชน" → เลือกไฟล์ → อัปโหลด | เอกสารอัปโหลดสำเร็จ, สถานะ "รอตรวจ" (pending) | HIGH |
| 14.02 | อัปโหลดเอกสาร — เอกสารภาษี | เลือกประเภท "เอกสารภาษี" → เลือกไฟล์ → อัปโหลด | เอกสารอัปโหลดสำเร็จ | MEDIUM |
| 14.03 | อัปโหลดเอกสาร — ใบประกอบวิชาชีพ | เลือกประเภท "ใบประกอบวิชาชีพ" → เลือกไฟล์ → อัปโหลด | เอกสารอัปโหลดสำเร็จ | MEDIUM |
| 14.04 | ดูเอกสาร | กดดูเอกสารที่อัปโหลดแล้ว | แสดงรูปภาพ/ไฟล์เอกสาร | HIGH |
| 14.05 | สถานะเอกสาร — Pending | อัปโหลดเอกสารใหม่ | แสดง badge "รอตรวจ" (สีเหลือง) | MEDIUM |
| 14.06 | สถานะเอกสาร — Approved | เอกสารที่ Admin อนุมัติแล้ว | แสดง badge "อนุมัติ" (สีเขียว) | MEDIUM |
| 14.07 | สถานะเอกสาร — Rejected | เอกสารที่ Admin ปฏิเสธ | แสดง badge "ปฏิเสธ" (สีแดง) | MEDIUM |
| 14.08 | ลบเอกสาร | กดลบเอกสาร → ยืนยัน | เอกสารถูกลบ, หายจากรายการ | MEDIUM |

---

### MODULE 15: Profile — พื้นที่ให้บริการ (Service Areas)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 15.01 | แสดงพื้นที่ให้บริการปัจจุบัน | ดู section พื้นที่ให้บริการ | แสดงรายการพื้นที่ที่เลือกไว้ | HIGH |
| 15.02 | เพิ่มพื้นที่ให้บริการ | เลือกพื้นที่เพิ่ม → บันทึก | พื้นที่ใหม่ปรากฏในรายการ | HIGH |
| 15.03 | ลบพื้นที่ให้บริการ | ลบพื้นที่ออก → บันทึก | พื้นที่ถูกลบออก | MEDIUM |
| 15.04 | บันทึกแล้ว refresh | แก้ไขพื้นที่ → บันทึก → refresh หน้า | ค่ายังคงอยู่ตามที่บันทึก | MEDIUM |

---

### MODULE 16: Profile — ผู้ติดต่อฉุกเฉิน (Emergency Contact)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 16.01 | เพิ่มผู้ติดต่อฉุกเฉิน | กรอกชื่อ + ความสัมพันธ์ + เบอร์โทร → บันทึก | ข้อมูลผู้ติดต่อฉุกเฉินถูกบันทึก | HIGH |
| 16.02 | แก้ไขผู้ติดต่อฉุกเฉิน | เปลี่ยนเบอร์โทร → บันทึก | เบอร์โทรอัปเดตสำเร็จ | MEDIUM |
| 16.03 | Validation — ชื่อว่าง | ไม่กรอกชื่อ → บันทึก | แสดง validation error | MEDIUM |
| 16.04 | Validation — เบอร์โทรว่าง | ไม่กรอกเบอร์โทร → บันทึก | แสดง validation error | MEDIUM |

---

### MODULE 17: Settings — ตั้งค่า

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 17.01 | หน้า Settings โหลดสำเร็จ | กดเมนู "ตั้งค่า" | หน้าโหลดสำเร็จ, แสดงตัวเลือกทั้งหมด | HIGH |
| 17.02 | Sound Notifications — เปิด | toggle เสียงแจ้งเตือนเป็น "เปิด" | ค่าบันทึก, refresh ยังเป็น "เปิด" | HIGH |
| 17.03 | Sound Notifications — ปิด | toggle เสียงแจ้งเตือนเป็น "ปิด" | ค่าบันทึก, refresh ยังเป็น "ปิด" | HIGH |
| 17.04 | Push Notifications — เปิด | toggle push notifications เป็น "เปิด" | ค่าบันทึก | MEDIUM |
| 17.05 | Push Notifications — ปิด | toggle push notifications เป็น "ปิด" | ค่าบันทึก | MEDIUM |
| 17.06 | Job Reminders — 60 นาที | เลือกเตือนก่อน "60 นาที" | ค่าบันทึก, ระบบจะเตือนก่อนงาน 60 นาที | MEDIUM |
| 17.07 | Job Reminders — 120 นาที | เลือกเตือนก่อน "120 นาที" | ค่าบันทึก, ระบบจะเตือนก่อนงาน 120 นาที | MEDIUM |
| 17.08 | Logout พร้อม Confirmation | กดปุ่ม "ออกจากระบบ" | แสดง confirmation dialog "คุณต้องการออกจากระบบหรือไม่?" | HIGH |
| 17.09 | Logout — ยืนยัน | กด "ออกจากระบบ" → กดยืนยัน | ออกจากระบบ, กลับหน้า login | HIGH |
| 17.10 | Logout — ยกเลิก | กด "ออกจากระบบ" → กดยกเลิก | ยังอยู่หน้า Settings | MEDIUM |

---

### MODULE 18: Notifications — แจ้งเตือน

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 18.01 | เปิด Notification Panel | กดปุ่ม/icon แจ้งเตือน | แสดง NotificationPanel พร้อมรายการแจ้งเตือน | HIGH |
| 18.02 | แสดง New Job Alert | มี job ใหม่ assign มา | แสดงแจ้งเตือน "คุณมีงานใหม่" พร้อมรายละเอียดบริการ/วัน/เวลา | HIGH |
| 18.03 | แสดง System Message | มีข้อความจากระบบ | แสดงข้อความระบบในรายการ | MEDIUM |
| 18.04 | Real-time Notification | มีแจ้งเตือนใหม่ขณะเปิดหน้า | แจ้งเตือนปรากฏทันทีโดยไม่ต้อง refresh (real-time via Supabase) | HIGH |
| 18.05 | Unread Badge | มี notification ยังไม่ได้อ่าน | แสดง badge จำนวนที่ยังไม่อ่านบน icon | MEDIUM |
| 18.06 | ไม่มีแจ้งเตือน | ไม่มี notification | แสดง empty state "ยังไม่มีแจ้งเตือน" | LOW |

---

### MODULE 19: [PASS] Payout Schedule — Staff UI (ทดสอบ 2026-04-03, 106/108 TC PASS)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority | ผล |
|----|-----------|---------|-------------|----------|-----|
| ✅ 19.01 | แสดง Section รอบการรับเงิน | ไปหน้า Settings | แสดง section "รอบการรับเงิน" พร้อม radio buttons | HIGH | PASS |
| ✅ 19.02 | เลือกรอบ "ครึ่งเดือน" (Bi-monthly) | เลือก radio "ครึ่งเดือน" → บันทึก | ค่าบันทึกสำเร็จ, refresh ยังเป็น "ครึ่งเดือน" | HIGH | PASS |
| ✅ 19.03 | เลือกรอบ "รายเดือน" (Monthly) | เลือก radio "รายเดือน" → บันทึก | ค่าบันทึกสำเร็จ, refresh ยังเป็น "รายเดือน" | HIGH | PASS |
| ✅ 19.04 | Default เป็น Monthly | Staff ใหม่ที่ยังไม่เคยเลือก | ค่า default เป็น "รายเดือน" | HIGH | PASS |
| ✅ 19.05 | แสดงวันตัดรอบถัดไป | เลือกรอบแล้วดู section "รอบถัดไป" | แสดงวันตัดรอบถูกต้อง (เช่น "ตัดรอบ: 25 เม.ย. 2569") | HIGH | PASS |
| ✅ 19.06 | แสดงวันรับเงินถัดไป | เลือกรอบแล้วดู section "รอบถัดไป" | แสดงวันรับเงินถูกต้อง (เช่น "รับเงิน: 1 พ.ค. 2569") | HIGH | PASS |
| ✅ 19.07 | แสดงยอดสะสม (Accumulated Earnings) | ดู section "รอบถัดไป" | แสดงยอดสะสมปัจจุบัน (เช่น "ยอดสะสม: 2,400") | HIGH | PASS |
| ✅ 19.08 | เปลี่ยนรอบ — อัปเดตข้อมูลรอบถัดไป | เปลี่ยนจาก "รายเดือน" → "ครึ่งเดือน" | วันตัดรอบ/วันรับเงินอัปเดตทันที ตามรอบใหม่ | MEDIUM | PASS |
| ✅ 19.09 | DB Persistence | เลือกรอบ → บันทึก → ตรวจ DB | `staff.payout_schedule` อัปเดตถูกต้อง ('bi-monthly' หรือ 'monthly') | HIGH | PASS |

---

### MODULE 20: [PASS] Payout Schedule — Cron Job ตัดรอบ (ทดสอบ 2026-04-03)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority | ผล |
|----|-----------|---------|-------------|----------|-----|
| ✅ 20.01 | ตัดรอบงวดแรก (Mid-month) วันที่ 10 | Trigger cron ในวันที่ 10 | ดึง Staff bi-monthly, คำนวณรายได้ 26-10, จ่ายวันที่ 16 | HIGH | PASS |
| ✅ 20.02 | สร้าง Payout — Bi-monthly Only | Staff bi-monthly มีรายได้ >= ขั้นต่ำ | สร้าง payout (status=pending, round=mid-month) | HIGH | PASS |
| ✅ 20.03 | Monthly Staff ไม่ถูกตัดรอบงวดแรก | Staff monthly + trigger cron วันที่ 10 | ไม่สร้าง payout | HIGH | PASS |
| ✅ 20.04 | ตัดรอบงวดหลัง (End-month) วันที่ 25 | Trigger cron ในวันที่ 25 | ดึง Staff ทุกคน, คำนวณรายได้, จ่าย 1 เดือนถัดไป | HIGH | PASS |
| ✅ 20.05 | สร้าง Payout ทุกคน (End-month) | Staff ทุกคนมีรายได้ >= ขั้นต่ำ | สร้าง payout (status=pending, round=end-month) | HIGH | PASS |
| ✅ 20.06 | Bi-monthly End-month นับ 11-25 | Staff bi-monthly + end-month | คำนวณเฉพาะ 11-25 ไม่นับซ้ำ | HIGH | PASS |
| ✅ 20.07 | Monthly End-month นับ 26-25 | Staff monthly + end-month | คำนวณ 26 เดือนก่อน ถึง 25 | HIGH | PASS |
| ✅ 20.08 | Carry Forward — ยอดต่ำกว่าขั้นต่ำ | Staff รายได้ ฿50 (ขั้นต่ำ ฿100) | ไม่สร้าง payout, ยกยอดไปรอบถัดไป | HIGH | PASS |
| ✅ 20.09 | Carry Forward — ยอดรวมถึงขั้นต่ำ | carry ฿200 + ฿300 = ฿500 >= ฿500 | สร้าง payout, carry_forward_amount=200, is_carry_forward=true | HIGH | PASS |
| ✅ 20.10 | Carry Forward — 3 รอบต่อเนื่อง | carry ข้าม 3 รอบ (เม.ย.→พ.ค.) | ยอดสะสมถูกต้อง, ไม่ error | MEDIUM | PASS |
| ✅ 20.11 | Duplicate Prevention — ไม่สร้างซ้ำ | Trigger cron ซ้ำวันเดียวกัน | payoutsCreated=0 | HIGH | PASS |

---

### MODULE 21: [PASS] Payout Schedule — Notifications (ทดสอบ 2026-04-03)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority | ผล |
|----|-----------|---------|-------------|----------|-----|
| ✅ 21.01 | แจ้ง Staff ล่วงหน้า 1 วัน (วันที่ 9) | Trigger cron วันที่ 9 | Staff bi-monthly ได้ notification | HIGH | PASS |
| ✅ 21.02 | แจ้ง Admin ล่วงหน้า 1 วัน (วันที่ 9) | Trigger cron วันที่ 9 | Admin ได้ "Staff X คน" | HIGH | PASS |
| ✅ 21.03 | แจ้ง Staff ล่วงหน้า 1 วัน (วันที่ 24) | Trigger cron วันที่ 24 | Staff ทุกคนได้ notification | HIGH | PASS |
| ✅ 21.04 | แจ้ง Admin ล่วงหน้า 1 วัน (วันที่ 24) | Trigger cron วันที่ 24 | Admin ได้ notification | HIGH | PASS |
| ✅ 21.05 | แจ้ง Admin ก่อนจ่ายเงินงวดแรก (วันที่ 15) | Trigger cron วันที่ 15 | Admin ได้ "Staff 1 คน ยอดรวม ฿1,500" | HIGH | PASS |
| ✅ 21.06 | แจ้ง Admin ก่อนจ่ายเงินงวดหลัง (วันสิ้นเดือน) | Trigger cron วันสิ้นเดือน | Admin ได้ notification | HIGH | PASS |
| ✅ 21.07 | แจ้ง Carry Forward | ตัดรอบ + ยอดต่ำกว่าขั้นต่ำ | Staff ได้ "ยอดรายได้ ฿50 ต่ำกว่าขั้นต่ำ" | MEDIUM | PASS |
| ✅ 21.08 | แจ้ง Payout Completed + LINE | Admin จ่ายเงิน | Staff ได้ in-app + LINE notification | HIGH | PASS |
| ✅ 21.09 | Duplicate Prevention — ไม่แจ้งซ้ำ | Trigger cron ซ้ำ | notificationsSent=0 | HIGH | PASS |

---

### MODULE 22: [PASS] Payout Schedule — Admin Dashboard (ทดสอบ 2026-04-03)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority | ผล |
|----|-----------|---------|-------------|----------|-----|
| ✅ 22.01 | หน้า Payout Dashboard โหลดสำเร็จ | Admin → เมนู "รอบจ่ายเงิน" | หน้าโหลดสำเร็จ | HIGH | PASS |
| ✅ 22.02 | Stats — Staff ทั้งหมด | ดู stats box | ตัวเลขถูกต้อง | HIGH | PASS |
| ✅ 22.03 | Stats — ครบกำหนดรอบนี้ | ดู stats box | ตัวเลขถูกต้อง | HIGH | PASS |
| ✅ 22.04 | Stats — ยอดรวมรอจ่าย | ดู stats box | ฿ format ถูกต้อง | HIGH | PASS |
| ✅ 22.05 | Stats — ยกยอด | ดู stats box | นับจาก payout_notifications ถูกต้อง | MEDIUM | PASS |
| ✅ 22.06 | ตาราง Staff + สถานะยกยอด/ยังไม่ถึงรอบ | ดูตาราง | แสดง payout records + virtual rows (ยกยอด สีส้ม, ยังไม่ถึงรอบ สีเทา) | HIGH | PASS |
| ✅ 22.07 | Filter — รอบ | เลือก "งวดแรก" | แสดงเฉพาะ mid-month | MEDIUM | PASS |
| ✅ 22.08 | Filter — เดือน | เลือกเดือน | แสดงเฉพาะเดือนนั้น | MEDIUM | PASS |
| ✅ 22.09 | Filter — สถานะ (รวมยกยอด/ยังไม่ถึงรอบ) | เลือก "รอจ่าย" | แสดงเฉพาะ pending | MEDIUM | PASS |
| ✅ 22.10 | จ่ายเงิน Staff เดี่ยว | กดปุ่ม "จ่าย" + กรอก ref + ยืนยัน | status=completed + in-app + LINE notification | HIGH | PASS |
| ✅ 22.11 | Batch Payout — เลือกหลายคน | เลือก checkbox 2 คน → "จ่ายเงินที่เลือก (2)" | modal แสดงจำนวน + ยอดรวม | HIGH | PASS |
| ✅ 22.12 | Batch Payout — ยืนยัน | กรอก ref → ยืนยัน | ทุกคน completed + notification | HIGH | PASS |
| ✅ 22.13 | Batch Payout — validation (ไม่กรอก ref) | ref ว่าง | ปุ่มยืนยัน disabled | MEDIUM | PASS |
| ✅ 22.14 | Export CSV | กด "Export CSV" | ดาวน์โหลดไฟล์ CSV | MEDIUM | PASS |
| ✅ 22.15 | Bank Account Warning | Staff ไม่มี bank | แสดง "ยังไม่มีบัญชีธนาคาร" สีแดง | MEDIUM | PASS |

---

### MODULE 23: [PASS] Payout Schedule — Admin Settings (ทดสอบ 2026-04-03)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority | ผล |
|----|-----------|---------|-------------|----------|-----|
| ✅ 23.01 | แสดง Tab รอบจ่ายเงิน Staff | Admin → Settings → tab | แสดง settings ครบ | HIGH | PASS |
| ✅ 23.02 | แก้ยอดขั้นต่ำ — บันทึก | เปลี่ยนเป็น 200 → บันทึก → refresh | ค่ายังเป็น 200 | HIGH | PASS |
| ✅ 23.03 | Validation — ค่า 0 | กรอก 0 → บันทึก | "ต้องเป็นตัวเลข 1-28" | MEDIUM | PASS |
| ✅ 23.04 | Validation — ค่าลบ | กรอก -5 → บันทึก | validation catch | MEDIUM | PASS |
| ✅ 23.05 | แก้วันตัดรอบงวดแรก | เปลี่ยนเป็น 12 → บันทึก → refresh | ค่ายังเป็น 12 | MEDIUM | PASS |
| ✅ 23.06 | แก้วันตัดรอบงวดหลัง | เปลี่ยนเป็น 23 → บันทึก | ค่าบันทึกสำเร็จ | MEDIUM | PASS |
| ✅ 23.07 | Cron ใช้ค่าจาก Settings | แก้ค่า → trigger cron | ใช้ค่าจาก DB ไม่ hardcode | HIGH | PASS |
| ✅ 23.08 | เปิด/ปิดยกยอดข้ามรอบ | toggle ปิด → บันทึก → carry_forward_enabled=false → จ่ายทุกยอด | ค่าบันทึก + cron ทำงานถูก | MEDIUM | PASS |

---

## สรุปจำนวน Test Cases

| Module | หมวด | จำนวน TC |
|--------|------|----------|
| 1 | Authentication (LINE LIFF) | 10 |
| 2 | Jobs Dashboard — แสดงข้อมูล | 5 |
| 3 | Jobs Dashboard — จัดการงาน | 6 |
| 4 | Jobs Dashboard — เสียง/แจ้งเตือน | 3 |
| 5 | Job Detail — แสดงข้อมูล | 5 |
| 6 | Job Detail — Job Actions | 7 |
| 7 | Job Cancellation | 7 |
| 8 | Schedule | 12 |
| 9 | History | 10 |
| 10 | Earnings | 20 |
| 11 | Profile — ข้อมูลส่วนตัว | 11 |
| 12 | Profile — บัญชีธนาคาร | 12 |
| 13 | Profile — ทักษะ | 6 |
| 14 | Profile — เอกสาร | 8 |
| 15 | Profile — พื้นที่ให้บริการ | 4 |
| 16 | Profile — ผู้ติดต่อฉุกเฉิน | 4 |
| 17 | Settings | 10 |
| 18 | Notifications | 6 |
| 19 | [PLANNED] Payout Schedule — Staff UI | 9 |
| 20 | [PLANNED] Payout Schedule — Cron | 11 |
| 21 | [PLANNED] Payout Schedule — Notifications | 7 |
| 22 | [PLANNED] Payout Schedule — Admin Dashboard | 15 |
| 23 | [PLANNED] Payout Schedule — Admin Settings | 8 |
| **รวม** | | **196 TC** |

---

## ตารางสรุปผลการทดสอบ

### รอบที่ 1: Localhost

| TC | Test Case | ผล | หมายเหตุ |
|----|-----------|-----|---------|
| 1.01 | LINE LIFF Login สำเร็จ | | |
| 1.02 | LIFF Callback Handler | | |
| 1.03 | LIFF Deep Link Redirect | | |
| 1.04 | LIFF Deep Link ไม่ overwrite | | |
| 1.05 | Session Persistence | | |
| 1.06 | Protected Route — ยังไม่ login | | |
| 1.07 | Protected Route — earnings | | |
| 1.08 | Protected Route — profile | | |
| 1.09 | Logout สำเร็จ | | |
| 1.10 | Logout แล้วกดย้อนกลับ | | |
| 2.01 | Dashboard โหลดสำเร็จ | | |
| 2.02 | แสดงโปรไฟล์ Staff พร้อม stats | | |
| 2.03 | แสดงรายการงานรอรับ | | |
| 2.04 | ไม่มีงานรอรับ | | |
| 2.05 | Eligibility Check | | |
| 3.01 | กดรับงาน | | |
| 3.02 | งาน In-Progress แสดง timer | | |
| 3.03 | กดเสร็จงาน | | |
| 3.04 | Extension Acceptance Card | | |
| 3.05 | ยืนยัน Extension | | |
| 3.06 | ปฏิเสธ Extension | | |
| 4.01 | Sound ON | | |
| 4.02 | Sound OFF | | |
| 4.03 | Background Music | | |
| 5.01 | แสดงข้อมูลลูกค้า | | |
| 5.02 | แสดงที่อยู่/ห้อง | | |
| 5.03 | แสดงรายการบริการ | | |
| 5.04 | แสดงราคา | | |
| 5.05 | แสดง Extension Info | | |
| 6.01 | Accept จากหน้า Detail | | |
| 6.02 | Start จากหน้า Detail | | |
| 6.03 | Complete จากหน้า Detail | | |
| 6.04 | ServiceTimer Countdown | | |
| 6.05 | ServiceTimer สีเปลี่ยน | | |
| 6.06 | ปุ่ม SOS | | |
| 6.07 | ปุ่ม SOS — ยกเลิก | | |
| 7.01 | ยกเลิกก่อนรับงาน | | |
| 7.02 | ยกเลิก — ไม่เลือกเหตุผล | | |
| 7.03 | ยกเลิก — กดปิด modal | | |
| 7.04 | ยกเลิกระหว่างให้บริการ | | |
| 7.05 | Mid-service ไม่เลือกเหตุผล | | |
| 7.06 | Mid-service Confirmation | | |
| 7.07 | Mid-service กดยกเลิก confirm | | |
| 8.01 | Schedule โหลดสำเร็จ | | |
| 8.02 | Day View | | |
| 8.03 | Week View | | |
| 8.04 | Month View | | |
| 8.05 | Filter ทั้งหมด | | |
| 8.06 | Filter งานที่จะมาถึง | | |
| 8.07 | Filter เสร็จแล้ว | | |
| 8.08 | Thai Date Labels | | |
| 8.09 | Navigate ก่อนหน้า | | |
| 8.10 | Navigate ถัดไป | | |
| 8.11 | คลิกวันที่ดูงาน | | |
| 8.12 | Expand/Collapse | | |
| 9.01 | History โหลดสำเร็จ | | |
| 9.02 | แสดงงาน Completed | | |
| 9.03 | แสดงงาน Cancelled | | |
| 9.04 | Filter ทั้งหมด | | |
| 9.05 | Filter เสร็จแล้ว | | |
| 9.06 | Filter ยกเลิก | | |
| 9.07 | Filter ตามเดือน | | |
| 9.08 | Group by Date | | |
| 9.09 | Earnings Summary ต่องาน | | |
| 9.10 | Monthly Totals | | |
| 10.01 | Earnings โหลดสำเร็จ | | |
| 10.02 | Period — วัน | | |
| 10.03 | Period — สัปดาห์ | | |
| 10.04 | Period — เดือน | | |
| 10.05 | Date Nav ก่อนหน้า | | |
| 10.06 | Date Nav ถัดไป | | |
| 10.07 | Summary — ยอดรวม | | |
| 10.08 | Summary — จำนวนงาน | | |
| 10.09 | Summary — ชั่วโมง | | |
| 10.10 | Summary — เฉลี่ยต่องาน | | |
| 10.11 | Summary — คะแนนเฉลี่ย | | |
| 10.12 | Pending Payout Indicator | | |
| 10.13 | Daily Earnings Chart | | |
| 10.14 | Service Breakdown Chart | | |
| 10.15 | Payout History Table | | |
| 10.16 | Payout Status Badges | | |
| 10.17 | Transfer Ref Copy | | |
| 10.18 | Slip Image | | |
| 10.19 | Bank Account Link | | |
| 10.20 | ไม่มีข้อมูลรายได้ | | |
| 11.01 | Profile โหลดสำเร็จ | | |
| 11.02 | ดูข้อมูลส่วนตัว | | |
| 11.03 | แก้ไขชื่อ | | |
| 11.04 | แก้ไขอีเมล | | |
| 11.05 | แก้ไขเบอร์โทร | | |
| 11.06 | แก้ไขที่อยู่ | | |
| 11.07 | อัปโหลดรูปโปรไฟล์ | | |
| 11.08 | Validation ชื่อว่าง | | |
| 11.09 | Validation อีเมลผิด | | |
| 11.10 | Validation เบอร์โทรผิด | | |
| 11.11 | กดยกเลิก | | |
| 12.01 | แสดงรายการบัญชี | | |
| 12.02 | เพิ่มบัญชีใหม่ | | |
| 12.03 | เลือกธนาคาร 13 แห่ง | | |
| 12.04 | ตั้งบัญชีหลัก (เพิ่มใหม่) | | |
| 12.05 | Validation ไม่เลือกธนาคาร | | |
| 12.06 | Validation เลขบัญชีว่าง | | |
| 12.07 | Validation ชื่อบัญชีว่าง | | |
| 12.08 | แก้ไขบัญชี | | |
| 12.09 | ลบบัญชี | | |
| 12.10 | ลบบัญชี — ยกเลิก | | |
| 12.11 | ตั้งบัญชีหลัก | | |
| 12.12 | ไม่มีบัญชี | | |
| 13.01 | แสดงทักษะปัจจุบัน | | |
| 13.02 | เลือก Massage | | |
| 13.03 | เลือก Nail | | |
| 13.04 | เลือก Spa | | |
| 13.05 | เลือกหลายทักษะ | | |
| 13.06 | ยกเลิกทักษะ | | |
| 14.01 | อัปโหลด บัตรประชาชน | | |
| 14.02 | อัปโหลด เอกสารภาษี | | |
| 14.03 | อัปโหลด ใบประกอบวิชาชีพ | | |
| 14.04 | ดูเอกสาร | | |
| 14.05 | สถานะ Pending | | |
| 14.06 | สถานะ Approved | | |
| 14.07 | สถานะ Rejected | | |
| 14.08 | ลบเอกสาร | | |
| 15.01 | แสดงพื้นที่ปัจจุบัน | | |
| 15.02 | เพิ่มพื้นที่ | | |
| 15.03 | ลบพื้นที่ | | |
| 15.04 | บันทึกแล้ว refresh | | |
| 16.01 | เพิ่มผู้ติดต่อฉุกเฉิน | | |
| 16.02 | แก้ไขผู้ติดต่อฉุกเฉิน | | |
| 16.03 | Validation ชื่อว่าง | | |
| 16.04 | Validation เบอร์โทรว่าง | | |
| 17.01 | Settings โหลดสำเร็จ | | |
| 17.02 | Sound ON | | |
| 17.03 | Sound OFF | | |
| 17.04 | Push ON | | |
| 17.05 | Push OFF | | |
| 17.06 | Reminders 60 นาที | | |
| 17.07 | Reminders 120 นาที | | |
| 17.08 | Logout Confirmation | | |
| 17.09 | Logout ยืนยัน | | |
| 17.10 | Logout ยกเลิก | | |
| 18.01 | Notification Panel | | |
| 18.02 | New Job Alert | | |
| 18.03 | System Message | | |
| 18.04 | Real-time Notification | | |
| 18.05 | Unread Badge | | |
| 18.06 | ไม่มีแจ้งเตือน | | |
| [PLANNED] 19.01 | Section รอบการรับเงิน | | |
| [PLANNED] 19.02 | เลือกครึ่งเดือน | | |
| [PLANNED] 19.03 | เลือกรายเดือน | | |
| [PLANNED] 19.04 | Default Monthly | | |
| [PLANNED] 19.05 | วันตัดรอบถัดไป | | |
| [PLANNED] 19.06 | วันรับเงินถัดไป | | |
| [PLANNED] 19.07 | ยอดสะสม | | |
| [PLANNED] 19.08 | เปลี่ยนรอบ อัปเดตข้อมูล | | |
| [PLANNED] 19.09 | DB Persistence | | |
| [PLANNED] 20.01 | ตัดรอบงวดแรก | | |
| [PLANNED] 20.02 | สร้าง Payout Bi-monthly | | |
| [PLANNED] 20.03 | Monthly ไม่ถูกตัดงวดแรก | | |
| [PLANNED] 20.04 | ตัดรอบงวดหลัง | | |
| [PLANNED] 20.05 | สร้าง Payout ทุกคน | | |
| [PLANNED] 20.06 | Bi-monthly นับ 11-25 | | |
| [PLANNED] 20.07 | Monthly นับ 26-25 | | |
| [PLANNED] 20.08 | Carry Forward ต่ำกว่าขั้นต่ำ | | |
| [PLANNED] 20.09 | Carry Forward รวมถึงขั้นต่ำ | | |
| [PLANNED] 20.10 | Carry Forward รวมไม่ถึง | | |
| [PLANNED] 20.11 | Duplicate Prevention | | |
| [PLANNED] 21.01 | แจ้ง Staff ก่อนตัดรอบ วันที่ 9 | | |
| [PLANNED] 21.02 | แจ้ง Admin ก่อนตัดรอบ วันที่ 9 | | |
| [PLANNED] 21.03 | แจ้ง Staff ก่อนตัดรอบ วันที่ 24 | | |
| [PLANNED] 21.04 | แจ้ง Admin ก่อนตัดรอบ วันที่ 24 | | |
| [PLANNED] 21.05 | แจ้ง Admin ก่อนจ่ายเงินงวดแรก (15) | | |
| [PLANNED] 21.06 | แจ้ง Admin ก่อนจ่ายเงินงวดหลัง (สิ้นเดือน) | | |
| [PLANNED] 21.07 | แจ้ง Carry Forward | | |
| [PLANNED] 21.08 | แจ้ง Payout Completed | | |
| [PLANNED] 21.09 | Duplicate Prevention | | |
| [PLANNED] 22.01 | Payout Dashboard โหลด | | |
| [PLANNED] 22.02 | Stats Staff ทั้งหมด | | |
| [PLANNED] 22.03 | Stats ครบกำหนด | | |
| [PLANNED] 22.04 | Stats ยอดรวมรอจ่าย | | |
| [PLANNED] 22.05 | Stats ยกยอด | | |
| [PLANNED] 22.06 | ตาราง Staff | | |
| [PLANNED] 22.07 | Filter รอบ | | |
| [PLANNED] 22.08 | Filter เดือน | | |
| [PLANNED] 22.09 | Filter สถานะ | | |
| [PLANNED] 22.10 | จ่ายเงิน Staff เดี่ยว | | |
| [PLANNED] 22.11 | Batch Payout เลือกหลายคน | | |
| [PLANNED] 22.12 | Batch Payout ยืนยัน | | |
| [PLANNED] 22.13 | Batch Payout ยกเลิก | | |
| [PLANNED] 22.14 | Export CSV | | |
| [PLANNED] 22.15 | Select All | | |
| [PLANNED] 23.01 | Tab รอบจ่ายเงิน | | |
| [PLANNED] 23.02 | แก้ยอดขั้นต่ำ | | |
| [PLANNED] 23.03 | Validation ตัวเลข | | |
| [PLANNED] 23.04 | Validation ไม่ติดลบ | | |
| [PLANNED] 23.05 | แก้วันตัดรอบงวดแรก | | |
| [PLANNED] 23.06 | แก้วันตัดรอบงวดหลัง | | |
| [PLANNED] 23.07 | Cron ใช้ค่าจาก Settings | | |
| [PLANNED] 23.08 | เปิด/ปิดยกยอดข้ามรอบ | | |

### รอบที่ 2: Production

| TC | Test Case | ผล | หมายเหตุ |
|----|-----------|-----|---------|
| 1.01 | LINE LIFF Login สำเร็จ | | |
| 1.02 | LIFF Callback Handler | | |
| 1.03 | LIFF Deep Link Redirect | | |
| 1.04 | LIFF Deep Link ไม่ overwrite | | |
| 1.05 | Session Persistence | | |
| 1.06 | Protected Route — ยังไม่ login | | |
| 1.07 | Protected Route — earnings | | |
| 1.08 | Protected Route — profile | | |
| 1.09 | Logout สำเร็จ | | |
| 1.10 | Logout แล้วกดย้อนกลับ | | |
| 2.01 | Dashboard โหลดสำเร็จ | | |
| 2.02 | แสดงโปรไฟล์ Staff พร้อม stats | | |
| 2.03 | แสดงรายการงานรอรับ | | |
| 2.04 | ไม่มีงานรอรับ | | |
| 2.05 | Eligibility Check | | |
| 3.01 | กดรับงาน | | |
| 3.02 | งาน In-Progress แสดง timer | | |
| 3.03 | กดเสร็จงาน | | |
| 3.04 | Extension Acceptance Card | | |
| 3.05 | ยืนยัน Extension | | |
| 3.06 | ปฏิเสธ Extension | | |
| 4.01 | Sound ON | | |
| 4.02 | Sound OFF | | |
| 4.03 | Background Music | | |
| 5.01 | แสดงข้อมูลลูกค้า | | |
| 5.02 | แสดงที่อยู่/ห้อง | | |
| 5.03 | แสดงรายการบริการ | | |
| 5.04 | แสดงราคา | | |
| 5.05 | แสดง Extension Info | | |
| 6.01 | Accept จากหน้า Detail | | |
| 6.02 | Start จากหน้า Detail | | |
| 6.03 | Complete จากหน้า Detail | | |
| 6.04 | ServiceTimer Countdown | | |
| 6.05 | ServiceTimer สีเปลี่ยน | | |
| 6.06 | ปุ่ม SOS | | |
| 6.07 | ปุ่ม SOS — ยกเลิก | | |
| 7.01 | ยกเลิกก่อนรับงาน | | |
| 7.02 | ยกเลิก — ไม่เลือกเหตุผล | | |
| 7.03 | ยกเลิก — กดปิด modal | | |
| 7.04 | ยกเลิกระหว่างให้บริการ | | |
| 7.05 | Mid-service ไม่เลือกเหตุผล | | |
| 7.06 | Mid-service Confirmation | | |
| 7.07 | Mid-service กดยกเลิก confirm | | |
| 8.01 | Schedule โหลดสำเร็จ | | |
| 8.02 | Day View | | |
| 8.03 | Week View | | |
| 8.04 | Month View | | |
| 8.05 | Filter ทั้งหมด | | |
| 8.06 | Filter งานที่จะมาถึง | | |
| 8.07 | Filter เสร็จแล้ว | | |
| 8.08 | Thai Date Labels | | |
| 8.09 | Navigate ก่อนหน้า | | |
| 8.10 | Navigate ถัดไป | | |
| 8.11 | คลิกวันที่ดูงาน | | |
| 8.12 | Expand/Collapse | | |
| 9.01 | History โหลดสำเร็จ | | |
| 9.02 | แสดงงาน Completed | | |
| 9.03 | แสดงงาน Cancelled | | |
| 9.04 | Filter ทั้งหมด | | |
| 9.05 | Filter เสร็จแล้ว | | |
| 9.06 | Filter ยกเลิก | | |
| 9.07 | Filter ตามเดือน | | |
| 9.08 | Group by Date | | |
| 9.09 | Earnings Summary ต่องาน | | |
| 9.10 | Monthly Totals | | |
| 10.01 | Earnings โหลดสำเร็จ | | |
| 10.02 | Period — วัน | | |
| 10.03 | Period — สัปดาห์ | | |
| 10.04 | Period — เดือน | | |
| 10.05 | Date Nav ก่อนหน้า | | |
| 10.06 | Date Nav ถัดไป | | |
| 10.07 | Summary — ยอดรวม | | |
| 10.08 | Summary — จำนวนงาน | | |
| 10.09 | Summary — ชั่วโมง | | |
| 10.10 | Summary — เฉลี่ยต่องาน | | |
| 10.11 | Summary — คะแนนเฉลี่ย | | |
| 10.12 | Pending Payout Indicator | | |
| 10.13 | Daily Earnings Chart | | |
| 10.14 | Service Breakdown Chart | | |
| 10.15 | Payout History Table | | |
| 10.16 | Payout Status Badges | | |
| 10.17 | Transfer Ref Copy | | |
| 10.18 | Slip Image | | |
| 10.19 | Bank Account Link | | |
| 10.20 | ไม่มีข้อมูลรายได้ | | |
| 11.01 | Profile โหลดสำเร็จ | | |
| 11.02 | ดูข้อมูลส่วนตัว | | |
| 11.03 | แก้ไขชื่อ | | |
| 11.04 | แก้ไขอีเมล | | |
| 11.05 | แก้ไขเบอร์โทร | | |
| 11.06 | แก้ไขที่อยู่ | | |
| 11.07 | อัปโหลดรูปโปรไฟล์ | | |
| 11.08 | Validation ชื่อว่าง | | |
| 11.09 | Validation อีเมลผิด | | |
| 11.10 | Validation เบอร์โทรผิด | | |
| 11.11 | กดยกเลิก | | |
| 12.01 | แสดงรายการบัญชี | | |
| 12.02 | เพิ่มบัญชีใหม่ | | |
| 12.03 | เลือกธนาคาร 13 แห่ง | | |
| 12.04 | ตั้งบัญชีหลัก (เพิ่มใหม่) | | |
| 12.05 | Validation ไม่เลือกธนาคาร | | |
| 12.06 | Validation เลขบัญชีว่าง | | |
| 12.07 | Validation ชื่อบัญชีว่าง | | |
| 12.08 | แก้ไขบัญชี | | |
| 12.09 | ลบบัญชี | | |
| 12.10 | ลบบัญชี — ยกเลิก | | |
| 12.11 | ตั้งบัญชีหลัก | | |
| 12.12 | ไม่มีบัญชี | | |
| 13.01 | แสดงทักษะปัจจุบัน | | |
| 13.02 | เลือก Massage | | |
| 13.03 | เลือก Nail | | |
| 13.04 | เลือก Spa | | |
| 13.05 | เลือกหลายทักษะ | | |
| 13.06 | ยกเลิกทักษะ | | |
| 14.01 | อัปโหลด บัตรประชาชน | | |
| 14.02 | อัปโหลด เอกสารภาษี | | |
| 14.03 | อัปโหลด ใบประกอบวิชาชีพ | | |
| 14.04 | ดูเอกสาร | | |
| 14.05 | สถานะ Pending | | |
| 14.06 | สถานะ Approved | | |
| 14.07 | สถานะ Rejected | | |
| 14.08 | ลบเอกสาร | | |
| 15.01 | แสดงพื้นที่ปัจจุบัน | | |
| 15.02 | เพิ่มพื้นที่ | | |
| 15.03 | ลบพื้นที่ | | |
| 15.04 | บันทึกแล้ว refresh | | |
| 16.01 | เพิ่มผู้ติดต่อฉุกเฉิน | | |
| 16.02 | แก้ไขผู้ติดต่อฉุกเฉิน | | |
| 16.03 | Validation ชื่อว่าง | | |
| 16.04 | Validation เบอร์โทรว่าง | | |
| 17.01 | Settings โหลดสำเร็จ | | |
| 17.02 | Sound ON | | |
| 17.03 | Sound OFF | | |
| 17.04 | Push ON | | |
| 17.05 | Push OFF | | |
| 17.06 | Reminders 60 นาที | | |
| 17.07 | Reminders 120 นาที | | |
| 17.08 | Logout Confirmation | | |
| 17.09 | Logout ยืนยัน | | |
| 17.10 | Logout ยกเลิก | | |
| 18.01 | Notification Panel | | |
| 18.02 | New Job Alert | | |
| 18.03 | System Message | | |
| 18.04 | Real-time Notification | | |
| 18.05 | Unread Badge | | |
| 18.06 | ไม่มีแจ้งเตือน | | |
| [PLANNED] 19.01 | Section รอบการรับเงิน | | |
| [PLANNED] 19.02 | เลือกครึ่งเดือน | | |
| [PLANNED] 19.03 | เลือกรายเดือน | | |
| [PLANNED] 19.04 | Default Monthly | | |
| [PLANNED] 19.05 | วันตัดรอบถัดไป | | |
| [PLANNED] 19.06 | วันรับเงินถัดไป | | |
| [PLANNED] 19.07 | ยอดสะสม | | |
| [PLANNED] 19.08 | เปลี่ยนรอบ อัปเดตข้อมูล | | |
| [PLANNED] 19.09 | DB Persistence | | |
| [PLANNED] 20.01 | ตัดรอบงวดแรก | | |
| [PLANNED] 20.02 | สร้าง Payout Bi-monthly | | |
| [PLANNED] 20.03 | Monthly ไม่ถูกตัดงวดแรก | | |
| [PLANNED] 20.04 | ตัดรอบงวดหลัง | | |
| [PLANNED] 20.05 | สร้าง Payout ทุกคน | | |
| [PLANNED] 20.06 | Bi-monthly นับ 11-25 | | |
| [PLANNED] 20.07 | Monthly นับ 26-25 | | |
| [PLANNED] 20.08 | Carry Forward ต่ำกว่าขั้นต่ำ | | |
| [PLANNED] 20.09 | Carry Forward รวมถึงขั้นต่ำ | | |
| [PLANNED] 20.10 | Carry Forward รวมไม่ถึง | | |
| [PLANNED] 20.11 | Duplicate Prevention | | |
| [PLANNED] 21.01 | แจ้ง Staff ก่อนตัดรอบ วันที่ 9 | | |
| [PLANNED] 21.02 | แจ้ง Admin ก่อนตัดรอบ วันที่ 9 | | |
| [PLANNED] 21.03 | แจ้ง Staff ก่อนตัดรอบ วันที่ 24 | | |
| [PLANNED] 21.04 | แจ้ง Admin ก่อนตัดรอบ วันที่ 24 | | |
| [PLANNED] 21.05 | แจ้ง Admin ก่อนจ่ายเงินงวดแรก (15) | | |
| [PLANNED] 21.06 | แจ้ง Admin ก่อนจ่ายเงินงวดหลัง (สิ้นเดือน) | | |
| [PLANNED] 21.07 | แจ้ง Carry Forward | | |
| [PLANNED] 21.08 | แจ้ง Payout Completed | | |
| [PLANNED] 21.09 | Duplicate Prevention | | |
| [PLANNED] 22.01 | Payout Dashboard โหลด | | |
| [PLANNED] 22.02 | Stats Staff ทั้งหมด | | |
| [PLANNED] 22.03 | Stats ครบกำหนด | | |
| [PLANNED] 22.04 | Stats ยอดรวมรอจ่าย | | |
| [PLANNED] 22.05 | Stats ยกยอด | | |
| [PLANNED] 22.06 | ตาราง Staff | | |
| [PLANNED] 22.07 | Filter รอบ | | |
| [PLANNED] 22.08 | Filter เดือน | | |
| [PLANNED] 22.09 | Filter สถานะ | | |
| [PLANNED] 22.10 | จ่ายเงิน Staff เดี่ยว | | |
| [PLANNED] 22.11 | Batch Payout เลือกหลายคน | | |
| [PLANNED] 22.12 | Batch Payout ยืนยัน | | |
| [PLANNED] 22.13 | Batch Payout ยกเลิก | | |
| [PLANNED] 22.14 | Export CSV | | |
| [PLANNED] 22.15 | Select All | | |
| [PLANNED] 23.01 | Tab รอบจ่ายเงิน | | |
| [PLANNED] 23.02 | แก้ยอดขั้นต่ำ | | |
| [PLANNED] 23.03 | Validation ตัวเลข | | |
| [PLANNED] 23.04 | Validation ไม่ติดลบ | | |
| [PLANNED] 23.05 | แก้วันตัดรอบงวดแรก | | |
| [PLANNED] 23.06 | แก้วันตัดรอบงวดหลัง | | |
| [PLANNED] 23.07 | Cron ใช้ค่าจาก Settings | | |
| [PLANNED] 23.08 | เปิด/ปิดยกยอดข้ามรอบ | | |
