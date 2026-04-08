# Test Plan: Production Deployment Verification — 2026-03-29

## Prompt สำหรับสั่ง Claude AI ทดสอบ

```
อ่านไฟล์ docs/TEST_PLAN_PRODUCTION_2026_03_29.md แล้วทดสอบตามแผนทั้งหมดด้วย Playwright ผ่าน UI บน Production

เงื่อนไข:
- ปิด Chrome ก่อนเริ่มทดสอบ
- เปิดทุก app บน browser แยก tab ด้วย Playwright
- login ทุก app ด้วย account ทดสอบ (Staff app เดี่ยวล็อกอินให้)
- ทดสอบตาม Section 1-5 ตามลำดับ
- หากพบข้อผิดพลาดให้รายงานพร้อมรายละเอียด
- รายงานผล Pass/Fail ของแต่ละ Test Case
```

---

## Commit ที่ Deploy

```
d65f23e feat: add KYC house registration, emergency contact, invoice email, and refund policy consent
```

**20 files changed, +1,169 lines** — 3 Features หลัก:

### Feature 1: KYC เอกสารทะเบียนบ้าน + บุคคลอ้างอิง
- เพิ่ม document type "สำเนาทะเบียนบ้าน" (house_registration) ทั้ง Staff + Admin
- เพิ่ม section บุคคลอ้างอิง (ชื่อ, เบอร์, ความสัมพันธ์) ทั้ง Staff + Admin
- Eligibility check เพิ่มเงื่อนไข: ทะเบียนบ้าน verified + บุคคลอ้างอิงครบ
- Admin สามารถแก้ไข emergency contact ผ่าน EditStaffModal

### Feature 2: Invoice Email ส่งใบแจ้งหนี้ทางอีเมล
- ปุ่ม "ส่งอีเมล" ทุกรายการบิลในหน้า Billing + หน้ารายละเอียด
- Email template มีรายละเอียดเหมือน PDF + แนบ PDF
- แก้ PDF download bug + bill number format consistency (INV- prefix)

### Feature 3: Refund Policy Consent (เงื่อนไขการคืนเงิน)
- หน้าลงทะเบียน: scrollable terms + checkbox + disable submit
- หลัง login: ConsentModalGuard แสดง modal ถ้ายังไม่ยอมรับ
- Booking: block ถ้ายังไม่ยอมรับเงื่อนไข
- Admin Settings: tab แก้ไขเนื้อหา + version

---

## Production URLs & Test Accounts

| App | URL |
|-----|-----|
| Customer | https://customer.theblissmassageathome.com |
| Staff | https://staff.theblissmassageathome.com |
| Hotel | https://hotel.theblissmassageathome.com |
| Admin | https://admin.theblissmassageathome.com |

| App | Username | Password |
|-----|----------|----------|
| Customer | mazmakerdesign@gmail.com | U9B*B2LE#8-q!m8 |
| Hotel | reservations@hilton.com | Hotel123. |
| Admin | admintest@theblissathome.com | Admin@12345 |
| Staff | LINE LIFF auto-login (ทดสอบ999) | — |

---

## SECTION 1: Feature 1 — KYC + Emergency Contact (Staff + Admin)

### Staff App

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 1.1 | Staff Profile แสดง eligibility 4 items | Staff → Profile | แสดง บัตรประชาชน / ทะเบียนบ้าน / บัญชีธนาคาร / บุคคลอ้างอิง |
| 1.2 | บุคคลอ้างอิง section แสดง | Staff → Profile → scroll ลง | แสดง section "บุคคลอ้างอิง (ผู้ติดต่อฉุกเฉิน)" |
| 1.3 | เพิ่มบุคคลอ้างอิง | กดเพิ่ม → กรอกชื่อ/เบอร์/ความสัมพันธ์ → บันทึก | success + แสดงข้อมูล |
| 1.4 | แก้ไขบุคคลอ้างอิง | กดแก้ไข → เปลี่ยนข้อมูล → บันทึก | ข้อมูลอัปเดต |
| 1.5 | document upload dropdown มีทะเบียนบ้าน | กดเพิ่มเอกสาร → เปิด dropdown | มีตัวเลือก "สำเนาทะเบียนบ้าน" |
| 1.6 | Eligibility blocker ทะเบียนบ้าน | Dashboard (ถ้ายังไม่มี doc) | แสดง "อัพโหลดและรอการตรวจสอบสำเนาทะเบียนบ้าน" |
| 1.7 | Eligibility blocker บุคคลอ้างอิง | Dashboard (ถ้ายังไม่กรอก) | แสดง "กรอกข้อมูลบุคคลอ้างอิง" |

