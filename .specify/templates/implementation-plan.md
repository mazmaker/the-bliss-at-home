# The Bliss Massage at Home - แผนการพัฒนา 12 สัปดาห์
## Implementation Plan (13 ม.ค. - 7 เม.ย. 2026)

**เวอร์ชัน:** 1.0.0
**สถาปัตยกรรม:** Supabase-First Monorepo
**ทีมงาน:** 5-7 คน (Tech Lead, Frontend x2, Backend, UI/UX, QA, DevOps 0.5)

---

## สารบัญ

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [โครงสร้างทีมและหน้าที่รับผิดชอบ](#2-โครงสร้างทีมและหน้าที่รับผิดชอบ)
3. [Phase 1: Foundation & Design (สัปดาห์ที่ 1-4)](#phase-1-foundation--design-สัปดาห์ที่-1-4)
4. [Phase 2: Core Development (สัปดาห์ที่ 5-8)](#phase-2-core-development-สัปดาห์ที่-5-8)
5. [Phase 3: Provider & Admin (สัปดาห์ที่ 9-11)](#phase-3-provider--admin-สัปดาห์ที่-9-11)
6. [Phase 4: Integration & Launch (สัปดาห์ที่ 12)](#phase-4-integration--launch-สัปดาห์ที่-12)
7. [Post-Launch](#post-launch)
8. [เกณฑ์ความสำเร็จ](#เกณฑ์ความสำเร็จ)
9. [การจัดการความเสี่ยง](#การจัดการความเสี่ยง)
10. [การสื่อสาร](#การสื่อสาร)

---

## 1. ภาพรวมโปรเจกต์

### Tech Stack Summary

| ประเภท | เทคโนโลยี |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5, Vite 5, TanStack Query 5, Zustand, Tailwind CSS, Shadcn/ui |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) |
| **Server** | Node.js 20, Express 4 (เสริมสำหรับงานซับซ้อน) |
| **External** | Omise (payment), LINE API, Google Maps, SendGrid |
| **DevOps** | Docker, GitHub Actions, Vercel, Railway |

### สถาปัตยกรรม Supabase-First

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                     │
│  Admin (3001) │ Customer (3002) │ Hotel (3003) │ Staff (3004) │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Supabase    │  │  Node.js     │  │  External    │
│  (Primary)   │  │  Server      │  │  Services    │
│              │  │  (3000)      │  │              │
│ • Database   │  │              │  │ • Omise      │
│ • Auth       │  │ • Omise      │  │ • LINE       │
│ • Storage    │  │ • LINE       │  │ • Maps       │
│ • Realtime   │  │ • Maps       │  │              │
│ • Edge Fns   │  │ • Algorithms │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 4 แอปพลิเคชัน

| แอป | Port | ผู้ใช้งาน | หน้าที่หลัก |
|-----|------|---------|---------|
| **Admin** | 3001 | ผู้ดูแลระบบ | จัดการทุกอย่าง - bookings, services, providers, hotels, customers, payments, reports, SOS |
| **Customer** | 3002 | ลูกค้าทั่วไป | เลือกบริการ → จอง → ชำระเงิน → ดูสถานะ → รีวิว |
| **Hotel** | 3003 | พนักงานโรงแรม | จองให้แขก → ดูการจอง → ดูบิล/ใบแจ้งหนี้ |
| **Staff** | 3004 | หมอนวด (LIFF) | รับงาน → เริ่มบริการ → เสร็จสิ้น → ดูรายได้ |

---

## 2. โครงสร้างทีมและหน้าที่รับผิดชอบ

### Team Structure

| บทบาท | จำนวน | หน้าที่หลัก |
|-------|-------|-----------|
| **Tech Lead** | 1 | Architecture, Code review, Technical decisions, Mentoring |
| **Frontend Dev** | 2 | Admin app, Customer app, Hotel app, Provider app |
| **Backend Dev** | 1 | Supabase setup, RLS, Node.js server, Integrations |
| **UI/UX Designer** | 1 | Research, Wireframes, Mockups, Prototype, Design system |
| **QA Engineer** | 1 | Test planning, E2E tests, Manual testing, Bug tracking |
| **DevOps** | 0.5 | CI/CD, Deployments, Monitoring, Infrastructure |

### การมอบหมายงานตามแอป

| แอป | Frontend | Backend | QA |
|-----|----------|---------|-----|
| **Admin** | Frontend #1 | Backend | QA |
| **Customer** | Frontend #2 | Backend | QA |
| **Hotel** | Frontend #2 | Backend | QA |
| **Provider** | Frontend #1 | Backend | QA |
| **Server** | - | Backend | QA |

---

## Phase 1: Foundation & Design (สัปดาห์ที่ 1-4)

### Week 1: Discovery & Planning (13-19 ม.ค.)

**📅 กำหนดการ:** 13-19 มกราคม 2026

#### UI/UX Designer
| Task | วัน | สถานะ |
|------|------|--------|
| สัมภาษณ์ผู้ใช้ 5-10 คนต่อ role | 13-15 | ⬜ |
| สร้าง User Personas (4 ประเภท) | 15 | ⬜ |
| สร้าง User Journey Mapping | 16 | ⬜ |
| วิเคราะห์คู่แข่ง 3-5 แพลตฟอร์ม | 16-17 | ⬜ |
| สร้าง Information Architecture | 17 | ⬜ |
| สร้าง Site Maps (4 แอป) | 17-18 | ⬜ |
| สร้าง Design System Foundation | 18-19 | ⬜ |

#### Tech Lead
| Task | วัน | สถานะ |
|------|------|--------|
| สร้าง GitHub repository | 13 | ⬜ |
| Initialize Monorepo (pnpm + Turborepo) | 13-14 | ⬜ |
| Set up ESLint + Prettier + TypeScript | 14 | ⬜ |
| Create project documentation structure | 14 | ⬜ |
| Define Git branching strategy | 15 | ⬜ |
| Set up GitHub Projects board | 15 | ⬜ |
| Create Supabase dev project | 16-19 | ⬜ |

#### 🎯 Deliverables
- [ ] User Research Report
- [ ] Personas (Customer, Hotel staff, Provider, Admin)
- [ ] Journey Maps (4 ชุด)
- [ ] Site Maps (4 แอป)
- [ ] Repository initialized
- [ ] Supabase dev project ready

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| ไม่สามารถติดต่อผู้ใช้ได้ | ใช้ data จาก competitor analysis ชดเชย |
| Supabase setup ใช้เวลานาน | ศึกษา docs ล่วงหน้า, มี backup plan |

---

### Week 2: Wireframes & Supabase Setup (20-26 ม.ค.)

**📅 กำหนดการ:** 20-26 มกราคม 2026

#### UI/UX Designer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Customer App wireframes (10+ screens) | 20-22 | ⬜ | Week 1 personas |
| Hotel App wireframes (8+ screens) | 23-25 | ⬜ | Week 1 personas |

**Customer Screens:**
- [ ] Home (Service categories, promotions)
- [ ] Service Catalog (Grid, search, filters)
- [ ] Service Details (Images, description, price, add-ons, reviews)
- [ ] Booking Step 1: Service Selection
- [ ] Booking Step 2: Date & Time
- [ ] Booking Step 3: Address
- [ ] Booking Step 4: Review
- [ ] Booking Step 5: Payment
- [ ] Booking History
- [ ] Booking Details
- [ ] Profile

**Hotel Screens:**
- [ ] Dashboard
- [ ] Create Guest Booking
- [ ] Guest Booking List
- [ ] Booking Details
- [ ] Billing Overview
- [ ] Invoice List
- [ ] Invoice Details
- [ ] Hotel Profile

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Create 4 app projects (Vite + React + TS) | 20-21 | ⬜ | Week 1 repo |
| Configure Tailwind CSS + Shadcn/ui | 21 | ⬜ | Apps created |
| Set up React Router in each app | 21-22 | ⬜ | Apps created |
| Create base layouts | 22-23 | ⬜ | Router setup |
| Install @supabase/supabase-js | 23 | ⬜ | Apps created |

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Set up local Supabase (Docker) | 20-21 | ⬜ | Week 1 Supabase account |
| Design complete database schema | 21-22 | ⬜ | - |
| Create initial migration files | 23-24 | ⬜ | Schema designed |
| Set up Supabase Auth providers | 24-25 | ⬜ | Local Supabase running |
| Create profiles table | 25-26 | ⬜ | Auth providers ready |

#### 🎯 Deliverables
- [ ] Customer + Hotel wireframes
- [ ] All 4 apps initialized with basic setup
- [ ] Supabase local running
- [ ] Initial database schema

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| Wireframes ไม่ครบ | เริ่มจาก critical flow ก่อน |
| Supabase local error | ใช้ Supabase cloud dev แทนชั่วคราว |

---

### Week 3: Wireframes & Database (27 ม.ค. - 2 ก.พ.)

**📅 กำหนดการ:** 27 มกราคม - 2 กุมภาพันธ์ 2026

#### UI/UX Designer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Staff App wireframes (10+ screens) | 27-29 | ⬜ | Week 1 personas |
| Admin App wireframes (15+ screens) | 30-1 | ⬜ | Week 1 personas |

**Provider Screens (LIFF):**
- [ ] Jobs Feed
- [ ] Job Details
- [ ] Accept/Decline confirmation
- [ ] Active Jobs
- [ ] Start Service
- [ ] Complete Service
- [ ] Schedule (Day/Week/Month)
- [ ] Earnings Dashboard
- [ ] Profile
- [ ] Documents Upload

**Admin Screens:**
- [ ] Dashboard (KPIs, charts)
- [ ] Bookings Management
- [ ] Services Management
- [ ] Providers Management
- [ ] Hotels Management
- [ ] Customers Management
- [ ] Payments Management
- [ ] Promotions Management
- [ ] Reports (4 types)
- [ ] SOS Alerts Dashboard
- [ ] System Settings

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Build shared UI components (@bliss/ui) | 27-29 | ⬜ | Week 2 setup |
| Set up Storybook | 29 | ⬜ | Components created |
| Configure i18next (TH/EN/CN) | 30 | ⬜ | - |
| Create translation files structure | 30 | ⬜ | - |
| Implement language switcher | 31-1 | ⬜ | i18n configured |

**Shared Components:**
- [ ] Button (variants: primary, secondary, ghost, danger)
- [ ] Input (text, email, phone, password)
- [ ] Card
- [ ] Modal
- [ ] Table (sortable, filterable)
- [ ] Loading (spinner, skeleton)
- [ ] Toast
- [ ] Badge
- [ ] Avatar

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Complete all database tables (15+) | 27-28 | ⬜ | Week 2 schema |
| Write RLS policies for all tables | 29-30 | ⬜ | Tables created |
| Create database functions | 30-31 | ⬜ | Tables created |
| Set up Supabase Storage buckets | 31 | ⬜ | - |
| Enable Realtime for bookings, sos_alerts | 1-2 | ⬜ | Tables created |

**Database Tables:**
- [ ] profiles (extends auth.users)
- [ ] customers
- [ ] hotels
- [ ] providers
- [ ] services
- [ ] service_add_ons
- [ ] bookings
- [ ] booking_add_ons
- [ ] payments
- [ ] reviews
- [ ] promotions
- [ ] invoices
- [ ] invoice_items
- [ ] notifications
- [ ] sos_alerts

**Storage Buckets:**
- [ ] avatars (public)
- [ ] documents (private)
- [ ] receipts (private)
- [ ] invoices (private)

#### DevOps
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Set up Docker Compose | 27-28 | ⬜ | - |
| Create .env.example files | 29 | ⬜ | - |
| Document local setup | 30-2 | ⬜ | Docker ready |

#### 🎯 Deliverables
- [ ] Provider + Admin wireframes
- [ ] Shared UI components library
- [ ] i18n setup complete
- [ ] Complete database with RLS
- [ ] Supabase Storage configured
- [ ] Docker Compose ready

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| RLS policies ซับซ้อน | เริ่มจาก simple policies ก่อน |
| Storage permissions issues | Test buckets อย่างละเอียด |

---

### Week 4: High-Fidelity Design & Auth (3-9 ก.พ.)

**📅 กำหนดการ:** 3-9 กุมภาพันธ์ 2026

#### UI/UX Designer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Complete design system | 3-4 | ⬜ | Week 3 components |
| Design all components (20+) | 4-5 | ⬜ | Design system |
| High-fidelity mockups (50+ screens) | 5-7 | ⬜ | All wireframes |
| Interactive prototype (Figma) | 8 | ⬜ | Mockups complete |
| Design handoff (assets, tokens) | 9 | ⬜ | Prototype ready |

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Implement Supabase auth (all apps) | 3-5 | ⬜ | Week 3 setup |
| Create auth context/hooks | 4 | ⬜ | - |
| Build protected route wrappers | 4-5 | ⬜ | Auth context |
| Email/password auth flow | 5 | ⬜ | Supabase auth |
| Phone/OTP auth flow | 6 | ⬜ | Supabase auth |
| OAuth (Google, Facebook) | 7 | ⬜ | Supabase auth |
| Build auth UI components | 8-9 | ⬜ | All auth flows |

**Auth Components:**
- [ ] LoginForm
- [ ] RegisterForm
- [ ] OTPInput
- [ ] ForgotPassword
- [ ] ResetPassword
- [ ] ProtectedRoute
- [ ] AuthProvider

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Set up Node.js server (Express + TS) | 3-4 | ⬜ | - |
| Create Supabase admin client | 4 | ⬜ | Node.js setup |
| Implement LINE OAuth integration | 5-6 | ⬜ | - |
| Create webhook endpoints structure | 6-7 | ⬜ | - |
| Set up Bull queue | 7-8 | ⬜ | - |
| Configure Winston logging | 8-9 | ⬜ | - |

#### QA Engineer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Create test plan document | 3-4 | ⬜ | - |
| Set up testing framework (Jest, RTL) | 5 | ⬜ | - |
| Write auth flow test cases | 6-8 | ⬜ | Auth implementation |
| Create test data scripts | 9 | ⬜ | Complete DB schema |

#### 🎯 Deliverables
- [ ] Complete design system
- [ ] All high-fidelity mockups
- [ ] Interactive prototype
- [ ] Auth system (all methods)
- [ ] Node.js server setup
- [ ] Test plan

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| LINE OAuth ซับซ้อน | ศึกษา LINE docs ล่วงหน้า |
| Auth flows ไม่ sync กัน | ใช้ shared auth package |

---

## Phase 2: Core Development (สัปดาห์ที่ 5-8)

### Week 5: Project Infrastructure & Services (10-16 ก.พ.)

**📅 กำหนดการ:** 10-16 กุมภาพันธ์ 2026

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Set up TanStack Query (all apps) | 10-11 | ⬜ | Week 4 apps |
| Create Supabase client hooks | 11 | ⬜ | TanStack Query |
| User profile pages (view, edit) | 12-13 | ⬜ | Auth complete |
| Customer: Service catalog | 13-14 | ⬜ | Profile done |
| Customer: Service details | 15-16 | ⬜ | Catalog done |

**Supabase Hooks:**
- [ ] useSupabase
- [ ] useSupabaseQuery
- [ ] useSupabaseMutation
- [ ] useAuth
- [ ] useUser

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Deploy Supabase staging | 10-11 | ⬜ | Week 4 local DB |
| Push migrations to staging | 11 | ⬜ | Staging ready |
| Google Maps integration | 12-13 | ⬜ | Node.js setup |
| POST /api/maps/geocode | 13 | ⬜ | Maps integration |
| POST /api/maps/distance | 14 | ⬜ | Geocoding done |
| Seed test data | 15 | ⬜ | Staging DB ready |
| Edge Function: booking validation | 15-16 | ⬜ | Staging functions |

#### DevOps
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Set up GitHub Actions CI/CD | 10-12 | ⬜ | - |
| Configure automated tests | 12-13 | ⬜ | CI/CD setup |
| Set up staging (Vercel + Railway) | 13-14 | ⬜ | - |
| Configure environment secrets | 15-16 | ⬜ | Staging ready |

#### QA Engineer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Write unit tests for hooks | 10-12 | ⬜ | Hooks created |
| Test Supabase queries | 13-14 | ⬜ | Services ready |
| Test Google Maps integration | 15-16 | ⬜ | Maps endpoints |

#### 🎯 Deliverables
- [ ] Service catalog with search/filters
- [ ] Service details page
- [ ] Google Maps integration
- [ ] Staging environment
- [ ] CI/CD pipeline

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| TanStack Query learning curve | ใช้ official docs, examples |
| Google Maps rate limits | Implement caching ตั้งแต่แรก |

---

### Week 6: Customer Booking Flow Part 1 (17-23 ก.พ.)

**📅 กำหนดการ:** 17-23 กุมภาพันธ์ 2026

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Booking wizard state (Zustand) | 17-18 | ⬜ | Week 5 setup |
| Step 1: Service selection + add-ons | 18-19 | ⬜ | State ready |
| Step 2: Date picker + Time slots | 19-20 | ⬜ | Availability logic |
| Step 3: Address input + Map | 21-22 | ⬜ | Maps integration |
| Booking flow navigation | 22-23 | ⬜ | All steps |

**Booking State Structure:**
```typescript
{
  step: 1 | 2 | 3 | 4 | 5
  service: Service | null
  addOns: ServiceAddOn[]
  date: Date | null
  time: string | null
  address: Address | null
  preferredGender: Gender | null
  specialNotes: string
  promotion: Promotion | null
}
```

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Availability check function | 17-18 | ⬜ | Week 5 DB |
| Provider availability queries | 18 | ⬜ | Availability function |
| Booking validation rules | 19 | ⬜ | Requirements |
| RLS for booking creation | 20 | ⬜ | Validation ready |
| Edge Function: on_booking_created | 21-23 | ⬜ | RLS policies |

**Validation Rules:**
- [ ] No double booking
- [ ] 3-hour cancellation window
- [ ] Provider availability
- [ ] Service area validation

#### QA Engineer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| E2E tests: Service catalog | 17-18 | ⬜ | Week 5 deliverables |
| E2E tests: Booking Steps 1-3 | 19-23 | ⬜ | Booking flow |
| Test availability logic | 20-21 | ⬜ | Backend function |

#### 🎯 Deliverables
- [ ] Booking wizard Steps 1-3
- [ ] Availability checking
- [ ] Booking validation
- [ ] E2E tests for Steps 1-3

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| Availability logic ซับซ้อน | Start simple, iterate |
| Date/time picker UI | Use Shadcn components |

---

### Week 7: Customer Booking & Payment (24 ก.พ. - 2 มี.ค.)

**📅 กำหนดการ:** 24 กุมภาพันธ์ - 2 มีนาคม 2026

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Step 4: Order review + Promo code | 24-25 | ⬜ | Week 6 booking |
| Step 5: Omise payment form | 25-26 | ⬜ | Review done |
| Integrate Omise.js tokenization | 26 | ⬜ | Omise form |
| Booking confirmation page | 27 | ⬜ | Payment integration |
| Booking history page | 27-28 | ⬜ | Confirmation done |
| Booking details page | 28 | ⬜ | History done |
| Real-time status updates | 1-2 | ⬜ | Details done |

**Payment Methods:**
- [ ] Credit/Debit card
- [ ] PromptPay QR
- [ ] Bank transfer

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Omise payment integration | 24-25 | ⬜ | Node.js setup |
| POST /api/payments/create-charge | 25 | ⬜ | Omise integration |
| POST /api/webhooks/omise | 26-27 | ⬜ | Create charge |
| Update booking after payment | 27 | ⬜ | Webhook handler |
| Generate PDF receipt | 28 | ⬜ | Payment complete |
| Booking cancellation logic | 1 | ⬜ | Requirements |
| POST /api/payments/refund | 2 | ⬜ | Cancellation logic |

#### QA Engineer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| E2E tests: Steps 4-5 | 24-28 | ⬜ | Booking flow |
| Test payment webhooks | 27-28 | ⬜ | Webhook endpoint |
| Test booking cancellation | 1-2 | ⬜ | Cancellation logic |

#### 🎯 Deliverables
- [ ] Complete booking flow (5 steps)
- [ ] Omise payment integration
- [ ] Booking history
- [ ] Cancellation feature
- [ ] E2E tests for complete flow

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| Omise webhook delay | Test thoroughly, add retry logic |
| PDF generation issues | Use tested library (PDFKit) |

---

### Week 8: Hotel Features (3-9 มี.ค.)

**📅 กำหนดการ:** 3-9 มีนาคม 2026

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Hotel: Dashboard | 3-4 | ⬜ | Week 5 profile |
| Hotel: Create guest booking | 4-5 | ⬜ | Dashboard done |
| Hotel: Guest booking list | 5-6 | ⬜ | Create booking |
| Hotel: Booking details | 6 | ⬜ | Booking list |
| Hotel: Billing overview | 7 | ⬜ | All booking features |
| Hotel: Invoice list | 7-8 | ⬜ | Billing overview |
| Hotel: Invoice details | 8 | ⬜ | Invoice list |
| Hotel: Hotel profile | 9 | ⬜ | All features |

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Hotel-specific RLS policies | 3 | ⬜ | Week 7 RLS |
| Billing cycle logic | 4-5 | ⬜ | Requirements |
| Bull queue: Invoice generation | 5-6 | ⬜ | Billing logic |
| POST /api/invoices/generate-pdf | 6-7 | ⬜ | PDF library |
| Store invoices in Storage | 7 | ⬜ | PDF generation |
| Invoice export (Excel) | 8 | ⬜ | PDF done |
| Invoice email notifications | 9 | ⬜ | Export done |

#### QA Engineer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| E2E tests: Hotel features | 3-7 | ⬜ | Hotel app |
| Test invoice generation | 7-8 | ⬜ | PDF endpoint |
| Test PDF/Excel export | 8-9 | ⬜ | Export endpoint |

#### 🎯 Deliverables
- [ ] Complete Hotel App
- [ ] Billing system
- [ ] Invoice generation
- [ ] PDF/Excel export
- [ ] E2E tests

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| Invoice logic complexity | Start with simple, add features |
| PDF/Excel export issues | Use tested libraries |

---

## Phase 3: Provider & Admin (สัปดาห์ที่ 9-11)

### Week 9: Staff App (LINE LIFF) (10-16 มี.ค.)

**📅 กำหนดการ:** 10-16 มีนาคม 2026

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Set up LINE LIFF SDK | 10-11 | ⬜ | Week 4 app setup |
| LIFF initialization + login | 11 | ⬜ | LIFF SDK |
| Link LINE to Supabase account | 11-12 | ⬜ | LIFF login |
| Jobs Feed page | 12-13 | ⬜ | Account linking |
| Job Details page | 13 | ⬜ | Jobs feed |
| Accept/Decline actions | 13-14 | ⬜ | Job details |
| Active Jobs page | 14 | ⬜ | Actions done |
| Job status management | 14-15 | ⬜ | Active jobs |
| Service music feature | 15 | ⬜ | Status management |
| Schedule calendar | 15-16 | ⬜ | Active jobs |
| Real-time earnings dashboard | 16 | ⬜ | Realtime setup |

**Service Music Feature:**
```typescript
// Auto-play on "Start Service"
// Loop during service
// Auto-stop on "Complete Service"
// Vibration feedback
// User preference toggle
```

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Provider-specific RLS | 10 | ⬜ | Week 8 RLS |
| Job assignment algorithm | 11-12 | ⬜ | Requirements |
| POST /api/bookings/assign-provider | 12 | ⬜ | Algorithm |
| LINE notification service | 13 | ⬜ | LINE SDK |
| POST /api/notifications/line | 13-14 | ⬜ | Notification service |
| Send job notifications | 14-15 | ⬜ | LINE endpoint |
| Edge Function: on_job_accepted | 15-16 | ⬜ | Job logic |

**Assignment Algorithm:**
```typescript
1. Find available providers (status = available)
2. Filter by service area (distance < radius)
3. Filter by skills match
4. Rank by: distance, rating, availability
5. Select top provider
6. Send LINE notification
```

#### QA Engineer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Set up LINE LIFF testing | 10 | ⬜ | - |
| E2E tests: Provider features | 11-15 | ⬜ | Provider app |
| Test job acceptance flow | 14-15 | ⬜ | Accept/Decline |
| Test music feature | 15-16 | ⬜ | Music implementation |

#### 🎯 Deliverables
- [ ] Complete Staff App (LIFF)
- [ ] Job assignment system
- [ ] LINE notifications
- [ ] Service music feature
- [ ] E2E tests

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| LIFF limitations | Test early, have web fallback |
| Assignment algorithm accuracy | Test with real data, iterate |

---

### Week 10: Admin Features Part 1 (17-23 มี.ค.)

**📅 กำหนดการ:** 17-23 มีนาคม 2026

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Admin: Dashboard + KPIs | 17-18 | ⬜ | Week 5 setup |
| Analytics charts | 18 | ⬜ | Dashboard |
| Bookings: List table | 18-19 | ⬜ | Dashboard |
| Bookings: Details modal | 19 | ⬜ | List table |
| Bookings: Manual assignment | 19-20 | ⬜ | Details modal |
| Services: List | 20 | ⬜ | - |
| Services: Create/Edit form | 20-21 | ⬜ | List |
| Services: Delete | 21 | ⬜ | Form |
| Providers: List | 21-22 | ⬜ | - |
| Providers: Details page | 22 | ⬜ | List |
| Providers: Approval workflow | 22-23 | ⬜ | Details page |

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Admin-specific RLS (bypass) | 17 | ⬜ | Week 9 RLS |
| Dashboard analytics queries | 17-18 | ⬜ | DB views |
| Manual provider assignment | 18-19 | ⬜ | Week 9 algorithm |
| Provider approval workflow | 19-20 | ⬜ | Requirements |
| Edge Function: on_provider_approved | 20-23 | ⬜ | Approval logic |

**Analytics Queries:**
```sql
-- Materialized views for performance
CREATE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as bookings_week,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') as bookings_completed,
  COALESCE(SUM(total_amount) FILTER (WHERE status = 'PAID'), 0) as revenue_week
FROM bookings;
```

#### QA Engineer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| E2E tests: Admin dashboard | 17-19 | ⬜ | Dashboard |
| Test booking management | 19-21 | ⬜ | Booking features |
| Test service CRUD | 21-22 | ⬜ | Service management |
| Test provider management | 22-23 | ⬜ | Provider features |

#### 🎯 Deliverables
- [ ] Admin dashboard
- [ ] Booking management
- [ ] Service management
- [ ] Provider management
- [ ] E2E tests

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| Analytics query performance | Use materialized views |
| Admin RLS bypass | Test thoroughly, audit logs |

---

### Week 11: Admin Features Part 2 (24-30 มี.ค.)

**📅 กำหนดการ:** 24-30 มีนาคม 2026

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Hotels: List + Details | 24-25 | ⬜ | Week 10 patterns |
| Customers: List + Details | 25-26 | ⬜ | Week 10 patterns |
| Payments: Transaction list | 26 | ⬜ | - |
| Payments: Details modal | 26-27 | ⬜ | List |
| Payments: Refund form | 27 | ⬜ | Details |
| Promotions: List | 27-28 | ⬜ | - |
| Promotions: Create/Edit | 28-29 | ⬜ | List |
| Reports: Selection page | 29 | ⬜ | - |
| Reports: Booking report | 29 | ⬜ | Selection |
| Reports: Revenue report | 29-30 | ⬜ | Booking report |
| Reports: Provider report | 30 | ⬜ | Revenue report |
| Reports: Hotel report | 30 | ⬜ | Provider report |

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Report generation queries | 24-26 | ⬜ | DB schema |
| Report export service | 26-27 | ⬜ | Queries |
| POST /api/reports/export | 27 | ⬜ | Export service |
| Promotion validation logic | 28 | ⬜ | Requirements |
| Payment refund workflow | 29-30 | ⬜ | Omise integration |

#### QA Engineer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| E2E tests: Hotel/Customer mgmt | 24-26 | ⬜ | Admin features |
| Test payment refunds | 27-28 | ⬜ | Refund form |
| Test promotion CRUD | 28-29 | ⬜ | Promotion features |
| Test report generation | 29-30 | ⬜ | Report endpoints |

#### 🎯 Deliverables
- [ ] Complete Admin App
- [ ] All CRUD features
- [ ] Payment management
- [ ] Promotions
- [ ] Reports (4 types)
- [ ] E2E tests

#### ⚠️ Risks & Mitigation
| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| Report query performance | Optimize with indexes |
| Export file size limits | Add pagination |

---

## Phase 4: Integration & Launch (สัปดาห์ที่ 12)

### Week 12: Final Integration & QA (31 มี.ค. - 6 เม.ย.)

**📅 กำหนดการ:** 31 มีนาคม - 6 เมษายน 2026

### Daily Standup Tasks

#### Frontend Developers
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| SOS button (Customer + Provider) | 31 | ⬜ | Week 11 apps |
| SOS confirmation dialog | 31 | ⬜ | SOS button |
| SOS insertion to Supabase | 1 | ⬜ | Dialog |
| Admin: SOS dashboard (Realtime) | 1-2 | ⬜ | SOS insertion |
| Admin: SOS response workflow | 2 | ⬜ | SOS dashboard |
| Notification center (all apps) | 2-3 | ⬜ | - |
| Notification bell + badge | 3 | ⬜ | Center |
| Notification list | 3 | ⬜ | Bell |
| Error states (network, API, empty) | 4 | ⬜ | All features |
| Loading skeletons | 4 | ⬜ | Error states |
| UI/UX polish (animations) | 5 | ⬜ | All states |
| Performance optimization | 5 | ⬜ | Polish |
| Accessibility improvements | 6 | ⬜ | Optimization |
| Mobile responsiveness check | 6 | ⬜ | Accessibility |

#### Backend Developer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Edge Function: on_sos_alert | 31 | ⬜ | SOS table |
| POST /api/sos/broadcast | 1 | ⬜ | Edge Function |
| SOS broadcasting (Realtime + LINE + Email) | 1-2 | ⬜ | Broadcast endpoint |
| Complete notification system | 2-3 | ⬜ | All notification types |
| Background jobs (invoices, reminders) | 3-4 | ⬜ | Bull queue |
| Bull queue scheduling (cron) | 4 | ⬜ | Jobs defined |
| API optimizations (indexes, cache) | 5 | ⬜ | Performance needs |
| Complete API documentation | 5-6 | ⬜ | All endpoints |

#### QA Engineer
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Full regression testing | 31-3 | ⬜ | All features |
| Cross-browser testing | 3-4 | ⬜ | Regression |
| Mobile device testing | 4 | ⬜ | Browser testing |
| Load testing (1000 users) | 4-5 | ⬜ | Device testing |
| Security testing | 5 | ⬜ | Load testing |
| Accessibility testing | 5-6 | ⬜ | Security |
| User acceptance testing | 6 | ⬜ | All testing |

#### DevOps
| Task | วัน | สถานะ | Dependency |
|------|------|--------|------------|
| Set up production Supabase | 31 | ⬜ | Staging stable |
| Deploy production migrations | 1 | ⬜ | Production Supabase |
| Deploy Edge Functions | 1-2 | ⬜ | Migrations |
| Set up production Node.js | 2 | ⬜ | Server stable |
| Deploy frontends (Vercel) | 3 | ⬜ | Node.js ready |
| Configure environment variables | 3 | ⬜ | Deployments |
| Set up SSL certificates | 4 | ⬜ | Domains ready |
| Configure monitoring | 4-5 | ⬜ | SSL ready |
| Set up alerting | 5 | ⬜ | Monitoring |
| Test backup/restore | 5 | ⬜ | Alerting |
| Create deployment runbook | 6 | ⬜ | All production |

### Launch Week Timeline

| วัน | กิจกรรม | เป้าหมาย |
|-----|---------|----------|
| **31 มี.ค.** | Final feature completion | All features done |
| **1-2 เม.ย.** | Bug fixes (Priority 1-2) | No critical bugs |
| **3 เม.ย.** | Production deployment | All systems live |
| **4 เม.ย.** | Soft launch (beta testers) | Collect feedback |
| **5 เม.ย.** | Bug fixes + monitoring | System stable |
| **6 เม.ย.** | **OFFICIAL LAUNCH** | 🚀 Go live! |

#### 🎯 Week 12 Deliverables
- [ ] SOS system
- [ ] Notification system
- [ ] All error/loading states
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Official launch

#### ⚠️ Critical Launch Risks
| ความเสี่ยง | การลดความเสี่ยง | Backup Plan |
|----------|---------------|-------------|
| Production deployment fails | Test deployment to staging first | Rollback to staging |
| Critical bug at launch | Have hotfix process ready | Quick patch deploy |
| Payment issues | Extensive testing | Manual fallback |
| SOS system failure | Multiple notification channels | Phone backup |

---

## Post-Launch (Week 13+)

### Ongoing Activities

| กิจกรรม | ความถี่ | ผู้รับผิดชอบ |
|---------|---------|---------------|
| Monitor production metrics | Daily | DevOps + Tech Lead |
| Respond to user feedback | Daily | All team |
| Bug fixes | As needed | All team |
| Weekly retrospective | Weekly | Tech Lead |
| Plan Phase 2 features | Bi-weekly | All team |

### Potential Phase 2 Features

| ฟีเจอร์ | Priority | ความซับซ้อน |
|---------|----------|-------------|
| Mobile native apps (React Native) | High | High |
| Advanced analytics | Medium | Medium |
| Loyalty program | Medium | Low |
| Referral system | Medium | Low |
| In-app chat | High | High |
| Video consultations | Low | Medium |
| Recurring bookings | Medium | Low |
| White-label solution | Low | High |

---

## เกณฑ์ความสำเร็จ

### Technical Success Criteria

| เกณฑ์ | เป้าหมาย | วิธีวัด |
|-------|----------|----------|
| All 4 apps deployed | ✅ 100% | Production check |
| Critical bugs | 0 | Bug tracking |
| Supabase query performance | <100ms simple, <500ms complex | Supabase dashboard |
| System uptime | 99.5% | Monitoring |
| Integration success | 100% | Test results |
| Test coverage | >80% | CI/CD reports |

### Business Success Criteria

| เกณฑ์ | เป้าหมาย | วิธีวัด |
|-------|----------|----------|
| Admin can manage all entities | ✅ | UAT |
| Customer can book end-to-end | ✅ | UAT |
| Payment success rate | >95% | Omise dashboard |
| Hotel billing working | ✅ | UAT |
| Provider can accept jobs | ✅ | UAT |
| All notifications working | ✅ | UAT |
| Reports generating correctly | ✅ | UAT |

### UX Success Criteria

| เกณฑ์ | เป้าหมาย | วิธีวัด |
|-------|----------|----------|
| Booking flow time | <2 minutes | User testing |
| Real-time updates latency | <500ms | Performance test |
| Multi-language working | TH/EN/CN | UAT |
| Mobile responsive | All breakpoints | Device testing |
| SOS button accessible | <3 taps | User testing |
| Service music working | Auto play/stop | UAT |

---

## การจัดการความเสี่ยง

### Technical Risks Matrix

| ความเสี่ยง | โอกาส | ผลกระทบ | การลดความเสี่ยง | ผู้รับผิดชอบ |
|----------|------|----------|---------------|-------------|
| Supabase RLS complexity | Medium | High | Thorough testing, use test DB | Backend |
| LINE LIFF instability | Medium | High | Test on multiple devices, web fallback | Frontend |
| Google Maps API limits | Low | Medium | Monitor usage, implement caching | Backend |
| Performance issues | Medium | High | Load testing early, optimize queries | All |
| Payment integration delays | Low | High | Start early, use test mode | Backend |
| Realtime scalability | Low | Medium | Test with concurrent users | Backend |
| Data loss | Low | Critical | Daily backups, test restore | DevOps |

### Schedule Risks

| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| Design delays | Fixed 4-week phase, freeze scope |
| Feature creep | Strict scope management, Phase 2 for extras |
| Testing time crunch | Automated tests throughout, full Week 12 |
| Team member absence | Cross-training, documentation |
| Integration issues | Weekly integration tests |

### Team Risks

| ความเสี่ยง | การลดความเสี่ยง |
|----------|---------------|
| Knowledge silos | Pair programming, code reviews, docs |
| Key person dependency | Shared ownership, cross-training |
| Burnout | Realistic estimates, no overtime policy |
| Communication gaps | Daily standups, clear documentation |

---

## การสื่อสาร

### Meeting Schedule

| การประชุม | ความถี่ | เวลา | ผู้เข้าร่วม |
|-----------|---------|------|-----------|
| Daily Standup | Daily | 15 นาที | All team |
| Weekly Planning | Weekly | 1 ชม. | All team |
| Weekly Demo | Weekly | 30 นาที | All team |
| Retrospective | Bi-weekly | 1 ชม. | All team |
| Design Review | As needed | 30 นาที | UI/UX + Frontend |
| Technical Review | As needed | 30 นาที | Tech team |

### Communication Tools

| เครื่องมือ | การใช้งาน |
|----------|----------|
| **GitHub** | Code repository, PR reviews, Issues |
| **GitHub Projects** | Task tracking, Sprint board |
| **Slack** | Daily chat, notifications |
| **Figma** | Design collaboration |
| **Notion** | Documentation, meeting notes |
| **Zoom** | Video meetings |

### Daily Standup Format

```
1. วันนี้ทำอะไรไปบ้าง? (What did you complete yesterday?)
2. วันนี้จะทำอะไร? (What will you do today?)
3. มีอุปสรรคอะไรไหม? (Any blockers?)
```

### Weekly Planning Agenda

```
1. Review previous week (15 min)
   - Completed tasks
   - Blocked tasks
   - Bugs found

2. Plan next week (30 min)
   - Assign tasks
   - Estimate effort
   - Identify dependencies

3. Risk check (10 min)
   - Any new risks?
   - Mitigation needed?

4. Q&A (5 min)
```

---

## การติดตามความคืบหน้า (Progress Tracking)

### Weekly Status Dashboard

สำหรับแต่ละสัปดาห์ ติดตาม:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Tasks completed | X/Y | Y/Z | 🟢/🟡/🔴 |
| Bugs found | 0-5 | X | 🟢/🟡/🔴 |
| Bugs fixed | All | X/Y | 🟢/🟡/🔴 |
| Tests passing | >95% | XX% | 🟢/🟡/🔴 |
| Deployments to staging | 1-2 | X | 🟢/🟡/🔴 |

### Phase Gate Criteria

แต่ละ Phase ต้องผ่าน Gate ก่อนไป Phase ถัดไป:

**Phase 1 Gate (end of Week 4):**
- [ ] All wireframes approved
- [ ] Design system complete
- [ ] Database schema approved
- [ ] Auth system tested
- [ ] No critical blockers

**Phase 2 Gate (end of Week 8):**
- [ ] Customer booking flow working
- [ ] Payment integration tested
- [ ] Hotel app functional
- [ ] Staging environment stable
- [ ] Test coverage >70%

**Phase 3 Gate (end of Week 11):**
- [ ] Provider app working
- [ ] Admin app complete
- [ ] All integrations tested
- [ ] Performance benchmarks met
- [ ] Test coverage >80%

**Phase 4 Gate (end of Week 12):**
- [ ] All features deployed to production
- [ ] Zero critical bugs
- [ ] Monitoring active
- [ ] Documentation complete
- [ ] Launch successful

---

## เอกสารอ้างอิง

- [CONSTITUTION.md](CONSTITUTION.md) - หลักสถาปัตยกรรมและมาตรฐานการพัฒนา
- [TECHNICAL_SPECIFICATION.md](documents/TECHNICAL_SPECIFICATION.md) - รายละเอียดเทคนิค
- [CODE_PATTERNS.md](documents/CODE_PATTERNS.md) - ตัวอย่างโค้ด
- [DEVELOPMENT_ROADMAP.md](documents/DEVELOPMENT_ROADMAP.md) - แผนพัฒนา

---

**เอกสารนี้เป็นแผนการพัฒนาหลักของโปรเจกต์ The Bliss Massage at Home**

**Version:** 1.0.0
**Last Updated:** 14 มกราคม 2026
**Next Review:** ทุกสัปดาห์

---

*Made with ❤️ for The Bliss Massage at Home Team*
