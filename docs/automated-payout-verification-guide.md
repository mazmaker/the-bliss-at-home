# 🔍 วิธีตรวจสอบผล Automated Payout System

## 🎯 4 วิธีตรวจสอบผลการทำงาน

### 1️⃣ **Admin UI Dashboard (ง่ายสุด ✅)**

#### เข้าใช้:
```
1. ไป Admin App → รอบจ่ายเงิน Staff
2. เลือก Tab "🤖 ระบบอัตโนมัติ"
3. ดูสถิติ Real-time:
   • ✅ วันนี้สร้างแล้ว: X รอบ
   • 💰 ยอดรวมวันนี้: ฿XX,XXX
   • ⏳ รอการอนุมัติ: X รอบ
   • 👥 ครบรอบ 7 วันข้างหน้า: X คน
```

#### ผลลัพธ์ที่ต้องดู:
```
✅ มีรายการใหม่ในตาราง "รอบจ่ายอัตโนมัติล่าสุด"
✅ แสดง badge "🤖 อัตโนมัติ" 
✅ สถานะ "รอการอนุมัติ"
✅ วันที่-เวลาตรงกับการรัน
```

---

### 2️⃣ **Database Verification (แม่นยำสุด 🎯)**

#### เข้าใช้:
```
1. ไป Supabase Dashboard → SQL Editor
2. Copy-paste queries จาก: scripts/verify-automated-payouts.sql
3. รัน query ตรวจสอบ
```

#### Queries สำคัญ:
```sql
-- ✅ 1. เช็ค payout ที่สร้างวันนี้
SELECT * FROM payouts 
WHERE is_automated = true 
  AND DATE(created_at) = CURRENT_DATE;

-- 📊 2. เช็ครายชื่อพนักงานที่ครบรอบวันนี้  
SELECT name_th, next_payout_date, payout_schedule
FROM staff st JOIN profiles p ON p.id = st.profile_id
WHERE next_payout_date = CURRENT_DATE;

-- 🚨 3. เช็คปัญหา
SELECT 'Overdue payouts' as issue, COUNT(*)
FROM staff WHERE next_payout_date < CURRENT_DATE - INTERVAL '7 days';
```

#### ผลลัพธ์ที่คาดหวัง:
```
✅ มี records ใน payouts table with is_automated = true
✅ staff ที่ครบรอบมี next_payout_date ถูก update
✅ payout_jobs table มี records เชื่อมกับ jobs
✅ notifications table มีแจ้งเตือนส่งให้ staff
```

---

### 3️⃣ **Vercel Function Logs (Technical 🔧)**

#### เข้าใช้:
```
1. ไป Vercel Dashboard
2. เลือก Project: the-bliss-at-home-server  
3. ไป Functions → Logs
4. กรอง: /api/cron/daily-payout
```

#### Log Messages ที่ต้องเจอ:
```
✅ "🚀 Starting daily payout check..."
✅ "👥 Found X staff due for payout today:"
✅ "🤖 Generating auto payout for staff: [ชื่อ] (schedule)"
✅ "✅ Created auto payout for [ชื่อ]: ฿X (Y jobs)"
✅ "✅ Completed daily payout check. Processed: X, Errors: 0"
```

#### Error Messages ที่ต้องระวัง:
```
❌ "❌ Error generating payout for [ชื่อ]:"
❌ "Failed to run sql query"
❌ "Cannot connect to database"
❌ "Staff record not found"
```

---

### 4️⃣ **Staff App Verification (User Experience 📱)**

#### เข้าใช้:
```
1. เข้า Staff App ด้วยบัญชีพนักงานที่ครบรอบ
2. ไปหน้า "รายได้" 
3. เช็ค notifications
```

#### ผลลัพธ์ที่ต้องเห็น:
```
✅ แจ้งเตือน: "🎉 รอบจ่ายเงินใหม่พร้อมแล้ว"
✅ ข้อความ: "฿XX,XXX จาก Y งาน รอการอนุมัติจาก Admin"
✅ วันจ่ายครั้งถัดไป: อัปเดตใหม่แล้ว
✅ รายการ payout ใหม่ในประวัติ
```

---

## 🧪 **การทดสอบระบบ**

### Manual Test ผ่าน API:
```bash
# Test local
curl -X POST http://localhost:3000/api/cron/daily-payout

# Test production  
curl -X POST https://the-bliss-at-home-server.vercel.app/api/cron/daily-payout
```

### Manual Test ผ่าน Admin UI:
```
1. Admin Dashboard → ระบบอัตโนมัติ
2. กด "เรียกใช้เลย" 
3. รอผลลัพธ์ 5-10 วินาที
4. ตรวจสอบ toast notification
```

### Expected Response:
```json
{
  "success": true,
  "processed": 2,
  "errors": [],
  "timestamp": "2026-06-04T12:00:00.000Z"
}
```

---

## 🚨 **Common Issues & Solutions**

### Issue 1: ไม่มี payout ถูกสร้าง
```
🔍 เช็ค:
• มีพนักงานครบรอบวันนี้หรือไม่?
• พนักงานมีงาน completed ในช่วง period หรือไม่?
• Database connection ทำงานหรือไม่?

💡 แก้ไข:
• ตั้ง next_payout_date ให้เป็นวันนี้ (manual)
• ตรวจสอบ jobs table มีข้อมูลหรือไม่
• เช็ค Vercel logs ดู errors
```

### Issue 2: Payout สร้างแล้วแต่ไม่ครบ
```
🔍 เช็ค:
• Staff ที่ไม่ได้สร้างมี error หรือไม่?
• Bank accounts setup ครบหรือไม่?
• is_active = true หรือไม่?

💡 แก้ไข:
• เช็ค logs หา error messages
• Manual trigger เฉพาะ staff ที่ขาด
• ตรวจสอบ RLS policies
```

### Issue 3: Notifications ไม่ส่ง
```
🔍 เช็ค:
• profile_id mapping ถูกต้องหรือไม่?
• notifications table มี records หรือไม่?
• LINE integration ทำงานหรือไม่?

💡 แก้ไข:
• เช็ค staff.profile_id = profiles.id
• Manual insert notification
• ทดสอบ LINE API connection
```

---

## 📋 **Daily Checklist**

### 🌅 ทุกเช้า (09:00):
- [ ] เช็ค Admin Dashboard → สถิติวันนี้
- [ ] ดู "วันนี้สร้างแล้ว" มีจำนวนถูกต้องหรือไม่
- [ ] เช็ค "รอการอนุมัติ" มีรายการใหม่หรือไม่

### 🌆 ทุกเย็น (17:00):  
- [ ] อนุมัติ pending payouts
- [ ] เช็ค staff notifications ส่งแล้วหรือไม่
- [ ] Preview พนักงานครบรอบพรุ่งนี้

### 📊 ทุกสัปดาห์:
- [ ] รัน SQL verification queries
- [ ] เช็ค Vercel logs หา errors
- [ ] ตรวจสอบ next_payout_date accuracy

---

## 🎯 **Success Indicators**

✅ **ระบบทำงานดี เมื่อ:**
- Payouts สร้างตามเวลากำหนด (00:01 น.)
- จำนวนตรงกับพนักงานที่ครบรอบ  
- ไม่มี errors ใน logs
- Staff ได้รับแจ้งเตือน
- Next payout dates ถูก update

❌ **ต้องแก้ไข เมื่อ:**
- ไม่มี payouts สร้างเลย
- Processed count ไม่ตรงกับที่คาดหวัง
- มี error messages ใน logs
- Staff ไม่ได้รับแจ้งเตือน
- Next payout dates ไม่เปลี่ยน