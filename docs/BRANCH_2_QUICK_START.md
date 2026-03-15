# 🏨👤 Branch 2 - Quick Start Guide

**Developer:** Team Member #2
**Tasks:** Hotels Management + Customers Management
**Timeline:** 1-2 สัปดาห์
**Priority:** Medium-High

---

## 🎯 Your Mission

ปรับปรุง 2 ฟังก์ชั่นหลักใน Admin App:
1. **🏨 Hotels Management** - จัดการโรงแรมพาร์ทเนอร์
2. **👤 Customers Management** - จัดการลูกค้า

**Current Status**: ใช้ Mock Data → **ต้องเชื่อมต่อ Database จริง**

---

## 🚀 Quick Start (5 นาทีแรก)

### 1. ดู Current Code
```bash
# ดูไฟล์ที่มีอยู่แล้ว
apps/admin/src/pages/Hotels.tsx      # โรงแรม (Mock Data)
apps/admin/src/pages/Customers.tsx   # ลูกค้า (Mock Data)
```

### 2. ทดสอบการทำงาน
```bash
cd apps/admin
pnpm dev
# เปิด http://localhost:3001
# ไป /admin/hotels และ /admin/customers
```

### 3. ดู Database Schema
```bash
# เช็ค tables ที่มีอยู่
supabase/migrations/004_create_staff_and_hotels.sql
supabase/migrations/005_create_customers_table.sql
```

---

## 📋 Your Checklist

### Week 1: Hotels Management 🏨

#### Day 1-2: Setup & Database
- [ ] ✅ สร้าง `useHotels` hook
- [ ] ✅ สร้าง `hotelService.ts`
- [ ] ✅ เชื่อมต่อ `Hotels.tsx` กับ Supabase
- [ ] ✅ แสดงข้อมูลโรงแรมจริงจาก Database

#### Day 3-4: CRUD Operations
- [ ] ✅ สร้าง `AddHotelModal.tsx` (เพิ่มโรงแรม)
- [ ] ✅ สร้าง `EditHotelModal.tsx` (แก้ไขโรงแรม)
- [ ] ✅ เพิ่มฟังก์ชั่นลบโรงแรม
- [ ] ✅ ทดสอบ Add/Edit/Delete

#### Day 5: Polish & Test
- [ ] ✅ ปรับปรุง UI/UX ให้สวยงาม
- [ ] ✅ เพิ่ม Loading states
- [ ] ✅ เพิ่ม Error handling
- [ ] ✅ ทดสอบ responsive design

### Week 2: Customers Management 👤

#### Day 1-2: Setup & Database
- [ ] ✅ สร้าง `useCustomers` hook
- [ ] ✅ สร้าง `customerService.ts`
- [ ] ✅ เชื่อมต่อ `Customers.tsx` กับ Supabase
- [ ] ✅ แสดงข้อมูลลูกค้าจริงจาก Database

#### Day 3-4: Customer Profile
- [ ] ✅ สร้าง `CustomerProfilePage.tsx`
- [ ] ✅ สร้าง `CustomerBookingHistory.tsx`
- [ ] ✅ เพิ่ม Customer Analytics
- [ ] ✅ เพิ่ม Edit Customer functionality

#### Day 5: Polish & Test
- [ ] ✅ ปรับปรุง UI/UX ให้สวยงาม
- [ ] ✅ เพิ่ม Advanced filters
- [ ] ✅ ทดสอบ User experience
- [ ] ✅ Complete testing

---

## 🔧 Essential Files to Create

### Hotels 🏨
```
hooks/useHotels.ts              # Database hooks
services/hotelService.ts        # API service
components/hotels/
  ├── AddHotelModal.tsx         # เพิ่มโรงแรม
  ├── EditHotelModal.tsx        # แก้ไขโรงแรม
  └── HotelCard.tsx             # การ์ดแสดงโรงแรม
```

