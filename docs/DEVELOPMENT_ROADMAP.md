# The Bliss Massage at Home - Development Roadmap (12 Weeks)

แผนการพัฒนาแบบละเอียดสำหรับ 3 เดือน พร้อมงานรายสัปดาห์

---

## 📊 Overview

**โครงสร้างโปรเจกต์:** Monorepo with 4 Apps
- Admin App (React + TypeScript + Vite)
- Customer App (React + TypeScript + Vite)
- Hotel App (React + TypeScript + Vite)
- Staff App (React + TypeScript + Vite + LINE LIFF)

**Backend:** Node.js + Express + TypeScript + PostgreSQL + Redis

**Timeline:** 12 สัปดาห์ (3 เดือน)

---

## 🎯 Phase 1: UI/UX Design (Week 1-4)

### Week 1: Research & Foundation

**Day 1-2: Requirements Analysis**
- [ ] ศึกษา SRS อย่างละเอียด
- [ ] สร้าง User Personas (Customer, Hotel, Provider, Admin)
- [ ] วิเคราะห์ User Journey แต่ละ role
- [ ] ระบุ Key Pain Points และ Solutions

**Day 3-4: Information Architecture**
- [ ] สร้าง Site Map สำหรับทั้ง 4 apps
- [ ] กำหนด Navigation Structure
- [ ] วาง Content Hierarchy
- [ ] ออกแบบ URL Structure

**Day 5: Competitor Analysis**
- [ ] วิเคราะห์คู่แข่งในตลาด (3-5 platforms)
- [ ] ระบุ Best Practices ที่ควรนำมาใช้
- [ ] หา Differentiation Points

### Week 2: Wireframe (Customer & Hotel)

**Day 1-2: Customer App Wireframes**
- [ ] Home Page (Service Catalog)
- [ ] Service Details
- [ ] Booking Flow (5 steps)
  - Step 1: Select Service
  - Step 2: Choose Date & Time
  - Step 3: Enter Address
  - Step 4: Review & Confirm
  - Step 5: Payment
- [ ] Booking History
- [ ] Booking Details
- [ ] Profile & Settings
- [ ] Payment Success/Failed Pages

**Day 3-4: Hotel App Wireframes**
- [ ] Dashboard
- [ ] Guest Booking Form
- [ ] Booking List & Management
- [ ] Billing Overview
- [ ] Invoice List & Details
- [ ] Hotel Profile
- [ ] Settings

**Day 5: Feedback & Iteration**
- [ ] Present wireframes to stakeholders
- [ ] Collect feedback
- [ ] Make necessary adjustments

### Week 3: Wireframe (Provider & Admin)

**Day 1-2: Staff App Wireframes (LINE LIFF)**
- [ ] Jobs Feed
- [ ] Job Details
- [ ] Accept/Decline Job Flow
- [ ] Job Status Updates
- [ ] Calendar View
- [ ] Earnings Dashboard
- [ ] Payment History
- [ ] Profile & Documents
- [ ] Settings

**Day 3-4: Admin App Wireframes**
- [ ] Dashboard with Analytics
- [ ] Booking Management
- [ ] Service Management
- [ ] Provider Management
- [ ] Hotel Management
- [ ] Customer Management
- [ ] Payment Management
- [ ] Promotion Management
- [ ] Reports & Analytics
- [ ] System Settings

**Day 5: Feedback & Iteration**
- [ ] Present wireframes to stakeholders
- [ ] Collect feedback
- [ ] Finalize wireframes

### Week 4: High-Fidelity Design

**Day 1: Design System**
- [ ] สร้าง Color Palette
- [ ] กำหนด Typography Scale
- [ ] ออกแบบ Icon Set
- [ ] สร้าง Component Library
  - Buttons (Primary, Secondary, Outline, Ghost)
  - Input Fields (Text, Textarea, Select, Date, Time)
  - Cards
  - Modals/Dialogs
  - Tables
  - Forms
  - Navigation
  - etc.

**Day 2-3: High-Fidelity Mockups**
- [ ] Customer App (All Pages)
- [ ] Hotel App (All Pages)
- [ ] Staff App (All Pages)
- [ ] Admin App (Main Pages)

**Day 4: Interactive Prototype**
- [ ] สร้าง Clickable Prototype ใน Figma
- [ ] เชื่อมโยง User Flows ทั้งหมด
- [ ] เพิ่ม Transitions และ Animations

**Day 5: Design Handoff**
- [ ] Export assets (Icons, Images, Logos)
- [ ] สร้าง Style Guide Document
- [ ] จัดทำ Component Specifications
- [ ] Prepare Design Tokens (Colors, Spacing, Typography)
- [ ] ส่งมอบให้ Dev Team พร้อม Access to Figma

---

