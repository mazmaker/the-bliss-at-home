# แผนพัฒนา: Customer Loyalty Points — ระบบสะสมแต้มลูกค้า

## Prompt สำหรับสั่ง Claude AI พัฒนา

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home
อ่านไฟล์ docs/PLAN_CUSTOMER_LOYALTY_POINTS.md แล้วพัฒนาทีละ Phase ตามแผน
- พัฒนาบน localhost ทดสอบให้ผ่านก่อน commit
- ทดสอบผ่าน UI ด้วย Playwright MCP ทุก Phase
- ถ้า FAIL ให้แก้โค้ดแล้วทดสอบซ้ำจนผ่าน

Dev Servers: npx turbo run dev --parallel
Ports: Admin=3001, Hotel=3003, Staff=3004, Server=3000, Customer=3008

Login:
- Admin: admintest@theblissathome.com / Admin@12345
- Customer: mazmakerdesign@gmail.com / U9B*B2LE#8-q!m8
```

---

## 1. Business Requirements (ความต้องการ)

### 1.1 ภาพรวม
ลูกค้าที่ใช้บริการผ่าน Customer App จะได้รับ **แต้มสะสม (Points)** ทุกครั้งที่จองเสร็จ
สามารถนำแต้มแลกเป็น **ส่วนลด** สำหรับการจองครั้งถัดไป
- **ไม่มีระดับสมาชิก** (ไม่มี Silver/Gold/Platinum)
- **ไม่รวม Hotel App** (เฉพาะลูกค้าจองตรง)
- ทำงานร่วมกับระบบ Promotions/Coupon ที่มีอยู่แล้ว

### 1.2 การได้รับแต้ม (Earn Points)

| เหตุการณ์ | แต้มที่ได้ | เงื่อนไข |
|----------|----------|---------|
| จองบริการเสร็จสมบูรณ์ | **1 แต้ม ต่อ X บาท** (default: 1 แต้ม/฿100) | booking status = completed |
| โบนัสจองครั้งแรก | **Y แต้ม** (default: 50 แต้ม) | first_booking_bonus (ครั้งเดียว) |
| Admin ให้แต้มพิเศษ | จำนวนตามที่กำหนด | manual adjustment |

**กฏสำคัญ:**
- แต้มได้รับ **หลังจาก booking completed เท่านั้น** (ไม่ใช่ตอนจอง)
- Booking ที่ยกเลิก/refund **ไม่ได้แต้ม**
- Booking ผ่าน Hotel App **ไม่ได้แต้ม** (is_hotel_booking = true)
- คำนวณจาก `final_price` (ราคาหลังส่วนลด)
- ปัดลงเสมอ (฿250 ÷ ฿100 = 2 แต้ม ไม่ใช่ 2.5)

### 1.3 การใช้แต้ม (Redeem Points)

| การแลก | อัตรา | เงื่อนไข |
|--------|-------|---------|
| แลกส่วนลด | **Z แต้ม = ฿1** (default: 10 แต้ม = ฿1) | ขั้นต่ำ 100 แต้ม |
| ส่วนลดสูงสุดต่อครั้ง | **ไม่เกิน X% ของราคา** (default: 50%) | ป้องกันจองฟรี |

**กฏการแลก:**
- ใช้แต้มได้เฉพาะ **ตอนจอง** (ในขั้นตอน Confirmation ของ BookingWizard)
- **ใช้ร่วมกับ promo code ได้** (ลด promo ก่อน แล้วค่อยลดจากแต้ม)
- ลำดับการลด: `base_price → promo discount → points discount = final_price`
- แต้มที่ใช้แล้ว **หักทันที** ตอนจอง (ไม่ใช่ตอน completed)
- ถ้า booking ถูกยกเลิก → **คืนแต้มที่ใช้ไป**

### 1.4 แต้มหมดอายุ (Points Expiry)

| กฏ | ค่า | เงื่อนไข |
|----|-----|---------|
| อายุแต้ม | **365 วัน** นับจากวันที่ได้รับ | Admin ตั้งค่าได้ |
| แจ้งเตือนก่อนหมดอายุ | **30 วัน** ก่อนหมดอายุ | in-app notification |
| แต้มที่หมดอายุ | ถูกตัดอัตโนมัติ | cron ตรวจทุกวัน |

### 1.5 ตัวอย่างการใช้งาน

```
สถานการณ์: ลูกค้าจองนวดไทย ราคา ฿800