### Customers 👤
```
hooks/useCustomers.ts           # Database hooks
services/customerService.ts     # API service
components/customers/
  ├── CustomerProfilePage.tsx   # หน้าโปรไฟล์ลูกค้า
  ├── EditCustomerModal.tsx     # แก้ไขลูกค้า
  └── CustomerBookingHistory.tsx # ประวัติการจอง
```

---

## 💡 Key Implementation Points

### 1. Database Connection
```typescript
// ใช้ TanStack Query + Supabase
import { supabase } from '../lib/supabase'
import { useQuery, useMutation } from '@tanstack/react-query'

// Example Hook
export const useHotels = () => {
  return useQuery({
    queryKey: ['hotels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .order('hotel_name')

      if (error) throw error
      return data
    }
  })
}
```

### 2. Form Handling
```typescript
// ใช้ React Hook Form + Zod
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const HotelSchema = z.object({
  hotel_name: z.string().min(3),
  email: z.string().email(),
  phone: z.string(),
  // ...
})

const form = useForm<HotelFormData>({
  resolver: zodResolver(HotelSchema)
})
```

### 3. UI Components
```typescript
// ใช้ Tailwind CSS + Lucide Icons
import { Building, Phone, Mail } from 'lucide-react'

// Follow existing design pattern
className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100"
```

---

## 🎨 Design Guidelines

### Colors & Theme
```css
/* ใช้สี Theme ที่มีอยู่ */
Primary: amber-700, amber-800    /* ปุ่มหลัก */
Background: stone-50             /* พื้นหลัง */
Text: stone-900                  /* ข้อความ */
Borders: stone-200               /* เส้นขอบ */
Cards: white                     /* การ์ด */
```

### Layout Pattern
```typescript
// ใช้ layout pattern ที่มีอยู่
<div className="space-y-6">
  {/* Header */}
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold text-stone-900">หัวข้อ</h1>
    <button className="bg-gradient-to-r from-amber-700 to-amber-800...">
      เพิ่ม
    </button>
  </div>

  {/* Content */}
  <div className="bg-white rounded-2xl shadow-lg p-6">
    {/* เนื้อหา */}
  </div>
</div>
```

---

## 🛠️ Development Commands

### Local Development
```bash
# Start admin app
cd apps/admin
pnpm dev

# Type checking
pnpm typecheck

# Build test
pnpm build

# Run tests
pnpm test
```

### Database Commands
```bash
# Reset database (if needed)
supabase db reset

# Generate types
supabase gen types typescript --linked > packages/supabase/src/types/database.types.ts
```

---

## 📞 Need Help?

### Resources
1. **📖 Full Documentation**: `docs/HOTELS_CUSTOMERS_IMPLEMENTATION.md`
2. **🎯 Existing Code**: `apps/admin/src/pages/Services.tsx` (ดูตัวอย่าง)
3. **🗄️ Database Schema**: `supabase/migrations/`
4. **🎨 Design System**: ดู components ที่มีอยู่แล้ว

### Quick References
- **Supabase Docs**: https://supabase.com/docs
- **TanStack Query**: https://tanstack.com/query/latest
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Hook Form**: https://react-hook-form.com/

---

## ✅ Definition of Done

Your code is ready when:
- [ ] Hotels Management แสดงข้อมูลจริงจาก Database
- [ ] สามารถ Add/Edit/Delete โรงแรมได้
- [ ] Customers Management แสดงข้อมูลจริงจาก Database
- [ ] สามารถดูและแก้ไขข้อมูลลูกค้าได้
- [ ] UI/UX สวยงามและใช้งานง่าย
- [ ] ไม่มี TypeScript errors
- [ ] Build ได้สำเร็จ
- [ ] Responsive design ทำงานได้บนมือถือ

---

**🚀 Ready to Code? Let's make it awesome!**

**Questions?** Check `docs/HOTELS_CUSTOMERS_IMPLEMENTATION.md` for full details!