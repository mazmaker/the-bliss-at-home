# The Bliss at Home - Development Checklist

> **Last updated:** 2026-03-02 | **Overall: 78%** | **Dashboard:** https://sprint.lightepic.com/
>
> **How to use:** ให้ Claude Code อ่านไฟล์นี้เพื่อรู้ว่าต้องทำอะไรต่อ
> ```
> อ่าน CHECKLIST.md แล้วทำ task ที่ยังไม่เสร็จ (เรียงจาก priority สูงสุด)
> ```

---

## Current Sprint

**Sprint J: Payment Flow + Cancel/Reschedule + E2E Testing** (3 - 9 มี.ค. 2569)

### Priorities (ทำก่อน)
1. Payment: PromptPay + Bank Transfer + Refund System (50%)
2. Cancel/Reschedule flow ทั้ง Customer + Hotel (0%)
3. E2E Tests เพิ่มจาก 4 specs (25%)

### Blockers
- Customer Cancel/Reschedule ยังไม่ได้ทำ (0%)
- Hotel Cancel/Reschedule ยังไม่ได้ทำ (0%)
- Payment PromptPay/BankTransfer/Refund ยังไม่ได้เชื่อม (50%)
- E2E Tests มีแค่ 4 specs ต้องเพิ่ม (25%)

---

## Monorepo Structure

```
apps/admin      → Admin dashboard (React+Vite, port 3001)
apps/customer   → Customer app (React+Vite, port 5173)
apps/hotel      → Hotel/B2B app (React+Vite, port 3003)
apps/staff      → Staff app (React+Vite, port 3004)
apps/server     → Backend API (Express, port 3000)
packages/supabase → Shared Supabase client, hooks, services
packages/ui     → Shared UI components
packages/types  → Shared TypeScript types
packages/i18n   → Multi-language support (TH/EN/ZH)
```

---

## Legend

- [x] **100%** = Done, production-ready
- [~] **60-99%** = Mostly done, minor work remaining
- [ ] **1-59%** = In progress, significant work needed
- [ ] **0%** = Not started

---

## 1. Infrastructure & Setup (avg ~69%)

- [x] **Supabase Cloud Project** (100%) - the-bliss-at-home-dev created
- [x] **Monorepo Structure** (100%) - pnpm + Turborepo workspace
- [x] **4 Frontend Apps Scaffolding** (100%) - Admin:3001, Customer:5173, Hotel:3003, Staff:3004
- [~] **Node.js Server Setup** (90%) - 76 endpoints: payment, OTP, hotel auth, email, secure-bookings, receipts, cancellation
- [x] **Environment Configuration** (100%) - .env.example, .env.local, env.d.ts
- [~] **Shared Packages Structure** (90%) - supabase + types (2862 lines) + ui + i18n
- [~] **DB Scripts** (80%) - run-migration.js, setup-hotels-db.js, test-db-connection.js
- [ ] **CI/CD Pipeline** (25%) - ci.yml มี typecheck, lint, build, test แต่ไม่มี deploy step
  - TODO: เพิ่ม deploy to staging/production
- [ ] **Staging Deployment** (0%) - ยังไม่ได้ deploy
  - TODO: Setup Vercel/Cloudflare deployment pipeline
- [ ] **Production Deployment** (0%) - ยังไม่ได้ deploy

## 2. Database & Schema (avg ~98%)

- [x] **Profiles Table + RLS** (100%) - User profiles, roles, status, trigger
- [x] **Enum Types** (100%) - booking_status, payment_status, etc.
- [x] **Services & Skills Tables** (100%) - Service catalog, categories, skills, commission, duration_options
- [x] **Staff & Hotels Tables** (100%) - Staff profiles, hotel info, hotel_invoices, hotel_auth
- [x] **Customers Table** (100%) - Customer-specific data + omise_customer_id
- [x] **Bookings & Booking Items** (100%) - Booking flow, items, addons, coordinates
- [x] **Reviews & Notifications** (100%) - Review system, notification queue
- [x] **Billing Tables** (100%) - Invoice, payments, transactions, tax_info
- [x] **SOS Alerts Table** (100%) - sos_alerts with staff assignment
- [x] **Storage Buckets** (100%) - service-images, staff-documents, logos
- [~] **RLS Policies** (95%) - 196 policies, 33 tables, known vulnerabilities tracked
  - BUG: promotions ใช้ `email LIKE '%admin%'` แทน role check
  - BUG: app_settings ใช้ lowercase `'admin'` (ไม่ match enum `'ADMIN'`)
