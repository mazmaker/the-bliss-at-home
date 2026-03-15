# 🌿 Updated Branching Strategy - From feature/admin

**Updated:** 28 มกราคม 2026
**Current Situation**: มี `feature/admin` branch อยู่แล้ว
**Goal**: แบ่งงาน Hotels & Customers เป็น sub-branches

---

## 🎯 Current Branching Structure

```
main (production)
└── feature/admin (มีอยู่แล้ว - รวม admin work ทั้งหมด)
    ├── feature/hotels-management     🏨 ← Developer A (สร้างใหม่)
    └── feature/customers-management  👤 ← Developer B (สร้างใหม่)
```

---

## 🚀 Setup Commands (ทำตอนนี้เลย)

### 1. เช็คสถานะปัจจุบัน
```bash
# เช็คว่าอยู่ branch ไหน
git branch
git status

# ควรเห็น feature/admin
git branch -a | grep admin
```

### 2. สร้าง Hotels Management Branch 🏨
```bash
# ไป feature/admin ก่อน
git checkout feature/admin
git pull origin feature/admin

# สร้าง hotels branch จาก feature/admin
git checkout -b feature/hotels-management
git push -u origin feature/hotels-management

# ✅ Developer A จะทำงานใน branch นี้
```

### 3. สร้าง Customers Management Branch 👤
```bash
# กลับไป feature/admin
git checkout feature/admin

# สร้าง customers branch จาก feature/admin
git checkout -b feature/customers-management
git push -u origin feature/customers-management

# ✅ Developer B จะทำงานใน branch นี้
```

---

## 👥 การแบ่งงาน

### 🏨 **Developer A** - Hotels Management
```bash
# Switch to hotels branch
git checkout feature/hotels-management

# ไฟล์ที่จะทำงาน:
apps/admin/src/
├── pages/Hotels.tsx              ← แก้ไข (จาก Mock → Real Data)
├── components/hotels/            ← สร้าง folder ใหม่
│   ├── AddHotelModal.tsx
│   ├── EditHotelModal.tsx
│   └── HotelCard.tsx
├── hooks/useHotels.ts            ← สร้างใหม่
└── services/hotelService.ts      ← สร้างใหม่
```

### 👤 **Developer B** - Customers Management
```bash
# Switch to customers branch
git checkout feature/customers-management

# ไฟล์ที่จะทำงาน:
apps/admin/src/
├── pages/Customers.tsx           ← แก้ไข (จาก Mock → Real Data)
├── components/customers/         ← สร้าง folder ใหม่
│   ├── CustomerProfilePage.tsx
│   ├── EditCustomerModal.tsx
│   └── CustomerBookingHistory.tsx
├── hooks/useCustomers.ts         ← สร้างใหม่
└── services/customerService.ts   ← สร้างใหม่
```

---

## 🔄 Daily Workflow

### 🏨 Developer A (Hotels)
```bash
# เริ่มต้นทุกวัน
git checkout feature/hotels-management
git pull origin feature/hotels-management

# พัฒนา...
cd apps/admin
pnpm dev

# Commit งาน
git add .
git commit -m "feat(hotels): add hotel creation modal"
git push origin feature/hotels-management
```

### 👤 Developer B (Customers)
```bash
# เริ่มต้นทุกวัน
git checkout feature/customers-management
git pull origin feature/customers-management

# พัฒนา...
cd apps/admin
pnpm dev

# Commit งาน
git add .
git commit -m "feat(customers): add customer profile page"
git push origin feature/customers-management
```

---

## 🔄 Merge Strategy

### Phase 1: Development (Week 1-2)
```bash
# แต่ละคนทำงานใน branch ของตัวเอง
feature/hotels-management     ← Developer A
feature/customers-management  ← Developer B

# ไม่ต้องกังวลเรื่อง conflicts
```

### Phase 2: Integration (Week 2-3)
```bash
# เมื่อ Hotels เสร็จแล้ว
feature/hotels-management → feature/admin
# Title: "feat(admin): Hotels Management - Complete Implementation"

# เมื่อ Customers เสร็จแล้ว
feature/customers-management → feature/admin
# Title: "feat(admin): Customers Management - Complete Implementation"
```

