# Test Plan: House Registration KYC + Emergency Contact + Eligibility

## Prompt สำหรับสั่ง Claude AI ทดสอบ

```
อ่านไฟล์ docs/TEST_PLAN_KYC_EMERGENCY_CONTACT.md แล้วทดสอบตามแผนทั้งหมดด้วย Playwright

เงื่อนไข:
- ปิด Chrome ก่อนเริ่มทดสอบ
- Staff app เปิดผ่าน tunnel (cloudflared tunnel --url http://localhost:3004)
- Admin app เปิดที่ http://localhost:3001
- login admin ด้วย admintest@theblissathome.com / Admin@12345
- Staff app ต้องรอ login ผ่าน LINE (แจ้งเมื่อต้องการ login)
- ทดสอบตาม Section 1-8 ตามลำดับ
- รายงานผล Pass/Fail ของแต่ละ Test Case
```

---

## สรุปการแก้ไขที่ทำไป

### 1. Database
- เพิ่ม 3 columns ใน `staff` table: `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relationship`

### 2. Document Type ใหม่: สำเนาทะเบียนบ้าน (house_registration)
- เพิ่มใน `DocumentType` union (`packages/supabase/src/staff/types.ts`)
- เพิ่มใน `DOCUMENT_TYPES` labels map
- เพิ่มใน dropdown อัปโหลดเอกสารทั้ง Staff app และ Admin app
- เพิ่มใน `getDocumentTypeLabel()` ของ Admin StaffDetail

### 3. บุคคลอ้างอิง (Emergency Contact) Section
- Staff Profile: section ใหม่ ฟอร์ม (ชื่อ, เบอร์โทร, dropdown ความสัมพันธ์) + CRUD
- Admin StaffDetail: แสดงข้อมูลบุคคลอ้างอิงใน Overview tab
- Hook ใหม่: `useEmergencyContact()`
- Service functions ใหม่: `getEmergencyContact()`, `updateEmergencyContact()`

### 4. Eligibility Check อัปเดต (canStaffStartWork)
- เพิ่มเงื่อนไข: `house_registration` ต้อง uploaded + verified
- เพิ่มเงื่อนไข: `emergency contact` ต้องกรอกครบ 3 ช่อง
- Dashboard แสดง blocker messages ใหม่
- Staff ไม่สามารถรับงานได้จนกว่าจะผ่านทุกเงื่อนไข

### ไฟล์ที่แก้ไข (8 ไฟล์)
| ไฟล์ | การแก้ไข |
|------|----------|
| `packages/supabase/src/staff/types.ts` | เพิ่ม house_registration, StaffEligibility, EMERGENCY_CONTACT_RELATIONSHIPS |
| `packages/supabase/src/staff/staffService.ts` | เพิ่ม canStaffStartWork checks + emergency contact CRUD |
| `packages/supabase/src/staff/useStaffProfile.ts` | เพิ่ม useEmergencyContact hook |
| `apps/staff/src/pages/StaffProfile.tsx` | เพิ่ม emergency contact section UI |
| `apps/staff/src/pages/StaffDashboard.tsx` | เพิ่ม eligibility blockers |
| `apps/admin/src/pages/StaffDetail.tsx` | เพิ่ม house_registration label + emergency contact display |
| `apps/admin/src/services/staffDocumentService.ts` | เพิ่ม house_registration type + label |
| `apps/admin/src/components/UploadDocumentModal.tsx` | เพิ่ม house_registration ใน dropdown |

---

## Test Environment

| Target | URL | Notes |
|--------|-----|-------|
| Staff App | tunnel URL (cloudflared) | LINE LIFF, user "ทดสอบ999" |
| Admin App | http://localhost:3001 | admintest@theblissathome.com / Admin@12345 |
| Staff ID | bc8abf87-14d7-403b-b013-7ed73c014cb0 | |

### Test Data Reset (ก่อนเริ่มทดสอบ)
```sql
-- ลบเอกสาร house_registration ทดสอบ
DELETE FROM staff_documents WHERE staff_id = 'bc8abf87-14d7-403b-b013-7ed73c014cb0' AND document_type = 'house_registration';

-- ล้าง emergency contact
UPDATE staff SET emergency_contact_name = NULL, emergency_contact_phone = NULL, emergency_contact_relationship = NULL WHERE id = 'bc8abf87-14d7-403b-b013-7ed73c014cb0';
```

---