1. ลูกค้ามี 500 แต้ม (= ฿50 ส่วนลด ที่อัตรา 10:1)
2. ลูกค้ากรอก promo code "SAVE200" (ลด ฿200)
3. คำนวณ:
   - base_price = ฿800
   - promo discount = -฿200
   - points discount = -฿50 (ใช้ 500 แต้ม)
   - final_price = ฿550
4. หลังจอง: หัก 500 แต้ม ทันที
5. หลัง completed: ได้แต้มใหม่ = ฿550 ÷ ฿100 = 5 แต้ม
```

---

## 2. System Design (ออกแบบระบบ)

### 2.1 Database Schema

```sql
-- 1. ตาราง customer_points — ยอดแต้มสะสมรวม
CREATE TABLE customer_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  total_points INTEGER DEFAULT 0,      -- แต้มคงเหลือ
  lifetime_earned INTEGER DEFAULT 0,   -- แต้มสะสมตลอด
  lifetime_redeemed INTEGER DEFAULT 0, -- แต้มใช้ไปตลอด
  lifetime_expired INTEGER DEFAULT 0,  -- แต้มหมดอายุตลอด
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ตาราง point_transactions — ประวัติการได้รับ/ใช้แต้ม
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'refund', 'bonus', 'admin_adjust')),
  points INTEGER NOT NULL,             -- +เพิ่ม / -ลด
  balance_after INTEGER NOT NULL,      -- ยอดคงเหลือหลังรายการนี้
  booking_id UUID REFERENCES bookings(id),
  description TEXT,                    -- "ได้รับจากการจอง BK-xxx"
  expires_at TIMESTAMPTZ,              -- วันหมดอายุ (เฉพาะ type=earn)
  expired BOOLEAN DEFAULT false,       -- ถูกตัดหมดอายุแล้ว
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_point_tx_customer ON point_transactions(customer_id);
CREATE INDEX idx_point_tx_booking ON point_transactions(booking_id);
CREATE INDEX idx_point_tx_expires ON point_transactions(expires_at) WHERE type = 'earn' AND expired = false;

-- 3. ตั้งค่าแต้มใน payout_settings (ใช้ตารางเดิม) หรือ app_settings
-- เพิ่ม settings:
INSERT INTO app_settings (setting_key, setting_value, setting_type) VALUES
  ('points_per_baht', '100', 'loyalty'),           -- ทุก X บาท ได้ 1 แต้ม
  ('points_to_baht', '10', 'loyalty'),             -- X แต้ม = ฿1
  ('min_redeem_points', '100', 'loyalty'),         -- ขั้นต่ำแลกแต้ม
  ('max_discount_percent', '50', 'loyalty'),       -- ส่วนลดสูงสุด %
  ('first_booking_bonus', '50', 'loyalty'),        -- โบนัสจองครั้งแรก
  ('points_expiry_days', '365', 'loyalty'),        -- อายุแต้ม (วัน)
  ('points_expiry_warning_days', '30', 'loyalty'), -- แจ้งเตือนก่อนหมดอายุ
  ('loyalty_enabled', 'true', 'loyalty');           -- เปิด/ปิดระบบ

-- 4. เพิ่มคอลัมน์ใน bookings table
ALTER TABLE bookings ADD COLUMN points_earned INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN points_redeemed INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN points_discount DECIMAL(10,2) DEFAULT 0;
```

### 2.2 Data Flow

```
         ลูกค้าจอง (BookingWizard)
                │
     ┌──────────┴──────────┐
     │ Step 5: Confirmation │
     │ เลือกใช้แต้ม?        │
     │ [ใช้ 500 แต้ม = ฿50] │
     └──────────┬──────────┘
                │
         สร้าง Booking
         points_redeemed = 500
         points_discount = 50
         final_price = base - promo - points
                │
         หัก points ทันที
         point_transactions: type=redeem, points=-500
                │
         ┌──────┴──────┐
         │             │
    ยกเลิก         Completed
    คืนแต้ม 500     ให้แต้มใหม่
    type=refund     points = final_price / points_per_baht
    +500            type=earn
                    expires_at = now + 365 days
                        │
                  Cron ตรวจทุกวัน
                  แต้มหมดอายุ → type=expire
                  แจ้งเตือนก่อน 30 วัน