- [~] **Database Indexes** (85%) - Analytics functions + geographical indexes

## 3. Authentication (avg ~83%)

- [~] **Email/Password Login** (85%) - ใช้ได้ทุก app: Customer, Admin, Hotel, Staff
- [x] **Registration + Profile Creation** (100%) - Auto profile via trigger
- [x] **Logout** (100%) - ทุก app
- [x] **Role Validation** (100%) - ADMIN/CUSTOMER/HOTEL/STAFF
- [x] **Account Status Check** (100%) - Active/Suspended
- [x] **Protected Routes** (100%) - Role-based ทุก app
- [~] **Session Refresh** (85%) - refreshSession() + sessionManager.ts
- [~] **Password Reset** (70%) - resetPassword() + form
  - TODO: ทดสอบ flow ครบ (email → reset link → new password)
- [~] **Hotel Auth System** (80%) - hotelAuthService.ts + invite system
- [~] **Social Login (Facebook/Google)** (60%) - OAuth ใน Customer auth/Login.tsx
  - TODO: ทดสอบ OAuth callback + profile creation
- [ ] **OTP Phone Verification** (35%) - otpService + routes + smsService
  - TODO: เชื่อม SMS provider จริง (ตอนนี้ mock)

## 4. Shared UI Components (avg ~92%)

- [x] **AuthLayout + LoginForm** (100%) - Shared login layout ใช้ทุก app
- [~] **PasswordResetForm** (90%)
- [x] **ProtectedRoute Component** (100%)
- [~] **Layout (Sidebar, Header, Footer)** (90%) - Responsive, collapsible
- [x] **Core Components** (100%) - Button, Card, Badge, Input
- [~] **Form Components** (90%) - Avatar, Checkbox, DatePicker, ThaiAddressFields
- [~] **UX State Components** (85%) - EmptyState, Loader, Modal, ConfirmDialog
- [~] **LogoUpload Component** (90%) - Drag & drop, Supabase Storage
- [~] **Responsive Design** (85%) - Mobile-first ทุก app

## 5. Customer App - SRS 3.1 (avg ~65%)

- [~] **Home Page** (70%) - useServices + useActivePromotions จาก DB + i18n
- [~] **Service Catalog** (75%) - useServices + category filter + i18n
- [~] **Service Detail** (75%) - useServiceBySlug + addons + ServiceDurationPicker
- [~] **Booking Wizard (5 Steps)** (85%) - Couple booking, duration picker, VoucherCode, payment
- [~] **Booking Summary** (70%) - useBookingByNumber + full detail
- [ ] **Cancel/Reschedule (3hr rule)** (0%) - **ยังไม่ได้ทำ** <<<< HIGH PRIORITY
  - TODO: UI สำหรับยกเลิก/เลื่อนนัด (ก่อน 3 ชม.)
  - TODO: Cancellation policy enforcement
  - TODO: Refund calculation + trigger
  - Files: `apps/customer/src/pages/BookingDetail.tsx`
- [~] **Booking History** (75%) - useCustomerBookings + pagination + filter
- [~] **Booking Detail** (75%) - useBookingByNumber + provider info
- [~] **Profile Management** (80%) - useCurrentCustomer CRUD + preferences + language
- [~] **Address/Location Mgmt** (85%) - Full CRUD + Thai cascading dropdowns + Google Maps
- [~] **Payment Methods** (80%) - usePaymentMethods full CRUD + default card
- [~] **Transaction History** (70%) - useCustomerTransactions + summary stats
- [~] **Review & Rating** (70%) - 3 หน้าดูรีวิว + ReviewModal + submit flow + notification triggers
- [~] **SOS Button** (95%) - Real geolocation + DB save + realtime
- [~] **Promotions Display** (60%) - useActivePromotions carousel บน Home page
- [ ] **FAQ & Help Center** (15%) - Privacy + Terms pages only
  - TODO: FAQ page + Help center + Contact support

## 6. Hotel/B2B App - SRS 3.2 (avg ~56%)

- [~] **Hotel Auth System** (85%) - EnhancedLogin + role-based + useHotelContext
- [~] **Dashboard Overview** (75%) - Real stats: bookings, revenue, guests, pending
- [~] **Billing Summary** (82%) - MonthlyBill + overdueCalculatorV2 + useBillingSettings + late fees
- [~] **Recent Bookings** (80%) - GuestBookings: real data + search + filter
- [~] **Upcoming Appointments** (65%) - รวมใน GuestBookings (pending/confirmed)
- [ ] **Guest Activity Snapshot** (0%) - **ยังไม่ได้ทำ**
  - TODO: Widget แสดง activity ล่าสุดของ guest
