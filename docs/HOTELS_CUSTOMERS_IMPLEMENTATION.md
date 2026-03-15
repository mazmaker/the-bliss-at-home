# 🏨👤 Hotels & Customers Management - Implementation Guide

**Version:** 1.0.0
**Created:** 28 มกราคม 2026
**For:** Developer Team Member #2
**Priority:** Medium-High

---

## 📋 Overview

เอกสารนี้สำหรับ Developer ที่รับผิดชอบพัฒนาส่วน **Hotels Management** และ **Customers Management** ในระบบ Admin App

### 🎯 Goal
- ปรับปรุงและเพิ่มฟังก์ชั่น Hotels Management ให้ครบถ้วน
- ปรับปรุงและเพิ่มฟังก์ชั่น Customers Management ให้ครบถ้วน
- เชื่อมต่อกับ Supabase Database จริง
- ให้ UI/UX สอดคล้องกับ Admin App

---

## 🏨 Hotels Management (จัดการโรงแรม)

### 🎯 Current Status

**ไฟล์หลัก**: `apps/admin/src/pages/Hotels.tsx`
**สถานะ**: ใช้ Mock Data - **ต้องเชื่อมต่อ Database จริง**

### ✅ ฟังก์ชั่นที่มีอยู่แล้ว

#### **Hotel Display Features**
- ✅ **View All Hotels** - รายการโรงแรมพาร์ทเนอร์
- ✅ **Hotel Card Layout** - แสดงข้อมูลโรงแรมแบบ Card
- ✅ **Status Badge** - แสดงสถานะ (active, pending, inactive)
- ✅ **Basic Information** - ชื่อ, ผู้ติดต่อ, เบอร์โทร, อีเมล
- ✅ **Performance Metrics** - การจองรวม, รายได้รายเดือน
- ✅ **Rating Display** - คะแนนความพึงพอใจ
- ✅ **Commission Rate** - อัตราค่าคอมมิชชั่น

#### **Hotel Filters**
- ✅ **Search Function** - ค้นหาโรงแรม (ชื่อ TH/EN)
- ✅ **Status Filter** - กรองตามสถานะ (all, active, pending, inactive)

### 🚧 ฟังก์ชั่นที่ต้องทำ

#### **1. Database Integration**
```typescript
// Database Schema: hotels table
interface Hotel {
  id: string                    // Primary key
  user_id?: string              // Link to auth.users
  hotel_name: string            // ชื่อโรงแรม
  hotel_name_en?: string        // ชื่ออังกฤษ
  contact_person: string        // ผู้ติดต่อ
  email: string                 // อีเมล
  phone: string                 // เบอร์โทร
  address: string               // ที่อยู่
  district?: string             // เขต
  province?: string             // จังหวัด
  postal_code?: string          // รหัสไปรษณีย์
  tax_id?: string               // เลขประจำตัวผู้เสียภาษี
  commission_rate: number       // อัตราค่าคอมมิชชั่น (%)
  billing_cycle: string        // รอบบิล (monthly, weekly)
  status: 'active' | 'pending' | 'inactive' | 'suspended'
  rating?: number               // คะแนนความพึงพอใจ
  total_bookings?: number       // การจองทั้งหมด
  monthly_revenue?: number      // รายได้รายเดือน
  notes?: string                // หมายเหตุ
  created_at: string
  updated_at: string
}
```

#### **2. CRUD Operations**

**2.1 Create Hotel (เพิ่มโรงแรม)**
```typescript
// Component: AddHotelModal.tsx
interface AddHotelForm {
  hotel_name: string
  hotel_name_en?: string
  contact_person: string
  email: string
  phone: string
  address: string
  district?: string
  province?: string
  postal_code?: string
  tax_id?: string
  commission_rate: number
  billing_cycle: 'monthly' | 'weekly'
  notes?: string
}

// Validation Rules:
// - hotel_name: required, min 3 chars
// - email: required, valid email format
// - phone: required, Thai phone format
// - commission_rate: required, 0-50%
// - address: required, min 10 chars
```

**2.2 Edit Hotel (แก้ไขโรงแรม)**
```typescript
// Component: EditHotelModal.tsx
// Same as AddHotelForm but pre-filled with existing data
// Support partial updates
```

