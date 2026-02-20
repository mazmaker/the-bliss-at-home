# 🏨 Hotel Auto-Creation System Setup Instructions

## Overview
เมื่อ Admin เพิ่มโรงแรมใหม่และเปลี่ยนสถานะเป็น `active` → ระบบจะสร้าง hotel invitation อัตโนมัติ

## 🚀 Installation Steps

### Step 1: Create Hotel Invitations Table
1. เปิด **Supabase Dashboard** → **SQL Editor**
2. Copy และ Paste จาก `CREATE-HOTEL-INVITATIONS-TABLE.sql`
3. กด **Run**
4. ตรวจสอบผลลัพธ์: `✅ Hotel invitations table created successfully!`

### Step 2: Create Auto-Triggers System
1. ใน **SQL Editor** อีกครั้ง
2. Copy และ Paste จาก `CREATE-HOTEL-AUTO-TRIGGERS.sql`
3. กด **Run**
4. ตรวจสอบผลลัพธ์: `🎉 Hotel Auto-Creation System Created Successfully!`

## 🧪 Testing the System

### Test 1: Check Current Hotels
```sql
SELECT * FROM get_hotel_onboarding_status();
```

### Test 2: Manual Trigger Test
```sql
-- Test โดยการ update hotel status
UPDATE hotels
SET status = 'active'
WHERE hotel_slug = 'test-hotel-bangkok';

-- ตรวจสอบว่ามี invitation ถูกสร้าง
SELECT * FROM hotel_invitations
WHERE hotel_id IN (
  SELECT id FROM hotels WHERE hotel_slug = 'test-hotel-bangkok'
);
```

### Test 3: Generate Credentials Test
```sql
-- ทดสอบ function สร้าง credentials
SELECT * FROM generate_hotel_credentials('โรงแรมฮิลตัน', 'hilton-bangkok');
```

## 🎯 Expected Results

### Auto-Generated Emails:
- `dusit-thani-bangkok@theblissathome.com`
- `grand-palace-bangkok@theblissathome.com`
- `resort-chiang-mai@theblissathome.com`

### Auto-Generated Passwords:
- `HotelDusit2026!`
- `HotelGrand2026!`
- `HotelResort2026!`

## 📋 Verification Checklist

- [ ] ✅ hotel_invitations table สร้างสำเร็จ
- [ ] ✅ RLS policies ทำงานถูกต้อง
- [ ] ✅ Functions สร้างสำเร็จ (4 functions)
- [ ] ✅ Trigger ทำงานเมื่อ hotel status = 'active'
- [ ] ✅ Invitation records ถูกสร้างอัตโนมัติ
- [ ] ✅ Credentials generation ทำงานถูกต้อง

## 🔄 How It Works

1. **Admin adds new hotel** in HotelForm
2. **Admin sets status = 'active'**
3. **Trigger fires** → `auto_create_hotel_user()`
4. **System generates** email & password
5. **Creates invitation record** in hotel_invitations
6. **Hotel can use credentials** to access system

## 🛠️ Functions Available

### 1. `generate_hotel_credentials(name, slug)`
- Generates email, username, password

### 2. `auto_create_hotel_user()`
- Trigger function for auto-creation

### 3. `accept_hotel_invitation(token, user_id)`
- For hotel users to accept invitations

### 4. `get_hotel_onboarding_status()`
- Admin dashboard to view all hotel statuses

## 🚨 Troubleshooting

### If invitation not created:
1. Check hotel has `hotel_slug`
2. Check hotel `status = 'active'`
3. Check logs: `SELECT * FROM pg_stat_statements;`

### If trigger doesn't fire:
1. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_create_hotel_user';`
2. Check function exists: `SELECT proname FROM pg_proc WHERE proname = 'auto_create_hotel_user';`

## ✅ Success Criteria

System is working correctly when:
- ✅ New active hotels automatically get invitations
- ✅ Credentials follow naming pattern
- ✅ Invitations expire in 7 days
- ✅ Admin can track all hotel onboarding status
- ✅ System scales to unlimited hotels

---
**Created:** 2026-02-19
**System:** Scalable Hotel Onboarding
**Status:** Ready for Production 🚀