## 🏗️ Phase 2: Core Development (Week 5-8)

### Week 5-6: Core System Setup

**Week 5, Day 1-2: Project Setup**
```bash
# Tasks for Claude Code:
"Setup monorepo structure with pnpm workspace and turborepo"
"Create all 5 apps (admin, customer, hotel, provider, api) with Vite + React + TypeScript"
"Configure ESLint, Prettier, and TypeScript for all packages"
"Setup shared packages (ui, types, utils, config, i18n)"
"Create root package.json with all dev scripts"
```

**Week 5, Day 3: Database Setup**
```bash
# Tasks for Claude Code:
"Setup PostgreSQL with Prisma ORM in apps/api"
"Create initial Prisma schema with User, Customer, Hotel, Provider, Admin models"
"Setup database connection and migrations"
"Create seed script for initial data"
```

**Week 5, Day 4-5: Authentication System**
```bash
# Tasks for Claude Code:
"Implement JWT authentication in apps/api"
"Create auth routes: register, login, logout, refresh token"
"Implement password hashing with bcrypt"
"Create auth middleware for protected routes"
"Add OTP verification with phone number"
"Implement social auth (Google, Facebook, LINE)"
```

**Week 6, Day 1-2: User Management**
```bash
# Tasks for Claude Code:
"Create user profile endpoints (GET, UPDATE, DELETE)"
"Implement role-based access control (RBAC) middleware"
"Create user management admin endpoints"
"Add user status management (Active, Suspended, Banned)"
```

**Week 6, Day 3: Multi-language Support**
```bash
# Tasks for Claude Code:
"Setup i18next in packages/i18n"
"Create translation files for TH, EN, CN"
"Integrate i18n in all frontend apps"
"Create language switcher component"
```

**Week 6, Day 4-5: Google Maps Integration**
```bash
# Tasks for Claude Code:
"Integrate Google Maps API in shared utils"
"Create AddressInput component with autocomplete"
"Implement geocoding service"
"Create distance calculation utility"
"Add map display component"
```

### Week 7: Customer Features

**Day 1: Service Catalog**
```bash
# Tasks for Claude Code:
"Create Service model in Prisma with categories and pricing"
"Implement service CRUD endpoints"
"Create service catalog page with filtering and search"
"Design ServiceCard component"
"Add service detail page"
```

**Day 2-3: Booking Flow**
```bash
# Tasks for Claude Code:
"Create Booking model in Prisma"
"Implement booking creation endpoint with validation"
"Build 5-step booking wizard"
"Create booking state management with Zustand"
"Add booking confirmation page"
"Implement booking modification (reschedule)"
"Add cancellation feature with 3-hour rule"
```

**Day 4: Payment Integration**
```bash
# Tasks for Claude Code:
"Integrate Omise Payment Gateway"
"Create payment service with charge creation"
"Implement payment webhook handler"
"Build payment form with Omise Card"
"Add payment success/failed pages"
"Generate digital receipts"
```

**Day 5: Booking History & Reviews**
```bash
# Tasks for Claude Code:
"Create booking history page with filters"
"Implement booking details page"
"Add review and rating system"
"Create review submission form"
"Display provider ratings"
"Add SOS emergency button"
```

### Week 8: Hotel Features

**Day 1-2: Hotel Dashboard**
```bash
# Tasks for Claude Code:
"Create Hotel model in Prisma"
"Build dashboard with booking overview"
"Display billing summary"
"Show recent bookings list"
"Add upcoming appointments"
"Show guest activity snapshot"
```

**Day 3: Guest Booking Management**
```bash
# Tasks for Claude Code:
"Create hotel booking form for guests"
"Implement room number field"
"Add guest information capture"
"Enable booking on behalf of guests"
"Show booking list with filters"
```

**Day 4: Billing & Invoicing**
```bash
# Tasks for Claude Code:
"Create Invoice model in Prisma"
"Implement billing cycle system (weekly/monthly)"
"Generate invoices automatically"
"Create invoice list page"
"Build invoice detail view"
"Add invoice export (PDF/Excel)"
"Implement billing notifications"
```

**Day 5: Hotel Profile**
```bash
# Tasks for Claude Code:
"Create hotel profile page"
"Add Google Maps integration for location"
"Implement billing information setup"
"Add notification settings"
"Create password change feature"
```

---

## 🚀 Phase 3: Provider & Admin (Week 9-11)

### Week 9: Provider Features

**Day 1-2: LINE LIFF Setup**
```bash
# Tasks for Claude Code:
"Setup LINE LIFF SDK in provider app"
"Implement LIFF initialization"
"Create LINE login flow"
"Link LINE user ID with provider account"
"Test LIFF in LINE app"
```

