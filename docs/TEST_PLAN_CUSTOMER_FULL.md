# แผนทดสอบ: Customer App — ทดสอบทุกฟังก์ชันผ่าน UI ด้วย Playwright MCP

## Prompt สำหรับสั่ง Claude AI ทดสอบ

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home
อ่านไฟล์ docs/TEST_PLAN_CUSTOMER_FULL.md แล้วทดสอบตาม Test Cases ทั้งหมด

เงื่อนไข:
- ทดสอบผ่าน UI ด้วย Playwright MCP แบบ full flow step by step
- ห้ามทดสอบด้วยการอัปเดต DB โดยตรง ให้ทำผ่าน UI เท่านั้น
- ทดสอบบน localhost ก่อน แก้ไขจนถูกต้อง แล้วค่อยทดสอบบน production
- ถ้า FAIL ให้แก้โค้ดแล้วทดสอบซ้ำจนผ่าน
- สรุปผลเป็นตาราง PASS/FAIL
- หากต้องการล็อกอินสามารถแจ้งฉันได้
- TC ที่มี [PLANNED] คือฟีเจอร์ที่ยังไม่ได้พัฒนา ข้ามไปก่อน

Dev Servers (หากยังไม่รัน):
cd /c/chitpon59/dev/project/theblissathome.com/the-bliss-at-home
nohup npx turbo run dev --parallel > /tmp/bliss-dev.log 2>&1 &
```

---

## URLs

### Round 1: Localhost
| App | URL |
|-----|-----|
| Customer | http://localhost:3008 |
| Admin | http://localhost:3001 |

### Round 2: Production
| App | URL |
|-----|-----|
| Customer | https://customer.theblissmassageathome.com |
| Admin | https://admin.theblissmassageathome.com |

---

## Login Credentials (ใช้ได้ทั้ง localhost และ production)

| App | Username | Password | หมายเหตุ |
|-----|----------|----------|---------|
| Customer | mazmakerdesign@gmail.com | U9B*B2LE#8-q!m8 | วิชัย มีชัย |
| Admin | admintest@theblissathome.com | Admin@12345 | ใช้สำหรับ TC ที่ต้อง verify จาก admin |

---

## สรุปจำนวน Test Cases ทั้งหมด

| Module | จำนวน TC | หมายเหตุ |
|--------|---------|---------|
| 1. Authentication | 12 | login, register, logout, session, forgot/reset password, OTP, protected routes |
| 2. Home Page | 8 | hero, search, promotions, categories, popular, reviews, CTA, discount banner |
| 3. Service Catalog | 7 | list, search, filter, sort, cards, skeleton |
| 4. Service Detail | 6 | info, pricing, add-ons, reviews, ratings, booking CTA |
| 5. Booking Wizard - Step 1 | 4 | customer type, couple config |
| 6. Booking Wizard - Step 2 | 6 | date picker, time picker, availability |
| 7. Booking Wizard - Step 3 | 5 | duration, add-ons, pricing |
| 8. Booking Wizard - Step 4 | 7 | saved addresses, new address, Google Maps, Thai address |
| 9. Booking Wizard - Step 5 | 7 | confirmation, voucher, price breakdown, provider preference |
| 10. Booking Wizard - Step 6 | 6 | payment method, credit card, processing, confirmation |
| 11. Booking History | 5 | list, status filter, search, date filter |
| 12. Booking Detail | 8 | detail view, cancel, reschedule, review, receipt, credit note |
| 13. Profile - Personal Info | 6 | view, edit, validation |
| 14. Profile - Addresses | 8 | CRUD, default, Google Maps, Thai address |
| 15. Profile - Payment Methods | 5 | list, add, delete, set default |
| 16. Profile - Tax Information | 4 | view, create, update |
| 17. Transaction History | 5 | list, filter, receipt, refund |
| 18. Notifications | 6 | center, event types, mark read, real-time, badge |
| 19. Promotions Page | 6 | list, search, filter, sort, detail, copy code |
| 20. Refund Policy Consent | 4 | scroll, checkbox, submit, version |
| 21. Legal Pages | 2 | terms, privacy |
| 22. [PLANNED] Loyalty Points - Earn | 6 | booking points, first bonus, hotel no points, cancelled, calculate, round down |
| 23. [PLANNED] Loyalty Points - Redeem | 7 | use points, with promo, validation, cancel refund, buttons |
| 24. [PLANNED] Loyalty Points - UI | 6 | profile widget, points history, filter, BookingWizard section, price breakdown |
| 25. [PLANNED] Loyalty Points - Expiry | 4 | cron expire, notification before expiry |
| 26. [PLANNED] Loyalty Points - Admin | 4 | admin adjust, give bonus, deduct |
| 27. Responsive/UX | 6 | mobile menu, loading, error, empty states |
| **รวม** | **168** | |

---

## Test Cases

---

### MODULE 1: Authentication (12 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 1.01 | Login email/password สำเร็จ | ไปหน้า `/login` → กรอก email: mazmakerdesign@gmail.com, password: U9B*B2LE#8-q!m8 → กด "เข้าสู่ระบบ" | เข้าหน้า Home ได้ แสดงชื่อผู้ใช้ที่ Header | HIGH |
| 1.02 | Login password ผิด | ไปหน้า `/login` → กรอก email ถูก, password ผิด → กด "เข้าสู่ระบบ" | แสดง error "อีเมลหรือรหัสผ่านไม่ถูกต้อง" ไม่เข้าระบบ | HIGH |
| 1.03 | Login email ไม่ถูกรูปแบบ | กรอก email "abc" (ไม่มี @) → กด "เข้าสู่ระบบ" | แสดง validation error ที่ฟิลด์ email | MEDIUM |
| 1.04 | Login ฟิลด์ว่าง | ไม่กรอกอะไรเลย → กด "เข้าสู่ระบบ" | แสดง validation error ทั้ง email และ password | MEDIUM |
| 1.05 | Login Google OAuth | ไปหน้า `/login` → กดปุ่ม "เข้าสู่ระบบด้วย Google" | Redirect ไป Google consent → callback กลับ → เข้าระบบสำเร็จ | HIGH |
| 1.06 | Login Facebook OAuth | ไปหน้า `/login` → กดปุ่ม "เข้าสู่ระบบด้วย Facebook" | Redirect ไป Facebook consent → callback กลับ → เข้าระบบสำเร็จ | HIGH |
| 1.07 | Register สำเร็จ | ไปหน้า `/register` → กรอก ชื่อ/email/โทรศัพท์/password → ติ๊กยอมรับเงื่อนไข → กดสมัคร | สมัครสำเร็จ → redirect ไปหน้า OTP verification หรือ login | HIGH |
| 1.08 | Register email ซ้ำ | กรอก email ที่มีอยู่แล้วในระบบ → กดสมัคร | แสดง error "อีเมลนี้ถูกใช้แล้ว" | MEDIUM |
| 1.09 | Logout | Login สำเร็จ → กดชื่อผู้ใช้ที่ Header → กด "ออกจากระบบ" | กลับหน้า `/login` ไม่เห็นข้อมูลผู้ใช้ | HIGH |
| 1.10 | Session persistence | Login สำเร็จ → ปิด tab → เปิด tab ใหม่ → เข้า `/` | ยังอยู่ใน Home แสดงชื่อผู้ใช้ (ไม่ต้อง login ใหม่) | MEDIUM |
| 1.11 | Protected route ไม่มี session | ไม่ login → เข้า `/bookings` โดยตรง | Redirect ไปหน้า `/login` | HIGH |
| 1.12 | Forgot password | ไปหน้า `/login` → กด "ลืมรหัสผ่าน" → กรอก email → กดส่ง | แสดงข้อความ "ส่ง link reset password ไปที่อีเมลแล้ว" | MEDIUM |

---

### MODULE 2: Home Page (8 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 2.01 | Hero section แสดงถูกต้อง | เข้าหน้า `/` | แสดง Hero banner พร้อม title, description, CTA button "จองบริการ" | HIGH |
| 2.02 | Search box ค้นหาบริการ | พิมพ์ "นวด" ในช่อง search ที่ Hero → กด search/Enter | Redirect ไปหน้า `/services` พร้อม keyword "นวด" แสดงผลที่ตรง | HIGH |
| 2.03 | Promotions carousel แสดง | เลื่อนดู section Promotions | แสดง carousel โปรโมชั่นที่ active ได้ เลื่อนซ้าย-ขวาได้ | MEDIUM |
| 2.04 | Service categories แสดง | เลื่อนดู section หมวดหมู่บริการ | แสดง categories (นวด, สปา, ทำเล็บ ฯลฯ) คลิกได้ → ไปหน้า services พร้อม filter | HIGH |
| 2.05 | Popular services แสดง | เลื่อนดู section บริการยอดนิยม | แสดง service cards พร้อมรูป ชื่อ ราคา rating | MEDIUM |
| 2.06 | Customer reviews แสดง | เลื่อนดู section รีวิวจากลูกค้า | แสดงรีวิว พร้อมชื่อ rating ข้อความ | MEDIUM |
| 2.07 | CTA section | เลื่อนถึงท้ายหน้า | แสดง CTA section พร้อมปุ่ม "จองบริการ" คลิก → ไปหน้า services | LOW |
| 2.08 | Global discount banner | ตรวจ Header/Banner | ถ้ามี global discount เปิดอยู่ → แสดง banner ส่วนลด, ถ้าปิดอยู่ → ไม่แสดง | MEDIUM |

---

### MODULE 3: Service Catalog (7 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 3.01 | แสดงรายการบริการทั้งหมด | ไปหน้า `/services` | แสดง service cards ทั้งหมด พร้อมรูป ชื่อ ราคาเริ่มต้น duration | HIGH |
| 3.02 | ค้นหาบริการ | พิมพ์ "Thai massage" หรือ "นวดไทย" ในช่อง search | แสดงเฉพาะบริการที่ตรงกับ keyword | HIGH |
| 3.03 | Filter ตาม category | คลิก filter category "นวด" | แสดงเฉพาะบริการหมวด "นวด" จำนวนอัปเดต | HIGH |
| 3.04 | Sort ตามราคา | เลือก sort "ราคาต่ำ-สูง" | บริการเรียงตามราคาจากน้อยไปมาก | MEDIUM |
| 3.05 | Sort ตาม rating | เลือก sort "คะแนนสูงสุด" | บริการเรียงตาม rating จากมากไปน้อย | MEDIUM |
| 3.06 | Service card แสดงข้อมูลถูกต้อง | ดู service card ใดก็ได้ | แสดง: รูป, ชื่อ, ราคาเริ่มต้น, duration เริ่มต้น, rating, คลิกได้ | HIGH |
| 3.07 | Skeleton loading | เปิดหน้า `/services` (ระหว่างโหลด) | แสดง skeleton cards ก่อนข้อมูลโหลดเสร็จ ไม่แสดงหน้าว่างเปล่า | LOW |

---

### MODULE 4: Service Detail (6 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 4.01 | แสดงข้อมูลบริการ | คลิก service card → ไปหน้า `/services/:slug` | แสดงชื่อ, รูป, รายละเอียด, หมวดหมู่ | HIGH |
| 4.02 | ราคาหลาย duration | ดู section ราคา | แสดงราคาแต่ละ duration (1 ชม., 1.5 ชม., 2 ชม. ฯลฯ) ถูกต้อง | HIGH |
| 4.03 | Add-ons แสดง | ดู section Add-ons | แสดง add-ons ของบริการ (ถ้ามี) พร้อมราคา | MEDIUM |
| 4.04 | Reviews list แสดง | เลื่อนดู section รีวิว | แสดงรีวิวของบริการนี้ พร้อมชื่อ rating วันที่ ข้อความ | MEDIUM |
| 4.05 | Star ratings แสดง | ดู rating เฉลี่ย + จำนวนรีวิว | แสดงดาวเฉลี่ย (เช่น 4.5/5) + จำนวนรีวิว (เช่น 23 รีวิว) | MEDIUM |
| 4.06 | Booking CTA | กดปุ่ม "จองบริการ" | Redirect ไปหน้า `/booking` พร้อมส่ง service ที่เลือกไป | HIGH |

---

### MODULE 5: Booking Wizard - Step 1: Customer Type (4 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 5.01 | เลือก Single (คนเดียว) | เข้า `/booking` → เลือก "คนเดียว" | เลือกสำเร็จ highlight "คนเดียว" สามารถกด "ถัดไป" ได้ | HIGH |
| 5.02 | เลือก Couple (คู่) | เข้า `/booking` → เลือก "คู่" | เลือกสำเร็จ แสดง section ตั้งค่า couple (เลือกบริการ/duration ของคนที่ 2) | HIGH |
| 5.03 | Couple config — เลือกบริการคนที่ 2 | เลือก "คู่" → เลือกบริการสำหรับคนที่ 2 | แสดง duration + ราคาของบริการคนที่ 2 ราคารวมอัปเดต | MEDIUM |
| 5.04 | กด "ถัดไป" โดยไม่เลือก type | เข้า `/booking` → ไม่เลือก Single/Couple → กด "ถัดไป" | แสดง validation error ให้เลือก customer type ก่อน หรือปุ่มถัดไปเป็น disabled | MEDIUM |

---

### MODULE 6: Booking Wizard - Step 2: Date/Time (6 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 6.01 | เลือกวันที่ | Step 2 → คลิกเลือกวันที่ในปฏิทิน | วันที่ถูก highlight ข้อมูลวันที่อัปเดต | HIGH |
| 6.02 | เลือกวันที่ในอดีต | คลิกวันที่ที่ผ่านมาแล้ว | ไม่สามารถเลือกได้ (วันที่ในอดีตเป็น disabled) | HIGH |
| 6.03 | เลือกเวลา | เลือกวันที่ → เลือกเวลา (เช่น 14:00) | เวลาถูก highlight สามารถกด "ถัดไป" ได้ | HIGH |
| 6.04 | เวลาที่ไม่ว่าง | เลือกวันที่ → ตรวจเวลาที่ไม่ว่าง (ถ้ามี) | เวลาที่ไม่ว่างแสดงเป็น disabled หรือมีสัญลักษณ์บอก | MEDIUM |
| 6.05 | กด "ถัดไป" ไม่เลือกวันเวลา | ไม่เลือกวันที่/เวลา → กด "ถัดไป" | แสดง validation error หรือปุ่มเป็น disabled | MEDIUM |
| 6.06 | กด "ย้อนกลับ" | กด "ย้อนกลับ" | กลับไป Step 1 ข้อมูลที่เลือกไว้ยังอยู่ | LOW |

---

### MODULE 7: Booking Wizard - Step 3: Duration/Add-ons (5 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 7.01 | เลือก duration | Step 3 → เลือก duration (เช่น 2 ชั่วโมง) | Duration ถูก highlight ราคาอัปเดตตาม duration ที่เลือก | HIGH |
| 7.02 | เปลี่ยน duration | เลือก 2 ชม. → เปลี่ยนเป็น 1.5 ชม. | ราคาอัปเดตตาม duration ใหม่ | HIGH |
| 7.03 | เลือก add-on | เลือก add-on (เช่น "อโรมา") | Add-on ถูกติ๊ก ราคาเพิ่มขึ้นตามราคา add-on | MEDIUM |
| 7.04 | เลือกหลาย add-ons | เลือก add-on 2 รายการ | ทั้ง 2 ถูกติ๊ก ราคารวม add-ons ถูกต้อง | MEDIUM |
| 7.05 | ยกเลิก add-on | เลือก add-on → คลิกอีกครั้งเพื่อยกเลิก | Add-on ถูกเอาออก ราคาลดลง | MEDIUM |

---

### MODULE 8: Booking Wizard - Step 4: Address (7 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 8.01 | แสดงที่อยู่ที่บันทึกไว้ | Step 4 → ดูรายการที่อยู่ | แสดงที่อยู่ที่บันทึกไว้ของ customer พร้อม default ถูกเลือก | HIGH |
| 8.02 | เลือกที่อยู่ที่บันทึกไว้ | คลิกเลือกที่อยู่อื่น (ไม่ใช่ default) | ที่อยู่ใหม่ถูก highlight สามารถกด "ถัดไป" ได้ | HIGH |
| 8.03 | เพิ่มที่อยู่ใหม่ — สำเร็จ | กดปุ่ม "เพิ่มที่อยู่ใหม่" → กรอก label/ที่อยู่/จังหวัด/อำเภอ/ตำบล/รหัสไปรษณีย์ → บันทึก | ที่อยู่ใหม่ปรากฏในรายการ + ถูกเลือกอัตโนมัติ | HIGH |
| 8.04 | เพิ่มที่อยู่ใหม่ — ฟิลด์ว่าง | กดปุ่ม "เพิ่มที่อยู่ใหม่" → ไม่กรอกข้อมูล → กดบันทึก | แสดง validation error ที่ฟิลด์ที่จำเป็น | MEDIUM |
| 8.05 | Google Maps picker | กดเลือกจุดบนแผนที่ | Pin ปักตำแหน่ง lat/lng อัปเดต อาจ autocomplete ที่อยู่ | MEDIUM |
| 8.06 | Thai address autocomplete | กรอกจังหวัด → เลือกจังหวัด → dropdown อำเภอโหลด → เลือกอำเภอ → dropdown ตำบลโหลด → เลือกตำบล | อำเภอ/ตำบล/รหัสไปรษณีย์ เชื่อมกันถูกต้อง | MEDIUM |
| 8.07 | ไม่มีที่อยู่ — ต้องเพิ่ม | Customer ไม่มีที่อยู่ → เข้า Step 4 | แสดง empty state + ปุ่ม "เพิ่มที่อยู่" ไม่สามารถกดถัดไปได้จนกว่าจะเพิ่ม | MEDIUM |

---

### MODULE 9: Booking Wizard - Step 5: Confirmation (7 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 9.01 | สรุปการจองแสดงถูกต้อง | Step 5 → ดูสรุป | แสดง: ชื่อบริการ, วันเวลา, duration, ที่อยู่, add-ons, ราคา ทั้งหมดถูกต้อง | HIGH |
| 9.02 | กรอก voucher code สำเร็จ | กรอก promo code ที่ valid → กด "ใช้" | แสดงส่วนลด ราคาหลังลดอัปเดต | HIGH |
| 9.03 | กรอก voucher code ไม่ถูกต้อง | กรอก promo code ที่ไม่มีจริง → กด "ใช้" | แสดง error "รหัสส่วนลดไม่ถูกต้อง" ราคาไม่เปลี่ยน | HIGH |
| 9.04 | กรอก voucher code หมดอายุ | กรอก promo code ที่หมดอายุ → กด "ใช้" | แสดง error "รหัสส่วนลดหมดอายุ" | MEDIUM |
| 9.05 | Price breakdown แสดง | ดู section ราคา | แสดง: ราคาบริการ, add-ons, promo discount, ยอดชำระ แยกบรรทัดถูกต้อง | HIGH |
| 9.06 | Provider preference | เลือกความชอบ provider (เช่น ไม่ระบุ/เพศเดียวกัน) | ค่า preference ถูกบันทึก แสดงในสรุป | MEDIUM |
| 9.07 | ยกเลิก voucher code | กรอก promo code สำเร็จ → กดปุ่ม "ลบ" / "ยกเลิก" | ส่วนลดถูกเอาออก ราคากลับเป็นเดิม | MEDIUM |

---

### MODULE 10: Booking Wizard - Step 6: Payment (6 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 10.01 | เลือกวิธีชำระเงิน — บัตรเครดิต | Step 6 → เลือก "บัตรเครดิต" | แสดง credit card form (หมายเลขบัตร, ชื่อ, หมดอายุ, CVV) | HIGH |
| 10.02 | กรอกบัตรเครดิต — สำเร็จ | กรอกข้อมูลบัตร Omise test (4242 4242 4242 4242) → กด "ชำระเงิน" | ชำระสำเร็จ → redirect ไปหน้า Payment Confirmation | HIGH |
| 10.03 | กรอกบัตรเครดิต — บัตรไม่ผ่าน | กรอกหมายเลขบัตรไม่ถูกต้อง → กด "ชำระเงิน" | แสดง error จาก Omise "บัตรไม่ถูกต้อง" | HIGH |
| 10.04 | กรอกบัตรเครดิต — ฟิลด์ว่าง | ไม่กรอกข้อมูลบัตร → กด "ชำระเงิน" | แสดง validation error ที่ฟิลด์ที่จำเป็น | MEDIUM |
| 10.05 | เลือกบัตรที่บันทึกไว้ | Customer มีบัตรบันทึกไว้ → เลือกบัตรจากรายการ | บัตรถูกเลือก สามารถกด "ชำระเงิน" ได้โดยไม่ต้องกรอกใหม่ | HIGH |
| 10.06 | Payment confirmation page | ชำระเงินสำเร็จ → ดูหน้า `/payment/confirmation` | แสดง checkmark สำเร็จ, ข้อมูลการจอง, ปุ่ม "ดาวน์โหลดใบเสร็จ", ปุ่มกลับหน้าหลัก | HIGH |

---

### MODULE 11: Booking History (5 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 11.01 | แสดงรายการจอง | ไปหน้า `/bookings` | แสดงรายการจองทั้งหมดของ customer เรียงตามวันที่ล่าสุด | HIGH |
| 11.02 | Filter ตาม status | เลือก filter "เสร็จสมบูรณ์" | แสดงเฉพาะ booking ที่ status = completed | HIGH |
| 11.03 | Filter status "ทั้งหมด" | เลือก filter "ทั้งหมด" | แสดงทุก booking ไม่ว่า status ใด | MEDIUM |
| 11.04 | ค้นหาจอง | พิมพ์ชื่อบริการหรือ booking ID ในช่อง search | แสดงเฉพาะ booking ที่ตรงกับ keyword | MEDIUM |
| 11.05 | ไม่มีรายการจอง | Customer ใหม่ที่ไม่มี booking → เข้า `/bookings` | แสดง empty state "ยังไม่มีรายการจอง" พร้อมปุ่ม "จองบริการ" | LOW |

---

### MODULE 12: Booking Detail (8 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 12.01 | แสดงรายละเอียดจอง | คลิก booking จากรายการ → ไปหน้า `/bookings/:id` | แสดง: ชื่อบริการ, วันเวลา, duration, ที่อยู่, status, ราคา, ชื่อ staff (ถ้ามี) | HIGH |
| 12.02 | Cancel booking — แสดง modal | กดปุ่ม "ยกเลิกการจอง" (booking ที่ยังไม่เริ่ม) | แสดง modal ยืนยันยกเลิก พร้อม refund policy (tier ตามเวลาที่เหลือ) | HIGH |
| 12.03 | Cancel booking — ยืนยัน | กดปุ่ม "ยืนยันยกเลิก" ใน modal | Booking ถูกยกเลิก status เปลี่ยน แสดง refund info | HIGH |
| 12.04 | Cancel booking — booking ที่ยกเลิกไม่ได้ | Booking ที่ status = completed หรือ in_progress | ไม่แสดงปุ่ม "ยกเลิกการจอง" | MEDIUM |
| 12.05 | Reschedule booking — modal | กดปุ่ม "เลื่อนนัด" (booking ที่ยังไม่เริ่ม) | แสดง modal เลือกวันเวลาใหม่ + ค่าธรรมเนียม (ถ้ามี) | HIGH |
| 12.06 | Review booking — modal | กดปุ่ม "เขียนรีวิว" (booking ที่ completed) | แสดง modal เขียนรีวิว: เลือกดาว 1-5, กรอกข้อความ, กดส่ง | HIGH |
| 12.07 | Receipt download | กดปุ่ม "ดาวน์โหลดใบเสร็จ" | Download PDF ใบเสร็จ ไฟล์เปิดได้ถูกต้อง | MEDIUM |
| 12.08 | Credit note download | Booking ที่ยกเลิกแล้วมี refund → กดปุ่ม "ดาวน์โหลด Credit Note" | Download PDF credit note ไฟล์เปิดได้ถูกต้อง | MEDIUM |

---

### MODULE 13: Profile - Personal Info (6 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 13.01 | แสดงข้อมูลส่วนตัว | ไปหน้า `/profile` → tab "ข้อมูลส่วนตัว" | แสดง: ชื่อ, นามสกุล, อีเมล, โทรศัพท์, วันเกิด | HIGH |
| 13.02 | แก้ไขชื่อ | กดแก้ไข → เปลี่ยนชื่อ → บันทึก | ชื่ออัปเดต toast สำเร็จ refresh ยังอยู่ | HIGH |
| 13.03 | แก้ไขเบอร์โทร | กดแก้ไข → เปลี่ยนเบอร์โทร → บันทึก | เบอร์โทรอัปเดต | HIGH |
| 13.04 | แก้ไขวันเกิด | กดแก้ไข → เปลี่ยนวันเกิด → บันทึก | วันเกิดอัปเดต | MEDIUM |
| 13.05 | Validation — ชื่อว่าง | ลบชื่อให้ว่าง → บันทึก | แสดง validation error "กรุณากรอกชื่อ" | MEDIUM |
| 13.06 | Validation — เบอร์โทรไม่ถูกรูปแบบ | กรอกเบอร์โทร "abc" → บันทึก | แสดง validation error "เบอร์โทรไม่ถูกต้อง" | MEDIUM |

---

### MODULE 14: Profile - Addresses (8 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 14.01 | แสดงรายการที่อยู่ | ไปหน้า `/profile` → tab "ที่อยู่" | แสดงรายการที่อยู่ทั้งหมด ที่อยู่ default มี badge | HIGH |
| 14.02 | เพิ่มที่อยู่ใหม่ | กดปุ่ม "เพิ่มที่อยู่" → กรอก label/ที่อยู่/จังหวัด/อำเภอ/ตำบล/รหัสไปรษณีย์ → บันทึก | ที่อยู่ใหม่ปรากฏในรายการ | HIGH |
| 14.03 | แก้ไขที่อยู่ | กดปุ่ม "แก้ไข" ที่ address card → เปลี่ยน label → บันทึก | Label อัปเดต | HIGH |
| 14.04 | ลบที่อยู่ | กดปุ่ม "ลบ" ที่ address card → ยืนยัน | ที่อยู่หายจากรายการ | HIGH |
| 14.05 | ตั้งเป็นที่อยู่เริ่มต้น | กดปุ่ม "ตั้งเป็นค่าเริ่มต้น" ที่ address ที่ไม่ใช่ default | Badge default ย้ายมาที่ address ใหม่ | MEDIUM |
| 14.06 | Google Maps picker | กดเพิ่ม/แก้ที่อยู่ → ปักหมุดแผนที่ | lat/lng อัปเดต pin แสดงบนแผนที่ | MEDIUM |
| 14.07 | Thai address เชื่อมกัน | เลือกจังหวัด → อำเภอโหลดตามจังหวัด → เลือกอำเภอ → ตำบลโหลดตามอำเภอ | จังหวัด/อำเภอ/ตำบล/รหัสไปรษณีย์ เชื่อมถูกต้อง | MEDIUM |
| 14.08 | Validation — ฟิลด์ว่าง | กดเพิ่มที่อยู่ → ไม่กรอกอะไร → บันทึก | แสดง validation error ที่ฟิลด์จำเป็น | MEDIUM |

---

### MODULE 15: Profile - Payment Methods (5 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 15.01 | แสดงรายการบัตรที่บันทึก | ไปหน้า `/profile` → tab "วิธีชำระเงิน" | แสดงรายการบัตร (masked number, brand, expiry) | HIGH |
| 15.02 | เพิ่มบัตรใหม่ | กดปุ่ม "เพิ่มบัตร" → กรอกข้อมูลบัตร Omise test → บันทึก | บัตรใหม่ปรากฏในรายการ | HIGH |
| 15.03 | ลบบัตร | กดปุ่ม "ลบ" ที่บัตร → ยืนยัน | บัตรหายจากรายการ | HIGH |
| 15.04 | ตั้งบัตรเริ่มต้น | กดปุ่ม "ตั้งเป็นค่าเริ่มต้น" ที่บัตรที่ไม่ใช่ default | Badge default ย้ายมาที่บัตรใหม่ | MEDIUM |
| 15.05 | ไม่มีบัตร | Customer ไม่มีบัตร → เข้า tab วิธีชำระเงิน | แสดง empty state "ยังไม่มีบัตรที่บันทึก" + ปุ่ม "เพิ่มบัตร" | LOW |

---

### MODULE 16: Profile - Tax Information (4 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 16.01 | แสดงข้อมูลภาษี | ไปหน้า `/profile` → tab "ข้อมูลภาษี" | แสดงข้อมูลภาษี (ชื่อ, เลขประจำตัวผู้เสียภาษี, ที่อยู่) หรือ empty state ถ้ายังไม่มี | HIGH |
| 16.02 | สร้างข้อมูลภาษี | กดปุ่ม "เพิ่มข้อมูลภาษี" → กรอก ชื่อ/tax ID/ที่อยู่ → บันทึก | ข้อมูลภาษีถูกบันทึก แสดงในหน้า | HIGH |
| 16.03 | แก้ไขข้อมูลภาษี | กด "แก้ไข" → เปลี่ยน tax ID → บันทึก | Tax ID อัปเดต | HIGH |
| 16.04 | Validation — tax ID ไม่ถูกรูปแบบ | กรอก tax ID ที่ไม่ใช่ตัวเลข 13 หลัก → บันทึก | แสดง validation error | MEDIUM |

---

### MODULE 17: Transaction History (5 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 17.01 | แสดงประวัติธุรกรรม | ไปหน้า `/transactions` | แสดงรายการธุรกรรมทั้งหมด เรียงตามวันที่ล่าสุด (วันที่, ยอด, สถานะ, วิธีชำระ) | HIGH |
| 17.02 | Filter ตาม status | เลือก filter "สำเร็จ" | แสดงเฉพาะ transaction ที่ status = successful | MEDIUM |
| 17.03 | Filter ตาม status "คืนเงิน" | เลือก filter "คืนเงิน" | แสดงเฉพาะ transaction ที่ status = refunded | MEDIUM |
| 17.04 | Receipt download | กดปุ่ม "ดาวน์โหลดใบเสร็จ" ที่ transaction สำเร็จ | Download PDF ใบเสร็จ | MEDIUM |
| 17.05 | ไม่มีธุรกรรม | Customer ใหม่ → เข้า `/transactions` | แสดง empty state "ยังไม่มีประวัติธุรกรรม" | LOW |

---

### MODULE 18: Notifications (6 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 18.01 | แสดง notification center | ไปหน้า `/notifications` หรือกดกระดิ่งที่ Header | แสดงรายการ notifications เรียงตามล่าสุด | HIGH |
| 18.02 | Notification types แสดงถูก | ดูรายการ notifications | แสดงประเภทต่าง ๆ (booking confirmed, job started, completed, cancelled, reminder) พร้อม icon/color ต่างกัน | MEDIUM |
| 18.03 | Mark as read | คลิก notification ที่ยังไม่อ่าน | สถานะเปลี่ยนเป็น "อ่านแล้ว" (ไม่มี badge/highlight) | HIGH |
| 18.04 | Mark all as read | กดปุ่ม "อ่านทั้งหมด" | ทุก notification เปลี่ยนเป็น "อ่านแล้ว" | MEDIUM |
| 18.05 | Unread badge ที่ Header | มี notification ที่ยังไม่อ่าน → ดูกระดิ่งที่ Header | แสดง badge ตัวเลขจำนวน unread | HIGH |
| 18.06 | Real-time notification | Booking status เปลี่ยนจาก admin → ดู customer app | Notification ใหม่ปรากฏแบบ real-time ไม่ต้อง refresh | MEDIUM |

---

### MODULE 19: Promotions Page (6 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 19.01 | แสดงรายการโปรโมชั่น | ไปหน้า `/promotions` | แสดงโปรโมชั่นที่ active ทั้งหมด พร้อมรูป ชื่อ ส่วนลด วันหมดอายุ | HIGH |
| 19.02 | ค้นหาโปรโมชั่น | พิมพ์ชื่อ promo ในช่อง search | แสดงเฉพาะ promo ที่ตรง | MEDIUM |
| 19.03 | Filter ตามประเภท | เลือก filter type (เช่น "ส่วนลดบาท", "ส่วนลด%") | แสดงเฉพาะ type ที่เลือก | MEDIUM |
| 19.04 | Sort โปรโมชั่น | เลือก sort (เช่น "หมดอายุเร็วสุด") | เรียงตาม criteria ที่เลือก | LOW |
| 19.05 | ดูรายละเอียดโปรโมชั่น | คลิก promo card | แสดง modal/page รายละเอียด: เงื่อนไข, วันหมดอายุ, promo code | HIGH |
| 19.06 | Copy promo code | กดปุ่ม "คัดลอก" ที่ promo code | Code ถูก copy ลง clipboard แสดง toast "คัดลอกแล้ว" | MEDIUM |

---

### MODULE 20: Refund Policy Consent (4 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 20.01 | แสดงเงื่อนไขคืนเงิน | Register flow หรือ booking flow → แสดง modal/page เงื่อนไขคืนเงิน | แสดงข้อความเงื่อนไขครบถ้วน | HIGH |
| 20.02 | Scroll ถึงล่างสุด | เลื่อนเงื่อนไขลงจนสุด | ปุ่ม "ยอมรับ" หรือ checkbox เปิดให้ใช้งาน (ก่อนหน้าเป็น disabled) | MEDIUM |
| 20.03 | ติ๊ก checkbox + submit | ติ๊ก "ฉันยอมรับเงื่อนไข" → กดปุ่ม submit | Consent ถูกบันทึก ดำเนินการต่อได้ | HIGH |
| 20.04 | ไม่ติ๊ก checkbox + submit | ไม่ติ๊ก checkbox → กดปุ่ม submit | ปุ่ม submit เป็น disabled หรือแสดง error | MEDIUM |

---

### MODULE 21: Legal Pages (2 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 21.01 | Terms of Service | ไปหน้า `/terms` | แสดงเนื้อหาข้อกำหนดการใช้งาน ไม่เป็นหน้าว่าง | MEDIUM |
| 21.02 | Privacy Policy | ไปหน้า `/privacy` | แสดงเนื้อหานโยบายความเป็นส่วนตัว ไม่เป็นหน้าว่าง | MEDIUM |

---

### MODULE 22: [PLANNED] Loyalty Points - Earn (6 TC)

> ฟีเจอร์ยังไม่ได้พัฒนา — ข้ามไปก่อนจนกว่าจะ implement

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 22.01 | [PLANNED] Booking completed ได้รับแต้ม | Customer จอง → Staff complete งาน → booking status = completed | Customer ได้รับแต้ม = floor(final_price / points_per_baht) เช่น ฿800 / ฿100 = 8 แต้ม | HIGH |
| 22.02 | [PLANNED] First booking bonus | Customer ใหม่ → จอง → completed (ครั้งแรก) | ได้รับแต้มปกติ + โบนัสจองครั้งแรก (default 50 แต้ม) เป็น 2 records แยกกัน | HIGH |
| 22.03 | [PLANNED] Hotel booking ไม่ได้แต้ม | Booking ที่จองผ่าน Hotel App (is_hotel_booking = true) → completed | ไม่มี record ใน point_transactions สำหรับ booking นี้ | HIGH |
| 22.04 | [PLANNED] Cancelled booking ไม่ได้แต้ม | Customer จอง → ยกเลิก (ก่อน completed) | ไม่มี record type=earn ใน point_transactions สำหรับ booking นี้ | MEDIUM |
| 22.05 | [PLANNED] คำนวณจาก final_price | Customer จอง ฿1,200 → ใช้ promo ลด ฿200 → final_price = ฿1,000 → completed | ได้รับ 10 แต้ม (฿1,000 / ฿100) ไม่ใช่ 12 แต้ม | MEDIUM |
| 22.06 | [PLANNED] ปัดลง (floor) | Customer จอง final_price = ฿250 → completed | ได้รับ 2 แต้ม (฿250 / ฿100 = 2.5 ปัดลงเป็น 2) ไม่ใช่ 3 | MEDIUM |

---

### MODULE 23: [PLANNED] Loyalty Points - Redeem (7 TC)

> ฟีเจอร์ยังไม่ได้พัฒนา — ข้ามไปก่อนจนกว่าจะ implement

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 23.01 | [PLANNED] ใช้แต้มแลกส่วนลด | Customer มี 500 แต้ม → จอง → Step 5 → กรอกใช้ 500 แต้ม → ชำระเงิน | ส่วนลด ฿50 (500 / 10) ถูกหักจากราคา ยอดชำระลดลง แต้มถูกหัก 500 ทันที | HIGH |
| 23.02 | [PLANNED] ใช้แต้มร่วมกับ promo code | Customer มี 500 แต้ม → จอง ฿1,200 → กรอก promo ลด ฿200 → ใช้ 500 แต้ม | ลำดับ: ฿1,200 → -฿200 (promo) → -฿50 (points) → ยอดชำระ ฿950 | HIGH |
| 23.03 | [PLANNED] Validation — แต้มน้อยกว่าขั้นต่ำ | Customer มี 80 แต้ม → จอง → กรอกใช้ 80 แต้ม | แสดง error "ต้องใช้ขั้นต่ำ 100 แต้ม" ไม่สามารถใช้ได้ | MEDIUM |
| 23.04 | [PLANNED] Validation — ใช้แต้มเกินที่มี | Customer มี 300 แต้ม → กรอกใช้ 500 แต้ม | แสดง error "แต้มไม่เพียงพอ" หรือ auto-adjust เป็น 300 | MEDIUM |
| 23.05 | [PLANNED] Validation — ส่วนลดเกิน max % | Customer มี 10,000 แต้ม → จอง ฿500 → ใช้แต้มทั้งหมด (= ฿1,000 ส่วนลด) | ส่วนลดถูก cap ที่ 50% ของราคา = ฿250 สูงสุด (ใช้ได้ 2,500 แต้ม) | MEDIUM |
| 23.06 | [PLANNED] ยกเลิก booking คืนแต้ม | ใช้ 500 แต้ม จอง → ยกเลิก booking | แต้ม 500 ถูกคืนกลับ (point_transactions type=refund) ยอดแต้มเพิ่มขึ้น | HIGH |
| 23.07 | [PLANNED] ปุ่ม "ใช้แต้มทั้งหมด" และ "ล้าง" | กดปุ่ม "ใช้แต้มทั้งหมด" → ตรวจค่า → กดปุ่ม "ล้าง" | "ใช้ทั้งหมด" กรอกแต้มเต็ม (หรือ cap ที่ max), "ล้าง" reset เป็น 0 ส่วนลดหายไป | MEDIUM |

---

### MODULE 24: [PLANNED] Loyalty Points - UI (6 TC)

> ฟีเจอร์ยังไม่ได้พัฒนา — ข้ามไปก่อนจนกว่าจะ implement

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 24.01 | [PLANNED] Profile widget แสดงแต้ม | ไปหน้า `/profile` | แสดง widget: ยอดแต้มคงเหลือ, มูลค่าเป็นบาท, แต้มใกล้หมดอายุ | HIGH |
| 24.02 | [PLANNED] Points history page | กด "ดูประวัติ" จาก widget → ไปหน้า `/points` | แสดงรายการ: ประเภท (earn/redeem/expire/refund/bonus), จำนวน, booking ref, วันที่ | HIGH |
| 24.03 | [PLANNED] Points history filter — "ได้รับ" | เลือก filter "ได้รับ" | แสดงเฉพาะ type = earn + bonus | MEDIUM |
| 24.04 | [PLANNED] Points history filter — "ใช้แล้ว" | เลือก filter "ใช้แล้ว" | แสดงเฉพาะ type = redeem | MEDIUM |
| 24.05 | [PLANNED] BookingWizard Step 5 section | จอง → Step 5 → ดู section "ใช้แต้มสะสม" | แสดง: ยอดแต้มคงเหลือ, มูลค่าเป็นบาท, input กรอกแต้ม, ปุ่ม "ใช้ทั้งหมด"/"ล้าง" | HIGH |
| 24.06 | [PLANNED] Price breakdown มี points discount | ใช้แต้ม → ดู price breakdown | แสดงบรรทัด "ส่วนลดจากแต้ม -฿XX" ระหว่าง promo discount กับยอดชำระ | HIGH |

---

### MODULE 25: [PLANNED] Loyalty Points - Expiry (4 TC)

> ฟีเจอร์ยังไม่ได้พัฒนา — ข้ามไปก่อนจนกว่าจะ implement

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 25.01 | [PLANNED] Cron ตัดแต้มหมดอายุ | Admin สร้าง point_transaction ที่ expires_at = เมื่อวาน → trigger cron | แต้มถูกตัด (type=expire), customer_points.total_points ลดลง, lifetime_expired เพิ่ม | HIGH |
| 25.02 | [PLANNED] แต้มที่ยังไม่หมดอายุไม่ถูกตัด | Customer มีแต้มที่ expires_at = อีก 30 วัน → trigger cron | แต้มไม่ถูกตัด ยอดไม่เปลี่ยน | HIGH |
| 25.03 | [PLANNED] Notification 30 วันก่อนหมดอายุ | Customer มีแต้มที่ expires_at = อีก 29 วัน → trigger cron | Customer ได้รับ notification "แต้ม X แต้มจะหมดอายุในวันที่ DD/MM/YYYY" | MEDIUM |
| 25.04 | [PLANNED] Notification ไม่ส่งซ้ำ | Trigger cron 2 ครั้งสำหรับแต้มเดียวกัน | Notification ไม่ถูกสร้างซ้ำ (duplicate prevention) | MEDIUM |

---

### MODULE 26: [PLANNED] Loyalty Points - Admin (4 TC)

> ฟีเจอร์ยังไม่ได้พัฒนา — ข้ามไปก่อนจนกว่าจะ implement

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 26.01 | [PLANNED] Admin ดูแต้มลูกค้า | Admin → Customers → คลิก customer detail | แสดง section แต้มสะสม: คงเหลือ, สะสมทั้งหมด, ใช้ไปแล้ว, หมดอายุ + ประวัติล่าสุด | HIGH |
| 26.02 | [PLANNED] Admin ให้แต้มพิเศษ | กดปุ่ม "ให้แต้มพิเศษ" → กรอก 100 แต้ม + เหตุผล "ชดเชย" → ยืนยัน | Customer ได้แต้ม +100, point_transactions type=admin_adjust, description="ชดเชย" | HIGH |
| 26.03 | [PLANNED] Admin หักแต้ม | กดปุ่ม "หักแต้ม" → กรอก 50 แต้ม + เหตุผล "แก้ไขยอด" → ยืนยัน | Customer แต้ม -50, point_transactions type=admin_adjust (points เป็นลบ) | HIGH |
| 26.04 | [PLANNED] Admin หักแต้มเกินที่ Customer มี | Customer มี 30 แต้ม → Admin กรอกหัก 100 แต้ม | แสดง error "แต้มไม่เพียงพอ" ไม่สามารถหักได้ | MEDIUM |

---

### MODULE 27: Responsive/UX (6 TC)

| TC | Test Case | ขั้นตอน | ผลที่คาดหวัง | Priority |
|----|-----------|---------|-------------|----------|
| 27.01 | Mobile menu (hamburger) | เปิด Customer app ด้วย viewport 375px → กดปุ่ม hamburger | แสดง mobile menu รายการ nav ครบ (Home, Services, Bookings, Profile ฯลฯ) | HIGH |
| 27.02 | Loading states | ทำ action ที่ต้องรอ (เช่น โหลดบริการ, โหลด bookings) | แสดง loading spinner/skeleton ระหว่างรอข้อมูล ไม่แสดงหน้าว่างเปล่า | HIGH |
| 27.03 | Error state — API fail | ปิด network/ทำให้ API fail → โหลดหน้า | แสดง error message ที่เข้าใจได้ + ปุ่ม "ลองใหม่" (ไม่ใช่ blank page) | MEDIUM |
| 27.04 | Empty state — ไม่มี bookings | Customer ใหม่ → ไปหน้า `/bookings` | แสดง empty state icon + ข้อความ "ยังไม่มีรายการจอง" + ปุ่ม "จองบริการ" | MEDIUM |
| 27.05 | Empty state — ไม่มี notifications | Customer ไม่มี notification → ไปหน้า `/notifications` | แสดง empty state "ไม่มีการแจ้งเตือน" | LOW |
| 27.06 | Responsive — tablet | เปิด Customer app ด้วย viewport 768px | Layout ปรับตาม breakpoint ไม่มี content ล้นจอ ไม่มี horizontal scroll | MEDIUM |

---

## ขั้นตอนการทดสอบ

### Round 1: Localhost

1. Start dev servers: `cd /c/chitpon59/dev/project/theblissathome.com/the-bliss-at-home && nohup npx turbo run dev --parallel > /tmp/bliss-dev.log 2>&1 &`
2. ทดสอบ TC 1.01 - 27.06 ที่ http://localhost:3008
3. TC ที่มี [PLANNED] ข้ามไปก่อน
4. บันทึกผล PASS/FAIL

### Round 2: Production

1. ทดสอบ TC เดียวกันที่ https://customer.theblissmassageathome.com
2. เปรียบเทียบผลกับ Round 1

---

## สรุปผลการทดสอบ

### Round 1: Localhost

| TC | Module | Test Case | Result | หมายเหตุ |
|----|--------|-----------|--------|---------|
| 1.01 | Auth | Login email/password สำเร็จ | | |
| 1.02 | Auth | Login password ผิด | | |
| 1.03 | Auth | Login email ไม่ถูกรูปแบบ | | |
| 1.04 | Auth | Login ฟิลด์ว่าง | | |
| 1.05 | Auth | Login Google OAuth | | |
| 1.06 | Auth | Login Facebook OAuth | | |
| 1.07 | Auth | Register สำเร็จ | | |
| 1.08 | Auth | Register email ซ้ำ | | |
| 1.09 | Auth | Logout | | |
| 1.10 | Auth | Session persistence | | |
| 1.11 | Auth | Protected route ไม่มี session | | |
| 1.12 | Auth | Forgot password | | |
| 2.01 | Home | Hero section แสดงถูกต้อง | | |
| 2.02 | Home | Search box ค้นหาบริการ | | |
| 2.03 | Home | Promotions carousel แสดง | | |
| 2.04 | Home | Service categories แสดง | | |
| 2.05 | Home | Popular services แสดง | | |
| 2.06 | Home | Customer reviews แสดง | | |
| 2.07 | Home | CTA section | | |
| 2.08 | Home | Global discount banner | | |
| 3.01 | Service Catalog | แสดงรายการบริการทั้งหมด | | |
| 3.02 | Service Catalog | ค้นหาบริการ | | |
| 3.03 | Service Catalog | Filter ตาม category | | |
| 3.04 | Service Catalog | Sort ตามราคา | | |
| 3.05 | Service Catalog | Sort ตาม rating | | |
| 3.06 | Service Catalog | Service card แสดงข้อมูลถูกต้อง | | |
| 3.07 | Service Catalog | Skeleton loading | | |
| 4.01 | Service Detail | แสดงข้อมูลบริการ | | |
| 4.02 | Service Detail | ราคาหลาย duration | | |
| 4.03 | Service Detail | Add-ons แสดง | | |
| 4.04 | Service Detail | Reviews list แสดง | | |
| 4.05 | Service Detail | Star ratings แสดง | | |
| 4.06 | Service Detail | Booking CTA | | |
| 5.01 | Booking Step 1 | เลือก Single | | |
| 5.02 | Booking Step 1 | เลือก Couple | | |
| 5.03 | Booking Step 1 | Couple config — บริการคนที่ 2 | | |
| 5.04 | Booking Step 1 | กด "ถัดไป" ไม่เลือก type | | |
| 6.01 | Booking Step 2 | เลือกวันที่ | | |
| 6.02 | Booking Step 2 | เลือกวันที่ในอดีต | | |
| 6.03 | Booking Step 2 | เลือกเวลา | | |
| 6.04 | Booking Step 2 | เวลาที่ไม่ว่าง | | |
| 6.05 | Booking Step 2 | กด "ถัดไป" ไม่เลือกวันเวลา | | |
| 6.06 | Booking Step 2 | กด "ย้อนกลับ" | | |
| 7.01 | Booking Step 3 | เลือก duration | | |
| 7.02 | Booking Step 3 | เปลี่ยน duration | | |
| 7.03 | Booking Step 3 | เลือก add-on | | |
| 7.04 | Booking Step 3 | เลือกหลาย add-ons | | |
| 7.05 | Booking Step 3 | ยกเลิก add-on | | |
| 8.01 | Booking Step 4 | แสดงที่อยู่ที่บันทึกไว้ | | |
| 8.02 | Booking Step 4 | เลือกที่อยู่ที่บันทึกไว้ | | |
| 8.03 | Booking Step 4 | เพิ่มที่อยู่ใหม่ — สำเร็จ | | |
| 8.04 | Booking Step 4 | เพิ่มที่อยู่ใหม่ — ฟิลด์ว่าง | | |
| 8.05 | Booking Step 4 | Google Maps picker | | |
| 8.06 | Booking Step 4 | Thai address autocomplete | | |
| 8.07 | Booking Step 4 | ไม่มีที่อยู่ — ต้องเพิ่ม | | |
| 9.01 | Booking Step 5 | สรุปการจองแสดงถูกต้อง | | |
| 9.02 | Booking Step 5 | กรอก voucher code สำเร็จ | | |
| 9.03 | Booking Step 5 | กรอก voucher code ไม่ถูกต้อง | | |
| 9.04 | Booking Step 5 | กรอก voucher code หมดอายุ | | |
| 9.05 | Booking Step 5 | Price breakdown แสดง | | |
| 9.06 | Booking Step 5 | Provider preference | | |
| 9.07 | Booking Step 5 | ยกเลิก voucher code | | |
| 10.01 | Booking Step 6 | เลือกบัตรเครดิต | | |
| 10.02 | Booking Step 6 | กรอกบัตร — สำเร็จ | | |
| 10.03 | Booking Step 6 | กรอกบัตร — บัตรไม่ผ่าน | | |
| 10.04 | Booking Step 6 | กรอกบัตร — ฟิลด์ว่าง | | |
| 10.05 | Booking Step 6 | เลือกบัตรที่บันทึกไว้ | | |
| 10.06 | Booking Step 6 | Payment confirmation page | | |
| 11.01 | Booking History | แสดงรายการจอง | | |
| 11.02 | Booking History | Filter ตาม status | | |
| 11.03 | Booking History | Filter status "ทั้งหมด" | | |
| 11.04 | Booking History | ค้นหาจอง | | |
| 11.05 | Booking History | ไม่มีรายการจอง | | |
| 12.01 | Booking Detail | แสดงรายละเอียดจอง | | |
| 12.02 | Booking Detail | Cancel booking — modal | | |
| 12.03 | Booking Detail | Cancel booking — ยืนยัน | | |
| 12.04 | Booking Detail | Cancel — booking ที่ยกเลิกไม่ได้ | | |
| 12.05 | Booking Detail | Reschedule booking — modal | | |
| 12.06 | Booking Detail | Review booking — modal | | |
| 12.07 | Booking Detail | Receipt download | | |
| 12.08 | Booking Detail | Credit note download | | |
| 13.01 | Profile Info | แสดงข้อมูลส่วนตัว | | |
| 13.02 | Profile Info | แก้ไขชื่อ | | |
| 13.03 | Profile Info | แก้ไขเบอร์โทร | | |
| 13.04 | Profile Info | แก้ไขวันเกิด | | |
| 13.05 | Profile Info | Validation — ชื่อว่าง | | |
| 13.06 | Profile Info | Validation — เบอร์โทรไม่ถูก | | |
| 14.01 | Profile Addresses | แสดงรายการที่อยู่ | | |
| 14.02 | Profile Addresses | เพิ่มที่อยู่ใหม่ | | |
| 14.03 | Profile Addresses | แก้ไขที่อยู่ | | |
| 14.04 | Profile Addresses | ลบที่อยู่ | | |
| 14.05 | Profile Addresses | ตั้งเป็นค่าเริ่มต้น | | |
| 14.06 | Profile Addresses | Google Maps picker | | |
| 14.07 | Profile Addresses | Thai address เชื่อมกัน | | |
| 14.08 | Profile Addresses | Validation — ฟิลด์ว่าง | | |
| 15.01 | Payment Methods | แสดงรายการบัตร | | |
| 15.02 | Payment Methods | เพิ่มบัตรใหม่ | | |
| 15.03 | Payment Methods | ลบบัตร | | |
| 15.04 | Payment Methods | ตั้งบัตรเริ่มต้น | | |
| 15.05 | Payment Methods | ไม่มีบัตร | | |
| 16.01 | Tax Info | แสดงข้อมูลภาษี | | |
| 16.02 | Tax Info | สร้างข้อมูลภาษี | | |
| 16.03 | Tax Info | แก้ไขข้อมูลภาษี | | |
| 16.04 | Tax Info | Validation — tax ID | | |
| 17.01 | Transactions | แสดงประวัติธุรกรรม | | |
| 17.02 | Transactions | Filter ตาม status | | |
| 17.03 | Transactions | Filter "คืนเงิน" | | |
| 17.04 | Transactions | Receipt download | | |
| 17.05 | Transactions | ไม่มีธุรกรรม | | |
| 18.01 | Notifications | แสดง notification center | | |
| 18.02 | Notifications | Notification types | | |
| 18.03 | Notifications | Mark as read | | |
| 18.04 | Notifications | Mark all as read | | |
| 18.05 | Notifications | Unread badge | | |
| 18.06 | Notifications | Real-time notification | | |
| 19.01 | Promotions | แสดงรายการโปรโมชั่น | | |
| 19.02 | Promotions | ค้นหาโปรโมชั่น | | |
| 19.03 | Promotions | Filter ตามประเภท | | |
| 19.04 | Promotions | Sort โปรโมชั่น | | |
| 19.05 | Promotions | ดูรายละเอียด | | |
| 19.06 | Promotions | Copy promo code | | |
| 20.01 | Refund Policy | แสดงเงื่อนไขคืนเงิน | | |
| 20.02 | Refund Policy | Scroll ถึงล่างสุด | | |
| 20.03 | Refund Policy | ติ๊ก checkbox + submit | | |
| 20.04 | Refund Policy | ไม่ติ๊ก checkbox + submit | | |
| 21.01 | Legal | Terms of Service | | |
| 21.02 | Legal | Privacy Policy | | |
| 22.01 | [PLANNED] Earn | Booking completed ได้รับแต้ม | | |
| 22.02 | [PLANNED] Earn | First booking bonus | | |
| 22.03 | [PLANNED] Earn | Hotel booking ไม่ได้แต้ม | | |
| 22.04 | [PLANNED] Earn | Cancelled ไม่ได้แต้ม | | |
| 22.05 | [PLANNED] Earn | คำนวณจาก final_price | | |
| 22.06 | [PLANNED] Earn | ปัดลง (floor) | | |
| 23.01 | [PLANNED] Redeem | ใช้แต้มแลกส่วนลด | | |
| 23.02 | [PLANNED] Redeem | ใช้แต้ม + promo code | | |
| 23.03 | [PLANNED] Redeem | แต้มน้อยกว่าขั้นต่ำ | | |
| 23.04 | [PLANNED] Redeem | ใช้แต้มเกินที่มี | | |
| 23.05 | [PLANNED] Redeem | ส่วนลดเกิน max % | | |
| 23.06 | [PLANNED] Redeem | ยกเลิก booking คืนแต้ม | | |
| 23.07 | [PLANNED] Redeem | ปุ่ม "ใช้ทั้งหมด"/"ล้าง" | | |
| 24.01 | [PLANNED] Points UI | Profile widget แสดงแต้ม | | |
| 24.02 | [PLANNED] Points UI | Points history page | | |
| 24.03 | [PLANNED] Points UI | Filter "ได้รับ" | | |
| 24.04 | [PLANNED] Points UI | Filter "ใช้แล้ว" | | |
| 24.05 | [PLANNED] Points UI | BookingWizard section | | |
| 24.06 | [PLANNED] Points UI | Price breakdown มี points | | |
| 25.01 | [PLANNED] Expiry | Cron ตัดแต้มหมดอายุ | | |
| 25.02 | [PLANNED] Expiry | แต้มยังไม่หมดไม่ถูกตัด | | |
| 25.03 | [PLANNED] Expiry | Notification ก่อนหมดอายุ | | |
| 25.04 | [PLANNED] Expiry | Notification ไม่ส่งซ้ำ | | |
| 26.01 | [PLANNED] Admin Points | ดูแต้มลูกค้า | | |
| 26.02 | [PLANNED] Admin Points | ให้แต้มพิเศษ | | |
| 26.03 | [PLANNED] Admin Points | หักแต้ม | | |
| 26.04 | [PLANNED] Admin Points | หักแต้มเกินที่มี | | |
| 27.01 | UX | Mobile menu (hamburger) | | |
| 27.02 | UX | Loading states | | |
| 27.03 | UX | Error state — API fail | | |
| 27.04 | UX | Empty state — ไม่มี bookings | | |
| 27.05 | UX | Empty state — ไม่มี notifications | | |
| 27.06 | UX | Responsive — tablet | | |

### Round 2: Production

(ใช้ตารางเดียวกับ Round 1 ทดสอบซ้ำบน production)

| TC | Module | Test Case | Result | หมายเหตุ |
|----|--------|-----------|--------|---------|
| ... | ... | ... | | |

---

## หมายเหตุ

- TC ที่มี **[PLANNED]** คือฟีเจอร์ Loyalty Points ที่อยู่ในแผนพัฒนาแต่ยังไม่ได้ implement — ข้ามไปก่อนจนกว่าจะพัฒนาเสร็จ
- ทดสอบ Round 1 (Localhost) ก่อนเสมอ ถ้า FAIL ให้แก้โค้ดจนผ่าน แล้วค่อยทดสอบ Round 2 (Production)
- Booking flow ที่ต้องชำระเงินจริง ใช้ Omise test card: `4242 4242 4242 4242` (Visa), expiry อนาคต, CVV 123
- Google/Facebook OAuth ทดสอบได้เฉพาะ production (localhost ต้องตั้งค่า OAuth redirect URI)
- Real-time notification (TC 18.06) ต้องเปิด 2 browser: Admin + Customer พร้อมกัน