**2.3 Delete Hotel (ลบโรงแรม)**
```typescript
// Soft delete - change status to 'inactive'
// Show confirmation dialog
// Check if hotel has active bookings
```

#### **3. Advanced Features**

**3.1 Hotel Profile Page**
```typescript
// Route: /admin/hotels/:id
// Features:
// - Full hotel information
// - Booking history with hotel
// - Revenue analytics
// - Contract documents
// - Communication history
```

**3.2 Bulk Operations**
```typescript
// Features:
// - Bulk status update
// - Bulk commission rate change
// - Export hotel list to Excel/CSV
// - Import hotels from CSV
```

**3.3 Performance Analytics**
```typescript
// Charts and metrics:
// - Monthly booking trends
// - Revenue by hotel
// - Top performing hotels
// - Commission summary
```

### 📊 Database Queries

**Supabase Queries ที่ต้องสร้าง:**

```sql
-- Get all hotels with stats
SELECT
  h.*,
  COUNT(b.id) as total_bookings,
  SUM(CASE WHEN b.created_at >= current_date - interval '30 days'
      THEN b.total_amount ELSE 0 END) as monthly_revenue
FROM hotels h
LEFT JOIN bookings b ON h.id = b.hotel_id
GROUP BY h.id
ORDER BY h.hotel_name;

-- Get hotel by ID with detailed stats
SELECT
  h.*,
  COUNT(b.id) as total_bookings,
  AVG(r.rating) as avg_rating,
  SUM(b.total_amount) as total_revenue
FROM hotels h
LEFT JOIN bookings b ON h.id = b.hotel_id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE h.id = $1
GROUP BY h.id;

-- Search hotels
SELECT * FROM hotels
WHERE (hotel_name ILIKE '%' || $1 || '%'
       OR hotel_name_en ILIKE '%' || $1 || '%'
       OR contact_person ILIKE '%' || $1 || '%')
  AND ($2 = 'all' OR status = $2)
ORDER BY hotel_name;
```

### 🎨 UI/UX Requirements

**Design Guidelines:**
- ใช้ Tailwind CSS ตาม Design System ที่มีอยู่
- สี Theme: Brown/Amber (สไตล์ Spa)
- Card Layout สำหรับแสดงโรงแรม
- Modal สำหรับ Add/Edit
- Responsive Design (Desktop-first)

**Components ที่ต้องสร้าง:**
- `AddHotelModal.tsx`
- `EditHotelModal.tsx`
- `HotelProfilePage.tsx`
- `HotelCard.tsx` (ปรับปรุงจากเดิม)
- `HotelStats.tsx`

---

## 👤 Customers Management (จัดการลูกค้า)

### 🎯 Current Status

**ไฟล์หลัก**: `apps/admin/src/pages/Customers.tsx`
**สถานะ**: ใช้ Mock Data - **ต้องเชื่อมต่อ Database จริง**

### ✅ ฟังก์ชั่นที่มีอยู่แล้ว

#### **Customer Display Features**
- ✅ **View All Customers** - รายการลูกค้าทั้งหมด
- ✅ **Customer Card Layout** - แสดงข้อมูลลูกค้าแบบ Card
- ✅ **Basic Information** - ชื่อ, อีเมล, เบอร์โทร
- ✅ **Booking Summary** - การจองทั้งหมด, ยอดใช้จ่ายรวม
- ✅ **Last Booking** - การจองล่าสุด
- ✅ **Status Display** - active, inactive

#### **Customer Filters**
- ✅ **Search Function** - ค้นหาลูกค้า
- ✅ **Basic Layout** - Table และ Card view

### 🚧 ฟังก์ชั่นที่ต้องทำ

#### **1. Database Integration**
```typescript
// Database Schema: customers table + profiles table
interface Customer {
  id: string                    // Primary key
  user_id?: string              // Link to auth.users
  full_name: string             // ชื่อเต็ม
  email: string                 // อีเมล
  phone?: string                // เบอร์โทร
  date_of_birth?: string        // วันเกิด
  gender?: 'male' | 'female' | 'other'
  address?: string              // ที่อยู่
  district?: string             // เขต
  province?: string             // จังหวัด
  postal_code?: string          // รหัสไปรษณีย์
  emergency_contact?: string    // ผู้ติดต่อฉุกเฉิน
  emergency_phone?: string      // เบอร์ฉุกเฉิน
  allergies?: string            // ภูมิแพ้
  medical_conditions?: string   // โรคประจำตัว
  preferred_language: 'th' | 'en'
  marketing_consent: boolean    // ยินยอมรับข่าวสาร
  status: 'active' | 'inactive' | 'blacklisted'
  total_bookings?: number       // การจองทั้งหมด
  total_spent?: number          // ยอดใช้จ่ายรวม
  last_booking_date?: string    // การจองล่าสุด
  average_rating?: number       // คะแนนเฉลี่ยที่ให้
  created_at: string
  updated_at: string
}
```