## SECTION 1: House Registration Document — Staff App Upload

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 1.1 | dropdown มี "สำเนาทะเบียนบ้าน" | Staff Profile → "เพิ่มเอกสาร" → เปิด dropdown ประเภท | มีตัวเลือก "สำเนาทะเบียนบ้าน" ครบ 6 ประเภท |
| 1.2 | อัปโหลดสำเร็จ (happy path) | เลือก "สำเนาทะเบียนบ้าน" → เลือกไฟล์ JPG → กดอัปโหลด | แสดง success, เอกสารปรากฏในรายการ status "รอตรวจสอบ" |
| 1.3 | ไฟล์ใหญ่เกิน 10MB | เลือกไฟล์ > 10MB | แจ้งเตือน "ไฟล์มีขนาดใหญ่เกิน 10MB" |
| 1.4 | ไฟล์ผิดประเภท | เลือกไฟล์ .docx | input ไม่รับไฟล์ (accept จำกัด image/jpeg, image/png, application/pdf) |
| 1.5 | ไม่เลือกไฟล์ | กดอัปโหลดโดยไม่เลือกไฟล์ | ปุ่ม disabled |
| 1.6 | อัปโหลดพร้อม notes + วันหมดอายุ | เลือกไฟล์ + ใส่ notes + ใส่ expiry → อัปโหลด | สำเร็จ, notes/expiry ถูกบันทึก |
| 1.7 | ลบเอกสาร house_registration | กดลบเอกสารที่อัปโหลด | ลบสำเร็จ, eligibility กลับมาแสดง blocker |
| 1.8 | อัปโหลด PDF | เลือกไฟล์ PDF | อัปโหลดสำเร็จ |

---

## SECTION 2: House Registration Document — Admin App

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 2.1 | dropdown Admin มี "สำเนาทะเบียนบ้าน" | Admin → Staff detail → Documents tab → "อัปโหลดเอกสาร" | dropdown มี "สำเนาทะเบียนบ้าน" |
| 2.2 | Admin อัปโหลดให้ staff | Admin อัปโหลด house_registration | เอกสารปรากฏ status "pending" |
| 2.3 | Admin ดูเอกสาร | เปิดเอกสารที่อัปโหลด | แสดง label "สำเนาทะเบียนบ้าน" ถูกต้อง |
| 2.4 | Admin อนุมัติ | กดอนุมัติเอกสาร house_registration | status เปลี่ยนเป็น "ยืนยันแล้ว" (เขียว) |
| 2.5 | Admin ปฏิเสธ | กดปฏิเสธ + ใส่เหตุผล "เอกสารไม่ชัดเจน" | status "ถูกปฏิเสธ", แสดงเหตุผล |

---

## SECTION 3: Emergency Contact — Staff App CRUD

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 3.1 | แสดงข้อมูลที่มีอยู่ | เปิด Profile → ดู section บุคคลอ้างอิง | แสดงชื่อ, เบอร์, ความสัมพันธ์ + ปุ่ม "แก้ไข" |
| 3.2 | แสดงเมื่อไม่มีข้อมูล | (reset data ก่อน) → เปิด Profile | แสดง "ยังไม่ได้กรอกข้อมูลบุคคลอ้างอิง" + ปุ่ม "เพิ่ม" |
| 3.3 | เพิ่มข้อมูล (happy path) | กด "เพิ่ม" → กรอก ชื่อ + เบอร์ + เลือกความสัมพันธ์ → บันทึก | success toast, แสดงข้อมูลที่กรอก, eligibility อัปเดต |
| 3.4 | แก้ไขข้อมูล | กด "แก้ไข" → เปลี่ยนชื่อ + ความสัมพันธ์ → บันทึก | ข้อมูลอัปเดต, success toast |
| 3.5 | ยกเลิกการแก้ไข | กด "แก้ไข" → แก้ไขข้อมูล → กด "ยกเลิก" | form กลับเป็นข้อมูลเดิม |
| 3.6 | บันทึกโดยไม่กรอกชื่อ | ปล่อยชื่อว่าง → กดบันทึก | error "กรุณากรอกข้อมูลบุคคลอ้างอิงให้ครบทุกช่อง" |
| 3.7 | บันทึกโดยไม่กรอกเบอร์ | ปล่อยเบอร์ว่าง → กดบันทึก | error เดียวกัน |
| 3.8 | บันทึกโดยไม่เลือกความสัมพันธ์ | ปล่อย dropdown เป็น default → กดบันทึก | error เดียวกัน |
| 3.9 | dropdown ความสัมพันธ์ | เปิด dropdown | มี 8 ตัวเลือก: บิดา, มารดา, คู่สมรส, พี่/น้อง, บุตร, ญาติ, เพื่อน, อื่นๆ |

---

