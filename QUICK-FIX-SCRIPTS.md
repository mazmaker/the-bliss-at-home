# 🚀 Quick Fix Scripts - แก้ปัญหาการจองผิดโรงแรม

## 📁 Scripts Available

### 1. **fix-hotel-mapping.js** - แก้ปัญหาหลัก
```bash
node fix-hotel-mapping.js
```
**จะทำอะไร:**
- ✅ เพิ่ม `hotel_id` column ใน profiles table
- ✅ Map hotel users ไปยังโรงแรมที่ถูกต้อง
- ✅ ตรวจสอบและแสดงผลลัพธ์
- ✅ ทดสอบการทำงานของระบบ

### 2. **check-hotel-status.js** - ตรวจสอบสถานะ
```bash
node check-hotel-status.js
```
**จะทำอะไร:**
- 🔍 ตรวจสอบ database schema
- 👥 แสดง hotel user mappings
- 📊 วิเคราะห์ booking distribution
- 🎯 เปรียบเทียบ expected vs actual
- 📋 สรุปสถานะระบบโดยรวม

---

## ⚡ Quick Start

### ขั้นตอนที่ 1: ตรวจสอบปัญหา
```bash
node check-hotel-status.js
```
**Expected Output:**
```
🔍 CHECKING: Hotel Mapping Status
==================================

👥 2. Hotel User Mappings...
   1. info@dusit.com
      Status: ❌ NOT MAPPED
      Hotel ID: null

🚨 SYSTEM STATUS: ❌ NEEDS ATTENTION
```

### ขั้นตอนที่ 2: แก้ไขปัญหา
```bash
node fix-hotel-mapping.js
```
**Expected Output:**
```
🔧 FIXING: Hotel User Mapping Problem
=====================================

✅ Mapped info@dusit.com → โรงแรมดุสิต ธานี
✅ Mapped sweettuay.bt@gmail.com → รีสอร์ทในฝัน เชียงใหม่

🎉 HOTEL MAPPING FIX COMPLETED!
```

### ขั้นตอนที่ 3: ตรวจสอบอีกครั้ง
```bash
node check-hotel-status.js
```
**Expected Output:**
```
👥 2. Hotel User Mappings...
   1. info@dusit.com
      Status: ✅ โรงแรมดุสิต ธานี (dusit-thani-bangkok)

🎉 SYSTEM STATUS: ✅ HEALTHY
```

---

## 🎯 Expected Results After Fix

### Before Fix (❌ Problem):
```
User: info@dusit.com
├── Creates booking
├── hotel_id = null or wrong
└── Booking appears in wrong hotel history

Booking Distribution:
- โรงแรมดุสิต ธานี: 0 bookings 😭
- รีสอร์ทในฝัน เชียงใหม่: 12 bookings (wrong!)
```

### After Fix (✅ Success):
```
User: info@dusit.com
├── Creates booking
├── hotel_id = 550e8400-e29b-41d4-a716-446655440003
└── Booking appears in correct hotel history

Booking Distribution:
- โรงแรมดุสิต ธานี: 5 bookings ✅
- รีสอร์ทในฝัน เชียงใหม่: 7 bookings ✅
```

---

## 🚨 Troubleshooting

### Problem 1: Script fails with "exec_sql not found"
**Solution:** Run SQL manually in Supabase Dashboard
1. Copy content from `HOTEL-USER-MAPPING-FIX.sql`
2. Paste in Supabase Dashboard > SQL Editor
3. Click **Run**

### Problem 2: "Hotel not found" errors
**Solution:** Update hotel mappings in script
1. Check actual hotel slugs in database
2. Update `userMappings` array in `fix-hotel-mapping.js`
3. Run script again

### Problem 3: Users still not mapped
**Solution:** Manual mapping
```sql
-- Run this in Supabase SQL Editor
UPDATE profiles
SET hotel_id = (SELECT id FROM hotels WHERE hotel_slug = 'dusit-thani-bangkok')
WHERE email = 'info@dusit.com' AND role = 'HOTEL';
```

---

## 🧪 Testing After Fix

### Test 1: Hotel App Login
1. Login to Hotel app with `info@dusit.com`
2. Create a new booking
3. Check booking history
4. **Expected:** Booking appears in Dusit Thani history

### Test 2: Admin Panel Check
1. Login to Admin panel
2. Go to Bookings section
3. Find the test booking
4. **Expected:** Shows correct hotel name

### Test 3: Server API Test
```bash
# Test server authentication
curl -X GET "http://localhost:3000/api/secure-bookings" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: Returns bookings for correct hotel only
```

---

## 📊 Monitoring

### Daily Health Check
```bash
# Add to cron job
0 9 * * * cd /path/to/project && node check-hotel-status.js >> hotel-status.log
```

### Key Metrics to Watch
- **Mapping percentage:** Should be 100%
- **No hotel bookings:** Should be 0
- **User complaints:** About wrong booking history

---

## ⚙️ Advanced Options

### Custom Hotel Mapping
Edit `fix-hotel-mapping.js` line 47-52:
```javascript
const userMappings = [
  { email: 'your-hotel@email.com', hotelName: 'Your Hotel Name', slug: 'your-hotel-slug' },
  // Add more mappings here
]
```

### Bulk User Import
```javascript
// In fix-hotel-mapping.js, add bulk mapping function
const bulkMappings = await supabase
  .from('hotel_users_import')
  .select('email, hotel_slug')

// Process bulk mappings...
```

---

## 📞 Support

### If Scripts Don't Work
1. **Check environment:** `.env` file has correct Supabase credentials
2. **Check permissions:** Service role key has admin access
3. **Manual SQL:** Use `HOTEL-USER-MAPPING-FIX.sql` directly
4. **Contact developer:** Provide error logs

### Log Files
- **Success logs:** Check console output
- **Error logs:** Saved to `hotel-fix-errors.log`
- **Status logs:** Saved to `hotel-status.log`

---

**Created:** 2026-02-19
**Version:** 1.0
**Status:** Production Ready 🚀