### Admin App

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 1.8 | Admin เห็นบุคคลอ้างอิง | Admin → Staff detail → Overview tab | แสดง section "บุคคลอ้างอิง" พร้อมข้อมูล |
| 1.9 | Admin แก้ไขบุคคลอ้างอิง | Admin → Staff detail → แก้ไขข้อมูล → modal | มีช่อง emergency contact 3 ช่อง (ชื่อ/เบอร์/ความสัมพันธ์) |
| 1.10 | Admin upload dropdown มีทะเบียนบ้าน | Admin → Staff detail → Documents tab → อัปโหลด | dropdown มี "สำเนาทะเบียนบ้าน" |
| 1.11 | Admin approve/reject ทะเบียนบ้าน | Admin → Staff detail → Documents tab → approve/reject | status เปลี่ยน + LINE notification (ถ้า quota ยังมี) |

---

## SECTION 2: Feature 2 — Invoice Email (Admin)

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 2.1 | ปุ่มส่งอีเมลในตาราง Billing | Admin → Hotels → เลือกโรงแรม → Billing | ทุกรายการมีปุ่ม "ส่งอีเมล" (icon mail) |
| 2.2 | กดส่งอีเมล | กดปุ่มส่งอีเมลบิลรายการใดรายการหนึ่ง | toast "ส่งใบแจ้งหนี้ไปยัง xxx@xxx เรียบร้อย" |
| 2.3 | ปุ่มส่งอีเมลในรายละเอียด | กดดูรายละเอียดบิล → modal | มีปุ่ม "ส่งอีเมล" สีส้ม |
| 2.4 | PDF download ทำงาน | กดดาวน์โหลด PDF | ดาวน์โหลดไฟล์ PDF สำเร็จ ไม่มี error |
| 2.5 | Bill number format consistent | ดูเลขที่บิลทุกรายการ | ทุกรายการขึ้นต้นด้วย "INV-" |

---

## SECTION 3: Feature 3 — Refund Policy Consent (Customer + Admin)

### Admin App

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 3.1 | Tab เงื่อนไขการคืนเงิน | Admin → ตั้งค่า | มี tab "เงื่อนไขการคืนเงิน" |
| 3.2 | แก้ไขเนื้อหา + บันทึก | เข้า tab → แก้ไข textarea → กดบันทึก | success "บันทึกเงื่อนไขการคืนเงินเรียบร้อย" |
| 3.3 | เปลี่ยน version | เปลี่ยน version จาก "1.0" → "2.0" → บันทึก | บันทึกสำเร็จ |

### Customer App — Consent Modal

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 3.4 | แสดง modal หลัง login (ยังไม่ยอมรับ) | Login customer → home | Consent Modal แสดง |
| 3.5 | Scroll + checkbox disabled | ดู modal | checkbox disabled + "กรุณาเลื่อนอ่านเงื่อนไขให้ครบก่อน" |
| 3.6 | Scroll จนจบ → checkbox enabled | scroll ลงจนสุด | checkbox enabled, ข้อความหายไป |
| 3.7 | ติ๊ก checkbox → ปุ่มยืนยัน enabled | ติ๊ก checkbox | ปุ่ม "ยืนยันยอมรับเงื่อนไข" enabled |
| 3.8 | กดยืนยัน → modal ปิด | กดยืนยัน | modal ปิด, หน้า home แสดงปกติ |
| 3.9 | ไม่แสดง modal ซ้ำ | refresh หน้า | ไม่มี modal |
| 3.10 | ไม่มีปุ่มปิด modal | ดู modal (ก่อนยอมรับ) | ไม่มีปุ่ม X หรือ dismiss |

