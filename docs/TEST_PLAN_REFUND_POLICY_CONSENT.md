# Test Plan: Refund Policy Consent System

## Prompt สำหรับสั่ง Claude AI ทดสอบ

```
อ่านไฟล์ docs/TEST_PLAN_REFUND_POLICY_CONSENT.md แล้วทดสอบตามแผนทั้งหมดด้วย Playwright

เงื่อนไข:
- ปิด Chrome ก่อนเริ่มทดสอบ
- Customer app: http://localhost:3008
- Admin app: http://localhost:3001
- login admin ด้วย admintest@theblissathome.com / Admin@12345
- login customer ด้วย mazmakerdesign@gmail.com / U9B*B2LE#8-q!m8
- ทดสอบตาม Section 1-7 ตามลำดับ
- หากพบข้อผิดพลาดให้แก้ไขจนทำงานถูกต้อง แล้วทดสอบซ้ำ
- รายงานผล Pass/Fail ของแต่ละ Test Case
```

---

## สรุปการแก้ไข

### 1. Database
- เพิ่ม column `refund_policy_accepted_at` (timestamptz) ใน `profiles` table
- เพิ่ม column `refund_policy_version` (text) ใน `profiles` table
- เพิ่ม setting key `refund_policy_content` ใน `settings` table (JSONB: `{value: "markdown content", version: "1.0"}`)

### 2. ไฟล์ที่แก้ไข / สร้างใหม่

| ไฟล์ | การแก้ไข |
|------|----------|
| `apps/customer/src/components/RefundPolicyConsent.tsx` | **ใหม่** — component + hook สำหรับ consent |
| `apps/customer/src/pages/Register.tsx` | เพิ่ม RefundPolicyConsent ในฟอร์มลงทะเบียน |
| `apps/customer/src/App.tsx` | เพิ่ม ConsentModalGuard (Google login) + BookingWizardWrapper guard |
| `apps/admin/src/pages/Settings.tsx` | เพิ่ม tab "เงื่อนไขการคืนเงิน" สำหรับ admin แก้ไขเนื้อหา |

### 3. Component: RefundPolicyConsent
- โหลดเนื้อหาจาก `settings.refund_policy_content`
- Scrollable box (ต้อง scroll ถึงล่างสุดก่อน checkbox จึงจะ enable)
- Checkbox ยอมรับเงื่อนไข
- บันทึก `refund_policy_accepted_at` + `refund_policy_version` ลง profiles
- ใช้ได้ทั้งแบบ inline (Register) และ modal (Google login / Booking guard)

### 4. Hook: useRefundPolicyConsent
- ตรวจสอบว่า user ยอมรับเงื่อนไขแล้วหรือไม่
- เปรียบเทียบ version ที่ user ยอมรับกับ version ปัจจุบัน
- หาก admin เปลี่ยน version → user ต้องยอมรับใหม่

### 5. Flow ทั้งหมด

```
Register (email):
  ฟอร์ม → scroll อ่านเงื่อนไขจนจบ → checkbox → กดลงทะเบียน
  ถ้าไม่ scroll/checkbox → ปุ่มลงทะเบียน disabled

Google Login:
  Login → Callback → Home → ConsentModalGuard ตรวจ consent
  → ยังไม่ยอมรับ: แสดง modal (ต้องยอมรับก่อน)
  → ยอมรับแล้ว: ไม่แสดง modal

จองบริการ:
  /booking → BookingWizardWrapper ตรวจ consent
  → ยังไม่ยอมรับ: แสดง modal (ต้องยอมรับก่อนเข้า BookingWizard)
  → ยอมรับแล้ว: เข้า BookingWizard ปกติ

Admin เปลี่ยน version:
  Settings → เปลี่ยน version → บันทึก → ลูกค้าเก่าต้องยอมรับใหม่
```

---

## Test Environment

| Target | URL | Credentials |
|--------|-----|-------------|
| Customer App | http://localhost:3008 | mazmakerdesign@gmail.com / U9B*B2LE#8-q!m8 |
| Admin App | http://localhost:3001 | admintest@theblissathome.com / Admin@12345 |

### Test Data Reset (ก่อนเริ่มทดสอบ)
```sql
-- ล้าง consent ของ customer ทดสอบ
UPDATE profiles SET refund_policy_accepted_at = NULL, refund_policy_version = NULL
WHERE email = 'mazmakerdesign@gmail.com';
```