- [~] **Service Catalog** (75%) - Services.tsx: real services + hotel discount pricing
- [ ] **Book for Guest** (25%) - UI form มีแต่ hardcoded services ยังไม่เชื่อม DB
  - TODO: เชื่อม real services + staff assignment + payment
- [~] **Guest Bookings List** (75%) - BookingHistory: completed/cancelled + CSV export
- [ ] **Cancel/Reschedule** (0%) - **ยังไม่ได้ทำ** <<<< HIGH PRIORITY
  - TODO: Hotel-side cancellation flow
  - TODO: Guest notification on cancel
  - Files: `apps/hotel/src/pages/`
- [~] **Auto Invoice Generation** (72%) - MonthlyBill: platform fee + hotel split + commission rate
- [~] **Monthly Bill** (80%) - Real billing + late fee calc + configurable due dates + overdue alerts
- [ ] **Invoice Download PDF** (20%) - Text file only ยังไม่ใช่ PDF
  - TODO: ใช้ jsPDF สร้าง proper PDF invoice
- [~] **Bill Status Display** (75%) - 5 severity levels: CURRENT/DUE_SOON/OVERDUE/WARNING/URGENT
- [~] **Hotel Profile + Map** (60%) - HotelProfile.tsx เชื่อม Supabase CRUD จริง
- [ ] **Change Password** (0%) - **ยังไม่ได้ทำ**
  - TODO: Change password form + Supabase updateUser

## 7. Staff/Provider App - SRS 3.3 (avg ~85%)

- [~] **LINE LIFF Auth** (90%) - Invite token + auto-login + LIFF profile
- [~] **LINE Job Notification** (60%) - lineMessagingService.ts created
  - TODO: ทดสอบส่ง notification จริงผ่าน LINE Messaging API
- [~] **Job Details Display** (95%) - StaffDashboard 603 lines: useJobs + realtime + stats
- [~] **Accept/Decline Job** (90%) - Real acceptJob/declineJob functions
- [~] **Personal Job Queue** (90%) - useJobs with realtime subscription
- [~] **Job Status + Music** (85%) - ServiceTimer + backgroundMusic.ts
- [~] **Cancel Accepted Job** (90%) - JobCancellationModal complete
- [~] **Job History** (80%) - StaffHistory.tsx with filters
- [~] **Job Filter** (75%) - JobFilter in useJobs
- [~] **SOS Button** (90%) - SOSButton component done
- [~] **Schedule Calendar** (85%) - StaffSchedule.tsx + realtime job updates + cancellation workflow
- [~] **Earnings Display** (90%) - StaffEarnings + useEarningsSummary + useDailyEarnings + payout tracking
- [~] **Payment/Payout Status** (82%) - earningsService + usePayouts + detailed payout type tracking
- [~] **Personal Profile** (92%) - StaffProfile + bank CRUD + documents + service areas + skills
- [~] **Document Upload** (75%) - uploadDocument + deleteDocument + type validation
- [~] **Service Area Setup** (80%) - addArea + deleteArea + toggleArea + geo-location
- [~] **Notification Sounds** (90%) - soundNotification.ts + jobReminder.ts
- [~] **Settings** (75%) - StaffSettings.tsx complete

## 8. Admin App - SRS 3.4 (avg ~79%)