#### **2. Customer Profile Management**

**2.1 View Customer Profile**
```typescript
// Component: CustomerProfilePage.tsx
// Route: /admin/customers/:id

interface CustomerProfile {
  // Personal Information
  basic_info: Customer

  // Booking History
  bookings: Booking[]

  // Payment History
  payments: Payment[]

  // Reviews Given
  reviews: Review[]

  // Statistics
  stats: {
    total_bookings: number
    total_spent: number
    average_booking_value: number
    favorite_services: string[]
    preferred_staff: Staff[]
    booking_frequency: string // weekly, monthly, etc.
  }
}
```

**2.2 Edit Customer Information**
```typescript
// Component: EditCustomerModal.tsx
// Fields that admin can edit:
// - Contact information
// - Address
// - Emergency contacts
// - Medical information
// - Status
// - Marketing consent
// - Notes
```

#### **3. Advanced Customer Features**

**3.1 Customer Analytics**
```typescript
// Customer Insights:
// - Booking patterns (time, frequency)
// - Service preferences
// - Spending behavior
// - Loyalty metrics
// - Cancellation patterns
// - Review patterns
```

**3.2 Customer Segmentation**
```typescript
// Customer Groups:
// - VIP (high spenders)
// - Regular (frequent bookers)
// - New (recent signups)
// - Inactive (no recent bookings)
// - At Risk (declining activity)
```

**3.3 Communication Tools**
```typescript
// Features:
// - Send notifications
// - Email marketing
// - SMS alerts
// - Appointment reminders
// - Promotional offers
```

### 📊 Database Queries

**Supabase Queries ที่ต้องสร้าง:**

```sql
-- Get all customers with stats
SELECT
  c.*,
  COUNT(b.id) as total_bookings,
  SUM(b.total_amount) as total_spent,
  MAX(b.created_at) as last_booking_date,
  AVG(r.rating) as average_rating_given
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN reviews r ON b.id = r.booking_id
GROUP BY c.id
ORDER BY c.created_at DESC;

-- Get customer profile with full details
SELECT
  c.*,
  COUNT(b.id) as total_bookings,
  SUM(b.total_amount) as total_spent,
  AVG(b.total_amount) as avg_booking_value,
  STRING_AGG(DISTINCT s.name_th, ', ') as favorite_services
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN services s ON b.service_id = s.id
WHERE c.id = $1
GROUP BY c.id;

-- Customer search with filters
SELECT * FROM customers
WHERE (full_name ILIKE '%' || $1 || '%'
       OR email ILIKE '%' || $1 || '%'
       OR phone ILIKE '%' || $1 || '%')
  AND ($2 = 'all' OR status = $2)
  AND ($3 = 'all' OR
       CASE
         WHEN $3 = 'vip' THEN total_spent > 50000
         WHEN $3 = 'regular' THEN total_bookings > 10
         WHEN $3 = 'new' THEN created_at > current_date - interval '30 days'
         WHEN $3 = 'inactive' THEN last_booking_date < current_date - interval '90 days'
         ELSE true
       END)
ORDER BY created_at DESC;
```

### 🎨 UI/UX Requirements

**Design Guidelines:**
- ใช้ Tailwind CSS ตาม Design System ที่มีอยู่
- สี Theme: Brown/Amber (สไตล์ Spa)
- Table Layout หลัก + Card View Option
- Modal สำหรับ Edit Customer
- Full-page สำหรับ Customer Profile
- Responsive Design

**Components ที่ต้องสร้าง:**
- `CustomerProfilePage.tsx`
- `EditCustomerModal.tsx`
- `CustomerStatsCard.tsx`
- `CustomerBookingHistory.tsx`
- `CustomerAnalytics.tsx`

---

## 🔧 Technical Implementation