---

## SECTION 1: Admin — จัดการเนื้อหาเงื่อนไขการคืนเงิน

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 1.1 | แสดง tab เงื่อนไขการคืนเงิน | Admin → ตั้งค่า | มี tab "เงื่อนไขการคืนเงิน" แสดงอยู่ |
| 1.2 | โหลดเนื้อหาปัจจุบัน | กดเข้า tab เงื่อนไขการคืนเงิน | แสดง textarea พร้อมเนื้อหา markdown + ช่อง version |
| 1.3 | แก้ไขเนื้อหา | แก้ไขข้อความใน textarea → กดบันทึก | แสดง success message "บันทึกเงื่อนไขการคืนเงินเรียบร้อย" |
| 1.4 | เปลี่ยน version | เปลี่ยน version จาก "1.0" เป็น "2.0" → บันทึก | บันทึกสำเร็จ |
| 1.5 | เนื้อหาว่าง | ลบเนื้อหาทั้งหมด → บันทึก | บันทึกได้ (แต่ customer จะเห็น content ว่าง) |

---

## SECTION 2: Customer Register — แสดงเงื่อนไขในฟอร์มลงทะเบียน

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 2.1 | แสดง section เงื่อนไขการคืนเงิน | เปิดหน้า /register | มี section "เงื่อนไขการคืนเงิน" พร้อม scrollable box |
| 2.2 | ปุ่มลงทะเบียน disabled ก่อนยอมรับ | กรอกข้อมูลครบทุกช่อง + ติ๊ก terms แต่ยังไม่ยอมรับ refund policy | ปุ่ม "ลงทะเบียน" ยัง disabled |
| 2.3 | Checkbox disabled ก่อน scroll จนจบ | ดู checkbox "ยอมรับเงื่อนไข" | checkbox disabled + ข้อความ "กรุณาเลื่อนอ่านเงื่อนไขให้ครบก่อน" |
| 2.4 | Scroll จนจบ → checkbox enabled | scroll ลงจนสุด scrollable box | ข้อความ "เลื่อนอ่าน..." หายไป, checkbox enabled |
| 2.5 | ติ๊ก checkbox → ปุ่มลงทะเบียน enabled | scroll จนจบ → ติ๊ก checkbox + ติ๊ก terms | ปุ่ม "ลงทะเบียน" enabled |
| 2.6 | ลงทะเบียนสำเร็จ | กรอกข้อมูลครบ + ยอมรับทั้ง 2 checkbox → กดลงทะเบียน | ลงทะเบียนสำเร็จ, redirect ไป /services |

---

## SECTION 3: Google Login — Consent Modal หลัง Login

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 3.1 | แสดง modal หลัง login (ยังไม่เคยยอมรับ) | Login ด้วย email (แทน Google) → reset consent → refresh | แสดง Consent Modal overlay |
| 3.2 | Modal บังคับ scroll + checkbox | ดู modal | Scrollable box + checkbox disabled จนกว่าจะ scroll จนจบ |
| 3.3 | ยอมรับเงื่อนไขใน modal | scroll จนจบ → ติ๊ก checkbox → กด "ยืนยันยอมรับเงื่อนไข" | Modal ปิด, บันทึก consent timestamp |
| 3.4 | ไม่แสดง modal ซ้ำหลังยอมรับแล้ว | refresh หน้า | ไม่แสดง modal |
| 3.5 | Modal แสดงอีกเมื่อ admin เปลี่ยน version | Admin เปลี่ยน version → customer refresh | แสดง modal อีกครั้ง (version ไม่ตรง) |

---

## SECTION 4: Booking — บล็อกจองถ้ายังไม่ยอมรับ

| TC | ทดสอบ | Precondition | ผลลัพธ์ที่คาดหวัง |
|----|-------|--------------|-------------------|
| 4.1 | แสดง consent modal เมื่อเข้า /booking | reset consent → ไปที่ /booking | แสดง Consent Modal แทน BookingWizard |
| 4.2 | ยอมรับแล้วเข้า booking ได้ | ยอมรับเงื่อนไขใน modal | Modal ปิด, BookingWizard แสดงปกติ |
| 4.3 | เข้า booking ได้เลยถ้ายอมรับแล้ว | consent accepted → ไปที่ /booking | BookingWizard แสดงทันที ไม่มี modal |