```

### 2.3 UI Components

#### Customer App — แต้มสะสมใน Profile
```
┌─────────────────────────────────────┐
│ 🎯 แต้มสะสม                         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  ⭐ 1,250 แต้ม                  │ │
│ │  มูลค่า ฿125                    │ │
│ │  หมดอายุเร็วสุด: 15 มิ.ย. 2569  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📊 ประวัติแต้ม                       │
│ ┌───────────────────────────────┐   │
│ │ +5 แต้ม  นวดไทย BK-0270  วันนี้│   │
│ │ -500     ใช้แลกส่วนลด   เมื่อวาน│   │
│ │ +8 แต้ม  สปาไทย BK-0268  3 วัน │   │
│ │ +50      โบนัสจองครั้งแรก  7 วัน │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### Customer App — ใช้แต้มตอนจอง (BookingWizard Step 5)
```
┌─────────────────────────────────────┐
│ 📋 สรุปการจอง                        │
│                                     │
│ นวดไทย (2 ชม.)          ฿1,200     │
│ Promo: SAVE200           -฿200     │
│                         ─────────  │
│ ราคาหลังลด               ฿1,000    │
│                                     │
│ ─────────────────────────────────── │
│ ⭐ ใช้แต้มสะสม                      │
│ ┌─────────────────────────────────┐ │
│ │ แต้มของคุณ: 1,250 แต้ม (฿125)   │ │
│ │                                 │ │
│ │ ใช้แต้ม: [____500___] แต้ม      │ │
│ │ = ส่วนลด ฿50                   │ │
│ │                                 │ │
│ │ [ใช้แต้มทั้งหมด]  [ล้าง]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ส่วนลดจากแต้ม            -฿50      │
│                         ═════════  │
│ ยอดชำระ                  ฿950      │
│                                     │
│ [ชำระเงิน]                          │
└─────────────────────────────────────┘
```

#### Admin App — Settings tab "ระบบแต้มสะสม"
```
┌──────────────────────────────────────────────┐
│ ⭐ ระบบแต้มสะสม (Loyalty Points)             │
│                                              │
│ เปิดใช้งาน                        [เปิด]    │
│                                              │
│ ── การได้รับแต้ม ──                           │
│ ทุกกี่บาทได้ 1 แต้ม        [___100___] บาท   │
│ โบนัสจองครั้งแรก            [___50____] แต้ม  │
│                                              │
│ ── การแลกแต้ม ──                              │
│ กี่แต้มเท่ากับ ฿1           [___10____] แต้ม  │
│ แลกขั้นต่ำ                  [___100___] แต้ม  │
│ ส่วนลดสูงสุด               [___50____] %     │
│                                              │
│ ── อายุแต้ม ──                                │
│ แต้มหมดอายุหลัง             [___365___] วัน   │
│ แจ้งเตือนก่อนหมดอายุ        [___30____] วัน   │
│                                              │
│ [บันทึก]                                     │
└──────────────────────────────────────────────┘
```

#### Admin App — Customer Detail (เพิ่ม section แต้ม)
```
┌──────────────────────────────────────────────┐
│ ⭐ แต้มสะสม                                  │
│                                              │
│ แต้มคงเหลือ: 1,250    สะสมทั้งหมด: 2,000    │
│ ใช้ไปแล้ว: 500         หมดอายุ: 250           │
│                                              │
│ [+ให้แต้มพิเศษ]  [-หักแต้ม]                   │
│                                              │
│ ประวัติล่าสุด:                                │
│ +5   ได้รับจาก BK-0270      30 มี.ค. 2569    │
│ -500 ใช้แลกส่วนลด BK-0269  29 มี.ค. 2569    │
│ +8   ได้รับจาก BK-0268      27 มี.ค. 2569    │
└──────────────────────────────────────────────┘
```

---

## 3. ความสัมพันธ์กับระบบเดิม

### ใช้ระบบเดิมที่มีอยู่:
- **bookings table** → เพิ่ม 3 columns (points_earned, points_redeemed, points_discount)
- **app_settings table** → เพิ่ม loyalty settings
- **promotions system** → ใช้ร่วมกันได้ (promo ลดก่อน แล้ว points ลดทีหลัง)
- **BookingWizard Step 5** → เพิ่ม section "ใช้แต้มสะสม"
- **VoucherCodeInput** → อยู่ร่วมกันได้ (แยก section)
- **notification system** → ใช้ pattern เดิมส่งแจ้งเตือนหมดอายุ

### ไม่กระทบ:
- Hotel bookings (is_hotel_booking = true → ไม่ได้แต้ม)
- Staff App
- Payment flow (แค่เปลี่ยน final_price)
- Admin Payout/Earnings (ไม่เกี่ยว)