### Phase 3: Final Release (Week 3)
```bash
# รวมทั้งหมดใน feature/admin แล้ว merge ไป main
feature/admin → main
# Title: "feat: Admin App - Complete Hotels & Customers Management"
```

---

## ✅ ข้อดีของ Strategy นี้

### 🎯 **Clean Organization**
- ใช้ `feature/admin` เป็น base (มีอยู่แล้ว)
- แบ่งงานชัดเจน ไม่ conflict
- History สะอาด แยกงานชัดเจน

### 🔄 **Easy Integration**
- Merge กลับเข้า `feature/admin` ก่อน
- Test integration ใน `feature/admin`
- Release ครั้งเดียวไป `main`

### 🚫 **No Conflicts**
- แต่ละคนทำ folder แยกกัน
- Base code เหมือนกัน (จาก feature/admin)
- Merge แยกกัน ทีละ feature

---

## 📋 Quick Reference

### 🏨 Hotels Branch
```bash
git checkout feature/hotels-management
git pull origin feature/hotels-management
# พัฒนา...
git add .
git commit -m "feat(hotels): describe change"
git push origin feature/hotels-management
```

### 👤 Customers Branch
```bash
git checkout feature/customers-management
git pull origin feature/customers-management
# พัฒนา...
git add .
git commit -m "feat(customers): describe change"
git push origin feature/customers-management
```

### 🔄 Sync with feature/admin (หากจำเป็น)
```bash
# ถ้า feature/admin มีการเปลี่ยนแปลง
git checkout feature/admin
git pull origin feature/admin

git checkout feature/hotels-management
git rebase feature/admin
git push --force-with-lease origin feature/hotels-management
```

---

## ⚠️ Important Notes

### 🚫 **ไฟล์ที่ต้องระวัง** (อาจ conflict)
```bash
apps/admin/src/
├── App.tsx                    ← Routes (ประสานกัน)
├── layouts/AdminLayout.tsx    ← Navigation (ประสานกัน)
└── lib/supabase.ts           ← Shared client (ระวัง)
```

### 💬 **Communication**
```markdown
# ตัวอย่างการประสาน:
Developer A: "🏨 Adding hotel routes to App.tsx today"
Developer B: "👤 Ok, I'll wait for your commit before adding customer routes"

Developer B: "👤 Need to update AdminLayout navigation"
Developer A: "✅ Go ahead, I'm only in components/hotels/ folder"
```

### ✅ **Best Practices**
- Commit งานเล็กๆ บ่อยๆ
- ใช้ descriptive commit messages
- Pull ก่อนเริ่มทำงานทุกวัน
- Test ก่อน push
- ประสานกันก่อนแก้ shared files

---

## 🎯 Success Checklist

### เมื่อเสร็จแล้ว ต้องได้:
- [ ] 🏨 Hotels Management ทำงานครบ 100%
- [ ] 👤 Customers Management ทำงานครบ 100%
- [ ] 🗄️ เชื่อมต่อ Database จริงได้ทั้งสอง
- [ ] 🎨 UI/UX สวยงาม ตาม Design System
- [ ] ⚡ Performance ดี (< 3 วินาที)
- [ ] 📱 Responsive ทำงานบนมือถือ
- [ ] ✅ ไม่มี TypeScript errors
- [ ] 🔧 Build ได้สำเร็จ
- [ ] 🧪 Tests ผ่านหมด

---

## 🚀 Ready to Start?

**Run these commands now:**

```bash
# เช็ค current branch
git branch

# สร้าง hotels branch
git checkout feature/admin
git pull origin feature/admin
git checkout -b feature/hotels-management
git push -u origin feature/hotels-management

# สร้าง customers branch
git checkout feature/admin
git checkout -b feature/customers-management
git push -u origin feature/customers-management

# แล้วแบ่งงานกัน!
```

**🌿 พร้อมแบ่งงานแล้ว! Happy Coding! 🚀**