- [~] **Dashboard Stats** (75%) - useDashboard + dashboardQueries.ts real data + SOSWidget
- [~] **Booking List + Filters** (85%) - BookingDetailModal + useBookings + real status updates + filters sync
- [~] **Booking Detail** (75%) - BookingDetailModal complete
- [~] **Change Booking Status** (85%) - Real Supabase mutation working
- [~] **Booking Search** (60%) - useBookings filter + BookingDetailModal search
- [~] **Service CRUD** (90%) - ServiceForm: Zod, multi-duration pricing, pricingUtils
- [~] **Service Image Upload** (70%) - ImageUpload + storage bucket
- [~] **Service Categories** (60%) - Filter tabs + slug + duration_options
- [~] **Staff List** (80%) - Staff.tsx + SearchInput enhanced
- [~] **Staff Detail Page** (95%) - StaffDetail.tsx massively enhanced
- [~] **Staff Edit** (90%) - EditStaffModal + EditBankModal CRUD
- [~] **Staff Documents** (90%) - DocumentViewerModal + UploadDocumentModal
- [~] **Staff Status Management** (85%) - StatusManagementModal + real mutations
- [~] **Staff Reviews** (92%) - ReviewsTabContent + useStaffReviews + useAdminReviews redesigned
- [~] **Staff Performance Metrics** (85%) - useStaffPerformance + performance_metrics table
- [~] **Staff Jobs View** (85%) - JobDetailModal + useStaffJobs hook
- [~] **Staff Payout Calculate** (85%) - PayoutCalculationModal complete
- [~] **Staff Payout Process** (80%) - ProcessPayoutModal + PayoutDetailModal
- [~] **Hotel List + Detail** (70%) - Hotels.tsx + HotelDetail.tsx pages
- [~] **Hotel CRUD + Map** (75%) - HotelForm + GoogleMapsPicker
- [~] **Hotel Bookings** (70%) - HotelBookings.tsx page complete
- [~] **Hotel Billing** (70%) - HotelBilling.tsx + InvoiceForm
- [~] **Hotel Payments** (65%) - HotelPayments.tsx + PaymentForm
- [~] **Customer List** (65%) - Customers.tsx + useCustomers hook
- [~] **Customer Detail** (70%) - CustomerDetailModal complete
- [~] **Customer Edit** (85%) - CustomerEditModal 697 lines: CRUD + map + Thai address
- [~] **Customer Stats** (65%) - CustomerStats component
- [~] **Customer Export** (60%) - comprehensiveExport + exportUtils
- [~] **SOS Alerts Dashboard** (90%) - SOSAlerts.tsx + useSOS + realtime
- [~] **SOS Notifications** (85%) - useSOSNotifications + sound alerts
- [~] **Promotion CRUD** (85%) - PromotionForm + Preview + CouponCodes + Reports
- [~] **Booking Reports** (85%) - 5 sections: Overview/Sales/Hotels/Staff/Services real data
- [~] **Revenue Reports** (85%) - useAnalytics hooks + analyticsQueries.ts 912 lines
- [~] **Report Export** (80%) - comprehensiveExport.ts + CSV/Excel ready
- [~] **General Settings** (82%) - Settings: billing, cancellation, payment settings เชื่อม DB

## 9. Payment - Omise (avg ~48%) <<<< HIGH PRIORITY

- [~] **Omise Service (Frontend)** (90%) - omiseService.ts DONE
- [~] **Omise Service (Backend)** (85%) - apps/server omiseService.ts DONE
- [~] **Payment Routes** (85%) - routes/payment.ts 7 endpoints
- [~] **Credit/Debit Card** (80%) - CreditCardForm + charge working
- [~] **Saved Card Support** (75%) - omise_customer_id + card tokens
- [ ] **PromptPay** (0%) - **ยังไม่ได้เชื่อม** <<<< DO THIS
  - TODO: Omise PromptPay source creation
  - TODO: QR code generation + display
  - TODO: Webhook for payment confirmation
  - Files: `apps/server/src/services/omiseService.ts`, `apps/customer/src/components/payment/`
- [ ] **Bank Transfer** (0%) - **ยังไม่ได้เชื่อม** <<<< DO THIS
  - TODO: Bank transfer instructions UI
  - TODO: Manual confirmation flow (admin)
- [ ] **Webhook Handler** (40%) - Basic handler, ยังไม่ verify signature
  - TODO: Verify Omise webhook signature
  - TODO: Handle charge.complete, charge.expired events
  - Files: `apps/server/src/routes/payment.ts`
- [~] **Customer PaymentForm** (75%) - PaymentForm + PaymentMethodModal
- [ ] **PaymentConfirmation Page** (40%) - UI complete แต่ใช้ mock data
  - TODO: เชื่อม real payment status from Omise
- [ ] **Refund System** (0%) - **ยังไม่ได้ทำ** <<<< DO THIS
  - TODO: Omise refund API integration
  - TODO: Refund request form (admin)
  - TODO: Refund status tracking
  - Files: `apps/server/src/services/refundService.ts` (exists but incomplete)
- [ ] **Invoice PDF** (0%) - **ยังไม่ได้ทำ**
  - TODO: Generate PDF invoice with jsPDF
  - TODO: Include tax info, booking details, payment receipt

## 10. External Integrations (avg ~75%)

- [ ] **OTP Service** (40%) - otpService.ts + smsService.ts + routes
  - TODO: เชื่อม SMS provider จริง
