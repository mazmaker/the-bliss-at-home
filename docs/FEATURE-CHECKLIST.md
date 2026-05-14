# The Bliss at Home - Feature Development Checklist

> **Last Updated:** 2026-05-14  
> **Overall Progress:** 3/11 ฟีเจอร์เสร็จแล้ว (27%)  
> **Status:** กำลังพัฒนาฟีเจอร์เพิ่มเติมตามความต้องการลูกค้า

---

## สถานะภาพรวม

| สถานะ | จำนวน | เปอร์เซ็นต์ |
|-------|--------|------------|
| ✅ เสร็จแล้ว | 3 | 27% |
| 🚧 กำลังทำ | 0 | 0% |
| ⏳ ยังไม่เริ่ม | 8 | 73% |

---

## รายการฟีเจอร์

### ✅ 1. ระบบส่วนลดโรงแรม (B2B) - **เสร็จแล้ว**
**Status:** ✅ Complete | **Priority:** High  
**Description:** เปลี่ยนระบบส่วนลดจากเปอร์เซ็นต์เป็นจำนวนเงินคงที่ (บาท)

**✅ Implementation:**
- [x] Admin UI: ช่อง "จำนวนเงินส่วนลด (บาท)" แทนเปอร์เซ็นต์
- [x] Database: เพิ่ม field `discount_amount` ใช้ร่วมกับ `discount_rate`  
- [x] Logic: ให้ priority กับ `discount_amount` ก่อน, fallback เป็น `discount_rate`
- [x] Hotel App: แสดงส่วนลดเป็นบาทในการจอง
- [x] Testing: ทดสอบการคำนวณและแสดงผล

**📁 Files:** `apps/admin/src/components/HotelForm.tsx`, `apps/hotel/src/services/extendSessionService.ts`

---

### ✅ 2. แสดงสถานะลูกค้ารายเก่า/รายใหม่ - **เสร็จแล้ว**
**Status:** ✅ Complete | **Priority:** Medium  
**Description:** แสดง badge ลูกค้าใหม่/เก่าในหน้า Admin (ไม่แสดงให้พนักงาน)

**✅ Implementation:**
- [x] Component: `CustomerTypeBadge` พร้อม tooltip ข้อมูล
- [x] UI: Badge "ลูกค้าใหม่" (เขียว) / "ลูกค้าเก่า" (น้ำเงิน)
- [x] Integration: ใช้งานในหน้า Bookings และ Customers
- [x] Logic: คำนวณสถานะจากจำนวนการจองและยอดใช้จ่าย
- [x] Admin Only: แสดงเฉพาะใน Admin app

**📁 Files:** `apps/admin/src/components/CustomerTypeBadge.tsx`, `apps/admin/src/pages/Bookings.tsx`

---

### ⏳ 3. รอบการจ่ายเงินพนักงาน - **ยังไม่เริ่ม**
**Status:** ⏳ Pending | **Priority:** High  
**Description:** ตั้งรอบจ่ายเงิน Staff ทุก 7/15/30 วัน พร้อมระบบ manual approval

**📋 Requirements:**
- [ ] ระบบตั้งรอบจ่ายเงิน: 7 วัน, 15 วัน, 30 วัน
- [ ] การคำนวณยอดรวมต่อรอบ
- [ ] Admin manual transfer + เปลี่ยนสถานะ "จ่ายเรียบร้อย"
- [ ] ประวัติการจ่ายเงินและรายการค้างจ่าย
- [ ] Notification สำหรับรอบจ่ายเงินใหม่

**📁 Estimated Files:** `apps/admin/src/pages/StaffPayouts.tsx`, `apps/server/src/services/payrollService.ts`

---

### ⏳ 4. ระบบรายงาน (Report) - **ยังไม่เริ่ม**
**Status:** ⏳ Pending | **Priority:** Medium  
**Description:** รายงานยอดขาย, รายได้สุทธิ, ผลงานพนักงาน, พฤติกรรมลูกค้า

**📋 Requirements:**
- [ ] รายงานยอดขาย (วัน/สัปดาห์/เดือน)
- [ ] รายงานรายได้สุทธิ 
- [ ] รายงานผลงานพนักงานรายคน
- [ ] รายงานพฤติกรรมลูกค้าใหม่/เก่า
- [ ] Export เป็น PDF/Excel
- [ ] กราฟและ visualization

**📁 Estimated Files:** `apps/admin/src/pages/Reports.tsx`, `apps/admin/src/components/ReportCharts.tsx`

---

### ⏳ 5. เพิ่มช่วงเวลาจอง 09:00-00:00 (ทุก 15 นาที) - **ยังไม่เริ่ม**
**Status:** ⏳ Pending | **Priority:** Medium  
**Description:** ขยายเวลาจองเป็น 09:00-00:00 น. และปรับช่วงเป็นทุก 15 นาที

**📋 Requirements:**
- [ ] อัพเดท time slots: 09:00, 09:15, 09:30, 09:45... ถึง 00:00
- [ ] Customer App: time picker ใหม่
- [ ] Hotel App: time picker ใหม่
- [ ] Staff App: รองรับตารางเวลาใหม่
- [ ] Validation: ตรวจสอบ availability
- [ ] Backend: time slot calculation logic

**📁 Estimated Files:** `packages/ui/src/components/TimePicker.tsx`, booking components

---

### ✅ 6. จองล่วงหน้า 2 อาทิตย์ - **เสร็จแล้ว**
**Status:** ✅ Complete | **Priority:** High  
**Description:** ขยายระยะจองล่วงหน้าจาก 7 เป็น 14 วัน