### 📁 File Structure
```
apps/admin/src/
├── pages/
│   ├── Hotels.tsx              ✅ มีอยู่แล้ว (ต้องปรับปรุง)
│   ├── Customers.tsx           ✅ มีอยู่แล้ว (ต้องปรับปรุง)
│   ├── HotelProfile.tsx        🆕 ต้องสร้างใหม่
│   └── CustomerProfile.tsx     🆕 ต้องสร้างใหม่
├── components/
│   ├── hotels/
│   │   ├── AddHotelModal.tsx   🆕 ต้องสร้างใหม่
│   │   ├── EditHotelModal.tsx  🆕 ต้องสร้างใหม่
│   │   ├── HotelCard.tsx       🆕 ต้องสร้างใหม่
│   │   └── HotelStats.tsx      🆕 ต้องสร้างใหม่
│   └── customers/
│       ├── EditCustomerModal.tsx     🆕 ต้องสร้างใหม่
│       ├── CustomerStatsCard.tsx     🆕 ต้องสร้างใหม่
│       ├── CustomerBookingHistory.tsx 🆕 ต้องสร้างใหม่
│       └── CustomerAnalytics.tsx     🆕 ต้องสร้างใหม่
├── hooks/
│   ├── useHotels.ts            🆕 ต้องสร้างใหม่
│   └── useCustomers.ts         🆕 ต้องสร้างใหม่
└── services/
    ├── hotelService.ts         🆕 ต้องสร้างใหม่
    └── customerService.ts      🆕 ต้องสร้างใหม่
```

### 🎣 Hooks ที่ต้องสร้าง

**Hotels Hooks:**
```typescript
// hooks/useHotels.ts
export const useHotels = (filters: HotelFilters) => {
  // TanStack Query for fetching hotels
}

export const useHotel = (id: string) => {
  // Get single hotel with full details
}

export const useCreateHotel = () => {
  // Create new hotel
}

export const useUpdateHotel = () => {
  // Update hotel information
}

export const useDeleteHotel = () => {
  // Soft delete hotel
}

export const useHotelStats = () => {
  // Get hotel analytics and stats
}
```

**Customers Hooks:**
```typescript
// hooks/useCustomers.ts
export const useCustomers = (filters: CustomerFilters) => {
  // TanStack Query for fetching customers
}

export const useCustomer = (id: string) => {
  // Get single customer with full profile
}

export const useUpdateCustomer = () => {
  // Update customer information
}

export const useCustomerBookings = (customerId: string) => {
  // Get customer booking history
}

export const useCustomerStats = () => {
  // Get customer analytics and stats
}
```

### 📝 Forms & Validation

**Hotel Form Validation:**
```typescript
import { z } from 'zod'

const HotelFormSchema = z.object({
  hotel_name: z.string().min(3, 'ชื่อโรงแรมต้องมีอย่างน้อย 3 ตัวอักษร'),
  hotel_name_en: z.string().optional(),
  contact_person: z.string().min(2, 'ชื่อผู้ติดต่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  phone: z.string().regex(/^[0-9-+().\s]+$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง'),
  address: z.string().min(10, 'ที่อยู่ต้องมีอย่างน้อย 10 ตัวอักษร'),
  commission_rate: z.number().min(0).max(50, 'อัตราค่าคอมมิชชั่นต้องอยู่ระหว่าง 0-50%'),
  billing_cycle: z.enum(['monthly', 'weekly']),
})
```

**Customer Form Validation:**
```typescript
const CustomerFormSchema = z.object({
  full_name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  phone: z.string().regex(/^[0-9-+().\s]+$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง').optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  allergies: z.string().optional(),
  medical_conditions: z.string().optional(),
})
```

---

## ✅ Testing Requirements

### 🧪 Unit Tests
```typescript
// Tests ที่ต้องเขียน:

// Hotels
- HotelCard component rendering
- AddHotelModal form validation
- Hotel search and filtering
- Hotel CRUD operations

// Customers
- CustomerProfilePage rendering
- Customer search and filtering
- Customer data display
- Customer analytics calculations
```

### 🔍 Integration Tests
```typescript
// Tests ที่ต้องเขียน:

// Database Integration
- Hotel CRUD with Supabase
- Customer CRUD with Supabase
- Hotel statistics calculation
- Customer analytics calculation

// API Integration
- Hotel search API
- Customer search API
- Booking history API
- Revenue calculation API
```