**Day 2-3: Job Management**
```bash
# Tasks for Claude Code:
"Create ProviderSchedule model"
"Implement job notification via LINE"
"Build jobs feed page"
"Create job detail view"
"Add accept/decline job functionality"
"Implement job status updates (start, complete)"
"Add sound effect when starting service"
"Create cancellation with reason"
```

**Day 4: Schedule & Calendar**
```bash
# Tasks for Claude Code:
"Build calendar view (day/week/month)"
"Show assigned jobs on calendar"
"Add upcoming jobs list"
"Implement job filters"
"Create job reminders (2 hours before)"
```

**Day 5: Earnings & Payments**
```bash
# Tasks for Claude Code:
"Create ProviderPayment model"
"Build earnings dashboard"
"Show payment status (paid/pending)"
"Display payment history"
"Add bank account management"
"Implement payment notifications"
```

### Week 10: Admin Features (Part 1)

**Day 1: Admin Dashboard**
```bash
# Tasks for Claude Code:
"Create admin dashboard with analytics"
"Show booking statistics"
"Display revenue charts"
"Add recent activity feed"
"Implement quick actions"
"Add performance metrics"
```

**Day 2: Booking Management**
```bash
# Tasks for Claude Code:
"Create comprehensive booking list with filters"
"Add separate views for customer and hotel bookings"
"Implement booking detail view"
"Add manual status updates"
"Create provider assignment feature"
"Add booking search by ID or customer info"
```

**Day 3: Service Management**
```bash
# Tasks for Claude Code:
"Build service management page"
"Create service creation form"
"Implement service editing"
"Add service activation/deactivation"
"Create category management"
"Add service image upload"
```

**Day 4: Provider Management**
```bash
# Tasks for Claude Code:
"Create provider list with filters"
"Build provider detail view"
"Implement provider creation/editing"
"Add document management"
"Create status management (Active/Suspended/Banned)"
"Show provider performance metrics"
"Add earnings management"
```

**Day 5: Hotel Management**
```bash
# Tasks for Claude Code:
"Create hotel list page"
"Build hotel detail view"
"Implement hotel creation/editing"
"Add location management with Google Maps"
"Create billing summary"
"Show hotel usage statistics"
```

### Week 11: Admin Features (Part 2)

**Day 1: Customer Management**
```bash
# Tasks for Claude Code:
"Create customer list with search"
"Show customer booking history"
"Display customer statistics"
"Implement status management"
"Add customer export (CSV/Excel)"
"Show customer behavior analytics"
```

**Day 2: Payment Management**
```bash
# Tasks for Claude Code:
"Create payment transaction list"
"Add payment filters and search"
"Implement refund management"
"Generate financial reports"
"Add payment export functionality"
```

**Day 3: Promotion Management**
```bash
# Tasks for Claude Code:
"Create Promotion model"
"Build promotion creation form"
"Implement promo code generation"
"Add usage limits and conditions"
"Create promotion list with filters"
"Show promotion usage analytics"
"Add activation/deactivation"
```

**Day 4: Reports & Analytics**
```bash
# Tasks for Claude Code:
"Create booking reports with date ranges"
"Build revenue reports by service/period"
"Show customer behavior reports"
"Add popular services report"
"Create provider performance reports"
"Build hotel usage reports"
"Implement report export (Excel/PDF)"
```

**Day 5: Settings & Notifications**
```bash
# Tasks for Claude Code:
"Create system settings page"
"Add notification management"
"Implement broadcast notifications"
"Create email templates"
"Add system logs viewer"
```

---

## 🧪 Phase 4: Integration & QA (Week 12)

### Week 12: Testing, Integration & Deployment

**Day 1: WebSocket Integration**
```bash
# Tasks for Claude Code:
"Setup Socket.io in API"
"Implement real-time booking status updates"
"Add real-time notifications"
"Create WebSocket client hooks"
"Test real-time features"
```

**Day 2: Notification System**
```bash
# Tasks for Claude Code:
"Create Notification model"
"Implement notification service"
"Add email notifications (SendGrid)"
"Setup LINE notifications"
"Create in-app notification center"
"Add notification preferences"
```

**Day 3: Error Handling & Testing**
```bash
# Tasks for Claude Code:
"Implement global error handling"
"Add API error responses standardization"
"Create error boundary components"
"Write unit tests for services"
"Add integration tests for API endpoints"
"Create E2E tests for critical flows"
```

**Day 4: Performance & Security**
```bash
# Tasks for Claude Code:
"Add API rate limiting"
"Implement caching with Redis"
"Optimize database queries"
"Add database indexes"
"Implement CORS properly"
"Add Helmet.js for security headers"
"Setup HTTPS"
"Add input sanitization"
"Implement SQL injection prevention"
```