### Customer App — Booking Guard

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 3.11 | เข้า booking ได้หลังยอมรับ | ไปที่ /booking | BookingWizard แสดงปกติ ไม่มี modal |

### Customer App — Register Form

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 3.12 | หน้าลงทะเบียนมี refund policy | เปิด /register | มี section "เงื่อนไขการคืนเงิน" + scrollable box |
| 3.13 | ปุ่มลงทะเบียน disabled ก่อนยอมรับ | กรอกข้อมูลครบ + ติ๊ก terms แต่ไม่ติ๊ก refund | ปุ่มยัง disabled |

### Version Management

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 3.14 | Admin เปลี่ยน version → customer ต้องยอมรับใหม่ | Admin เปลี่ยน version → customer refresh | Consent Modal แสดงอีกครั้ง |

---

## SECTION 4: Regression — ระบบเดิมยังทำงานปกติ

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 4.1 | Customer login | login ด้วย email/password | login สำเร็จ |
| 4.2 | Admin login | login ด้วย email/password | login สำเร็จ เข้า dashboard |
| 4.3 | Hotel login | login ด้วย email/password | login สำเร็จ เข้า dashboard |
| 4.4 | Staff login | login ผ่าน LINE LIFF | login สำเร็จ (ต้อง login ให้) |
| 4.5 | Customer ดูบริการ | เปิดหน้า services | แสดงรายการบริการ |
| 4.6 | Admin dashboard | เปิด admin dashboard | แสดงข้อมูลภาพรวม |
| 4.7 | Hotel dashboard | เปิด hotel dashboard | แสดงข้อมูลภาพรวม |
| 4.8 | Staff dashboard | เปิด staff dashboard | แสดง eligibility + งาน |
| 4.9 | Admin Staff list | Admin → พนักงาน | แสดงรายชื่อพนักงาน |
| 4.10 | Admin Hotel list | Admin → โรงแรม | แสดงรายชื่อโรงแรม |

---

## SECTION 5: Full Booking Flow (ถ้ามีเวลา)

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 5.1 | Customer จองบริการ | เลือกบริการ → วัน/เวลา → ที่อยู่ → ชำระเงิน | จองสำเร็จ |
| 5.2 | Staff เห็นงาน | Staff → Dashboard | งานใหม่แสดง |
| 5.3 | Staff รับงาน | กดรับงาน | สถานะเปลี่ยน |
| 5.4 | Staff เริ่มงาน | กดเริ่มงาน | สถานะเปลี่ยน |
| 5.5 | Staff เสร็จสิ้น | กดเสร็จสิ้น | สถานะเปลี่ยน |

---

## Playwright Selectors Reference

### Customer App
- Login: textbox "อีเมล", textbox "รหัสผ่าน", button "เข้าสู่ระบบ"
- Consent Modal: text "เงื่อนไขการคืนเงิน", checkbox "ข้าพเจ้าได้อ่าน...", button "ยืนยันยอมรับเงื่อนไข"
- Register: text "ลงทะเบียน", scrollable box, checkbox

### Staff App
- Profile: text "โปรไฟล์", text "บุคคลอ้างอิง", text "เอกสาร KYC"
- Dashboard: text "ยังไม่สามารถรับงานได้", text "พร้อมรับงาน"

### Admin App
- Settings: link "ตั้งค่า", button "เงื่อนไขการคืนเงิน Refund Policy"
- Staff Detail: button "แก้ไขข้อมูล", text "บุคคลอ้างอิง"
- Hotel Billing: button "ส่งอีเมล", button "ดาวน์โหลด PDF"

### Hotel App
- Login: textbox "hotel@example.com", button "เข้าสู่ระบบ"
- Dashboard: text "ภาพรวม"

---

## Test Execution Order (แนะนำ)

1. Section 4 (Regression) — ตรวจสอบว่าระบบเดิมยังทำงานปกติ
2. Section 1 (KYC + Emergency Contact) — ทดสอบ Staff + Admin
3. Section 2 (Invoice Email) — ทดสอบ Admin
4. Section 3 (Refund Policy Consent) — ทดสอบ Customer + Admin
5. Section 5 (Full Booking Flow) — ถ้ามีเวลา
