# 🌿 Git Branching Strategy - Hotels & Customers Features

**Version:** 1.0.0
**Created:** 28 มกราคม 2026
**Purpose:** แบ่ง branch สำหรับ Hotels & Customers Management

---

## 🎯 Branching Overview

```
main (production)
└── feature/admin (current admin development - มีอยู่แล้ว)
    ├── feature/hotels-management     🏨 ← Developer A
    └── feature/customers-management  👤 ← Developer B
```

### 📋 Branch Purpose
- **`main`**: Production stable code
- **`feature/admin`**: Current admin app development (มีอยู่แล้ว)
- **`feature/hotels-management`**: Hotels Management features only (สร้างจาก feature/admin)
- **`feature/customers-management`**: Customers Management features only (สร้างจาก feature/admin)

---

## 🚀 Setup Instructions

### 1. เช็คสถานะปัจจุบัน
```bash
# เช็คว่าอยู่ branch ไหน
git status
git branch -a

# ควรเห็น feature/admin branch
git branch -r | grep admin
```

### 2. สร้าง Feature Branches จาก feature/admin

#### 🏨 สำหรับ Hotels Management
```bash
# ไปยัง feature/admin branch ก่อน
git checkout feature/admin
git pull origin feature/admin

# สร้าง branch hotels จาก feature/admin
git checkout -b feature/hotels-management

# Push branch ขึ้น remote
git push -u origin feature/hotels-management
```

#### 👤 สำหรับ Customers Management
```bash
# ไปยัง feature/admin branch ก่อน (ถ้ายังไม่ได้อยู่)
git checkout feature/admin
git pull origin feature/admin

# สร้าง branch customers จาก feature/admin
git checkout -b feature/customers-management

# Push branch ขึ้น remote
git push -u origin feature/customers-management
```

---

## 👥 Team Workflow

### 🏨 Developer A: Hotels Management

#### Initial Setup
```bash
# Clone และ checkout hotels branch
git clone <repository-url>
cd the-bliss-at-home-1
git checkout feature/hotels-management

# Install dependencies
pnpm install
cd apps/admin
pnpm install

# Start development
pnpm dev
```

#### Daily Workflow
```bash
# เริ่มทำงานแต่ละวัน
git checkout feature/hotels-management
git pull origin feature/hotels-management

# ทำงาน... แล้ว commit
git add .
git commit -m "feat(hotels): add hotel listing from database"
git push origin feature/hotels-management
```

#### Completed Features Commits
```bash
# Hotels: Database Integration
git commit -m "feat(hotels): integrate hotels with Supabase database"

# Hotels: Add Modal
git commit -m "feat(hotels): add hotel creation modal with form validation"

# Hotels: Edit Modal
git commit -m "feat(hotels): add hotel edit functionality"

# Hotels: Delete Feature
git commit -m "feat(hotels): add hotel deletion with confirmation"

# Hotels: UI Polish
git commit -m "style(hotels): improve responsive design and loading states"
```

### 👤 Developer B: Customers Management

#### Initial Setup
```bash
# Clone และ checkout customers branch
git clone <repository-url>
cd the-bliss-at-home-1
git checkout feature/customers-management

# Install dependencies
pnpm install
cd apps/admin
pnpm install

# Start development
pnpm dev
```

#### Daily Workflow
```bash
# เริ่มทำงานแต่ละวัน
git checkout feature/customers-management
git pull origin feature/customers-management

# ทำงาน... แล้ว commit
git add .
git commit -m "feat(customers): add customer profile page"
git push origin feature/customers-management
```

#### Completed Features Commits
```bash
# Customers: Database Integration
git commit -m "feat(customers): integrate customers with Supabase database"

# Customers: Profile Page
git commit -m "feat(customers): add customer profile page with booking history"

# Customers: Edit Modal
git commit -m "feat(customers): add customer edit functionality"

# Customers: Analytics
git commit -m "feat(customers): add customer analytics and statistics"

# Customers: UI Polish
git commit -m "style(customers): improve responsive design and search filters"
```