**✅ Implementation:**
- [x] Customer App: DatePicker รองรับ 14 วัน
- [x] Hotel App: BookingModal รองรับ 14 วัน  
- [x] Server validation: 14-day booking limit
- [x] Bonus: Staff reminder system (3 วัน, 1 วัน, 2 ชั่วโมงก่อน)
- [x] Database: job_reminders table

**📁 Files:** `apps/customer/src/pages/BookingWizard.tsx`, `apps/server/src/services/reminderService.ts`

---

### ⏳ 7. Tracking Map การเดินทางพนักงาน - **ยังไม่เริ่ม**
**Status:** ⏳ Pending | **Priority:** High  
**Description:** ลูกค้าติดตามการเดินทางของพนักงานแบบ real-time

**📋 Requirements:**
- [ ] Real-time location tracking พนักงาน
- [ ] Google Maps integration สำหรับลูกค้า
- [ ] ปุ่ม "เริ่มเดินทาง" สำหรับพนักงาน
- [ ] WebSocket/SSE สำหรับ real-time updates
- [ ] Privacy settings และ location permission
- [ ] ETA calculation

**📁 Estimated Files:** `apps/customer/src/components/TrackingMap.tsx`, `apps/staff/src/components/StartJourney.tsx`

---

### ⏳ 8. หน้าเว็บจองด่วน (< 3 ชม.) - **ยังไม่เริ่ม**
**Status:** ⏳ Pending | **Priority:** Medium  
**Description:** หน้าเว็บสำหรับลูกค้าจองด่วนติดต่อ Admin ตรงๆ

**📋 Requirements:**
- [ ] Landing page จองด่วน
- [ ] ฟอร์มติดต่อ Admin (ไม่ผ่านระบบจองปกติ)
- [ ] ข้อมูลการติดต่อ: LINE, โทรศัพท์, อีเมล
- [ ] แสดงช่วงเวลาที่รับจองด่วน
- [ ] SEO optimization
- [ ] Mobile responsive

**📁 Estimated Files:** `apps/urgent-booking/` (new app), `apps/server/src/routes/urgent.ts`

---

### ⏳ 9. หน้ารายได้พนักงาน (1/7/15/30 วัน) - **ยังไม่เริ่ม**
**Status:** ⏳ Pending | **Priority:** Medium  
**Description:** พนักงานดูรายได้ของตัวเองแยกตามช่วงเวลา

**📋 Requirements:**
- [ ] Staff App: หน้า Earnings Dashboard
- [ ] Filter: 1 วัน, 7 วัน, 15 วัน, 1 เดือน
- [ ] กราฟรายได้ต่อวัน/สัปดาห์
- [ ] รายละเอียดรายได้ต่อการจอง
- [ ] การคำนวณค่าคอมมิชชั่น
- [ ] Export รายงานรายได้

**📁 Estimated Files:** `apps/staff/src/pages/StaffEarnings.tsx`, `apps/staff/src/components/EarningsChart.tsx`

---

### ⏳ 10. ปุ่ม "เริ่มเดินทาง" + Real-time Tracking - **ยังไม่เริ่ม**
**Status:** ⏳ Pending | **Priority:** High  
**Description:** ปุ่มเริ่มเดินทางสำหรับพนักงาน + ระบบ tracking แบบ real-time

**📋 Requirements:**
- [ ] ปุ่ม "เริ่มเดินทาง" ใน Staff App
- [ ] GPS location tracking เริ่มทำงาน
- [ ] Real-time updates ส่งให้ลูกค้า
- [ ] Map display ใน Customer App
- [ ] Location permission handling
- [ ] Battery optimization

**📁 Estimated Files:** `apps/staff/src/components/StartJourneyButton.tsx`, location services

---

### ⏳ 11. หน้าจองด่วนสำหรับ Admin - **ยังไม่เริ่ม**
**Status:** ⏳ Pending | **Priority:** Low  
**Description:** Admin จองแทนลูกค้าในกรณีจองตรงผ่านแอดมิน

**📋 Requirements:**
- [ ] Quick Booking Form ใน Admin App
- [ ] ค้นหาลูกค้า (หรือสร้างใหม่)
- [ ] เลือกบริการและพนักงาน
- [ ] การจ่ายเงินแบบ manual/เก็บเงินปลายทาง
- [ ] พิมพ์ใบเสร็จ
- [ ] Integration กับระบบจองปกติ

**📁 Estimated Files:** `apps/admin/src/components/QuickBookingModal.tsx`, admin booking services

---

## ลำดับความสำคัญในการพัฒนา

### 🔥 High Priority (ต้องทำก่อน)
1. **#3** รอบการจ่ายเงินพนักงาน
2. **#7** Tracking Map การเดินทางพนักงาน  
3. **#10** ปุ่ม "เริ่มเดินทาง" + Real-time Tracking

### 📋 Medium Priority  
1. **#5** เพิ่มช่วงเวลาจอง 09:00-00:00 (ทุก 15 นาที)
2. **#4** ระบบรายงาน (Report)
3. **#9** หน้ารายได้พนักงาน
4. **#8** หน้าเว็บจองด่วน

### 📝 Low Priority
1. **#11** หน้าจองด่วนสำหรับ Admin

---

## การติดตาม

**Next Steps:**
1. เลือกฟีเจอร์ที่จะทำต่อไปจาก High Priority
2. สร้าง detailed specification สำหรับฟีเจอร์ที่เลือก  
3. ประมาณเวลาการพัฒนา
4. เริ่มการพัฒนา

**Update Schedule:** อัพเดทสถานะทุกสัปดาห์หรือเมื่อมีความคืบหน้า