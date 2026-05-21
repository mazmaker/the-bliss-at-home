# Staff App Status Workflow Testing Report

## Testing URL
**Staff App:** https://wallet-rfc-kelly-part.trycloudflare.com

## Test Plan Overview

### 1. **เปิด Staff App และค้นหา Active Jobs**

**Steps:**
1. เปิด URL: https://wallet-rfc-kelly-part.trycloudflare.com
2. ตรวจสอบว่าแอปโหลดสำเร็จ (ไม่มี JavaScript errors ใน console)
3. ดูหน้าหลัก (Staff Dashboard) และหาการ์ดงานที่มี status:
   - `pending` - รอมอบหมาย (สีเหลือง)
   - `assigned` - มอบหมายแล้ว (สีส้ม) 
   - `confirmed` - ยืนยันแล้ว (สีน้ำเงิน)
   - `traveling` - กำลังเดินทาง (สีม่วงอมน้ำเงิน)
   - `arrived` - ถึงแล้ว (สีม่วง)
   - `in_progress` - กำลังดำเนินการ (สีม่วง)

**Expected Results:**
- แอปโหลดเสร็จ ไม่มี error
- แสดงรายการงานพร้อม status badge ที่ถูกต้อง
- สามารถเลื่อนดู jobs ได้

### 2. **ทดสอบ Status Transition Buttons (22-Status Workflow)**

**Test Case 2.1: เริ่มเดินทาง (Start Journey)**
- **สถานะเริ่มต้น:** `assigned` หรือ `confirmed`
- **ปุ่มที่ควรปรากฏ:** 🚗 "เริ่มเดินทาง (ติดตาม GPS)"
- **การทำงาน:** กดแล้วต้องเปลี่ยนเป็น `traveling` + เริ่ม GPS tracking

**Test Case 2.2: ยืนยันการมาถึง (Confirm Arrival)**  
- **สถานะเริ่มต้น:** `traveling`
- **ปุ่มที่ควรปรากฏ:** 📍 "มาถึงแล้ว"
- **การทำงาน:** กดแล้วต้องเปลี่ยนเป็น `arrived`

**Test Case 2.3: เริ่มงาน (Start Service)**
- **สถานะเริ่มต้น:** `arrived` 
- **ปุ่มที่ควรปรากฏ:** ▶️ "เริ่มงาน (เริ่มคิดค่าบริการ)"
- **การทำงาน:** กดแล้วต้องเปลี่ยนเป็น `in_progress` + เริ่ม Service Timer

**Test Case 2.4: เสร็จสิ้นงาน (Complete Service)**
- **สถานะเริ่มต้น:** `in_progress`
- **ปุ่มที่ควรปรากฏ:** ✅ "เสร็จสิ้นงาน" 
- **การทำงาน:** กดแล้วต้องเปลี่ยนเป็น `completed`

### 3. **ตรวจสอบ Service Timer**

**When Job Status = `in_progress`:**
- **Timer Display:** ต้องแสดง Timer สีม่วง ด้านบนของหน้า Job Detail
- **Format:** MM:SS (เช่น 59:45 สำหรับ 59 นาที 45 วินาที)
- **Countdown:** นับถอยหลังทุกวินาที
- **Duration Label:** "ระยะเวลา: XX นาที"
- **Progress Bar:** แสดง progress bar สีม่วงที่เคลื่อนไหว
- **Overtime Indicator:** เมื่อเกินเวลา ต้องแสดงเป็น "+MM:SS" สีแดง

**Timer Features:**
- 🟢 เริ่มคิดค่าบริการแล้ว (สีเขียว)
- ⚠️ ใกล้หมดเวลา (เหลือน้อยกว่า 5 นาที - สีเหลือง)
- 🔴 เกินเวลาที่กำหนด (สีแดง + animate pulse)

### 4. **ทดสอบ GPS Integration**

**GPS Tracking Features:**
- **GPS Status Indicator:** จุดสีเขียวกระพริบ + "กำลังติดตาม GPS"
- **Location Update:** แสดงเวลาอัปเดตล่าสุด
- **Tracking Link:** ปุ่ม "แชร์" สำหรับส่งลิงก์ให้ลูกค้า
- **Google Maps Integration:** ปุ่ม "เปิดแผนที่" ทำงาน
- **Phone Integration:** ปุ่ม "โทรหาลูกค้า" ทำงาน