---

## 4. Development Phases (แผนพัฒนาทีละ Phase)

### Phase 1: Database + Points Settings (Admin)
**ขอบเขต:** DB schema + Admin ตั้งค่าระบบแต้ม
**ประมาณเวลา:** 2-3 ชม.

#### งาน:
1. **DB Migration** — ผ่าน Supabase MCP
   - สร้าง `customer_points` table
   - สร้าง `point_transactions` table
   - เพิ่ม columns ใน `bookings` table
   - เพิ่ม loyalty settings ใน `app_settings`
   - RLS policies

2. **Admin Settings UI** — เพิ่ม tab "ระบบแต้มสะสม" ใน Settings.tsx
   - เปิด/ปิดระบบ
   - อัตราการได้รับแต้ม
   - อัตราการแลกแต้ม
   - โบนัสจองครั้งแรก
   - อายุแต้ม
   - บันทึกลง app_settings

3. **Service functions** — `loyaltyService.ts` (ไฟล์ใหม่)
   - `getLoyaltySettings()` — ดึง settings
   - `getCustomerPoints(customerId)` — ดึงยอดแต้ม
   - `getPointTransactions(customerId)` — ดึงประวัติ

#### ทดสอบ:
- Admin → Settings → tab "ระบบแต้มสะสม" → ตั้งค่า → บันทึก → refresh
- DB: tables สร้างสำเร็จ, settings บันทึกถูกต้อง

---

### Phase 2: Earn Points (ให้แต้มหลัง Booking Complete)
**ขอบเขต:** ให้แต้มอัตโนมัติเมื่อ booking completed
**ประมาณเวลา:** 3-4 ชม.

#### งาน:
1. **Server-side logic** — `loyaltyService.ts`
   - `awardPoints(customerId, bookingId, finalPrice)` — คำนวณ + ให้แต้ม
   - `awardFirstBookingBonus(customerId)` — โบนัสจองครั้งแรก
   - ตรวจ `is_hotel_booking` → ไม่ให้แต้ม
   - สร้าง `point_transactions` record (type=earn, expires_at)
   - อัปเดต `customer_points.total_points` + `lifetime_earned`
   - อัปเดต `bookings.points_earned`

2. **Hook เข้า booking completion flow**
   - เมื่อ booking status เปลี่ยนเป็น `completed` → เรียก `awardPoints()`
   - ดูว่า hook อยู่ที่ server หรือ Supabase trigger

3. **Notification** — แจ้ง customer เมื่อได้รับแต้ม
   - "คุณได้รับ 5 แต้มจากการจอง BK-0270"

#### ทดสอบ:
- สร้าง booking → Admin เปลี่ยน status เป็น completed
- ตรวจ DB: point_transactions มี record type=earn
- ตรวจ customer_points: total_points เพิ่มขึ้น
- ตรวจ bookings: points_earned อัปเดต
- Hotel booking → ไม่ได้แต้ม

---

### Phase 3: Redeem Points (ใช้แต้มแลกส่วนลดตอนจอง)
**ขอบเขต:** ลูกค้าใช้แต้มลดราคาใน BookingWizard
**ประมาณเวลา:** 4-5 ชม.

#### งาน:
1. **Customer UI** — BookingWizard Step 5 (Confirmation)
   - เพิ่ม section "ใช้แต้มสะสม" ใต้ VoucherCodeInput
   - แสดงยอดแต้มคงเหลือ + มูลค่าเป็นบาท
   - Input กรอกจำนวนแต้มที่ต้องการใช้
   - ปุ่ม "ใช้แต้มทั้งหมด" / "ล้าง"
   - Validation: ขั้นต่ำ, ไม่เกินแต้มที่มี, ไม่เกิน max discount %
   - แสดง price breakdown: base → promo → points → final

2. **Service functions** — `loyaltyService.ts`
   - `redeemPoints(customerId, bookingId, points)` — หักแต้ม
   - `calculatePointsDiscount(points, settings)` — คำนวณส่วนลด
   - `validateRedemption(customerId, points, orderAmount)` — ตรวจสอบ
   - `refundPoints(customerId, bookingId)` — คืนแต้มเมื่อยกเลิก

3. **Booking creation** — อัปเดต flow สร้าง booking
   - เพิ่ม `points_redeemed`, `points_discount` ใน booking record
   - หัก points ทันทีตอนสร้าง booking