---

## 📁 File Organization Strategy

### 🏨 Hotels Management Files (Developer A)

**ไฟล์ที่ Developer A ควรทำงานด้วย:**
```
apps/admin/src/
├── pages/
│   ├── Hotels.tsx                    ← แก้ไขไฟล์นี้
│   └── HotelProfile.tsx              ← สร้างใหม่
├── components/hotels/                ← สร้าง folder ใหม่
│   ├── AddHotelModal.tsx
│   ├── EditHotelModal.tsx
│   ├── HotelCard.tsx
│   └── HotelStats.tsx
├── hooks/
│   └── useHotels.ts                  ← สร้างใหม่
└── services/
    └── hotelService.ts               ← สร้างใหม่
```

### 👤 Customers Management Files (Developer B)

**ไฟล์ที่ Developer B ควรทำงานด้วย:**
```
apps/admin/src/
├── pages/
│   ├── Customers.tsx                 ← แก้ไขไฟล์นี้
│   └── CustomerProfile.tsx           ← สร้างใหม่
├── components/customers/             ← สร้าง folder ใหม่
│   ├── EditCustomerModal.tsx
│   ├── CustomerStatsCard.tsx
│   ├── CustomerBookingHistory.tsx
│   └── CustomerAnalytics.tsx
├── hooks/
│   └── useCustomers.ts               ← สร้างใหม่
└── services/
    └── customerService.ts            ← สร้างใหม่
```

### 🚫 ไฟล์ที่ต้องระวัง (อย่าแก้พร้อมกัน)

**Shared Files - ต้องประสานกัน:**
```
apps/admin/src/
├── App.tsx                          ← Route definitions
├── layouts/AdminLayout.tsx          ← Navigation menu
└── lib/supabase.ts                  ← Shared Supabase client
```

**📞 หากต้องแก้ shared files**: ให้คุยกันก่อน และ merge เป็นคนละ PR

---

## 🔄 Merge Strategy

### Phase 1: Independent Development (Week 1-2)
```bash
# แต่ละคนทำงานใน branch ของตัวเอง
# ไม่ต้อง merge รีบ
feature/hotels-management     ← Development A
feature/customers-management  ← Development B
```

### Phase 2: Integration Testing (Week 2-3)
```bash
# เมื่อทำเสร็จแล้ว สร้าง PR กลับไป feature/admin

# Developer A creates PR
feature/hotels-management → feature/admin
# Title: "feat(admin): Hotels Management - Complete Implementation"

# Developer B creates PR
feature/customers-management → feature/admin
# Title: "feat(admin): Customers Management - Complete Implementation"
```

### Phase 3: Final Integration (Week 3)
```bash
# Merge ทีละ PR กลับเข้า feature/admin
# Test integration ใน feature/admin branch
# แล้วสุดท้าย merge feature/admin → main เป็น final release
feature/admin → main
# Title: "feat: Admin App - Complete Hotels & Customers Management"
```

---

## 📋 Branch Protection & Rules

### ✅ Commit Message Convention
```bash
# Hotels commits
feat(hotels): add new hotel functionality
fix(hotels): resolve hotel deletion bug
style(hotels): improve hotel card styling
test(hotels): add hotel CRUD tests

# Customers commits
feat(customers): add customer profile page
fix(customers): resolve customer search issue
style(customers): improve responsive design
test(customers): add customer analytics tests
```

### 🛡️ Branch Protection Rules
```bash
# ป้องกัน force push ใน feature branches
git push --force-with-lease origin feature/hotels-management

# แทน force push ธรรมดา (อันตราย)
git push --force origin feature/hotels-management  # ❌ อย่าทำ
```

### 📝 PR Requirements
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Code review approved
- [ ] Features working in dev environment
- [ ] Documentation updated

---

## 🚀 Development Commands