---

## SECTION 5: Consent Version Management

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 5.1 | User ยอมรับ v1.0 | Customer ยอมรับเงื่อนไข version 1.0 | profiles.refund_policy_version = "1.0" |
| 5.2 | Admin อัป version เป็น 2.0 | Admin → Settings → เปลี่ยน version → บันทึก | settings value.version = "2.0" |
| 5.3 | User ต้องยอมรับใหม่ | Customer refresh หน้า | แสดง Consent Modal อีกครั้ง (v1.0 ≠ v2.0) |
| 5.4 | User ยอมรับ v2.0 | ยอมรับเงื่อนไขใหม่ | profiles.refund_policy_version = "2.0", modal ไม่แสดงอีก |

---

## SECTION 6: Edge Cases

| TC | ทดสอบ | ผลลัพธ์ที่คาดหวัง |
|----|-------|-------------------|
| 6.1 | เนื้อหาสั้น (ไม่ต้อง scroll) | ถ้าเนื้อหาสั้นกว่า box → checkbox enabled ทันที |
| 6.2 | เนื้อหายาวมาก | scroll ได้ปกติ, checkbox enabled เมื่อถึงล่างสุด |
| 6.3 | ไม่มี user login → ไม่แสดง modal | เปิด home page โดยไม่ login | ConsentModalGuard ไม่แสดง (no user) |
| 6.4 | Register form — ยกเลิก checkbox refund | ติ๊ก checkbox → ถอดติ๊ก | ปุ่มลงทะเบียน กลับเป็น disabled |
| 6.5 | Modal — กดปิดไม่ได้ | ดู modal | ไม่มีปุ่มปิด/dismiss (ต้องยอมรับเท่านั้น) |

---

## SECTION 7: Database Integrity

| TC | ทดสอบ | วิธีตรวจสอบ | ผลลัพธ์ที่คาดหวัง |
|----|-------|------------|-------------------|
| 7.1 | columns มีอยู่ใน profiles | `SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name LIKE 'refund%'` | 2 columns: refund_policy_accepted_at, refund_policy_version |
| 7.2 | settings key มีอยู่ | `SELECT key FROM settings WHERE key='refund_policy_content'` | 1 row |
| 7.3 | consent timestamp บันทึกถูกต้อง | หลังยอมรับ → ตรวจ profiles | refund_policy_accepted_at ไม่เป็น null, refund_policy_version ตรงกับ version ปัจจุบัน |
| 7.4 | RLS อนุญาต customer update consent | Customer update refund_policy_accepted_at ผ่าน supabase client | สำเร็จ |

---

## Playwright Selectors Reference

### Register Page (/register)
- Refund policy section: text "เงื่อนไขการคืนเงิน"
- Scrollable box: div with `overflow-y-auto` ภายใน section
- Checkbox: text "ข้าพเจ้าได้อ่านและยอมรับเงื่อนไขการคืนเงินข้างต้นแล้ว"
- Scroll hint: text "กรุณาเลื่อนอ่านเงื่อนไขให้ครบก่อน"
- Submit button: button "ลงทะเบียน"

### Consent Modal
- Modal container: div with `fixed inset-0 z-50`
- Accept button: button "ยืนยันยอมรับเงื่อนไข"
- Same scrollable box + checkbox as above

### Admin Settings (/admin/settings)
- Tab: text "เงื่อนไขการคืนเงิน"
- Version input: text "เวอร์ชัน"
- Content textarea: placeholder "เขียนเงื่อนไขการคืนเงินที่นี่..."
- Save button: button "บันทึก" within refund_policy tab

### Booking (/booking)
- If consent needed: Consent Modal shows instead of BookingWizard
- After consent: BookingWizard step 1 shows

---

## Test Execution Order (แนะนำ)

1. Section 7 (DB checks) — verify foundation
2. Section 1 (Admin editor) — verify admin can manage content
3. Section 2 (Register form) — verify registration flow
4. Section 3 (Consent modal) — verify post-login flow
5. Section 4 (Booking guard) — verify booking block
6. Section 5 (Version management) — verify version upgrade flow
7. Section 6 (Edge cases) — verify edge scenarios