4. **Cancel booking** — คืนแต้ม
   - เมื่อ booking ถูกยกเลิก → เรียก `refundPoints()`
   - สร้าง point_transactions type=refund

#### ทดสอบ:
- Customer จอง → ใส่แต้ม → ราคาลดลง → จ่ายเงิน
- แต้มถูกหัก → ยอดแต้มลดลง
- ยกเลิก booking → แต้มคืน
- ใช้แต้ม + promo code พร้อมกัน → ลดซ้อนกันถูกต้อง

---

### Phase 4: Customer Points UI (แสดงแต้มในแอป)
**ขอบเขต:** หน้าแสดงแต้ม + ประวัติ ใน Customer App
**ประมาณเวลา:** 3-4 ชม.

#### งาน:
1. **Points Widget** — แสดงใน Profile page หรือ Home page
   - ยอดแต้มคงเหลือ
   - มูลค่าเป็นบาท
   - แต้มที่ใกล้หมดอายุ

2. **Points History Page** — หน้าใหม่ `/points`
   - ประวัติ earn/redeem/expire/refund/bonus
   - Filter: ทั้งหมด / ได้รับ / ใช้ / หมดอายุ
   - แต่ละรายการ: ประเภท, จำนวนแต้ม, booking reference, วันที่

3. **Navigation** — เพิ่มลิงก์ไปหน้า Points
   - Profile page → section แต้มสะสม → "ดูประวัติ"
   - หรือ bottom nav เพิ่ม icon

#### ทดสอบ:
- Customer → Profile → เห็นยอดแต้ม
- กด "ดูประวัติ" → เห็นรายการ earn/redeem
- Filter ทำงานถูกต้อง

---

### Phase 5: Points Expiry + Notifications (Cron)
**ขอบเขต:** แต้มหมดอายุอัตโนมัติ + แจ้งเตือน
**ประมาณเวลา:** 3-4 ชม.

#### งาน:
1. **Cron Job** — ตรวจแต้มหมดอายุทุกวัน
   - `processPointsExpiry()` — หาแต้มที่ `expires_at <= today`
   - สร้าง point_transactions type=expire
   - อัปเดต customer_points.total_points
   - อัปเดต customer_points.lifetime_expired

2. **แจ้งเตือนก่อนหมดอายุ** — 30 วันก่อน
   - "แต้มสะสม X แต้มของคุณจะหมดอายุในวันที่ DD/MM/YYYY"
   - in-app notification
   - duplicate prevention

3. **Dev endpoint** — `/api/dev/trigger-points-expiry`

#### ทดสอบ:
- สร้าง point_transaction ที่ expires_at = เมื่อวาน (ผ่าน admin adjust)
- Trigger cron → แต้มถูกตัด
- customer_points อัปเดต
- Notification ส่งให้ customer

---

### Phase 6: Admin Customer Points Management
**ขอบเขต:** Admin ดู/จัดการแต้มลูกค้า
**ประมาณเวลา:** 2-3 ชม.

#### งาน:
1. **Customer Detail** — เพิ่ม section แต้มสะสม
   - ยอดแต้ม, สะสมทั้งหมด, ใช้ไปแล้ว, หมดอายุ
   - ประวัติล่าสุด
   - ปุ่ม "ให้แต้มพิเศษ" → modal กรอกจำนวน + เหตุผล
   - ปุ่ม "หักแต้ม" → modal กรอกจำนวน + เหตุผล

2. **Admin adjust** — `adminAdjustPoints(customerId, points, reason)`
   - สร้าง point_transactions type=admin_adjust
   - อัปเดต customer_points

#### ทดสอบ:
- Admin → ลูกค้า → เลือก customer → เห็นแต้ม
- ให้แต้มพิเศษ → ยอดเพิ่ม
- หักแต้ม → ยอดลด
- Customer เห็นยอดอัปเดต

---

### Phase 7: Integration Testing + Deploy
**ขอบเขต:** ทดสอบ full flow + commit + deploy
**ประมาณเวลา:** 2-3 ชม.

#### ทดสอบ Full Flow:
1. Customer ไม่มีแต้ม → จอง → completed → ได้แต้ม (+ โบนัสครั้งแรก)
2. Customer มีแต้ม → จอง → ใช้แต้ม + promo → ราคาลดถูกต้อง
3. ยกเลิก booking → แต้มคืน
4. แต้มหมดอายุ → cron ตัด → notification
5. Admin ให้แต้มพิเศษ → Customer เห็น
6. Regression: login ทุก app, booking flow, hotel credit