**Day 5: Deployment**
```bash
# Tasks for Claude Code:
"Create Dockerfiles for all apps"
"Setup docker-compose"
"Create GitHub Actions CI/CD"
"Setup staging environment"
"Deploy to production"
"Configure monitoring (Sentry, PM2)"
"Setup backups"
"Create deployment documentation"
```

---

## 📋 Detailed Task Breakdown by Feature

### 🎨 UI Components (Shared Package)

**Week 5-6: Core Components**
```bash
# Tasks for Claude Code:
"Create Button component with variants (primary, secondary, outline, ghost)"
"Build Input component with validation states"
"Create Card component with different styles"
"Build Modal/Dialog component"
"Create Table component with sorting and pagination"
"Build Form components (FormField, FormGroup, FormError)"
"Create Navigation components (Header, Sidebar, Tabs)"
"Build Loading components (Spinner, Skeleton)"
"Create Badge component"
"Build Alert/Toast notification component"
```

**Week 7-8: Advanced Components**
```bash
# Tasks for Claude Code:
"Create DatePicker component"
"Build TimePicker component"
"Create Select component with search"
"Build MultiSelect component"
"Create FileUpload component"
"Build ImageUpload with preview"
"Create Chart components (Line, Bar, Pie)"
"Build Calendar component"
"Create Map component with markers"
"Build Rating component"
```

### 🔐 Authentication Flows

**Customer Registration:**
1. Email/Phone + Password
2. OTP Verification
3. Profile Completion
4. Social Auth (Google, Facebook)

**Provider Registration:**
1. Basic Info + Phone
2. OTP Verification
3. LINE Connection
4. Document Upload
5. Admin Approval

**Hotel Registration:**
1. Hotel Info + Contact
2. Location Setup
3. Billing Information
4. Admin Approval

### 📊 Data Models Priority

**Phase 1 (Week 5-6):**
- User
- Customer
- Hotel
- Provider
- Admin

**Phase 2 (Week 7-8):**
- Service
- ServiceAddOn
- Booking
- BookingAddOn
- Payment

**Phase 3 (Week 9-10):**
- ProviderSchedule
- ProviderSkill
- Review
- Notification

**Phase 4 (Week 11):**
- Promotion
- Invoice
- InvoiceItem

### 🧪 Testing Strategy

**Unit Tests:**
- Services layer
- Utility functions
- Components (React Testing Library)
- Hooks

**Integration Tests:**
- API endpoints
- Database operations
- External service integrations

**E2E Tests (Playwright):**
- Customer booking flow
- Hotel booking creation
- Provider job acceptance
- Admin user management

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup strategy in place

### Staging Deployment
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] UAT with stakeholders
- [ ] Performance testing
- [ ] Security audit

### Production Deployment
- [ ] Database backup
- [ ] Deploy API server
- [ ] Deploy frontend apps
- [ ] Run health checks
- [ ] Monitor errors
- [ ] Gradual rollout

### Post-Deployment
- [ ] Monitor performance
- [ ] Check error rates
- [ ] Verify integrations
- [ ] User acceptance
- [ ] Documentation handoff

---

## 📈 Success Metrics

### Technical Metrics
- API Response Time: < 2 seconds (90th percentile)
- Uptime: ≥ 99.5%
- Error Rate: < 1%
- Test Coverage: ≥ 80%

### Business Metrics
- Booking Completion Rate: ≥ 85%
- User Registration Rate: Track weekly
- Provider Acceptance Rate: ≥ 90%
- Customer Satisfaction: ≥ 4.5/5

---

## 🛠️ Tools & Resources

### Development
- VS Code / Claude Code
- Postman / Insomnia (API Testing)
- Prisma Studio (Database)
- Redis Commander

### Design
- Figma (Design & Prototype)
- Unsplash (Stock Photos)
- Flaticon (Icons)

### Project Management
- GitHub Issues
- GitHub Projects
- Notion (Documentation)

### Communication
- Slack / Discord
- Zoom (Meetings)
- Loom (Screen Recording)

---

## 📞 Support & Resources

### Documentation
- Technical Specification: `TECHNICAL_SPECIFICATION.md`
- Quick Start Guide: `QUICK_START.md`
- Code Patterns: `CODE_PATTERNS.md`
- API Documentation: `docs/API.md`

### External Resources
- Prisma Docs: https://www.prisma.io/docs
- React Docs: https://react.dev
- TanStack Query: https://tanstack.com/query
- Tailwind CSS: https://tailwindcss.com
- LINE LIFF: https://developers.line.biz/en/docs/liff/
- Omise: https://docs.opn.ooo

---

**Timeline สามารถปรับเปลี่ยนได้ตามความเหมาะสม แต่ควรรักษา milestone หลักๆ ไว้** 🎯

**Good luck with your development! 🚀**

