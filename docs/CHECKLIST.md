# The Bliss at Home - Development Checklist

> **Last updated:** 2026-03-02 | **Overall: 78%** | **Dashboard:** https://sprint.lightepic.com/
>
> **How to use:** ให้ Claude Code อ่านไฟล์นี้เพื่อรู้ว่าต้องทำอะไรต่อ
> ```
> อ่าน docs/CHECKLIST.md แล้วทำ task ที่ยังไม่เสร็จ (เรียงจาก priority สูงสุด)
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

- [x] **Done** (100%) - ไม่ต้องทำอะไรเพิ่ม
- [ ] **Remaining** - มีรายละเอียดว่าค้างอะไร ต้องทำอะไรเพิ่มถึงจะ 100%

---

## 1. Infrastructure & Setup (avg ~69%)

- [x] **Supabase Cloud Project** (100%)
- [x] **Monorepo Structure** (100%)
- [x] **4 Frontend Apps Scaffolding** (100%)
- [ ] **Node.js Server Setup** (90%)
  - Remaining: Error handling middleware ยังไม่ครบทุก route, rate limiting ยังไม่มี, request validation (Zod) ยังไม่ครบ
  - Files: `apps/server/src/routes/*.ts`, `apps/server/src/middleware/`
- [x] **Environment Configuration** (100%)
- [ ] **Shared Packages Structure** (90%)
  - Remaining: types package ยังขาดบาง type definitions (cancellation, refund), barrel exports ยังไม่ครบ
  - Files: `packages/types/src/`
- [ ] **DB Scripts** (80%)
  - Remaining: seed script สำหรับ test data ยังไม่ครบ, migration rollback script ยังไม่มี
  - Files: `supabase/seed_customer_data.sql`
- [ ] **CI/CD Pipeline** (25%)
  - Remaining: เพิ่ม deploy step (staging → production), เพิ่ม E2E test step, เพิ่ม migration check, เพิ่ม environment secrets
  - Files: `.github/workflows/ci.yml`
- [ ] **Staging Deployment** (0%)
  - Remaining: เลือก platform (Vercel/Cloudflare), setup project, configure domains, environment variables, auto-deploy on PR merge
- [ ] **Production Deployment** (0%)
  - Remaining: Production Supabase project, production domain, SSL, CDN, monitoring, alerting

## 2. Database & Schema (avg ~98%)

- [x] **Profiles Table + RLS** (100%)
- [x] **Enum Types** (100%)
- [x] **Services & Skills Tables** (100%)
- [x] **Staff & Hotels Tables** (100%)
- [x] **Customers Table** (100%)
- [x] **Bookings & Booking Items** (100%)
- [x] **Reviews & Notifications** (100%)
- [x] **Billing Tables** (100%)
- [x] **SOS Alerts Table** (100%)
- [x] **Storage Buckets** (100%)
- [ ] **RLS Policies** (95%)
  - Remaining: แก้ VULN-001 (promotions ใช้ email LIKE), แก้ VULN-002 (app_settings lowercase admin), แก้ VULN-003 (profiles open INSERT), แก้ VULN-005 (monthly_bills open SELECT)
  - Files: `supabase/migrations/000000000000_create_promotions_complete.sql`, `supabase/migrations/20260210050000_create_app_settings.sql`
- [ ] **Database Indexes** (85%)
  - Remaining: เพิ่ม composite index สำหรับ booking search (customer_id + status + date), staff availability index, hotel billing date range index
  - Files: `supabase/migrations/`

## 3. Authentication (avg ~83%)

- [ ] **Email/Password Login** (85%)
  - Remaining: Error message ภาษาไทย, email verification flow ยังไม่ enforce, login attempt rate limiting
  - Files: `packages/supabase/src/auth/authService.ts`
- [x] **Registration + Profile Creation** (100%)
- [x] **Logout** (100%)
- [x] **Role Validation** (100%)
- [x] **Account Status Check** (100%)
- [x] **Protected Routes** (100%)
- [ ] **Session Refresh** (85%)
  - Remaining: Auto-refresh token ก่อน expire, handle refresh failure gracefully (redirect to login), multi-tab session sync
  - Files: `packages/supabase/src/auth/sessionManager.ts`
- [ ] **Password Reset** (70%)
  - Remaining: ทดสอบ flow ครบ (email → reset link → new password), custom email template, success/error feedback UI, password strength validation
  - Files: `packages/ui/src/components/auth/PasswordResetForm.tsx`
- [ ] **Hotel Auth System** (80%)
  - Remaining: Invite email template, invite expiry handling, multi-user per hotel, role hierarchy (hotel admin vs hotel staff)
  - Files: `apps/server/src/services/hotelAuthService.ts`, `apps/hotel/src/pages/Login.tsx`
- [ ] **Social Login (Facebook/Google)** (60%)
  - Remaining: ทดสอบ OAuth callback, profile creation from social data, link existing account, handle duplicate email, Facebook App Review
  - Files: `apps/customer/src/pages/auth/Login.tsx`
- [ ] **OTP Phone Verification** (35%)
  - Remaining: เชื่อม SMS provider จริง (ThaiBulkSMS/Twilio), OTP input UI, resend cooldown, verify + link phone to profile, rate limiting
  - Files: `apps/server/src/services/otpService.ts`, `apps/server/src/services/smsService.ts`, `apps/server/src/routes/otp.ts`

## 4. Shared UI Components (avg ~92%)

- [x] **AuthLayout + LoginForm** (100%)
- [ ] **PasswordResetForm** (90%)
  - Remaining: Validation error ภาษาไทย, loading state on submit, success redirect timer
  - Files: `packages/ui/src/components/auth/PasswordResetForm.tsx`
- [x] **ProtectedRoute Component** (100%)
- [ ] **Layout (Sidebar, Header, Footer)** (90%)
  - Remaining: Mobile hamburger menu animation, active route highlight ใน sidebar, breadcrumbs component
  - Files: `packages/ui/src/components/Layout.tsx`
- [x] **Core Components** (100%)
- [ ] **Form Components** (90%)
  - Remaining: DatePicker ภาษาไทย (พ.ศ.), time picker component, file input with preview, form error summary
  - Files: `packages/ui/src/components/`
- [ ] **UX State Components** (85%)
  - Remaining: Skeleton loader, toast notification system, offline indicator, error boundary with retry
  - Files: `packages/ui/src/components/`
- [ ] **LogoUpload Component** (90%)
  - Remaining: Image crop/resize before upload, file size validation feedback, upload progress bar
  - Files: `packages/ui/src/components/LogoUpload.tsx`
- [ ] **Responsive Design** (85%)
  - Remaining: ทดสอบ tablet breakpoint, touch-friendly table on mobile, print stylesheet, landscape orientation
  - Files: ทุก app

## 5. Customer App - SRS 3.1 (avg ~65%)

- [ ] **Home Page** (70%)
  - Remaining: Hero section design, popular services section, testimonials section, CTA buttons, SEO meta tags
  - Files: `apps/customer/src/pages/Home.tsx`
- [ ] **Service Catalog** (75%)
  - Remaining: Search by keyword, sort by price/rating, service availability check, skeleton loading
  - Files: `apps/customer/src/pages/Services.tsx`
- [ ] **Service Detail** (75%)
  - Remaining: Service reviews display, therapist availability preview, related services, share button, breadcrumbs
  - Files: `apps/customer/src/pages/ServiceDetail.tsx`
- [ ] **Booking Wizard (5 Steps)** (85%)
  - Remaining: Step validation (prevent skip), address auto-fill from saved, time slot availability check real-time, booking confirmation email trigger
  - Files: `apps/customer/src/pages/BookingWizard.tsx`, `apps/customer/src/components/booking/`
- [ ] **Booking Summary** (70%)
  - Remaining: PDF receipt download, share booking link, add to calendar (iCal), QR code for booking reference
  - Files: `apps/customer/src/pages/BookingSummary.tsx`
- [ ] **Cancel/Reschedule (3hr rule)** (0%) <<<< HIGH PRIORITY
  - Remaining: ทั้งหมด - UI ยกเลิก/เลื่อนนัด, 3-hour rule enforcement, cancellation policy display, refund calculation, confirmation dialog, notification to staff, booking status update
  - Files: `apps/customer/src/pages/BookingDetail.tsx` (ต้องสร้างใหม่หรือเพิ่ม)
- [ ] **Booking History** (75%)
  - Remaining: Date range filter, export booking history, rebook button, status filter chips
  - Files: `apps/customer/src/pages/BookingHistory.tsx`
- [ ] **Booking Detail** (75%)
  - Remaining: Real-time status update (realtime subscription), staff contact info (after confirmed), map to service location, cancel/reschedule buttons
  - Files: `apps/customer/src/pages/BookingDetail.tsx`
- [ ] **Profile Management** (80%)
  - Remaining: Profile photo upload, email change with verification, phone change with OTP, delete account (PDPA), profile completeness indicator
  - Files: `apps/customer/src/pages/Profile.tsx`
- [ ] **Address/Location Mgmt** (85%)
  - Remaining: Set default address, address nickname, validate postal code, current location auto-detect
  - Files: `apps/customer/src/pages/Addresses.tsx`
- [ ] **Payment Methods** (80%)
  - Remaining: Card expiry warning, 3D Secure support, remove card confirmation, card brand icon display
  - Files: `apps/customer/src/pages/PaymentMethods.tsx`
- [ ] **Transaction History** (70%)
  - Remaining: Filter by date/status/type, receipt download per transaction, refund status display, pagination
  - Files: `apps/customer/src/pages/Transactions.tsx`
- [ ] **Review & Rating** (70%)
  - Remaining: Photo upload with review, edit/delete own review, review reply notification, review analytics (avg rating)
  - Files: `apps/customer/src/pages/Reviews.tsx`, `apps/customer/src/components/ReviewModal.tsx`
- [ ] **SOS Button** (95%)
  - Remaining: SOS history view, cancel SOS, admin acknowledge notification to customer
  - Files: `apps/customer/src/components/SOSButton.tsx`
- [ ] **Promotions Display** (60%)
  - Remaining: Promotion detail page, coupon code input, apply coupon in booking wizard, promotion expiry countdown, terms & conditions display
  - Files: `apps/customer/src/pages/Home.tsx`, `apps/customer/src/components/PromotionCarousel.tsx`
- [ ] **FAQ & Help Center** (15%)
  - Remaining: FAQ page with categories, search FAQ, contact form, LINE chat link, help articles, tutorial videos
  - Files: ต้องสร้างใหม่ `apps/customer/src/pages/FAQ.tsx`, `apps/customer/src/pages/Help.tsx`

## 6. Hotel/B2B App - SRS 3.2 (avg ~56%)

- [ ] **Hotel Auth System** (85%)
  - Remaining: Remember me, forgot password for hotel users, session timeout warning, multi-device login management
  - Files: `apps/hotel/src/pages/Login.tsx`
- [ ] **Dashboard Overview** (75%)
  - Remaining: Revenue chart (daily/weekly/monthly), occupancy rate, top services, comparison with last period, real-time booking counter
  - Files: `apps/hotel/src/pages/Dashboard.tsx`
- [ ] **Billing Summary** (82%)
  - Remaining: Payment history chart, dispute/inquiry flow, auto-payment setup, billing contact info update
  - Files: `apps/hotel/src/pages/Billing.tsx`
- [ ] **Recent Bookings** (80%)
  - Remaining: Real-time new booking notification, booking detail expand, quick status change, export filtered results
  - Files: `apps/hotel/src/pages/GuestBookings.tsx`
- [ ] **Upcoming Appointments** (65%)
  - Remaining: Calendar view (day/week), time slot visualization, staff assignment preview, auto-reminder to guests
  - Files: `apps/hotel/src/pages/GuestBookings.tsx`
- [ ] **Guest Activity Snapshot** (0%)
  - Remaining: ทั้งหมด - Widget แสดง recent check-ins, active services, completed today, revenue today
  - Files: ต้องสร้างใหม่ `apps/hotel/src/components/GuestActivitySnapshot.tsx`
- [ ] **Service Catalog** (75%)
  - Remaining: Hotel-specific pricing override, service availability toggle, seasonal pricing, bulk price update
  - Files: `apps/hotel/src/pages/Services.tsx`
- [ ] **Book for Guest** (25%)
  - Remaining: เชื่อม real services จาก DB, staff assignment (auto/manual), payment method selection, guest info form, booking confirmation, notification to guest
  - Files: `apps/hotel/src/pages/BookForGuest.tsx`
- [ ] **Guest Bookings List** (75%)
  - Remaining: Advanced filter (date range, status, guest name), bulk actions (cancel, export), booking statistics summary
  - Files: `apps/hotel/src/pages/BookingHistory.tsx`
- [ ] **Cancel/Reschedule** (0%) <<<< HIGH PRIORITY
  - Remaining: ทั้งหมด - Hotel-side cancellation UI, reason selection, guest notification, refund trigger, reschedule date picker, policy enforcement
  - Files: ต้องสร้างใหม่ `apps/hotel/src/components/CancelBookingModal.tsx`
- [ ] **Auto Invoice Generation** (72%)
  - Remaining: Tax invoice format (ใบกำกับภาษี), withholding tax calculation, credit note for refunds, auto-send invoice email
  - Files: `apps/hotel/src/pages/Billing.tsx`
- [ ] **Monthly Bill** (80%)
  - Remaining: Bill detail breakdown, payment method selection (transfer/credit), payment proof upload, auto-reconciliation
  - Files: `apps/hotel/src/pages/Billing.tsx`
- [ ] **Invoice Download PDF** (20%)
  - Remaining: ใช้ jsPDF สร้าง proper PDF (ตอนนี้เป็น text file), company logo, Thai tax invoice format, digital signature
  - Files: `apps/hotel/src/utils/pdfInvoiceGenerator.ts`
- [ ] **Bill Status Display** (75%)
  - Remaining: Email reminder for overdue, payment deadline countdown, escalation notification to admin
  - Files: `apps/hotel/src/components/BillStatus.tsx`
- [ ] **Hotel Profile + Map** (60%)
  - Remaining: Photo gallery upload, amenities list, operating hours, contact information, Google Maps embed (display mode), description editor
  - Files: `apps/hotel/src/pages/HotelProfile.tsx`
- [ ] **Change Password** (0%)
  - Remaining: ทั้งหมด - Change password form, current password verification, password strength meter, Supabase updateUser() call
  - Files: ต้องสร้างใหม่ `apps/hotel/src/pages/ChangePassword.tsx`

## 7. Staff/Provider App - SRS 3.3 (avg ~85%)

- [ ] **LINE LIFF Auth** (90%)
  - Remaining: Handle LIFF init failure gracefully, offline fallback, auto-refresh LIFF token
  - Files: `packages/supabase/src/auth/liffService.ts`
- [ ] **LINE Job Notification** (60%)
  - Remaining: ทดสอบส่ง notification จริงผ่าน LINE Messaging API, rich message template (Flex Message), job detail in notification, accept/decline quick reply buttons
  - Files: `packages/supabase/src/notifications/lineMessagingService.ts`
- [ ] **Job Details Display** (95%)
  - Remaining: Customer phone number display (after accept), navigation link to Google Maps, service checklist
  - Files: `apps/staff/src/pages/StaffDashboard.tsx`
- [ ] **Accept/Decline Job** (90%)
  - Remaining: Decline reason selection, auto-reassign after decline, confirmation dialog with job summary
  - Files: `apps/staff/src/pages/StaffDashboard.tsx`
- [ ] **Personal Job Queue** (90%)
  - Remaining: Priority sorting, conflict detection (overlapping times), job count badge
  - Files: `packages/supabase/src/jobs/useJobs.ts`
- [ ] **Job Status + Music** (85%)
  - Remaining: Timer pause/resume, background music volume control, music playlist selection, auto-stop timer on job complete
  - Files: `apps/staff/src/components/ServiceTimer.tsx`, `apps/staff/src/utils/backgroundMusic.ts`
- [ ] **Cancel Accepted Job** (90%)
  - Remaining: Cancellation penalty display, mandatory reason, notification to customer and admin
  - Files: `apps/staff/src/components/JobCancellationModal.tsx`
- [ ] **Job History** (80%)
  - Remaining: Earnings per job display, date range filter, export history, customer feedback per job
  - Files: `apps/staff/src/pages/StaffHistory.tsx`
- [ ] **Job Filter** (75%)
  - Remaining: Filter by service type, distance filter, time range filter, save filter presets
  - Files: `packages/supabase/src/jobs/useJobs.ts`
- [ ] **SOS Button** (90%)
  - Remaining: SOS history, cancel SOS, emergency contacts list
  - Files: `apps/staff/src/components/SOSButton.tsx`
- [ ] **Schedule Calendar** (85%)
  - Remaining: Block time off, recurring availability, sync with Google Calendar, week/month view toggle
  - Files: `apps/staff/src/pages/StaffSchedule.tsx`
- [ ] **Earnings Display** (90%)
  - Remaining: Earnings chart (weekly/monthly trend), tax summary, export for tax filing
  - Files: `apps/staff/src/pages/StaffEarnings.tsx`
- [ ] **Payment/Payout Status** (82%)
  - Remaining: Payout schedule display, bank transfer confirmation, payout history export, payout dispute flow
  - Files: `packages/supabase/src/earnings/earningsService.ts`
- [ ] **Personal Profile** (92%)
  - Remaining: Profile completeness indicator, required fields validation, profile photo crop
  - Files: `apps/staff/src/pages/StaffProfile.tsx`
- [ ] **Document Upload** (75%)
  - Remaining: Document expiry notification, document status (pending/approved/rejected) display, re-upload rejected docs, document type validation (ID card, license, etc.)
  - Files: `apps/staff/src/pages/StaffProfile.tsx`
- [ ] **Service Area Setup** (80%)
  - Remaining: Area radius visualization on map, multiple area zones, travel time estimation, area overlap warning
  - Files: `apps/staff/src/pages/StaffProfile.tsx`
- [ ] **Notification Sounds** (90%)
  - Remaining: Custom sound selection, volume control per notification type, do not disturb mode
  - Files: `apps/staff/src/utils/soundNotification.ts`
- [ ] **Settings** (75%)
  - Remaining: Notification preferences (toggle per type), language setting, availability schedule, auto-accept rules, dark mode
  - Files: `apps/staff/src/pages/StaffSettings.tsx`

## 8. Admin App - SRS 3.4 (avg ~79%)

- [ ] **Dashboard Stats** (75%)
  - Remaining: Revenue trend chart, booking trend chart, top performing staff, top services, comparison vs last period, real-time counters (active bookings, online staff)
  - Files: `apps/admin/src/pages/Dashboard.tsx`, `apps/admin/src/hooks/useDashboard.ts`
- [ ] **Booking List + Filters** (85%)
  - Remaining: Date range picker filter, export filtered list, bulk status change, column sort
  - Files: `apps/admin/src/pages/Bookings.tsx`
- [ ] **Booking Detail** (75%)
  - Remaining: Full timeline/audit log, payment info display, staff assignment history, customer communication log
  - Files: `apps/admin/src/components/BookingDetailModal.tsx`
- [ ] **Change Booking Status** (85%)
  - Remaining: Status change reason (required for cancel), notification trigger to customer/staff, status change audit log
  - Files: `apps/admin/src/pages/Bookings.tsx`
- [ ] **Booking Search** (60%)
  - Remaining: Search by booking number, customer name, phone, staff name, hotel name, date range, advanced filter combination
  - Files: `apps/admin/src/pages/Bookings.tsx`
- [ ] **Service CRUD** (90%)
  - Remaining: Service ordering/sorting, duplicate service, archive (soft delete), service version history
  - Files: `apps/admin/src/pages/Services.tsx`
- [ ] **Service Image Upload** (70%)
  - Remaining: Multiple images per service, image reorder (drag & drop), image crop before upload, thumbnail generation
  - Files: `apps/admin/src/components/ImageUpload.tsx`
- [ ] **Service Categories** (60%)
  - Remaining: Category CRUD (create/edit/delete), category icon, category ordering, subcategories
  - Files: `apps/admin/src/pages/Services.tsx`
- [ ] **Staff List** (80%)
  - Remaining: Filter by status/skill/area, bulk actions (activate/suspend), staff availability overview, map view of staff locations
  - Files: `apps/admin/src/pages/Staff.tsx`
- [ ] **Staff Detail Page** (95%)
  - Remaining: Activity log/timeline, login history, rating trend chart
  - Files: `apps/admin/src/pages/StaffDetail.tsx`
- [ ] **Staff Edit** (90%)
  - Remaining: Skill assignment UI, commission rate override per staff, edit history/audit log
  - Files: `apps/admin/src/components/EditStaffModal.tsx`
- [ ] **Staff Documents** (90%)
  - Remaining: Document approval workflow (approve/reject with comment), expiry reminder automation, bulk document review
  - Files: `apps/admin/src/components/DocumentViewerModal.tsx`
- [ ] **Staff Status Management** (85%)
  - Remaining: Suspension reason tracking, auto-reactivation scheduler, status change notification to staff, suspension history
  - Files: `apps/admin/src/components/StatusManagementModal.tsx`
- [ ] **Staff Reviews** (92%)
  - Remaining: Review moderation (hide/show), reply to review as admin, review analytics dashboard (avg per staff)
  - Files: `apps/admin/src/components/ReviewsTabContent.tsx`
- [ ] **Staff Performance Metrics** (85%)
  - Remaining: Performance comparison between staff, target/goal setting, performance alerts (below threshold), export performance report
  - Files: `apps/admin/src/hooks/useStaffPerformance.ts`
- [ ] **Staff Jobs View** (85%)
  - Remaining: Job reassignment, job timeline visualization, conflict detection
  - Files: `apps/admin/src/components/JobDetailModal.tsx`
- [ ] **Staff Payout Calculate** (85%)
  - Remaining: Deduction management (advance, penalty), tax withholding, payout preview before confirm, batch calculation
  - Files: `apps/admin/src/components/PayoutCalculationModal.tsx`
- [ ] **Staff Payout Process** (80%)
  - Remaining: Bank transfer integration, payout batch processing, payment proof upload, payout receipt generation
  - Files: `apps/admin/src/components/ProcessPayoutModal.tsx`
- [ ] **Hotel List + Detail** (70%)
  - Remaining: Hotel onboarding wizard, hotel status management, hotel performance dashboard, contract management
  - Files: `apps/admin/src/pages/Hotels.tsx`, `apps/admin/src/pages/HotelDetail.tsx`
- [ ] **Hotel CRUD + Map** (75%)
  - Remaining: Hotel photo gallery, amenities management, operating hours, contact info validation, area coverage setup
  - Files: `apps/admin/src/components/HotelForm.tsx`
- [ ] **Hotel Bookings** (70%)
  - Remaining: Hotel-specific booking analytics, booking source tracking, revenue per hotel chart, booking trend
  - Files: `apps/admin/src/pages/HotelBookings.tsx`
- [ ] **Hotel Billing** (70%)
  - Remaining: Invoice generation automation, payment reconciliation, outstanding balance alerts, billing dispute management
  - Files: `apps/admin/src/pages/HotelBilling.tsx`
- [ ] **Hotel Payments** (65%)
  - Remaining: Payment recording (manual), payment proof verification, payment history with receipts, overdue payment escalation
  - Files: `apps/admin/src/pages/HotelPayments.tsx`
- [ ] **Customer List** (65%)
  - Remaining: Advanced search (name, phone, email), filter by status/join date, customer segments, bulk actions
  - Files: `apps/admin/src/pages/Customers.tsx`
- [ ] **Customer Detail** (70%)
  - Remaining: Booking history in detail, spending summary, review history, communication log, account actions (suspend/delete)
  - Files: `apps/admin/src/components/CustomerDetailModal.tsx`
- [ ] **Customer Edit** (85%)
  - Remaining: Edit validation (phone format, email uniqueness), change log/audit trail
  - Files: `apps/admin/src/components/CustomerEditModal.tsx`
- [ ] **Customer Stats** (65%)
  - Remaining: Customer growth chart, retention rate, average spending, top customers, churn analysis
  - Files: `apps/admin/src/components/CustomerStats.tsx`
- [ ] **Customer Export** (60%)
  - Remaining: Export format selection (CSV/Excel/PDF), custom field selection, scheduled export, PDPA-compliant export (mask sensitive data)
  - Files: `apps/admin/src/lib/comprehensiveExport.ts`
- [ ] **SOS Alerts Dashboard** (90%)
  - Remaining: Alert acknowledge workflow, alert resolution tracking, alert statistics, response time metrics
  - Files: `apps/admin/src/pages/SOSAlerts.tsx`
- [ ] **SOS Notifications** (85%)
  - Remaining: Escalation rules (if no response in X minutes), SMS alert to admin, alert priority levels
  - Files: `apps/admin/src/hooks/useSOSNotifications.ts`
- [ ] **Promotion CRUD** (85%)
  - Remaining: Promotion analytics (usage count, revenue impact), A/B testing support, promotion scheduling (future start), auto-expire
  - Files: `apps/admin/src/pages/Promotions.tsx`
- [ ] **Booking Reports** (85%)
  - Remaining: Date range comparison, drill-down by hotel/staff/service, scheduled report delivery, report caching
  - Files: `apps/admin/src/pages/Reports.tsx`
- [ ] **Revenue Reports** (85%)
  - Remaining: Revenue forecast, profit margin analysis, payment method breakdown, tax summary report
  - Files: `apps/admin/src/lib/analyticsQueries.ts`
- [ ] **Report Export** (80%)
  - Remaining: PDF report with charts, scheduled email delivery, custom report builder, report templates
  - Files: `apps/admin/src/lib/comprehensiveExport.ts`
- [ ] **General Settings** (82%)
  - Remaining: Notification settings (email templates), system maintenance mode, audit log viewer, backup management
  - Files: `apps/admin/src/pages/Settings.tsx`

## 9. Payment - Omise (avg ~48%) <<<< HIGH PRIORITY

- [ ] **Omise Service (Frontend)** (90%)
  - Remaining: Error handling for network failures, retry logic, payment timeout handling
  - Files: `packages/supabase/src/payment/omiseService.ts`
- [ ] **Omise Service (Backend)** (85%)
  - Remaining: Idempotency key support, charge status polling, error code mapping to Thai messages
  - Files: `apps/server/src/services/omiseService.ts`
- [ ] **Payment Routes** (85%)
  - Remaining: Request validation (amount, currency), rate limiting, audit logging per transaction
  - Files: `apps/server/src/routes/payment.ts`
- [ ] **Credit/Debit Card** (80%)
  - Remaining: 3D Secure flow completion, card brand detection + icon, input formatting (card number spaces), error messages ภาษาไทย
  - Files: `apps/customer/src/components/payment/CreditCardForm.tsx`
- [ ] **Saved Card Support** (75%)
  - Remaining: Card expiry check before charge, update default card, delete card with confirmation, PCI compliance check
  - Files: `apps/customer/src/pages/PaymentMethods.tsx`
- [ ] **PromptPay** (0%) <<<< DO THIS
  - Remaining: ทั้งหมด - Omise PromptPay source creation, QR code generation + display, polling for payment status, webhook for confirmation, timeout handling, UI flow
  - Files: `apps/server/src/services/omiseService.ts`, `apps/customer/src/components/payment/PromptPayForm.tsx` (ต้องสร้างใหม่)
- [ ] **Bank Transfer** (0%) <<<< DO THIS
  - Remaining: ทั้งหมด - Bank account display (company bank info), transfer instruction UI, payment proof upload, manual confirmation flow (admin), notification on confirm
  - Files: `apps/customer/src/components/payment/BankTransferForm.tsx` (ต้องสร้างใหม่)
- [ ] **Webhook Handler** (40%)
  - Remaining: Verify Omise webhook signature, handle charge.complete event, handle charge.expired event, handle refund events, idempotent processing, error recovery
  - Files: `apps/server/src/routes/payment.ts`
- [ ] **Customer PaymentForm** (75%)
  - Remaining: Payment method selector (card/PromptPay/transfer), payment summary display, loading state, error recovery UI
  - Files: `apps/customer/src/components/payment/PaymentForm.tsx`
- [ ] **PaymentConfirmation Page** (40%)
  - Remaining: เชื่อม real payment status จาก Omise, auto-refresh status, receipt display, booking confirmation link, download receipt PDF
  - Files: `apps/customer/src/pages/PaymentConfirmation.tsx`
- [ ] **Refund System** (0%) <<<< DO THIS
  - Remaining: ทั้งหมด - Omise refund API integration, refund request form (admin), refund amount calculation (full/partial), refund status tracking, refund notification to customer, refund receipt
  - Files: `apps/server/src/services/refundService.ts` (exists but incomplete), `apps/admin/src/components/RefundModal.tsx` (ต้องสร้างใหม่)
- [ ] **Invoice PDF** (0%)
  - Remaining: ทั้งหมด - jsPDF invoice template, company header + logo, Thai tax invoice format (ใบกำกับภาษี), line items + pricing, payment info, customer/hotel info, running number
  - Files: ต้องสร้างใหม่ `apps/server/src/services/invoicePdfService.ts`

## 10. External Integrations (avg ~75%)

- [ ] **OTP Service** (40%)
  - Remaining: เชื่อม SMS provider จริง (ThaiBulkSMS/Twilio), OTP template, rate limiting (max 5/hour), OTP expiry (5 min), verify endpoint, error handling
  - Files: `apps/server/src/services/otpService.ts`, `apps/server/src/services/smsService.ts`
- [ ] **OTP Routes** (40%)
  - Remaining: Input validation, phone format normalization (+66), response codes, OTP verify + link to profile
  - Files: `apps/server/src/routes/otp.ts`
- [ ] **Google Maps Picker** (90%)
  - Remaining: API key restriction (production), geocoding rate limiting, fallback when Maps unavailable
  - Files: `packages/ui/src/components/GoogleMapsPicker.tsx`
- [ ] **Google Maps Display** (75%)
  - Remaining: Custom marker icons, directions link, street view, distance calculation between customer and hotel
  - Files: multiple apps
- [ ] **LINE Messaging API** (85%)
  - Remaining: Rich menu setup, Flex Message templates for booking/job, message delivery status tracking, fallback for failed delivery
  - Files: `packages/supabase/src/notifications/lineMessagingService.ts`
- [ ] **LINE Notify Service** (82%)
  - Remaining: Admin notification group, alert priority levels, notification throttling (prevent spam), delivery confirmation
  - Files: `packages/supabase/src/notifications/lineNotifyService.ts`
- [ ] **LINE LIFF Auth** (90%)
  - Remaining: LIFF size optimization, handle browser fallback (non-LINE), token refresh on expiry
  - Files: `packages/supabase/src/auth/liffService.ts`
- [ ] **Email Service** (55%)
  - Remaining: ทดสอบส่ง email จริง (SMTP/SendGrid/SES), HTML email templates (booking confirm, reminder, cancellation, receipt), unsubscribe link, bounce handling
  - Files: `apps/server/src/services/emailService.ts`
- [ ] **Sound Notifications** (90%)
  - Remaining: Custom sound selection settings, mute schedule, browser permission handling improvement
  - Files: `apps/admin/src/utils/soundAlert.ts`
- [ ] **Browser Notifications** (85%)
  - Remaining: Service Worker for background notifications, notification click handling (navigate to page), notification grouping
  - Files: `apps/admin/src/utils/notificationService.ts`
- [ ] **Background Music** (90%)
  - Remaining: Music library/playlist, smooth fade in/out, remember last playing track, volume persistence
  - Files: `apps/staff/src/utils/backgroundMusic.ts`

## 11. Multi-Language i18n (avg ~78%)

- [ ] **i18n Package Setup** (95%)
  - Remaining: Namespace lazy loading, translation key type-safety, missing key fallback logging
  - Files: `packages/i18n/src/`
- [ ] **Thai Translation** (90%)
  - Remaining: ตรวจทาน translation ทั้งหมดกับ native speaker, เพิ่ม error messages, notification messages, email templates
  - Files: `packages/i18n/src/locales/th/`
- [ ] **English Translation** (85%)
  - Remaining: Proofread by native speaker, ensure all new features have EN translations, pluralization rules
  - Files: `packages/i18n/src/locales/en/`
- [ ] **Chinese Translation** (80%)
  - Remaining: Proofread by native speaker, Traditional Chinese variant, ensure all modules translated
  - Files: `packages/i18n/src/locales/zh/`
- [ ] **Language Switcher UI** (75%)
  - Remaining: Switcher in all apps (ตอนนี้มีแค่ Customer), language flag icons, persist selection across sessions, switcher in header (not just profile)
  - Files: `apps/customer/src/pages/Profile.tsx`
- [ ] **Auto Language Detection** (40%)
  - Remaining: Detect browser language on first visit, save to profiles.language, prompt user to confirm, fallback chain (browser → profile → default TH)
  - Files: `packages/i18n/src/config.ts`

## 12. Testing & QA (avg ~39%)

- [ ] **E2E Tests (Playwright)** (25%)
  - Remaining: Booking flow E2E (search → select → book → pay → confirm), payment E2E, staff job acceptance E2E, hotel booking E2E, admin CRUD E2E, mobile viewport tests
  - Files: `e2e/`
- [x] **Unit Tests (Vitest)** (100%) - 139 files / 2,420 tests / 0 failures
- [ ] **RLS Policy Tests** (80%)
  - Remaining: เพิ่ม live DB tests (ทดสอบ policy จริงกับ Supabase), test with different user roles, test cross-tenant data isolation
  - Files: `packages/supabase/src/rls/__tests__/rlsPolicies.test.ts`
- [ ] **Integration Tests** (0%)
  - Remaining: ทั้งหมด - API endpoint tests with supertest, Supabase query tests with test DB, payment flow integration, notification delivery tests
  - Files: ต้องสร้างใหม่ `apps/server/src/__tests__/integration/`
- [ ] **PDPA Compliance** (10%)
  - Remaining: Cookie consent banner, data deletion request flow, privacy policy review by lawyer, data processing agreement, consent logging, data export for user
  - Files: `apps/customer/src/components/CookieConsent.tsx` (ต้องสร้างใหม่)
- [ ] **Security Audit** (0%)
  - Remaining: ทั้งหมด - OWASP top 10 review, fix RLS vulnerabilities (VULN-001~005), XSS prevention audit, CSRF protection, rate limiting, input sanitization, dependency vulnerability scan
  - Files: ทุก app

---

## Known Security Vulnerabilities

| ID | Severity | Table | Issue | Fix |
|----|----------|-------|-------|-----|
| VULN-001 | HIGH | promotions, promotion_usage, coupon_codes | ใช้ `email LIKE '%admin%'` แทน role check | สร้าง migration ใหม่: DROP เก่า + CREATE ใหม่ด้วย `profiles.role = 'ADMIN'` |
| VULN-002 | HIGH | app_settings | ใช้ lowercase `'admin'` แต่ enum เป็น `'ADMIN'` (ไม่มีใครเข้าถึงได้) | สร้าง migration: เปลี่ยน `'admin'` เป็น `'ADMIN'` |
| VULN-003 | MEDIUM | profiles | INSERT policy `WITH CHECK (true)` เปิดกว้างเกินไป | เปลี่ยน WITH CHECK เป็น `auth.uid() = id` |
| VULN-005 | MEDIUM | monthly_bills | Hotel SELECT policy ใช้ `AND true` (เห็นบิลทุกโรงแรม) | เพิ่ม `hotel_id = get_user_hotel_id()` filter |

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