---

## 📋 Implementation Checklist

### 🏨 Hotels Management Tasks

#### Phase 1: Database Integration
- [ ] สร้าง `useHotels` hooks
- [ ] สร้าง `hotelService.ts`
- [ ] เชื่อมต่อ `Hotels.tsx` กับ Supabase
- [ ] ทดสอบการแสดงข้อมูลจริง

#### Phase 2: CRUD Operations
- [ ] สร้าง `AddHotelModal.tsx`
- [ ] สร้าง `EditHotelModal.tsx`
- [ ] เพิ่มฟังก์ชั่น Delete Hotel
- [ ] ทดสอบ CRUD operations

#### Phase 3: Advanced Features
- [ ] สร้าง `HotelProfilePage.tsx`
- [ ] เพิ่ม Analytics และ Charts
- [ ] เพิ่ม Bulk Operations
- [ ] Export/Import functionality

#### Phase 4: UI/UX Polish
- [ ] ปรับปรุง responsive design
- [ ] เพิ่ม Loading states
- [ ] เพิ่ม Error handling
- [ ] ทดสอบ User experience

### 👤 Customers Management Tasks

#### Phase 1: Database Integration
- [ ] สร้าง `useCustomers` hooks
- [ ] สร้าง `customerService.ts`
- [ ] เชื่อมต่อ `Customers.tsx` กับ Supabase
- [ ] ทดสอบการแสดงข้อมูลจริง

#### Phase 2: Customer Profile
- [ ] สร้าง `CustomerProfilePage.tsx`
- [ ] สร้าง `CustomerBookingHistory.tsx`
- [ ] เพิ่ม Customer Analytics
- [ ] เพิ่ม Edit Customer functionality

#### Phase 3: Advanced Features
- [ ] เพิ่ม Customer Segmentation
- [ ] เพิ่ม Communication Tools
- [ ] เพิ่ม Export functionality
- [ ] เพิ่ม Search & Filter options

#### Phase 4: UI/UX Polish
- [ ] ปรับปรุง responsive design
- [ ] เพิ่ม Loading states
- [ ] เพิ่ม Error handling
- [ ] ทดสอบ User experience

---

## 🚀 Deployment

### 📦 Build Requirements
```bash
# ก่อน deploy ต้องทดสอบ:
pnpm typecheck      # ไม่มี TypeScript errors
pnpm build          # Build สำเร็จ
pnpm test           # Tests ผ่านหมด
```

### 🔧 Environment Variables
```bash
# ตรวจสอบว่ามี env variables ครบ:
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## 📞 Support & Resources

### 📚 References
- **Supabase Docs**: https://supabase.com/docs
- **TanStack Query**: https://tanstack.com/query/latest
- **React Hook Form**: https://react-hook-form.com/
- **Tailwind CSS**: https://tailwindcss.com/docs

### 🤝 Team Communication
- **Code Reviews**: Required for all PRs
- **Testing**: Write tests for all new features
- **Documentation**: Update docs for new features
- **Progress Updates**: Daily standup reports

---

## 📝 Notes

### ⚠️ Important Reminders
1. **ใช้ TypeScript** ให้เต็มรูปแบบ - ไม่ใช้ `any`
2. **ทดสอบกับข้อมูลจริง** - อย่าใช้ Mock Data
3. **Follow Design System** - ใช้ Theme และ Components ที่มีอยู่
4. **Error Handling** - จัดการข้อผิดพลาดให้ครบถ้วน
5. **Performance** - ใช้ TanStack Query สำหรับ caching
6. **Security** - ตรวจสอบ RLS policies
7. **Mobile Responsive** - ทดสอบบนอุปกรณ์มือถือ

### 🎯 Success Criteria
- [ ] Hotels Management ทำงานได้ครบ 100%
- [ ] Customers Management ทำงานได้ครบ 100%
- [ ] เชื่อมต่อ Database จริงได้
- [ ] UI/UX สวยงามและใช้งานง่าย
- [ ] Performance ดี (loading < 3 วินาทีี)
- [ ] ไม่มี bugs หรือ errors
- [ ] Tests ครบถ้วนและผ่านหมด

**Timeline**: 1-2 สัปดาห์
**Priority**: Medium-High

---

**Happy Coding! 🚀**
