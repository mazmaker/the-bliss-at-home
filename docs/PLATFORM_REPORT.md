# The Bliss Massage at Home — Platform Report

> รายงานโครงสร้างแพลตฟอร์มอย่างละเอียด: ทุก App, Module, Function
> อัปเดตล่าสุด: 31 มีนาคม 2569

---

## สารบัญ

1. [ภาพรวมแพลตฟอร์ม](#1-ภาพรวมแพลตฟอร์ม)
2. [Admin App](#2-admin-app)
3. [Customer App](#3-customer-app)
4. [Hotel App](#4-hotel-app)
5. [Staff App](#5-staff-app)
6. [Server App (API)](#6-server-app-api)
7. [Shared Packages](#7-shared-packages)
8. [สรุปสถิติ](#8-สรุปสถิติ)

---

## 1. ภาพรวมแพลตฟอร์ม

**The Bliss Massage at Home** — แพลตฟอร์มจองบริการนวด สปา ทำเล็บถึงบ้าน

### โครงสร้าง Monorepo

```
the-bliss-at-home/
├── apps/
│   ├── admin/      → Admin Dashboard (React+Vite, port 3001)
│   ├── customer/   → Customer Booking App (React+Vite, port 3008)
│   ├── hotel/      → Hotel Partner Portal (React+Vite, port 3003)
│   ├── staff/      → Staff LINE LIFF App (React+Vite, port 3004)
│   └── server/     → Backend API (Express, port 3000)
├── packages/
│   ├── supabase/   → Shared Supabase client, hooks, services
│   ├── ui/         → Shared UI components
│   ├── types/      → Shared TypeScript types
│   └── i18n/       → Multi-language support (TH/EN/CN)
└── supabase/
    └── migrations/ → Database migrations (219 files)
```

### Tech Stack

| Layer | เทคโนโลยี |
|-------|----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query |
| Backend | Express.js, Node.js |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Payment | Omise (Credit Card, PromptPay) |
| Messaging | LINE Messaging API, Resend (Email) |
| Maps | Google Maps API |
| Deploy | Vercel (Frontend + Serverless) |
| Auth | Supabase Auth, LINE LIFF, Google/Facebook OAuth |

### Production URLs

| App | URL |
|-----|-----|
| Customer | https://customer.theblissmassageathome.com |
| Staff | https://staff.theblissmassageathome.com |
| Hotel | https://hotel.theblissmassageathome.com |
| Admin | https://admin.theblissmassageathome.com |

---

## 2. Admin App

**Port:** 3001 | **Path:** `apps/admin/` | **Role:** ADMIN

### 2.1 Pages (19 หน้า)

| หน้า | Route | Module | Functions |
|------|-------|--------|-----------|
| **Dashboard** | `/admin` | ภาพรวม | Stats รวม (users, bookings, revenue), SOS widget, Job escalation alerts, การจองล่าสุด, รออนุมัติ, บริการยอดนิยม |
| **Services** | `/admin/services` | จัดการบริการ | CRUD บริการ, Search + category filter, ตั้งราคาหลาย duration, Analytics tab, Soft delete, สถานะ on/off |
| **Staff** | `/admin/staff` | พนักงาน | รายชื่อ Staff + filter (skill/status), Search, อนุมัติ/ปฏิเสธ, Invite via LINE QR, แก้ไข Staff |
| **StaffDetail** | `/admin/staff/:id` | พนักงาน | 8 tabs: Overview, Documents, Schedule, Performance, Reviews, Earnings/Payouts, Job History, Bank Accounts, Status management |
| **PayoutDashboard** | `/admin/payout` | รอบจ่ายเงิน | Stats (Staff/ครบกำหนด/ยอดรวม/ยกยอด), ตาราง Staff + virtual rows (ยกยอด/ยังไม่ถึงรอบ), Filter (รอบ/สถานะ/เดือน), Batch payout + LINE notification, Bank warning, Export CSV — **เพิ่ม 2026-04-03** |
| **Customers** | `/admin/customers` | ลูกค้า | รายชื่อลูกค้า + filter, Search, ดูรายละเอียด, แก้ไข, Export CSV/Excel, สถิติ |
| **SOSAlerts** | `/admin/sos-alerts` | แจ้งเตือน SOS | รายการ SOS ทั้งหมด, Filter status/source, Acknowledge/Resolve/Cancel, Priority sorting |
| **Hotels** | `/admin/hotels` | โรงแรม | รายชื่อโรงแรม Grid/List, Search + status filter, อนุมัติ/ปฏิเสธ, Reset password, เพิ่มโรงแรมใหม่ |
| **HotelDetail** | `/admin/hotels/:id` | โรงแรม | ข้อมูลโรงแรม, เครดิต, สถานะ, Invoice history, Revenue stats |
| **HotelBilling** | `/admin/hotels/:id/billing` | โรงแรม | รายการบิล + filter, สร้างบิล, ส่งอีเมล, Download PDF/CSV/Excel, สถานะการชำระ |
| **HotelPayments** | `/admin/hotels/:id/payments` | โรงแรม | บันทึกการชำระ, Filter status/method, Export, เชื่อมกับ Invoice |
| **HotelBookings** | `/admin/hotels/:id/bookings` | โรงแรม | การจองของโรงแรม, Search, Filter status/date, แก้ไข/ดูรายละเอียด |
| **CreditCalendar** | `/admin/credit-calendar` | ปฏิทินเครดิต | ปฏิทินรายเดือน, Badge โรงแรมครบกำหนด, Day detail modal, Stats summary, สี urgency |
| **Bookings** | `/admin/bookings` | การจอง | การจองทั้งหมด, Search, Filter status/date/category/type, ดูรายละเอียด, ยกเลิก, อัปเดตสถานะ |
| **Promotions** | `/admin/promotions` | โปรโมชั่น | สร้าง/แก้ไข promotions, Filter type/status, ตั้งกฎส่วนลด, Preview, สร้าง coupon codes |
| **Reports** | `/admin/reports` | รายงาน | Multi-section (Overview/Sales/Hotels/Staff/Services), Period selector, Data visualization, Export |
| **Reviews** | `/admin/reviews` | รีวิว | รายการรีวิว + ratings, Search, Filter visibility, Toggle visibility, Sort |
| **Settings** | `/admin/settings` | ตั้งค่า | 5 tabs: ทั่วไป (company info/logo), การชำระเงิน (Omise/Google Calendar), นโยบายยกเลิก, เงื่อนไขคืนเงิน, รายงาน/เป้าหมาย |
| **Login** | `/admin/login` | Auth | Email/password login, Session persistence |

### 2.2 Components (30+ ชิ้น)

| หมวด | Components | Functions |
|------|-----------|-----------|
| **Booking** | BookingDetailModal, BookingEditModal, BookingCancellationModal | ดู/แก้ไข/ยกเลิก booking พร้อม refund |
| **Hotel** | HotelForm, InvoiceForm, InvoiceDetailModal, PaymentForm, CouponCodesModal | CRUD โรงแรม, สร้าง Invoice, บันทึกการชำระ |
| **Staff** | AddStaffModal, EditStaffModal, DocumentViewerModal, UploadDocumentModal, EditBankModal, StatusManagementModal, InviteLinkModal | จัดการ Staff ครบ lifecycle |
| **Payout** | CreatePayoutModal, ProcessPayoutModal, PayoutDetailModal, PayoutCalculationModal | สร้าง/ดำเนินการ/ดู/คำนวณ payout |
| **Customer** | CustomerDetailModal, CustomerEditModal, CustomerStats | ดู/แก้ไข/สถิติลูกค้า |
| **UI** | SearchInput, ImageUpload, LogoUpload, GoogleMapsPicker, ThaiAddressFields, SOSWidget, JobEscalationWidget | Reusable UI components |

### 2.3 Hooks (17 hooks)

| หมวด | Hooks | Functions |
|------|-------|-----------|
| **Auth** | useAdminAuth | Login/logout, session, profile caching |
| **Booking** | useBookings, useBookingNotifications | Fetch + filter bookings, real-time notifications |
| **Staff** | useStaff, useStaffDetail, useStaffDocuments, useStaffEarnings, useStaffJobs, useStaffPerformance, useStaffReviews | ข้อมูล Staff ทุกด้าน |
| **Hotel** | useHotels | Hotels + invoices + payments + bookings + revenue |
| **Customer** | useCustomers | Customers + booking history + addresses + stats |
| **Alerts** | useSOS, useSOSNotifications, useJobEscalation | SOS + job escalation real-time |
| **Analytics** | useAdminReviews, useAnalytics, useDashboard | Reviews, analytics, dashboard data |

---

## 3. Customer App

**Port:** 3008 | **Path:** `apps/customer/` | **Role:** CUSTOMER

### 3.1 Pages (20 หน้า)

| หน้า | Route | Module | Functions |
|------|-------|--------|-----------|
| **Home** | `/` | หน้าแรก | Hero + search, Promotions carousel, Service categories, Popular services, Customer reviews, Why choose us, CTA |
| **ServiceCatalog** | `/services` | บริการ | รายการบริการ + filter (category/sort/search), ราคา minimum + duration |
| **ServiceDetails** | `/services/:slug` | บริการ | ข้อมูลบริการ, ราคาหลาย duration, Add-ons, Reviews, จองบริการ |
| **BookingWizard** | `/booking` | การจอง | 6 ขั้นตอน: Customer type (Single/Couple) → Date/Time → Duration/Add-ons → Address → Payment → Confirmation, Voucher code, Google Maps |
| **BookingHistory** | `/bookings` | การจอง | รายการจอง + status filter, Service name/date/price/status |
| **BookingDetails** | `/bookings/:id` | การจอง | รายละเอียดจอง, Cancel/Reschedule/Review modals, Receipt/Credit note download |
| **Profile** | `/profile` | โปรไฟล์ | 4 tabs: ข้อมูลส่วนตัว, ที่อยู่ (CRUD + default), วิธีชำระเงิน (saved cards), ข้อมูลภาษี |
| **PaymentConfirmation** | `/payment/confirmation` | ชำระเงิน | Success checkmark, Receipt download, Send email, Action buttons |
| **TransactionHistory** | `/transactions` | ธุรกรรม | ประวัติการชำระ + filter (status), Receipt download, Payment method icons |
| **Notifications** | `/notifications` | แจ้งเตือน | Real-time notifications, Mark as read, Unread badge, Multiple event types |
| **Promotions** | `/promotions` | โปรโมชั่น | Active promotions + search/filter/sort, Detail modal, Copy promo code |
| **OTPVerification** | `/verify-otp` | Auth | 6-digit OTP input, Countdown timer, Resend |
| **Login** | `/login` | Auth | Email/password, Google/Facebook OAuth, Remember me, Forgot password |
| **Register** | `/register` | Auth | Name/email/phone/password, Terms checkbox, Refund policy consent |
| **ResetPassword** | `/auth/reset-password` | Auth | New password + confirm, Validation |
| **AuthCallback** | `/auth/callback` | Auth | OAuth callback handler (Google/Facebook) |
| **Terms** | `/terms` | Legal | Terms of service |
| **Privacy** | `/privacy` | Legal | Privacy policy |
| **ColorPalette** | `/design-system` | Dev | Design system reference |

### 3.2 Components (23 ชิ้น)

| หมวด | Components | Functions |
|------|-----------|-----------|
| **Navigation** | Header | Nav bar, User menu, Notification bell, SOS button, Mobile hamburger |
| **Booking** | CancelBookingModal, RescheduleModal, ReviewModal, CoupleServiceConfig, CustomerTypeSelector, ServiceDurationPicker, VoucherCodeInput | ยกเลิก/เลื่อน/รีวิว/จอง couple/เลือก duration/ใส่ promo |
| **Payment** | PaymentForm, CreditCardForm, PaymentMethodModal | ชำระ Omise, เพิ่มบัตร |
| **Address** | AddressFormModal, GoogleMapsPicker, ThaiAddressFields | เพิ่ม/แก้ที่อยู่, แผนที่, ที่อยู่ไทย |
| **UI** | DiscountPrice, EmptyState, ErrorMessage, LoadingSpinner, ConfirmDialog | แสดงส่วนลด, สถานะว่าง/error/loading/ยืนยัน |
| **Promotion** | PromotionDetailModal, RefundPolicyConsent, SOSButton | รายละเอียด promo, ยอมรับเงื่อนไข, ปุ่ม SOS |

### 3.3 Utilities (6 ไฟล์)

| Utility | Functions |
|---------|-----------|
| discountUtils.ts | `isGlobalDiscountEnabled()`, `calculateDiscountedPrice()` |
| serviceUtils.ts | `getMinimumPriceInfo()` — ราคาต่ำสุดของบริการ |
| promoCodeUtils.ts | Promo code validation |
| receiptPdfGenerator.ts | `downloadReceipt()`, `downloadCreditNote()` |
| pdfLabels.ts | Thai/English labels สำหรับ PDF |
| slugUtils.ts | URL slug generation |

---

## 4. Hotel App

**Port:** 3003 | **Path:** `apps/hotel/` | **Role:** HOTEL

### 4.1 Pages (8 หน้า)

| หน้า | Route | Module | Functions |
|------|-------|--------|-----------|
| **Dashboard** | `/hotel/:slug` | ภาพรวม | Stats (bookings/revenue/guests/pending), Credit Widget (30 วัน + urgency color), Guest Activity Snapshot (repeat guests/ratings/satisfaction), Booking patterns, Service preferences, Recent bookings |
| **Services** | `/hotel/:slug/services` | บริการ | Browse บริการ + filter, ราคาหลังส่วนลดโรงแรม, จองบริการ (BookingModalNew) |
| **BookingHistory** | `/hotel/:slug/history` | ประวัติการจอง | รายการจอง + status filter + search, Cancel/Reschedule modals, Extension modal, Provider preference |
| **MonthlyBill** | `/hotel/:slug/bill` | บิลรายเดือน | Revenue data by month, Bookings/Revenue/Discounts/Fees, Payment history, Export invoice |
| **HotelProfile** | `/hotel/:slug/profile` | ข้อมูลโรงแรม | แก้ไข contact/email/phone/website, Tax/banking info, Map display |
| **HotelNotifications** | `/hotel/:slug/notifications` | แจ้งเตือน | In-app notifications, Real-time subscription, Mark as read |
| **HotelSettings** | `/hotel/:slug/settings` | ตั้งค่า | Email/SMS notifications, Auto-confirm, Guest info requirements, Default duration |
| **Login** | `/login` | Auth | Email/password login |

### 4.2 Components (14 ชิ้น)

| หมวด | Components | Functions |
|------|-----------|-----------|
| **Booking** | BookingCard, BookingModal, BookingModalNew, CoupleFormatSelector, ServiceSelector, ServiceModeSelector, ProviderPreferenceSelector, PricingSummary | สร้าง/ดู booking, เลือกบริการ/format/provider, สรุปราคา |
| **Session** | ExtendSessionButton, ExtendSessionModal, ExtensionAlertBanner | ขยายเวลาบริการ |
| **Cancel/Reschedule** | HotelCancelBookingModal, HotelRescheduleModal | ยกเลิก/เลื่อน booking |
| **Map** | HotelMapDisplay | แสดงแผนที่โรงแรม |
| **Navigation** | DynamicHotelRedirect | Redirect ตาม hotel slug |
| **Analytics** | GuestActivitySnapshot | สถิติแขก |

### 4.3 Hooks (5 hooks)

| Hook | Functions |
|------|-----------|
| useHotelContext | Hotel data, commission rate, billing settings |
| useBookingStore | Zustand state: booking flow, pricing, couple config |
| useBillingSettings | Billing preferences, overdue alerts |
| useExtendSession | Extend session duration/pricing |
| useUserHotelId | Hotel-to-user mapping |

---

## 5. Staff App

**Port:** 3004 | **Path:** `apps/staff/` | **Role:** STAFF | **Auth:** LINE LIFF

### 5.1 Pages (8 หน้า)

| หน้า | Route | Module | Functions |
|------|-------|--------|-----------|
| **StaffDashboard** | `/staff/jobs` | หน้าแรก/งาน | Pending jobs, In-progress job + timer, Accept/Start/Complete, Extension acceptance, Sound notifications, Background music, Staff stats, Eligibility check |
| **StaffJobDetail** | `/staff/jobs/:id` | งาน | Customer info/address/room, Service list + durations, Real-time timer (ServiceTimer), SOS button, Job actions, Mid-service cancellation, Extension info |
| **StaffSchedule** | `/staff/schedule` | ตารางงาน | Calendar view (day/week/month), Status filter, Thai date labels, Navigate periods |
| **StaffHistory** | `/staff/history` | ประวัติงาน | Completed/Cancelled jobs + filter, Group by date, Earnings summary, Monthly totals |
| **StaffEarnings** | `/staff/earnings` | รายได้ | Period selector (day/week/month), Earnings summary + trends, Daily/Service charts, Payout history + status (งวดแรก/งวดหลัง label, payout jobs detail, carry forward info), Bank account link, Real-time payout updates — **อัปเดต 2026-04-03** |
| **StaffProfile** | `/staff/profile` | โปรไฟล์ | Personal details + photo, Bank accounts (CRUD), Skills selection, Document upload, Service areas, Availability, Emergency contact, Qualifications |
| **StaffSettings** | `/staff/settings` | ตั้งค่า | Sound/Push notifications toggle, Job reminders (60/120 min), Logout |
| **Login** | `/staff/login` | Auth | LINE LIFF login, Email/password fallback |

### 5.2 Components (8 ชิ้น)

| Component | Functions |
|-----------|-----------|
| ExtensionAcceptanceCard | ยืนยัน/ปฏิเสธ extension request |
| ExtensionAlertBanner | แจ้ง extension ใหม่ |
| ExtensionInfo | แสดงรายละเอียด extension |
| JobCancellationModal | ยกเลิกงาน (ก่อนรับงาน) |
| MidServiceCancellationModal | ยกเลิกงาน (ระหว่างให้บริการ) |
| NotificationPanel | แสดง notifications |
| SOSButton | ปุ่มฉุกเฉิน SOS |
| ServiceTimer | Countdown timer + color coding |

### 5.3 Hooks (2 hooks)

| Hook | Functions |
|------|-----------|
| useExtendSessionNotifications | Real-time extension notifications via Supabase |
| usePendingExtensionAcknowledgments | Track pending extension confirmations |

---

## 6. Server App (API)

**Port:** 3000 | **Path:** `apps/server/` | **Framework:** Express.js

### 6.1 API Routes (7 route files, 40+ endpoints)

#### Payment Routes (`/api/payments`)
| Method | Endpoint | Function |
|--------|----------|----------|
| POST | `/create-charge` | สร้าง charge ผ่าน Omise (card token / saved card) |
| POST | `/save-card` | บันทึกบัตรเครดิต |
| GET | `/cards` | ดึงบัตรที่บันทึกไว้ |

#### OTP Routes (`/api/otp`)
| Method | Endpoint | Function |
|--------|----------|----------|
| POST | `/send` | ส่ง OTP 6 หลัก (SMS), 5 นาที expiry |
| POST | `/verify` | ตรวจ OTP, max 3 attempts |

#### Hotel Auth Routes (`/api/hotels`)
| Method | Endpoint | Function |
|--------|----------|----------|
| POST | `/create-account` | สร้างบัญชี hotel (Admin only) |
| POST | `/send-invitation` | ส่ง invitation email |
| POST | `/reset-password` | Reset password |

#### Secure Bookings Routes (`/api/secure-bookings`)
| Method | Endpoint | Function |
|--------|----------|----------|
| POST | `/create` | สร้าง booking + assign staff + create jobs |
| POST | `/confirm` | ยืนยัน booking + trigger notifications |

#### Notification Routes (`/api/notifications`)
| Method | Endpoint | Function |
|--------|----------|----------|
| POST | `/booking-confirmed` | สร้าง jobs + ส่ง LINE/in-app notification |
| POST | `/job-cancelled` | ยกเลิก job + สร้าง replacement + re-notify |
| POST | `/booking-cancelled` | ยกเลิก booking + ทุก jobs |
| POST | `/job-accepted` | แจ้ง hotel เมื่อ staff รับงาน |
| POST | `/job-completed` | แจ้ง hotel + trigger payout |
| POST | `/reminder-settings` | ดึง/อัปเดต reminder settings |

#### Booking Routes (`/api/bookings`)
| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/` | รายการ bookings ล่าสุด |
| GET | `/:id/refund-preview` | คำนวณ refund ตาม policy |
| POST | `/:id/cancel` | ยกเลิก + refund |
| POST | `/:id/reschedule` | เลื่อน + คำนวณ fee |

#### Cancellation Policy Routes (`/api/cancellation-policy`)
| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/` | ดึง policy ปัจจุบัน |
| GET | `/check/:bookingId` | เช็คสิทธิ์ยกเลิก/เลื่อน |
| GET | `/refund-preview/:bookingId` | Preview refund |

#### Receipt/Invoice Routes
| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/api/receipts/:id` | ดึงข้อมูล receipt |
| POST | `/api/receipts/:id/send-email` | ส่ง receipt email |
| POST | `/api/invoices/:id/send-email` | ส่ง invoice email + PDF |

### 6.2 Services (11 service files)

| Service | Functions |
|---------|-----------|
| **emailService** | `sendEmail()`, templates: receipt, credit note, invoice, credit due reminder |
| **notificationService** | `createJobsFromBooking()`, `processBookingConfirmed()`, `processJobCancelled()`, `processBookingCancelled()`, `processJobReminders()`, `processCustomerEmailReminders()`, `processJobEscalations()`, `processCreditDueReminders()`, `cleanupOldReminders()` |
| **lineService** | `pushMessage()`, `multicastMessage()`, `sendJobNotification()`, `sendCoupleJobNotification()`, `sendJobCancelledNotification()`, `sendExtensionNotification()` |
| **omiseService** | `createCharge()`, `createCustomer()`, `refund()`, `deleteCard()`, `captureCharge()` |
| **refundService** | `calculateRefund()`, `processRefund()`, `isRefundEligible()`, `createCreditNote()` |
| **cancellationPolicyService** | `getCancellationPolicy()`, `checkCancellationEligibility()`, `calculateDynamicRefund()`, `updateCancellationPolicy()` |
| **staffAssignmentService** | `getAvailableStaff()`, `assignStaffToJob()`, `checkTimeConflict()`, `filterStaffByPreference()` |
| **payoutService** | `processPayoutCutoff()`, `calculateStaffEarnings()`, `createPayoutRecord()`, `handleCarryForward()`, `notifyUpcomingCutoff()`, `notifyUpcomingPayout()` — Cron ทุกวัน 08:00 ICT ตัดรอบจ่ายเงิน Staff อัตโนมัติ — **เพิ่ม 2026-04-03** |
| **otpService** | `generateOTP()`, `storeOTP()`, `verifyOTP()`, `canResendOTP()` |
| **smsService** | `sendOTP()`, `sendNotification()` (Twilio) |
| **googleCalendarService** | `createCreditDueEvent()`, `isConfigured()` |
| **hotelAuthService** | `createHotelAccount()`, `sendHotelInvitation()`, `generateResetToken()` |

### 6.3 Cron Jobs (5 jobs)

| Schedule | ICT Time | Function |
|----------|----------|----------|
| `* * * * *` | ทุกนาที | `processJobReminders()` — ส่ง LINE reminder 1 ชม. ก่อนงาน |
| `*/5 * * * *` | ทุก 5 นาที | `processCustomerEmailReminders()` — ส่ง email reminder ลูกค้า |
| `*/5 * * * *` | ทุก 5 นาที | `processJobEscalations()` — Escalate งานที่ยังไม่มี staff รับ |
| `0 20 * * *` | 03:00 ICT | `cleanupOldReminders()` — ลบ reminder records เก่า |
| `0 2 * * *` | 09:00 ICT | `processCreditDueReminders()` — แจ้งเตือนเครดิตโรงแรมครบกำหนด |

---

## 7. Shared Packages

### 7.1 packages/supabase — Supabase Integration

#### Auth Module (7 files)
| File | Exports |
|------|---------|
| AuthProvider.tsx | React context provider สำหรับ auth state |
| authService.ts | `login()`, `register()`, `logout()`, `getCurrentProfile()`, `signInWithLINE()`, `signInWithGoogle()`, `signInWithFacebook()` |
| hooks.ts | `useAuth()`, `useAuthStandalone()`, `useLogin()`, `useRegister()`, `useLogout()` |
| supabaseClient.ts | Singleton Supabase client instance |
| sessionManager.ts | "Remember Me" session persistence |
| liffService.ts | LINE LIFF integration (init, profile) |
| types.ts | `UserRole`, `UserStatus`, `Profile`, `AuthState`, `LoginCredentials`, `RegisterCredentials` |

#### Services Module (13 files)
| Service | Key Functions |
|---------|--------------|
| customerService | `getCurrentCustomer()`, customer stats, auto-create |
| bookingService | `getCustomerBookings()`, booking details, related jobs |
| addressService | Address CRUD, default address management |
| serviceService | `getServices()`, `getServicesByCategory()`, addons |
| promotionService | `getActivePromotions()`, `validatePromoCode()` |
| notificationService | `getNotifications()`, `markAsRead()`, `deleteNotification()` |
| paymentMethodService | Payment methods CRUD, default payment |
| reviewService | `getReviewByBookingId()`, `createReview()` |
| sosService | `createSOSAlert()`, location tracking |
| taxInformationService | Tax info CRUD |
| thaiGeographyService | `getProvinces()`, `getDistricts()`, `getSubdistricts()` |
| transactionService | `getCustomerTransactions()`, summaries |

#### Hooks Module (12 files)
| Hook | Data |
|------|------|
| useAddresses | Customer addresses CRUD |
| useBookings | Customer bookings |
| useCustomer | Current customer profile |
| usePaymentMethods | Saved payment methods |
| useServices | Service catalog |
| useSOSAlerts | SOS alert operations |
| useSupabaseQuery | TanStack Query wrappers |
| useTaxInformation | Tax data |
| useTransactions | Transaction history |
| useThaiGeography | Thai province/district lookups |
| usePromotions | Active promotions + validation |
| useReviews, useNotifications | Reviews, notifications |

#### Earnings Module (3 files)
| File | Key Functions |
|------|--------------|
| earningsService | `getEarningsSummary()`, `getDailyEarnings()`, `getServiceEarnings()`, `getPayoutHistory()`, Bank account CRUD, `subscribeToPayouts()`, **`getPayoutSchedule()`**, **`updatePayoutSchedule()`**, **`getNextPayoutInfo()`**, **`getPayoutSettings()`** — เพิ่ม 2026-04-03 |
| useEarnings | React hooks: `useEarningsSummary()`, `useDailyEarnings()`, `usePayoutHistory()`, `useBankAccounts()` |
| types | `Payout`, `BankAccount`, `EarningsSummary`, `PayoutStatus`, `THAI_BANKS` (13 ธนาคาร), **`PayoutSchedule`**, **`PayoutRound`**, **`PayoutSettings`**, **`NextPayoutInfo`** — เพิ่ม 2026-04-03 |

#### Jobs Module (3 files)
| File | Key Functions |
|------|--------------|
| jobService | `getStaffJobs()`, job filtering, accept/complete, payment status |
| useJobs | React hook สำหรับ staff job list |
| types | `Job`, `JobStatus`, `JobPaymentStatus`, `CancellationReason` |

#### Staff Module (3 files)
| File | Key Functions |
|------|--------------|
| staffService | Profile updates, documents CRUD, skills, service areas |
| useStaffProfile | React hook สำหรับ staff profile |
| types | `StaffDocument`, `ServiceArea`, `StaffSkill`, `StaffEligibility`, `DocumentType`, `ProviderPreference` |

#### Notifications Module (4 files)
| File | Key Functions |
|------|--------------|
| staffNotificationService | `getStaffNotifications()`, realtime subscriptions |
| useStaffNotifications | Hook with enable/disable toggle |
| lineMessagingService | LINE Messaging API (flex messages) |
| lineNotifyService | LINE Notify API (legacy) |

#### Payment Module (2 files)
| File | Key Functions |
|------|--------------|
| omiseService | `tokenizeCard()`, `createCharge()`, `processRefund()` |
| types | `CardDetails`, `OmiseToken`, `PaymentRequest`, `Transaction`, `Receipt` |

### 7.2 packages/ui — UI Component Library

| หมวด | Components |
|------|-----------|
| **Form** | Button, Input, TextArea, Select, Checkbox, RadioGroup, DatePicker |
| **Display** | Card, Badge, StatusBadge, Avatar, Table, Pagination, Tabs |
| **Feedback** | Modal, Loader, EmptyState |
| **Auth** | LoginForm, AuthLayout, PasswordResetForm, ProtectedRoute |
| **Layout** | Header, Sidebar, Footer, Container |
| **Utility** | `cn()` — Tailwind CSS class merging |

### 7.3 packages/types — Shared Types

| File | Types |
|------|-------|
| cancellation.ts | `RefundStatus`, `RefundTransaction`, `CancellationNotification`, `BookingCancellationRequest`, `BookingCancellationResponse` |

### 7.4 packages/i18n — Internationalization

| ภาษา | รหัส |
|------|-----|
| ไทย | `th` (Primary) |
| อังกฤษ | `en` |
| จีน | `cn` |

| Namespace | เนื้อหา |
|-----------|---------|
| common | Nav, footer, buttons, status, loading, errors |
| auth | Login, register, forgot password, logout |
| booking | Wizard 6 steps, payment, confirmation |
| services | Catalog, details, reviews, categories |
| home | Hero, features, testimonials, FAQ |
| profile | Account, addresses, payment methods, preferences |

---

## 8. สรุปสถิติ

### จำนวนไฟล์แยกตาม App

| App | Pages | Components | Hooks | Routes |
|-----|-------|-----------|-------|--------|
| **Admin** | 19 | 30+ | 17 | 19 |
| **Customer** | 20 | 23 | 0 (ใช้ shared) | 18 |
| **Hotel** | 8 | 14 | 5 | 10 |
| **Staff** | 8 | 8 | 2 | 10 |
| **Server** | — | — | — | 40+ endpoints |
| **รวม** | **55** | **75+** | **24** | **97+** |

### Shared Packages

| Package | Files | Key Exports |
|---------|-------|------------|
| supabase | 47 | Auth, Services, Hooks, Earnings, Jobs, Staff, Notifications, Payment |
| ui | 21 | Form, Display, Feedback, Auth, Layout components |
| types | 2 | Cancellation/Refund types |
| i18n | 21 | 3 ภาษา × 6 namespaces + config |
| **รวม** | **91** | — |

### Database

| รายการ | จำนวน |
|--------|-------|
| Migration files | 219 |
| Key tables | bookings, staff, customers, services, profiles, hotels, reviews, notifications, payments, earnings, payouts, bank_accounts, promotions, sos_alerts, monthly_bills, hotel_credit_notifications, payout_notifications |
| Auth | Supabase Auth + LINE LIFF + Google/Facebook OAuth |
| Storage | Supabase Storage (documents, photos, logos) |
| Realtime | bookings, notifications, payouts, jobs |

### External Integrations

| Service | ใช้ทำอะไร |
|---------|----------|
| Omise | Credit card payment, PromptPay, Refund |
| LINE Messaging API | Push notifications to staff (flex messages) |
| LINE LIFF | Staff app authentication |
| Google Maps API | Address picker, hotel map display |
| Google Calendar API | Credit due reminders |
| Resend | Email (receipts, invoices, reminders, invitations) |
| Twilio | SMS OTP verification |
| Google/Facebook OAuth | Customer social login |

### Cron Jobs

| จำนวน | รายละเอียด |
|-------|-----------|
| 5 jobs | Staff reminders (1 min), Customer email (5 min), Job escalation (5 min), Cleanup (daily), Credit reminders (daily) |