**Error Handling:**
- ไม่มี JavaScript errors เมื่อกด "เริ่มเดินทาง"
- แอปไม่ค้าง หรือหน้าจอขาว
- แสดง error message ที่เหมาะสมถ้า GPS ไม่พร้อมใช้งาน

### 5. **Status Workflow Validation**

**22-Status State Machine:**
```
ASSIGNED → START_JOURNEY → STAFF_EN_ROUTE → CONFIRM_ARRIVAL → STAFF_ARRIVED → START_SERVICE → SERVICE_IN_PROGRESS → COMPLETED
```

**Expected Button Labels:**
- ASSIGNED/STAFF_PREPARING: 🚗 "เริ่มเดินทาง"
- STAFF_EN_ROUTE: 📍 "มาถึงแล้ว" 
- STAFF_ARRIVED: ▶️ "เริ่มงาน"
- SERVICE_IN_PROGRESS: 🟢 "กำลังให้บริการ" (status only)

---

## Testing Checklist

### ✅ Pre-Test Setup
- [ ] Staff App accessible at tunnel URL
- [ ] Database has test jobs in various statuses
- [ ] Browser console open to catch JavaScript errors

### ✅ Basic Functionality  
- [ ] App loads without errors
- [ ] Jobs list displays correctly
- [ ] Status badges show correct colors
- [ ] Job detail pages load

### ✅ Status Transitions
- [ ] "เริ่มเดินทาง" button works (assigned → traveling)
- [ ] "มาถึงแล้ว" button works (traveling → arrived)  
- [ ] "เริ่มงาน" button works (arrived → in_progress)
- [ ] "เสร็จสิ้นงาน" button works (in_progress → completed)

### ✅ Service Timer
- [ ] Timer appears when status = in_progress
- [ ] Shows correct MM:SS format
- [ ] Counts down every second
- [ ] Shows "ระยะเวลา: XX นาที" label
- [ ] Progress bar animates correctly
- [ ] Overtime handling works (+MM:SS in red)

### ✅ GPS Integration
- [ ] GPS tracking starts with "เริ่มเดินทาง"
- [ ] No JavaScript errors during GPS operations
- [ ] Location updates display correctly
- [ ] Share button works
- [ ] Maps integration works
- [ ] Phone links work

### ✅ Error Handling
- [ ] Proper error messages for failed operations
- [ ] App doesn't crash or show white screen
- [ ] GPS permission issues handled gracefully

---

## Common Issues to Watch For

### 🚨 Critical Issues
1. **White Screen of Death** - JavaScript errors causing app crash
2. **Status Not Updating** - Database sync issues
3. **Timer Not Starting** - Timer component not mounting when status changes
4. **GPS Permission Denied** - Location access blocked

### ⚠️ Minor Issues  
1. **Slow Status Updates** - Realtime subscriptions not working
2. **Button Disabled State** - Processing state not clearing
3. **Timer Accuracy** - Timer drifting or jumping
4. **UI Layout Issues** - Component overflow or misalignment

---

## Test Data Requirements

### Sample Jobs Needed:
1. **Pending Job** (status: pending) - for accept button testing
2. **Assigned Job** (status: assigned) - for start journey testing  
3. **Traveling Job** (status: traveling) - for arrival confirmation
4. **Arrived Job** (status: arrived) - for service start testing
5. **In Progress Job** (status: in_progress, started_at: recent) - for timer testing

### Test Staff Account:
- Must be logged into Staff App
- Must have eligibility to work (canWork: true)
- Must be assigned to test jobs

---

## Expected Testing Results

### ✅ Success Indicators:
- All status transitions work smoothly
- Timer displays and counts correctly  
- GPS tracking functions without errors
- UI responsive and intuitive
- No console errors

### ❌ Failure Indicators:
- App crashes or shows white screen
- Status transitions don't work
- Timer doesn't appear or count incorrectly
- JavaScript errors in console
- Buttons remain disabled

---

**Note:** This is a comprehensive test for the 22-status workflow implementation in the Staff App. The focus is on verifying that the new GPS-enhanced status transitions work correctly and the Service Timer functions as expected.