## SECTION 4: Emergency Contact — Admin App Display

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 4.1 | Admin เห็นข้อมูลบุคคลอ้างอิง | Admin → Staff detail → Overview tab | แสดงชื่อ, เบอร์, ความสัมพันธ์ ตรงกับที่ staff กรอก |
| 4.2 | Admin เห็นเมื่อไม่มีข้อมูล | (reset data ก่อน) → Admin → Staff detail | แสดง "ยังไม่ได้กรอกข้อมูลบุคคลอ้างอิง" |
| 4.3 | ความสัมพันธ์แสดงเป็นภาษาไทย | ค่าใน DB = "father" → Admin แสดง "บิดา" | แปลจาก value เป็น label ถูกต้อง |

---

## SECTION 5: Cross-App Consistency

| TC | ทดสอบ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง |
|----|-------|---------|-------------------|
| 5.1 | Staff บันทึก → Admin เห็น | Staff แก้ไข emergency contact → Admin refresh | Admin เห็นข้อมูลตรงกัน |
| 5.2 | Staff อัปโหลด → Admin เห็น | Staff อัปโหลด house_registration → Admin ดู Documents tab | เอกสารปรากฏ type "สำเนาทะเบียนบ้าน" status "pending" |
| 5.3 | Admin อนุมัติ → Staff เห็นสถานะ | Admin approve house_registration → Staff refresh Profile | เอกสาร status "ยืนยันแล้ว", eligibility blocker หายไป |
| 5.4 | Admin ปฏิเสธ → Staff เห็น | Admin reject → Staff refresh | เอกสาร "ถูกปฏิเสธ" + เหตุผล, dashboard blocker ยังอยู่ |

---

## SECTION 6: Eligibility Flow (canStaffStartWork)

| TC | ทดสอบ | Precondition | ผลลัพธ์ที่คาดหวัง |
|----|-------|--------------|-------------------|
| 6.1 | blocker ทะเบียนบ้านขาด | id_card ✅, bank ✅, emergency ✅, house_reg ❌ | Dashboard แสดง "อัพโหลดและรอการตรวจสอบสำเนาทะเบียนบ้าน" |
| 6.2 | blocker บุคคลอ้างอิงขาด | ล้าง emergency contact | Dashboard แสดง "กรอกข้อมูลบุคคลอ้างอิง" + link ไป Profile |
| 6.3 | ปุ่มรับงาน disabled | house_reg ไม่ verified | ปุ่ม "รับงาน" disabled |
| 6.4 | ทะเบียนบ้าน pending | อัปโหลดแล้วยังไม่ approve | Dashboard: "สำเนาทะเบียนบ้านรอการตรวจสอบ" |
| 6.5 | ทะเบียนบ้าน rejected | Admin reject | Dashboard: "สำเนาทะเบียนบ้านถูกปฏิเสธ กรุณาอัปโหลดใหม่" |
| 6.6 | ผ่านทุกเงื่อนไข | ทุก doc verified + emergency filled | canWork=true, ไม่มี warning, ปุ่มรับงาน enabled, แสดง "พร้อมรับงาน" |
| 6.7 | หลาย blockers พร้อมกัน | ลบ house_reg + ล้าง emergency | แสดง 2 blockers ในรายการ |
| 6.8 | Full flow: blocked → unblocked | เริ่มจาก blocked → อัปโหลด → admin approve → staff refresh | warning หายไป, สถานะเปลี่ยนเป็น "พร้อมรับงาน" |

---

## SECTION 7: Edge Cases

| TC | ทดสอบ | ผลลัพธ์ที่คาดหวัง |
|----|-------|-------------------|
| 7.1 | กดบันทึกซ้ำ 2 ครั้ง | ปุ่ม disabled ขณะ saving (isSaving=true) |
| 7.2 | ข้อมูลชื่อยาวมาก (200+ ตัวอักษร) | บันทึกได้ UI ไม่เสีย |
| 7.3 | ชื่อมีอักขระพิเศษ ("O'Brien") | บันทึกและแสดงได้ถูกต้อง |
| 7.4 | เบอร์โทรหลายรูปแบบ | "081-234-5678", "0812345678" — ทุกรูปแบบรับได้ |

---

## SECTION 8: Database Integrity

| TC | ทดสอบ | SQL / วิธีตรวจสอบ | ผลลัพธ์ที่คาดหวัง |
|----|-------|-------------------|-------------------|
| 8.1 | columns มีอยู่ | `SELECT column_name FROM information_schema.columns WHERE table_name='staff' AND column_name LIKE 'emergency%'` | 3 columns |
| 8.2 | columns เป็น nullable | ตรวจ column definition | ทุก column nullable |
| 8.3 | staff_documents รับ house_registration | INSERT test | ไม่มี constraint error |
| 8.4 | RLS อนุญาต staff update | Staff update emergency contact ผ่าน supabase client | สำเร็จ |