#### Deploy:
- git commit + push + merge main
- ตรวจ Vercel deploy
- ทดสอบ production

---

## 5. Files ที่ต้องสร้าง/แก้ไข

### ไฟล์ใหม่ (NEW):
| ไฟล์ | รายละเอียด |
|------|-----------|
| `packages/supabase/src/loyalty/loyaltyService.ts` | Service: earn, redeem, refund, expire |
| `packages/supabase/src/loyalty/types.ts` | Types: CustomerPoints, PointTransaction, LoyaltySettings |
| `packages/supabase/src/loyalty/useLoyalty.ts` | React hooks: usePoints, usePointHistory |
| `apps/customer/src/pages/PointsHistory.tsx` | หน้าประวัติแต้ม |
| `apps/customer/src/components/PointsRedeemSection.tsx` | Section ใช้แต้มใน BookingWizard |
| `apps/customer/src/components/PointsWidget.tsx` | Widget แสดงแต้มใน Profile |

### ไฟล์ที่แก้ไข (MODIFIED):
| ไฟล์ | รายละเอียด |
|------|-----------|
| `apps/customer/src/pages/BookingWizard.tsx` | เพิ่ม section ใช้แต้ม + คำนวณ points_discount |
| `apps/customer/src/pages/Profile.tsx` | เพิ่ม Points Widget |
| `apps/customer/src/App.tsx` | เพิ่ม route `/points` |
| `apps/admin/src/pages/Settings.tsx` | เพิ่ม tab "ระบบแต้มสะสม" |
| `apps/admin/src/pages/CustomerDetail.tsx` | เพิ่ม section แต้มสะสม + admin adjust |
| `apps/server/src/index.ts` | เพิ่ม cron job points expiry |
| `apps/server/src/services/notificationService.ts` | เพิ่ม points notifications |

### Database (via Supabase MCP):
| Migration | รายละเอียด |
|-----------|-----------|
| `CREATE TABLE customer_points` | ยอดแต้มสะสม |
| `CREATE TABLE point_transactions` | ประวัติแต้ม |
| `ALTER TABLE bookings` | เพิ่ม points_earned, points_redeemed, points_discount |
| `INSERT INTO app_settings` | Loyalty settings |

---

## 6. Test Cases

| TC | หมวด | ทดสอบ | Priority |
|----|------|-------|----------|
| 01 | Admin | Settings — ตั้งค่าระบบแต้ม | HIGH |
| 02 | Earn | Booking completed → ได้แต้ม | HIGH |
| 03 | Earn | โบนัสจองครั้งแรก | HIGH |
| 04 | Earn | Hotel booking → ไม่ได้แต้ม | HIGH |
| 05 | Earn | Cancelled booking → ไม่ได้แต้ม | MEDIUM |
| 06 | Earn | คำนวณแต้มจาก final_price ปัดลง | MEDIUM |
| 07 | Redeem | ใช้แต้มแลกส่วนลดตอนจอง | HIGH |
| 08 | Redeem | ใช้แต้ม + promo code พร้อมกัน | HIGH |
| 09 | Redeem | Validation: ขั้นต่ำ, ไม่เกินแต้มที่มี | MEDIUM |
| 10 | Redeem | Validation: ส่วนลดไม่เกิน max % | MEDIUM |
| 11 | Redeem | ยกเลิก booking → คืนแต้ม | HIGH |
| 12 | UI | Customer Profile แสดงยอดแต้ม | HIGH |
| 13 | UI | Points History แสดงประวัติ + filter | HIGH |
| 14 | UI | BookingWizard แสดง section ใช้แต้ม | HIGH |
| 15 | UI | Price breakdown ถูกต้อง | HIGH |
| 16 | Expiry | Cron ตัดแต้มหมดอายุ | HIGH |
| 17 | Expiry | แจ้งเตือน 30 วันก่อนหมดอายุ | MEDIUM |
| 18 | Admin | Customer Detail แสดงแต้ม | MEDIUM |
| 19 | Admin | ให้แต้มพิเศษ | MEDIUM |
| 20 | Admin | หักแต้ม | MEDIUM |
| 21 | Regression | Login ทุก app | HIGH |
| 22 | Regression | Booking flow ปกติ (ไม่ใช้แต้ม) | HIGH |
| 23 | Regression | Promo code ยังใช้ได้ | HIGH |
| 24 | Regression | Hotel Credit system ไม่กระทบ | MEDIUM |