- [ ] **OTP Routes** (40%) - routes/otp.ts 4 endpoints
- [~] **Google Maps Picker** (90%) - GoogleMapsPicker ใน Admin + Customer + Hotel
- [~] **Google Maps Display** (75%) - For hotel/address locations
- [~] **LINE Messaging API** (85%) - lineMessagingService + gender filtering + multi-service + couple booking
- [~] **LINE Notify Service** (82%) - lineNotifyService.ts + providerPreference utility
- [~] **LINE LIFF Auth** (90%) - liffService.ts + Login + invite tokens
- [ ] **Email Service** (55%) - emailService.ts + booking confirmations + reminder crons + cancellation emails
  - TODO: ทดสอบส่ง email จริง + template design
- [~] **Sound Notifications** (90%) - soundAlert.ts + soundNotification.ts
- [~] **Browser Notifications** (85%) - notificationService.ts + jobReminder.ts
- [~] **Background Music** (90%) - backgroundMusic.ts for Staff service

## 11. Multi-Language i18n (avg ~78%)

- [~] **i18n Package Setup** (95%) - I18nProvider + config + index.ts
- [~] **Thai Translation** (90%) - 6 modules: auth, booking, common, home, profile, services
- [~] **English Translation** (85%) - 6 modules ครบ 18.8KB
- [~] **Chinese Translation** (80%) - 6 modules ครบ 17.6KB
- [~] **Language Switcher UI** (75%) - อยู่ใน Profile page ของ Customer app
- [ ] **Auto Language Detection** (40%) - เก็บใน profiles.language column
  - TODO: Detect browser language on first visit

## 12. Testing & QA (avg ~39%)

- [ ] **E2E Tests (Playwright)** (25%) - 4 specs: admin smoke, customer login+home, hotel login
  - TODO: เพิ่ม E2E สำหรับ booking flow, payment, staff job acceptance
  - Files: `e2e/`
- [x] **Unit Tests (Vitest)** (100%) - 139 test files / 2,420 tests / 0 failures / 100% pass rate
- [~] **RLS Policy Tests** (80%) - 128 tests, static analysis ของ migration files
  - Files: `packages/supabase/src/rls/__tests__/rlsPolicies.test.ts`
- [ ] **Integration Tests** (0%) - **ยังไม่ได้ทำ**
  - TODO: API endpoint integration tests
  - TODO: Supabase query integration tests
- [ ] **PDPA Compliance** (10%) - Privacy + Terms pages มีแล้ว
  - TODO: Cookie consent, data deletion request, privacy policy review
- [ ] **Security Audit** (0%) - **ยังไม่ได้ทำ**
  - TODO: OWASP top 10 review
  - TODO: Fix RLS vulnerabilities (see VULN-001 to VULN-005)

---

## Known Security Vulnerabilities

| ID | Severity | Table | Issue | Fix |
|----|----------|-------|-------|-----|
| VULN-001 | HIGH | promotions, promotion_usage, coupon_codes | ใช้ `email LIKE '%admin%'` แทน role check | เปลี่ยนเป็น `profiles.role = 'ADMIN'` |
| VULN-002 | HIGH | app_settings | ใช้ lowercase `'admin'` แต่ enum เป็น `'ADMIN'` (ไม่มีใครเข้าถึงได้) | เปลี่ยนเป็น `'ADMIN'` |
| VULN-003 | MEDIUM | profiles | INSERT policy `WITH CHECK (true)` เปิดกว้างเกินไป | Scope to `auth.uid()` |
| VULN-005 | MEDIUM | monthly_bills | Hotel SELECT policy ใช้ `AND true` (เห็นบิลทุกโรงแรม) | เพิ่ม hotel_id filter |

---

## Quick Reference: Key Files

| Area | Key Files |
|------|-----------|
| Server API | `apps/server/src/routes/*.ts`, `apps/server/src/services/*.ts` |
| Customer App | `apps/customer/src/pages/*.tsx`, `apps/customer/src/components/` |
| Hotel App | `apps/hotel/src/pages/*.tsx`, `apps/hotel/src/components/` |
| Staff App | `apps/staff/src/pages/*.tsx`, `apps/staff/src/components/` |
| Admin App | `apps/admin/src/pages/*.tsx`, `apps/admin/src/hooks/`, `apps/admin/src/lib/` |
| Supabase Hooks | `packages/supabase/src/hooks/*.ts` |
| Supabase Services | `packages/supabase/src/services/*.ts` |
| Auth | `packages/supabase/src/auth/` |
| Payment | `packages/supabase/src/payment/`, `apps/server/src/services/omiseService.ts` |
| Migrations | `supabase/migrations/*.sql` |
| Tests | `*/__tests__/*.test.ts` |
| Dashboard | `docs/project-timeline.html` → https://sprint.lightepic.com/ |