### 🏨 Hotels Development Commands
```bash
# Switch to hotels branch
git checkout feature/hotels-management

# Daily development
cd apps/admin
pnpm dev

# Testing
pnpm typecheck
pnpm build
pnpm test

# Commit work
git add .
git commit -m "feat(hotels): describe what you built"
git push origin feature/hotels-management
```

### 👤 Customers Development Commands
```bash
# Switch to customers branch
git checkout feature/customers-management

# Daily development
cd apps/admin
pnpm dev

# Testing
pnpm typecheck
pnpm build
pnpm test

# Commit work
git add .
git commit -m "feat(customers): describe what you built"
git push origin feature/customers-management
```

---

## 🔧 Resolving Conflicts

### เมื่อเกิด Conflicts ใน Shared Files

#### Scenario: Both developers แก้ `App.tsx` (routes)
```bash
# Developer A: เพิ่ม hotel routes
# Developer B: เพิ่ม customer routes

# Solution: ประสานกันผ่าน chat/meeting
# หรือ create intermediate merge commit
```

#### Safe Merge Procedure
```bash
# Developer A merges first
git checkout main
git pull origin main
git merge feature/hotels-management
git push origin main

# Developer B rebases และ resolves conflicts
git checkout feature/customers-management
git rebase main
# Resolve conflicts manually
git add .
git rebase --continue
git push --force-with-lease origin feature/customers-management
```

---

## 📞 Communication Protocol

### 🗣️ Daily Standup Questions
1. **Yesterday**: What did you complete in your branch?
2. **Today**: What are you working on today?
3. **Blockers**: Any shared files you need to modify?
4. **Dependencies**: Do you need anything from the other developer?

### 📱 Quick Coordination
```markdown
# Example Slack/Discord messages:

Developer A: "🏨 Working on AddHotelModal today, won't touch shared files"
Developer B: "👤 Need to update App.tsx for customer routes, is that ok?"
Developer A: "✅ Go ahead, I'm only in components/hotels/ folder"

Developer B: "👤 Finished customer profile page, ready for review"
Developer A: "🏨 Hotels CRUD is done, creating PR now"
```

---

## 🎯 Success Metrics

### ✅ Branch Health Indicators
- [ ] No merge conflicts in shared files
- [ ] Each branch builds successfully
- [ ] Features work independently
- [ ] Clear commit history
- [ ] Good test coverage
- [ ] Documentation is updated

### 📊 Progress Tracking
```bash
# Check progress of each branch
git log --oneline feature/hotels-management
git log --oneline feature/customers-management

# Compare branches
git diff main..feature/hotels-management --name-only
git diff main..feature/customers-management --name-only
```

---

## 🆘 Emergency Procedures

### 🔴 If Main Branch Breaks
```bash
# Stop all feature development
# Fix main branch first
# Rebase feature branches after fix

git checkout main
git pull origin main
# Fix the issue...
git commit -m "hotfix: resolve critical issue"
git push origin main

# Then update feature branches
git checkout feature/hotels-management
git rebase main
git push --force-with-lease origin feature/hotels-management

git checkout feature/customers-management
git rebase main
git push --force-with-lease origin feature/customers-management
```

### 🔴 If Feature Branch Breaks
```bash
# Reset to last known good commit
git checkout feature/hotels-management
git log --oneline  # find good commit hash
git reset --hard <good-commit-hash>
git push --force-with-lease origin feature/hotels-management
```

---

## 🎉 Final Integration Plan

### Week 3: Merge Week 🚀
1. **Day 1**: Developer A creates Hotels PR
2. **Day 2**: Code review for Hotels PR
3. **Day 3**: Developer B creates Customers PR
4. **Day 4**: Code review for Customers PR
5. **Day 5**: Merge both PRs and integration testing

### 🧪 Integration Testing Checklist
- [ ] Both features work together
- [ ] No conflicts in navigation/routing
- [ ] Shared components work properly
- [ ] Database operations don't conflict
- [ ] Performance is acceptable
- [ ] UI/UX is consistent

---

**🌿 Happy Branching! Let's build amazing features! 🚀**