# The Bliss Massage at Home - Implementation Tasks
## งานย่อยสำหรับการพัฒนาแบบ Incremental (1-2 ชั่วโมงต่องาน)

**เวอร์ชัน:** 1.0.0
**อัพเดตล่าสุด:** 14 มกราคม 2026
**ปรัชญา:** Deploy incremental updates ไม่ใช่ Big-bang release

---

## หลักการ (Priorities)

1. **First Priority:** รักษา UI/UX ที่ผู้ใช้เคยชิน (Don't break existing UX)
2. **Second Priority:** Backend infrastructure & Data persistence (Database first)
3. **Third Priority:** Authentication & Security features
4. **Task Size:** แต่ละงานต้องทำได้ใน 1-2 ชั่วโมง

---

## สารบัญ

- [Phase 1: Backend Infrastructure & Data Persistence](#phase-1-backend-infrastructure--data-persistence)
- [Phase 2: Authentication & Security](#phase-2-authentication--security)
- [Phase 3: Integration Layer](#phase-3-integration-layer)
- [Phase 4: Real-time & Notifications](#phase-4-real-time--notifications)
- [Phase 5: External Integrations](#phase-5-external-integrations)

---

## Phase 1: Backend Infrastructure & Data Persistence

### Sprint 1.1: Supabase Project Setup (Deploy: Week 1)

#### Backend Tasks

- [ ] **[1.5h] TASK-001:** Create Supabase organization and project
  - ลงทะเบียน Supabase (ใช้อีเมลองค์กร)
  - สร้าง project ใหม่: `the-bliss-at-home-dev`
  - บันทึก project URL และ keys
  - **Deploy:** สร้าง dev environment พร้อมใช้

- [ ] **[1h] TASK-002:** Set up local Supabase with Docker
  - Install Supabase CLI: `brew install supabase/tap/supabase`
  - Run `supabase init` ใน project root
  - Start local: `supabase start`
  - Verify: เข้า http://localhost:54323
  - **Deploy:** Local dev environment พร้อม

- [ ] **[2h] TASK-003:** Create base database schema (Users only)
  - เขียน migration: `supabase/migrations/001_create_profiles.sql`
  - สร้าง table `profiles` (extend auth.users)
  - เพิ่ม columns: id, role, full_name, phone, avatar_url, status
  - Run `supabase db reset` เพื่อทดสอบ
  - **Deploy:** Users table พร้อมใช้

- [ ] **[1.5h] TASK-004:** Implement Row Level Security (RLS) basics
  - เปิด RLS บน profiles table
  - เขียน policy: "Users can view their own profile"
  - เขียน policy: "Users can update their own profile"
  - Test ด้วยสอง user ต่างกัน
  - **Deploy:** Data security พื้นฐาน

#### Frontend Tasks (Maintain Existing UI)

- [ ] **[1h] TASK-005:** Initialize Monorepo structure
  - Create folder: `apps/admin`, `apps/customer`, `apps/hotel`, `apps/provider`
  - Create folder: `packages/supabase`, `packages/ui`, `packages/types`
  - Create `pnpm-workspace.yaml`
  - Create `turbo.json` สำหรับ build pipeline
  - **Deploy:** Project structure พร้อม

- [ ] **[1.5h] TASK-006:** Set up shared Supabase client package
  - Create `packages/supabase/package.json`
  - Install: `@supabase/supabase-js`
  - Create `client.ts` (factory function)
  - Create `types.ts` (Database types)
  - Export: `createSupabaseClient`, `createSupabaseAdminClient`
  - **Deploy:** Shared Supabase client พร้อมใช้

- [ ] **[1h] TASK-007:** Create environment configuration
  - Create `.env.example` สำหรับแต่ละ app
  - Define: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Create `.env.local` สำหรับ local development
  - Add to `.gitignore`
  - **Deploy:** Environment variables พร้อม

---

### Sprint 1.2: Core Data Models (Deploy: Week 2)

#### Backend Tasks

- [ ] **[2h] TASK-008:** Create Services table and migration
  - Migration: `002_create_services.sql`
  - Table: services (id, name JSONB, category, base_price, duration, images, is_active)
  - Add indexes: category, is_active
  - Seed: 5-10 services สำหรับทดสอบ
  - **Deploy:** Services data พร้อม

- [ ] **[1.5h] TASK-009:** Create Bookings table and migration
  - Migration: `003_create_bookings.sql`
  - Table: bookings (id, booking_code, customer_id, service_id, scheduled_date, status, etc.)
  - Add indexes: status, scheduled_date, customer_id
  - Enable Realtime บน bookings table
  - **Deploy:** Bookings data พร้อม

- [ ] **[1.5h] TASK-010:** Implement booking RLS policies
  - Policy: "Customers view own bookings"
  - Policy: "Providers view assigned bookings"
  - Policy: "Admins view all bookings"
  - Test กับ 3 roles ต่างกัน
  - **Deploy:** Booking security พร้อม

- [ ] **[2h] TASK-011:** Create Payments table and migration
  - Migration: `004_create_payments.sql`
  - Table: payments (id, booking_id, amount, status, omise_charge_id, etc.)
  - Add indexes: booking_id, status
  - Foreign key: bookings.id
  - **Deploy:** Payments data พร้อม

#### Frontend Tasks

- [ ] **[1.5h] TASK-012:** Create Supabase query hooks (shared)
  - File: `packages/supabase/src/hooks/useSupabaseQuery.ts`
  - Hook: `useSupabaseQuery` (wrap TanStack Query)
  - Hook: `useSupabaseMutation` (wrap mutations)
  - Include: error handling, loading states
  - **Deploy:** Shared hooks พร้อมใช้

- [ ] **[1h] TASK-013:** Generate TypeScript types from Supabase
  - Run: `supabase gen types typescript --local > types.ts`
  - Format: จัดระเบเบียบ types
  - Export: `Database` type
  - Update `packages/supabase/src/types.ts`
  - **Deploy:** Type-safe queries พร้อม

---

### Sprint 1.3: Additional Data Models (Deploy: Week 3)

#### Backend Tasks

- [ ] **[2h] TASK-014:** Create Providers table and migration
  - Migration: `005_create_providers.sql`
  - Table: providers (id, user_id, line_user_id, skills, rating, status, etc.)
  - Add indexes: status, rating, line_user_id
  - Enable RLS สำหรับ providers
  - **Deploy:** Providers data พร้อม

- [ ] **[1.5h] TASK-015:** Create Hotels table and migration
  - Migration: `006_create_hotels.sql`
  - Table: hotels (id, user_id, hotel_name, address, billing_cycle, tax_id, etc.)
  - Add indexes: hotel_name, billing_cycle
  - Enable RLS สำหรับ hotels
  - **Deploy:** Hotels data พร้อม

- [ ] **[1h] TASK-016:** Create Reviews table and migration
  - Migration: `007_create_reviews.sql`
  - Table: reviews (id, booking_id, ratings, comment, provider_response)
  - Add indexes: booking_id, ratings
  - Foreign key: bookings.id
  - **Deploy:** Reviews data พร้อม

- [ ] **[1.5h] TASK-017:** Create Promotions table and migration
  - Migration: `008_create_promotions.sql`
  - Table: promotions (id, code, discount_type, value, valid_from, valid_until)
  - Add indexes: code, is_active, valid_until
  - Add unique constraint: code
  - **Deploy:** Promotions data พร้อม

#### Frontend Tasks

- [ ] **[1h] TASK-018:** Create service data access layer
  - File: `packages/supabase/src/queries/services.ts`
  - Function: `getServices()` (list all active)
  - Function: `getServiceById(id)` (single service)
  - Function: `getServicesByCategory(category)` (filter)
  - Export ทั้งหมด
  - **Deploy:** Service queries พร้อม

- [ ] **[1h] TASK-019:** Create booking data access layer
  - File: `packages/supabase/src/queries/bookings.ts`
  - Function: `createBooking(data)`
  - Function: `getBookings(userId, role)`
  - Function: `getBookingById(id)`
  - Function: `updateBookingStatus(id, status)`
  - **Deploy:** Booking queries พร้อม

---

### Sprint 1.4: Storage & Files (Deploy: Week 4)

#### Backend Tasks

- [ ] **[1.5h] TASK-020:** Set up Supabase Storage buckets
  - Create bucket: `avatars` (public)
  - Create bucket: `documents` (authenticated)
  - Create bucket: `receipts` (authenticated)
  - Set up RLS policies สำหรับแต่ละ bucket
  - **Deploy:** Storage พร้อมใช้

- [ ] **[2h] TASK-021:** Implement file upload helper functions
  - Function: `uploadAvatar(userId, file)`
  - Function: `uploadDocument(providerId, type, file)`
  - Function: `uploadReceipt(bookingId, file)`
  - Include: error handling, file validation
  - **Deploy:** Upload functions พร้อม

- [ ] **[1h] TASK-022:** Create database functions (PostgreSQL)
  - Function: `generate_booking_code()` (BK + timestamp)
  - Function: `calculate_booking_total()` (base + addons - discount + tax)
  - Function: `check_provider_availability()` (no double booking)
  - Test แต่ละ function
  - **Deploy:** DB functions พร้อม

#### Frontend Tasks

- [ ] **[1.5h] TASK-023:** Create file upload component
  - Component: `FileUpload` (shared UI)
  - Features: Drag & drop, preview, progress
  - Props: `onUpload`, `accept`, `maxSize`
  - Integrate กับ Supabase Storage
  - **Deploy:** Upload UI พร้อม

- [ ] **[1h] TASK-024:** Create image gallery component
  - Component: `ImageGallery` (shared UI)
  - Features: Grid view, lightbox, delete
  - Props: `images`, `editable`, `onDelete`
  - Use สำหรับ service images, provider photos
  - **Deploy:** Gallery UI พร้อม

---

## Phase 2: Authentication & Security

### Sprint 2.1: Supabase Auth Setup (Deploy: Week 5)

#### Backend Tasks

- [ ] **[1h] TASK-025:** Configure Supabase Auth providers
  - Enable: Email/Password auth
  - Enable: Phone auth (OTP)
  - Enable: Google OAuth
  - Enable: Facebook OAuth
  - Test แต่ละ provider
  - **Deploy:** Auth providers พร้อม

- [ ] **[1.5h] TASK-026:** Create Auth Edge Function
  - Function: `on-user-created` (trigger after signup)
  - Logic: Create row in profiles table
  - Logic: Set default role based on signup source
  - Test: สมัครใหม่ → profile ถูกสร้าง
  - **Deploy:** Auth trigger พร้อม

- [ ] **[1h] TASK-027:** Implement password policies
  - Policy: Min 8 characters
  - Policy: Must include uppercase, lowercase, number
  - Configure ใน Supabase Auth settings
  - Test: ลองสมัครด้วย password อ่อน
  - **Deploy:** Password policies พร้อม

#### Frontend Tasks

- [ ] **[1.5h] TASK-028:** Create auth context (shared)
  - File: `packages/supabase/src/contexts/AuthContext.tsx`
  - State: user, session, loading
  - Functions: signIn, signUp, signOut, updateProfile
  - Provider: AuthProvider
  - **Deploy:** Auth context พร้อม

- [ ] **[1h] TASK-029:** Create auth hooks
  - Hook: `useAuth()` (get auth context)
  - Hook: `useUser()` (get current user)
  - Hook: `useRequireAuth()` (redirect if not auth)
  - Export จาก `packages/supabase`
  - **Deploy:** Auth hooks พร้อม

---

### Sprint 2.2: Auth UI Components (Deploy: Week 5-6)

#### Frontend Tasks

- [ ] **[2h] TASK-030:** Create Login form component
  - Component: `LoginForm` (shared UI)
  - Fields: email/phone, password
  - Features: Remember me, Forgot password link
  - Validation: Email format, required fields
  - Integrate กับ Supabase auth
  - **Deploy:** Login UI พร้อม

- [ ] **[1.5h] TASK-031:** Create Register form component
  - Component: `RegisterForm` (shared UI)
  - Fields: email, password, confirm password, name, phone
  - Features: Password strength indicator, terms checkbox
  - Validation: Password match, required fields
  - Integrate กับ Supabase auth
  - **Deploy:** Register UI พร้อม

- [ ] **[1h] TASK-032:** Create OTP input component
  - Component: `OTPInput` (shared UI)
  - Features: 6-digit input, auto-focus next
  - Props: `length`, `onComplete`, `onResend`
  - Style: กล่องแยก 6 ช่อง
  - **Deploy:** OTP UI พร้อม

- [ ] **[1h] TASK-033:** Create Forgot Password component
  - Component: `ForgotPassword` (shared UI)
  - Flow: Email → Magic link → Reset
  - UI: Email input, instructions, back to login
  - Integrate กับ Supabase magic link
  - **Deploy:** Password reset UI พร้อม

---

### Sprint 2.3: Protected Routes (Deploy: Week 6)

#### Frontend Tasks

- [ ] **[1.5h] TASK-034:** Create Protected Route component
  - Component: `ProtectedRoute` (shared)
  - Props: `children`, `allowedRoles`, `redirectTo`
  - Logic: Check auth, check role, redirect ถ้าไม่ผ่าน
  - Use กับ React Router
  - **Deploy:** Route protection พร้อม

- [ ] **[1h] TASK-035:** Create auth pages layout
  - Layout: `AuthLayout` (centered card, minimal)
  - Features: Logo, background image, responsive
  - Use สำหรับ: Login, Register, Forgot Password
  - **Deploy:** Auth layout พร้อม

- [ ] **[1h] TASK-036:** Implement auth state persistence
  - Logic: Save session to localStorage
  - Logic: Restore session on app load
  - Logic: Clear session on logout
  - Test: Refresh → user still logged in
  - **Deploy:** Session persistence พร้อม

---

### Sprint 2.4: Role-Based Access (Deploy: Week 7)

#### Backend Tasks

- [ ] **[2h] TASK-037:** Implement admin RLS bypass
  - Policy: "Admins bypass all RLS"
  - Logic: Check `role = 'ADMIN'` in profiles
  - Test: Admin สามารถเห็นทุก booking
  - Document: Admin capabilities
  - **Deploy:** Admin access พร้อม

- [ ] **[1.5h] TASK-038:** Create role-specific database views
  - View: `v_customer_bookings` (customer perspective)
  - View: `v_provider_jobs` (provider perspective)
  - View: `v_admin_overview` (admin dashboard)
  - Grant access ตาม role
  - **Deploy:** Role views พร้อม

#### Frontend Tasks

- [ ] **[1h] TASK-039:** Create role-based navigation
  - Component: `AppNavigation` (แตกต่างตาม role)
  - Admin: Dashboard, Bookings, Services, Providers, Reports
  - Customer: Home, Services, Bookings, Profile
  - Provider: Jobs, Schedule, Earnings, Profile
  - **Deploy:** Role navigation พร้อม

- [ ] **[1h] TASK-040:** Create permission check hook
  - Hook: `usePermission(permission)`
  - Logic: Check user role against required permission
  - Return: `hasPermission: boolean`
  - Use สำหรับ conditional rendering
  - **Deploy:** Permission system พร้อม

---

## Phase 3: Integration Layer

### Sprint 3.1: Node.js Server Setup (Deploy: Week 8)

#### Backend Tasks

- [ ] **[1.5h] TASK-041:** Initialize Node.js server project
  - Folder: `apps/server`
  - Init: `npm init -y`
  - Install: express, typescript, @types/express
  - Setup: tsconfig.json, ts-node-dev
  - **Deploy:** Server project พร้อม

- [ ] **[1h] TASK-042:** Create Express server base
  - File: `apps/server/src/server.ts`
  - Setup: Express app, JSON parser, CORS
  - Create: Health check endpoint `/health`
  - Add: Error handling middleware
  - **Deploy:** Server base พร้อม

- [ ] **[1.5h] TASK-043:** Connect server to Supabase
  - Install: `@supabase/supabase-js`
  - Create: Admin client (service role)
  - Test: Query profiles table
  - Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - **Deploy:** Server-Supabase connection พร้อม

- [ ] **[1h] TASK-044:** Setup Winston logging
  - Install: winston, winston-daily-rotate-file
  - Create: Logger configuration
  - Add: Request logging middleware
  - Test: Log requests to file
  - **Deploy:** Logging system พร้อม

---

### Sprint 3.2: API Endpoints (Deploy: Week 9)

#### Backend Tasks

- [ ] **[2h] TASK-045:** Create booking API endpoints
  - `POST /api/bookings/create` (create booking)
  - `GET /api/bookings/:id` (get booking details)
  - `PATCH /api/bookings/:id/status` (update status)
  - `DELETE /api/bookings/:id` (cancel booking)
  - Include: Validation, error handling
  - **Deploy:** Booking API พร้อม

- [ ] **[1.5h] TASK-046:** Create provider assignment endpoint
  - `POST /api/bookings/:id/assign-provider`
  - Logic: Find available providers, rank by distance/rating
  - Algorithm: Simple version (distance + rating)
  - Return: Assigned provider or error
  - **Deploy:** Assignment API พร้อม

- [ ] **[1h] TASK-047:** Create availability check endpoint
  - `GET /api/providers/available?service=...&datetime=...`
  - Logic: Query providers by service, check schedule
  - Return: List of available providers
  - Cache: 5 minutes (Redis if available)
  - **Deploy:** Availability API พร้อม

#### Frontend Tasks

- [ ] **[1h] TASK-048:** Create API client (shared)
  - File: `packages/supabase/src/api/client.ts`
  - Base: Axios instance with base URL
  - Interceptors: Add auth token, handle errors
  - Functions: `get`, `post`, `patch`, `delete`
  - **Deploy:** API client พร้อม

- [ ] **[1.5h] TASK-049:** Create booking integration hooks
  - Hook: `useCreateBooking()` (call server API)
  - Hook: `useAssignProvider()` (call server API)
  - Hook: `useCheckAvailability()` (call server API)
  - Include: Error handling, loading states
  - **Deploy:** Booking integration พร้อม

---

### Sprint 3.3: Background Jobs (Deploy: Week 10)

#### Backend Tasks

- [ ] **[1.5h] TASK-050:** Setup Bull Queue
  - Install: bull, ioredis
  - Create: Queue instance
  - Setup: Redis connection (หรือใช้ memory queue สำหรับ dev)
  - Test: Add and process job
  - **Deploy:** Queue system พร้อม

- [ ] **[2h] TASK-051:** Create invoice generation job
  - Job: `generate-invoice` (hotel billing)
  - Trigger: Daily at midnight
  - Logic: Query bookings, calculate totals, create invoice
  - Store: Save to invoices table
  - **Deploy:** Invoice job พร้อม

- [ ] **[1.5h] TASK-052:** Create reminder notification job
  - Job: `send-reminders` (booking reminders)
  - Trigger: Hourly
  - Logic: Find bookings in next 24h, send notifications
  - Channels: Email (SendGrid or Supabase)
  - **Deploy:** Reminder job พร้อม

---

## Phase 4: Real-time & Notifications

### Sprint 4.1: Supabase Realtime (Deploy: Week 11)

#### Backend Tasks

- [ ] **[1h] TASK-053:** Enable Realtime on critical tables
  - Enable: bookings table
  - Enable: sos_alerts table
  - Enable: notifications table
  - Configure: Row-level security สำหรับ Realtime
  - **Deploy:** Realtime enabled

- [ ] **[1.5h] TASK-054:** Create Realtime subscription helpers
  - Function: `subscribeToBooking(bookingId, callback)`
  - Function: `subscribeToSOSAlerts(callback)`
  - Function: `subscribeToNotifications(userId, callback)`
  - Include: Error handling, auto-reconnect
  - **Deploy:** Subscription helpers พร้อม

#### Frontend Tasks

- [ ] **[1.5h] TASK-055:** Create booking status tracker
  - Component: `BookingStatusTracker`
  - Features: Progress bar, status steps, estimated time
  - Realtime: Subscribe to booking changes
  - UI: แสดง status flow
  - **Deploy:** Status tracker พร้อม

- [ ] **[1h] TASK-056:** Create notification bell component
  - Component: `NotificationBell`
  - Features: Badge count, dropdown list, mark as read
  - Realtime: Subscribe to notifications
  - Animation: Shake เมื่อมี notification ใหม่
  - **Deploy:** Notification UI พร้อม

---

### Sprint 4.2: SOS Alert System (Deploy: Week 12)

#### Backend Tasks

- [ ] **[2h] TASK-057:** Create SOS alert system
  - Table: sos_alerts (already in Sprint 1)
  - Edge Function: `on_sos_created` (trigger after insert)
  - Logic: Broadcast to admins, send LINE, send email
  - Test: Trigger SOS → verify all channels
  - **Deploy:** SOS system พร้อม

- [ ] **[1.5h] TASK-058:** Create SOS broadcast endpoint
  - `POST /api/sos/broadcast`
  - Logic: Query active admins, send notifications
  - Channels: Realtime (immediate), LINE (push), Email (fallback)
  - Include: Location data, severity
  - **Deploy:** Broadcast API พร้อม

#### Frontend Tasks

- [ ] **[2h] TASK-059:** Create SOS button component
  - Component: `SOSButton`
  - Features: GPS capture, confirmation dialog, message input
  - Styling: Red, prominent, easy to tap
  - Logic: Insert to sos_alerts table
  - **Deploy:** SOS button พร้อม

- [ ] **[1.5h] TASK-060:** Create admin SOS dashboard
  - Page: Admin SOS alerts (real-time list)
  - Features: Active alerts prominent, map view, response form
  - Realtime: Subscribe to sos_alerts
  - Actions: View details, respond, mark resolved
  - **Deploy:** SOS dashboard พร้อม

---

## Phase 5: External Integrations

### Sprint 5.1: Omise Payment (Deploy: Week 13)

#### Backend Tasks

- [ ] **[2h] TASK-061:** Integrate Omise SDK
  - Install: omise package
  - Setup: Test mode keys
  - Create: Omise client instance
  - Test: Create test charge
  - **Deploy:** Omise integration พร้อม

- [ ] **[1.5h] TASK-062:** Create payment endpoints
  - `POST /api/payments/create-charge` (create Omise charge)
  - `POST /api/webhooks/omise` (handle webhooks)
  - `POST /api/payments/refund` (process refund)
  - Include: Webhook signature verification
  - **Deploy:** Payment API พร้อม

#### Frontend Tasks

- [ ] **[1.5h] TASK-063:** Create payment form component
  - Component: `PaymentForm`
  - Features: Card input, PromptPay QR, Bank transfer info
  - Integration: Omise.js tokenization
  - Validation: Card format, expiry date
  - **Deploy:** Payment UI พร้อม

- [ ] **[1h] TASK-064:** Create payment status tracker
  - Component: `PaymentStatus`
  - Features: Pending, Processing, Success, Failed states
  - Realtime: Subscribe to payment status
  - UI: Spinner, checkmark, error message
  - **Deploy:** Payment tracker พร้อม

---

### Sprint 5.2: LINE Integration (Deploy: Week 14)

#### Backend Tasks

- [ ] **[2h] TASK-065:** Setup LINE Messaging API
  - Create: LINE Messaging API channel
  - Setup: Channel access token, webhook URL
  - Install: `@line/bot-sdk`
  - Test: Send test message
  - **Deploy:** LINE integration พร้อม

- [ ] **[1.5h] TASK-066:** Create LINE notification service
  - Function: `sendJobNotification(lineUserId, booking)`
  - Function: `sendBookingConfirmation(lineUserId, booking)`
  - Function: `sendSOSAlert(lineUserIds, alert)`
  - Include: Flex message templates
  - **Deploy:** LINE notifications พร้อม

#### Frontend Tasks

- [ ] **[2h] TASK-067:** Setup LINE LIFF in Provider app
  - Install: `@line/liff`
  - Initialize: LIFF with LIFF_ID
  - Login: Get LINE profile, link to Supabase user
  - Test: Login flow
  - **Deploy:** LIFF integration พร้อม

- [ ] **[1.5h] TASK-068:** Create LIFF-specific components
  - Component: `LIFFLayout` (mobile-first, LINE header)
  - Component: `LIFFButton` (LINE styled)
  - Component: `ProfileCard` (show LINE profile picture)
  - Optimize: For LINE in-app browser
  - **Deploy:** LIFF UI พร้อม

---

### Sprint 5.3: Google Maps (Deploy: Week 15)

#### Backend Tasks

- [ ] **[2h] TASK-069:** Setup Google Maps API
  - Create: Google Cloud project
  - Enable: Maps JavaScript API, Geocoding API, Distance Matrix
  - Setup: API key, restrictions
  - Test: Geocoding request
  - **Deploy:** Maps API พร้อม

- [ ] **[1.5h] TASK-070:** Create Maps proxy endpoints
  - `POST /api/maps/geocode` (address → coordinates)
  - `POST /api/maps/distance` (calculate distance)
  - `POST /api/maps/autocomplete` (address suggestions)
  - Include: Caching (reduce API calls)
  - **Deploy:** Maps proxy พร้อม

#### Frontend Tasks

- [ ] **[2h] TASK-071:** Create address input component
  - Component: `AddressInput`
  - Features: Autocomplete, map preview, coordinate display
  - Integration: Call proxy endpoint for autocomplete
  - Validation: Required, within service area
  - **Deploy:** Address input พร้อม

- [ ] **[1.5h] TASK-072:** Create map display component
  - Component: `MapDisplay`
  - Features: Marker, info window, zoom controls
  - Use: Google Maps JavaScript API
  - Props: `latitude`, `longitude`, `markers`
  - **Deploy:** Map display พร้อม

---

## สรุปการ Deploy แบบ Incremental

### Deployment Schedule

| Week | Phase | Deploy | Risk Level |
|------|-------|--------|------------|
| 1 | 1.1 | Supabase project, Local env | 🟢 Low |
| 2 | 1.2 | Services + Bookings tables | 🟢 Low |
| 3 | 1.3 | Providers + Hotels tables | 🟢 Low |
| 4 | 1.4 | Storage buckets, File upload | 🟡 Medium |
| 5 | 2.1 | Auth providers, Auth context | 🟡 Medium |
| 6 | 2.2 | Login/Register UI | 🟡 Medium |
| 7 | 2.3-2.4 | Protected routes, Role access | 🟡 Medium |
| 8 | 3.1 | Node.js server setup | 🟢 Low |
| 9 | 3.2 | Booking API endpoints | 🟡 Medium |
| 10 | 3.3 | Background jobs | 🟡 Medium |
| 11 | 4.1 | Realtime subscriptions | 🟡 Medium |
| 12 | 4.2 | SOS alert system | 🔴 High (critical feature) |
| 13 | 5.1 | Omise payment | 🔴 High (payment) |
| 14 | 5.2 | LINE integration | 🟡 Medium |
| 15 | 5.3 | Google Maps | 🟢 Low |

### Rollback Plan

แต่ละ deploy:
1. **Pre-deploy:** Backup database, tag git version
2. **Deploy:** Deploy to staging first, test, then production
3. **Post-deploy:** Monitor 1 hour, verify critical paths
4. **Rollback if:** Error rate >5%, critical bug, performance degradation

### Success Metrics แต่ละ Deploy

- ✅ All migrations successful
- ✅ Zero critical errors
- ✅ Test coverage maintained
- ✅ Performance within benchmarks
- ✅ No existing features broken

---

## เอกสารอ้างอิง

- [CONSTITUTION.md](CONSTITUTION.md) - หลักสถาปัตยกรรม
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - แผน 12 สัปดาห์
- Supabase Docs: https://supabase.com/docs
- Omise Docs: https://docs.omise.co
- LINE Docs: https://developers.line.biz

---

**Version:** 1.0.0
**Last Updated:** 14 มกราคม 2026
**Maintained By:** Tech Lead

---

*งานทั้งหมด 72 tasks แบ่งเป็น 5 Phases, 15 Sprints*
*แต่ละ task ใช้เวลา 1-2 ชั่วโมง*
*Deploy incremental ทุกสัปดาห์*

🚀 **Start with TASK-001 today!**
