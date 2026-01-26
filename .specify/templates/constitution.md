# The Bliss at Home - Project Constitution

**Version:** 2.0.0 (Supabase-First Architecture)
**Effective:** January 14, 2026
**Status:** Active

---

## บทนำ (Preamble)

เอกสารนี้เป็น "Single Source of Truth" สำหรับการตัดสินใจด้านเทคนิคทั้งหมดของโปรเจกต์ **The Bliss at Home** - แพลตฟอร์มจองบริการนวด สปา และทำเล็บถึงที่

สถาปัตยกรรมหลัก: **Supabase-First** พร้อม Node.js Server เสริมสำหรับงานที่ซับซ้อน

ผู้มีส่วนร่วมทุกคนต้องปฏิบัติตามหลักการนี้ การเบี่ยงเบนต้องได้รับอนุมัติและมีการบันทึก

---

## สารบัญ (Table of Contents)

1. [หลักสถาปัตยกรรมหลัก](#1-หลักสถาปัตยกรรมหลัก-core-architectural-principles)
2. [มาตรฐานการพัฒนา](#2-มาตรฐานการพัฒนา-development-standards)
3. [แนวทางคุณภาพ](#3-แนวทางคุณภาพ-quality-guidelines)
4. [รูปแบบการเชื่อมต่อระบบภายนอก](#4-รูปแบบการเชื่อมต่อระบบภายนอก-integration-patterns)
5. [การ Deploy และดำเนินงาน](#5-การ-deploy-และดำเนินงาน-deployment--operations)
6. [การทำงานร่วมกันเป็นทีม](#6-การทำงานร่วมกันเป็นทีม-team-collaboration)
7. [การบริหารจัดการและการแก้ไข](#7-การบริหารจัดการและการแก้ไข-governance--amendment-process)
8. [ข้อมูลอ้างอิงอย่างย่อ](#8-ข้อมูลอ้างอิงอย่างย่อ-quick-reference)

---

## 1. หลักสถาปัตยกรรมหลัก (Core Architectural Principles)

### 1.1 หลักการ Supabase-First

**ทำไมต้อง Supabase:**

1. **Backend-as-a-Service** ที่ครบถ้วน:
   - Database (PostgreSQL 15+)
   - Auth (Email, Phone, OAuth)
   - Storage (S3-compatible)
   - Realtime (WebSocket subscriptions)
   - Edge Functions (Deno serverless)

2. **Row Level Security (RLS)**:
   - ความปลอดภัยระดับ database
   - ไม่ต้องเขียน middleware authorization
   - แยกข้อมูลผู้ใช้โดยอัตโนมัติ

3. **Realtime ในตัว**:
   - สำหรับ booking status updates
   - SOS alerts broadcasting
   - Live analytics

4. **ลดโค้ด backend**:
   - CRUD ผ่าน Supabase client โดยตรง
   - ไม่ต้องเขียน API endpoints ทั่วไป

### 1.2 สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                     │
│  (Admin, Customer, Hotel, Provider - React + TypeScript)   │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Supabase    │  │  Node.js     │  │  External    │
│  (Primary)   │  │  Server      │  │  Services    │
│              │  │  (Supple-    │  │              │
│ • Database   │  │  mentary)    │  │ • Omise      │
│ • Auth       │  │              │  │ • LINE       │
│ • Storage    │  │ • Omise      │  │ • Maps       │
│ • Realtime   │  │ • LINE       │  │              │
│ • Edge Fns   │  │ • Maps       │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 1.3 การแบ่งหน้าที่ระหว่าง Supabase และ Node.js

**Supabase รับผิดชอบ:**

| หน้าที่ | วิธีการ | ตัวอย่าง |
|---------|---------|---------|
| CRUD ทั่วไป | Supabase Client | ดึง services, สร้าง booking |
| Authentication | Supabase Auth | Login, signup, OAuth |
| Authorization | RLS Policies | Customer เห็น booking ตัวเอง |
| File Uploads | Supabase Storage | อัพโหลดรูป profile, documents |
| Real-time Updates | Supabase Realtime | Booking status changes |
| Simple Computed Fields | DB Functions | คำนวณ total_amount |
| Simple Webhooks | Edge Functions | Email notifications |

**Node.js Server รับผิดชอบ:**

| หน้าที่ | วิธีการ | เหตุผล |
|---------|---------|---------|
| Omise Payment | API endpoints | ซ่อน secret key |
| LINE Messaging | API endpoints | LINE SDK ไม่รองรับ Edge Functions |
| Google Maps | API endpoints | ซ่อน API key, rate limiting |
| Provider Assignment | Background job | Algorithm ที่ซับซ้อน |
| Invoice Generation | Bull Queue + PDF | ต้องการ library พิเศษ |
| SOS Broadcast | Webhook + Realtime | การส่งแบบ real-time ทั้งระบบ |

### 1.4 หลักการ RLS (Row Level Security)

**กฎทองคำ: RLS เป็นเส้นป้องกันหลัก**

```sql
-- ✅ GOOD: RLS ปกป้องข้อมูล
CREATE POLICY "Customers view own bookings"
ON public.bookings FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM public.customers
    WHERE user_id = auth.uid()
  )
);

-- ❌ BAD: พึ่ง frontend/ระบับกัน
-- อย่าใช้แค่ permission ใน frontend
```

**โครงสร้าง RLS:**

```sql
-- 1. เปิด RLS สำหรับทุก table ที่มีข้อมูลผู้ใช้
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 2. Policy สำหรับทุก table
--    - อ่าน: ผู้ใช้ดูของตัวเอง
--    - เขียน: ผู้ใช้แก้ของตัวเอง
--    - Admin: ดู/แก้ทั้งหมด

-- 3. Test RLS ทุกครั้งที่เพิ่ม/แก้ policy
```

### 1.5 หลักการ Real-time

**ใช้เมื่อ:**
- ต้องการ updates แบบ instant
- หลาย user ต้องเห็นข้อมูลเดียวกันพร้อมกัน
- Dashboard, tracking, notifications

**รูปแบบการ subscribe:**

```typescript
// ✅ GOOD: Subscribe ด้วย filter
const subscription = supabase
  .channel('booking-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'bookings',
      filter: `id=eq.${bookingId}`  // เฉพาะ booking นี้
    },
    (payload) => {
      console.log('Status changed:', payload.new.status)
    }
  )
  .subscribe()

// ❌ BAD: Subscribe ทั้ง table โดยไม่กรอง
```

---

## 2. มาตรฐานการพัฒนา (Development Standards)

### 2.1 โครงสร้างโปรเจกต์

```
the-bliss-at-home/
├── apps/
│   ├── admin/              # Port 3001
│   │   └── src/
│   │       ├── lib/
│   │       │   └── supabase.ts      # Supabase client
│   │       ├── hooks/                # Custom hooks
│   │       ├── components/
│   │       └── pages/
│   ├── customer/           # Port 3002
│   ├── hotel/              # Port 3003
│   ├── staff/             # Port 3004 (LINE LIFF)
│   └── server/             # Port 3000
│       └── src/
│           ├── routes/              # API routes
│           ├── services/            # Business logic
│           ├── jobs/                # Bull queue jobs
│           └── lib/
│               └── supabase.ts      # Admin client
├── packages/
│   ├── supabase/           # Shared Supabase code
│   │   ├── client.ts                # Client factory
│   │   ├── types.ts                 # Generated types
│   │   └── queries.ts               # Common queries
│   ├── ui/
│   ├── types/
│   └── i18n/
└── supabase/
    ├── migrations/         # SQL migrations
    ├── functions/          # Edge Functions
    └── config.toml         # Supabase config
```

### 2.2 การตั้งชื่อ (Naming Conventions)

**Frontend:**
```
Components:     PascalCase     BookingCard.tsx
Hooks:          camelCase      useBookings.ts
Utils:          camelCase      formatCurrency.ts
Types:          PascalCase     Booking.types.ts
Constants:      SCREAMING_SNAKE_CASE  API_ENDPOINTS.ts
```

**Database:**
```
Tables:         snake_case     customer_profiles, booking_logs
Columns:        snake_case     first_name, created_at
Primary Keys:   id (UUID)     gen_random_uuid()
Foreign Keys:   {table}_id    customer_id, service_id
Indexes:        idx_{table}_{column}  idx_bookings_status
```

**API Routes:**
```
Node.js:        kebab-case     /api/v1/create-charge
Edge Functions: camelCase      sendNotification
```

### 2.3 Supabase Client Pattern

**Frontend Client:**

```typescript
// apps/admin/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@bliss/supabase/types'

export const createSupabaseClient = () => {
  return createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  )
}

export const supabase = createSupabaseClient()
```

**Admin/Server Client:**

```typescript
// apps/server/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@bliss/supabase/types'

export const createSupabaseAdminClient = () => {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// ⚠️ SERVICE ROLE KEY ใช้เฉพาะ server เท่านั้น!
```

### 2.4 TanStack Query + Supabase Pattern

**Query Pattern:**

```typescript
// hooks/useBookings.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const useBookings = () => {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          provider:providers(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })
}

// ✅ GOOD: ใช้ Supabase query โดยตรง
// ❌ BAD: สร้าง API endpoint แค่เพื่อ SELECT * FROM
```

**Mutation Pattern:**

```typescript
// hooks/useCreateBooking.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const useCreateBooking = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (booking: CreateBookingInput) => {
      const { data, error } = await supabase
        .from('bookings')
        .insert(booking)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    }
  })
}
```

### 2.5 RLS Design Patterns

**Standard RLS Policy Template:**

```sql
-- 1. Users view their own data
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- 2. Users update their own data
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Admins view all
CREATE POLICY "Admins view all profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- 4. Service role bypass (สำหรับ Node.js server)
-- ใช้ service_role_key เพื่อ bypass RLS
```

**Complex RLS with Joins:**

```sql
-- Customer เห็น bookings ของตัวเอง
CREATE POLICY "Customers view own bookings"
ON public.bookings FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM public.customers
    WHERE user_id = auth.uid()
  )
);

-- Provider เห็น bookings ที่ถูก assign
CREATE POLICY "Providers view assigned bookings"
ON public.bookings FOR SELECT
USING (
  provider_id IN (
    SELECT id FROM public.providers
    WHERE user_id = auth.uid()
  )
);
```

### 2.6 Edge Functions Pattern

**เมื่อใช้ Edge Functions:**

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { userId, message } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Business logic...

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**เมื่อใช้ Node.js แทน:**

```typescript
// apps/server/src/routes/payments.ts
// ใช้เมื่อต้องการ:
// - External SDK (Omise, LINE)
// - Complex processing
// - Background jobs
// - File handling (PDF generation)
```

### 2.7 Node.js Server API Pattern

**API Route Structure:**

```typescript
// apps/server/src/routes/bookings.ts
import { Router } from 'express'
import { requireAuth } from '@/middleware/auth'
import { assignProvider } from '@/services/booking'

const router = Router()

// ✅ GOOD: API สำหรับ logic ที่ซับซ้อน
router.post('/bookings/:id/assign-provider', requireAuth, async (req, res) => {
  try {
    const booking = await assignProvider(req.params.id)
    res.json({ success: true, data: booking })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ❌ BAD: API ที่ทำแค่ SELECT
// router.get('/bookings', ...) -> ใช้ Supabase query แทน
```

### 2.8 การจัดการ Error

**Frontend:**

```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error:', error, errorInfo)
    // Send to Sentry
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
```

**Backend (Node.js):**

```typescript
// middleware/errorHandler.ts
export const errorHandler = (err, req, res, next) => {
  console.error(err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message }
    })
  }

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }
  })
}
```

---

## 3. แนวทางคุณภาพ (Quality Guidelines)

### 3.1 Testing Strategy

**Frontend Testing:**

```typescript
// Unit Tests - Components
describe('BookingCard', () => {
  it('renders booking details', () => {
    render(<BookingCard booking={mockBooking} />)
    expect(screen.getByText('Thai Massage')).toBeInTheDocument()
  })
})

// Integration Tests - Supabase (mocked)
describe('useBookings', () => {
  it('fetches bookings', async () => {
    const { result } = renderHook(() => useBookings())
    await waitFor(() => expect(result.current.data).toHaveLength(3))
  })
})

// E2E Tests - Playwright
test('complete booking flow', async ({ page }) => {
  await page.goto('/services')
  await page.click('[data-testid="service-1"]')
  await page.fill('[name="date"]', '2026-01-20')
  await page.click('[data-testid="submit"]')
  await expect(page.locator('[data-testid="success"]')).toBeVisible()
})
```

**RLS Testing:**

```sql
-- ทดสอบ RLS ด้วย test users
-- 1. เปลี่ยนเป็น user A
SET LOCAL request.jwt.claim.sub = 'user-a-id';

-- 2. Test query
SELECT * FROM public.bookings; -- ควรเห็นเฉพาะของ user A

-- 3. Verify
-- ถ้าเห็นของ user B = RLS ผิด!
```

**Edge Functions Testing:**

```typescript
// supabase/functions/test-notification/index.test.ts
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'

Deno.test('send notification', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ userId: 'test', message: 'Hello' })
  })

  const res = await serve(req)
  assertEquals(res.status, 200)
})
```

### 3.2 Performance Benchmarks

**Supabase Queries:**

| Query Type | Target | Notes |
|------------|--------|-------|
| Simple SELECT | < 50ms | Single table, indexed |
| JOIN SELECT | < 100ms | 2-3 tables |
| Complex SELECT | < 200ms | Multiple joins, aggregations |
| INSERT/UPDATE | < 100ms | Single row |
| Realtime latency | < 200ms | From DB to client |

**Frontend Metrics:**

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |

**Database Optimization:**

```sql
-- Indexes สำคัญ
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX idx_bookings_scheduled_date ON public.bookings(scheduled_date);
CREATE INDEX idx_bookings_provider_id ON public.bookings(provider_id);

-- Composite indexes สำหรับ query ที่ใช้บ่อย
CREATE INDEX idx_bookings_customer_status
  ON public.bookings(customer_id, status);
```

### 3.3 Security Checklist

**Supabase Security:**

- [ ] RLS เปิดสำหรับทุก user table
- [ ] Service role key ไม่ expose ใน frontend
- [ ] Anon key มีสิทธิ์จำกัด (ตาม RLS)
- [ ] Storage buckets มี RLS policies
- [ ] Functions ตรวจสอบ auth.uid()

**Node.js Security:**

- [ ] Environment variables ใช้ `.env`
- [ ] API keys ไม่ expose ใน logs
- [ ] Input validation (Zod)
- [ ] Rate limiting บน sensitive endpoints
- [ ] CORS configuration ถูกต้อง

**Frontend Security:**

- [ ] No sensitive data in localStorage
- [ ] XSS prevention (React auto-escape)
- [ ] CSRF tokens สำหรับ mutations
- [ ] Content Security Policy

### 3.4 Code Review Criteria

**เช็คลิสต์สำหรับ PR:**

- [ ] ปฏิบัติตาม naming conventions
- [ ] RLS policies ถูกต้อง (ถ้าเกี่ยวข้อง)
- [ ] TypeScript types ครบถ้วน (ไม่มี `any`)
- [ ] Error handling เหมาะสม
- [ ] Tests ครอบคลุม
- [ ] ไม่มี hardcoded values
- [ ] ไม่มี console.log ใน production
- [ ] Performance ได้รับการคำนึง

---

## 4. รูปแบบการเชื่อมต่อระบบภายนอก (Integration Patterns)

### 4.1 Omise Payment (Node.js)

**Flow:**

```
Frontend → Omise.js (tokenize) → Node.js → Omise API
                                              ↓
                                         Supabase (payments table)
                                              ↓
                                         Webhook → Node.js → Supabase update
```

**Implementation:**

```typescript
// Node.js: Create charge
import Omise from 'omise'

const omise = Omise({ secretKey: process.env.OMISE_SECRET_KEY })

export async function createCharge(bookingId: string, tokenId: string) {
  // 1. Get booking from Supabase
  const supabase = createSupabaseAdminClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  // 2. Create charge
  const charge = await omise.charges.create({
    amount: Math.round(booking.total_amount * 100), // satang
    currency: 'thb',
    card: tokenId,
    metadata: { bookingId }
  })

  // 3. Update payment record
  await supabase.from('payments').insert({
    booking_id: bookingId,
    omise_charge_id: charge.id,
    amount: booking.total_amount,
    status: charge.status === 'successful' ? 'PAID' : 'PENDING'
  })

  return charge
}
```

**Webhook Handler:**

```typescript
// Node.js: Webhook
app.post('/webhooks/omise', async (req, res) => {
  const event = req.body

  if (event.key === 'charge.complete') {
    const supabase = createSupabaseAdminClient()

    await supabase.from('payments').update({
      status: 'PAID'
    }).eq('omise_charge_id', event.data.id)

    await supabase.from('bookings').update({
      status: 'CONFIRMED'
    }).eq('id', event.data.metadata.bookingId)
  }

  res.json({ received: true })
})
```

### 4.2 LINE LIFF + Auth

**LIFF Initialization:**

```typescript
// Provider app
import liff from '@line/liff'

export const initializeLiff = async () => {
  try {
    await liff.init({ liffId: import.meta.env.VITE_LIFF_ID })

    if (!liff.isLoggedIn()) {
      liff.login()
      return null
    }

    const profile = await liff.getProfile()

    // Login กับ Supabase
    const supabase = createSupabaseClient()
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'line',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    return data
  } catch (error) {
    console.error('LIFF init failed:', error)
    return null
  }
}
```

**LINE Notifications (Node.js):**

```typescript
import { Client } from '@line/bot-sdk'

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
})

export async function sendJobNotification(lineUserId: string, booking: any) {
  await lineClient.pushMessage(lineUserId, {
    type: 'flex',
    altText: 'งานใหม่!',
    contents: { /* Flex Message */ }
  })
}
```

### 4.3 Google Maps (Node.js Proxy)

**ทำไมต้อง proxy:**
- ซ่อน API key
- Rate limiting
- Caching ผลลัพธ์

```typescript
// Node.js: Geocoding
import { Client } from '@googlemaps/google-maps-services-js'

const mapsClient = new Client({})

app.post('/api/integrations/maps/geocode', async (req, res) => {
  const { address } = req.body

  const response = await mapsClient.geocode({
    params: { address, key: process.env.GOOGLE_MAPS_API_KEY }
  })

  const { lat, lng } = response.data.results[0].geometry.location

  res.json({ latitude: lat, longitude: lng })
})
```

### 4.4 Real-time + Bull Queue

**Pattern: Supabase Realtime เตือน → Bull ประมวลผล**

```typescript
// Node.js: Listen และ queue
import { Queue } from 'bull'
import { createClient } from '@supabase/supabase-js'

const invoiceQueue = new Queue('invoices', process.env.REDIS_URL)

// Supabase subscription
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

supabase
  .channel('booking-changes')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'bookings' },
    (payload) => {
      // Queue invoice generation
      invoiceQueue.add('generate', { bookingId: payload.new.id })
    }
  )
  .subscribe()

// Process
invoiceQueue.process('generate', async (job) => {
  const pdf = await generateInvoicePDF(job.data.bookingId)
  await uploadToSupabase(pdf)
})
```

### 4.5 SOS Alert System

**Flow:**

```
1. User กด SOS
   ↓
2. Frontend → Supabase (insert sos_alerts)
   ↓
3. Supabase Realtime → Admin clients (live update)
   ↓
4. Edge Function/Node.js → LINE broadcast
   ↓
5. Node.js → Email to emergency contacts
```

**Implementation:**

```typescript
// Frontend
export const triggerSOS = async (bookingId: string) => {
  const position = await getCurrentPosition()

  const { error } = await supabase.from('sos_alerts').insert({
    triggered_by: (await supabase.auth.getUser()).data.user?.id,
    booking_id: bookingId,
    latitude: position.latitude,
    longitude: position.longitude,
    status: 'ACTIVE'
  })

  return { error }
}

// Admin - Subscribe to alerts
supabase
  .channel('sos-alerts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'sos_alerts',
    filter: 'status=eq.ACTIVE'
  }, (payload) => {
    showSOSNotification(payload.new)
  })
  .subscribe()
```

---

## 5. การ Deploy และดำเนินงาน (Deployment & Operations)

### 5.1 Environment Setup

**Supabase Projects:**

| Environment | Purpose | Project |
|-------------|---------|---------|
| Local | Development | Docker (supabase start) |
| Staging | Pre-production | Supabase Cloud (staging) |
| Production | Live | Supabase Cloud (production) |

**Node.js Server:**

| Environment | Platform | Purpose |
|-------------|----------|---------|
| Local | npm run dev | Development |
| Staging | Railway/Render | Testing |
| Production | Railway/Render/Docker | Live |

### 5.2 Supabase Migrations

**Workflow:**

```bash
# 1. Create migration
supabase migration new add_booking_status_index

# 2. Write SQL
# supabase/migrations/{timestamp}_add_booking_status_index.sql
CREATE INDEX CONCURRENTLY idx_bookings_status
  ON public.bookings(status);

# 3. Local testing
supabase db reset

# 4. Push to remote
supabase db push

# 5. Generate types
supabase gen types typescript --local > packages/supabase/types.ts
```

**Migration Rules:**

1. **Always create migrations** - ไม่แก้ database โดยตรง
2. **Test locally first** - ใช้ `supabase start`
3. **Generate types** หลังจาก migration
4. **Backward compatible** - avoid breaking changes
5. **Index CONCURRENTLY** - สำหรับ production

### 5.3 Edge Functions Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy send-notification

# Deploy with secrets
supabase functions deploy send-notification \
  --env-file .env.production
```

### 5.4 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    - pnpm install
    - pnpm test
    - supabase db reset  # Test migrations

  deploy-supabase:
    - supabase db push
    - supabase functions deploy
    - supabase gen types typescript

  deploy-frontend:
    - Deploy to Vercel

  deploy-server:
    - Deploy to Railway
```

### 5.5 Monitoring

**Supabase Dashboard:**
- Database performance
- Auth activity
- Storage usage
- Edge Functions logs
- Realtime connections

**Custom Monitoring:**
```typescript
// Send metrics to monitoring service
import * as Sentry from '@sentry/browser'

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE
})

// Track queries
supabase.from('bookings').select('*').then(({ error }) => {
  if (error) {
    Sentry.captureException(error)
  }
})
```

### 5.6 Backup Strategy

**Supabase:**
- Automatic backups (daily)
- Point-in-time recovery (7 days)
- Export to SQL (manual)

**Node.js Server:**
- Database: ใช้ Supabase
- Logs: Winston + CloudWatch
- Files: ใช้ Supabase Storage

---

## 6. การทำงานร่วมกันเป็นทีม (Team Collaboration)

### 6.1 Git Workflow

**Branches:**

```
main (production)
  ↑
staging (pre-production)
  ↑
develop (development)
  ↑
feature/*, bugfix/*, hotfix/*
```

**Conventional Commits:**

```
feat(supabase): add RLS policies for bookings
fix(auth): resolve LINE OAuth callback
refactor(server): move provider assignment to service
test(rls): add policy tests
chore(migrations): add customer preferences
```

### 6.2 Schema Change Process

**1. Propose:**
- สร้าง issue / PR description
- อธิบายการเปลี่ยนแปลง schema

**2. Review:**
- Tech lead review
- Security review (ถ้าเกี่ยวข้องกับ RLS)
- Performance review (indexes)

**3. Implement:**
- Create migration
- Test locally
- Update TypeScript types

**4. Deploy:**
- PR approval
- Deploy to staging
- Test staging
- Deploy to production

### 6.3 RLS Review Process

**Checklist:**

- [ ] RLS enabled สำหรับ user tables
- [ ] Policy ครอบคลุมทุก operation (SELECT/INSERT/UPDATE/DELETE)
- [ ] Test กับ test users
- [ ] Admin bypass ถูกต้อง
- [ ] Service role usage documented

### 6.4 Local Development

**Setup:**

```bash
# 1. Clone
git clone <repo>

# 2. Install
pnpm install

# 3. Start Supabase locally
supabase start

# 4. Setup environment
cp .env.example .env.local

# 5. Run migrations
supabase db reset

# 6. Start apps
pnpm dev              # All apps
pnpm dev:admin        # Admin only
pnpm dev:server       # Server only
```

### 6.5 Documentation Standards

**Required Docs:**

1. **README.md** ในแต่ละ app/package
2. **Migration comments** สำหรับ schema ที่ซับซ้อน
3. **RLS Policy documentation** ใน migration files
4. **Edge Function docs** ใน function files
5. **API documentation** (OpenAPI) สำหรับ Node.js endpoints

---

## 7. การบริหารจัดการและการแก้ไข (Governance & Amendment Process)

### 7.1 Constitution Ownership

**Constitution Keeper:** Tech Lead

**Review Schedule:**
- รายเดือน: ตรวจสอบการอัพเดต
- รายไตรมาส: Major version review
- รายปี: Complete audit

### 7.2 Amendment Process

**Minor Updates:**
- คำชี้แจง, typo fixes
- Tech Lead approval
- Version bump (patch)

**Major Changes:**
- Architecture changes
- Technology stack changes
- New/removal of standards
- Team approval required
- Version bump (major/minor)

### 7.3 Compliance

**All Contributors SHALL:**
- อ่านและเข้าใจ constitution
- ปฏิบัติตาม standards และ principles
- รายงาน violations หรือ issues
- เข้าร่วม improvement discussions

---

## 8. ข้อมูลอ้างอิงอย่างย่อ (Quick Reference)

### Port Assignments

```
3000  Node.js Server
3001  Admin App
3002  Customer App
3003  Hotel App
3004  Staff App (LINE LIFF)
5432  Supabase PostgreSQL (local)
```

### Environment Variables

```bash
# Supabase (Frontend)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

# Supabase (Server/Functions)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

# LINE
VITE_LIFF_ID
LINE_CHANNEL_ACCESS_TOKEN
LINE_CHANNEL_SECRET

# Omise
OMISE_PUBLIC_KEY
OMISE_SECRET_KEY

# Google Maps
GOOGLE_MAPS_API_KEY

# Node.js Server
DATABASE_URL  # Supabase connection string
REDIS_URL
JWT_SECRET
```

### Common Commands

```bash
# Supabase
supabase start              # Start local
supabase stop               # Stop local
supabase db reset           # Reset DB
supabase db push            # Push migrations
supabase migration new      # Create migration
supabase functions deploy   # Deploy functions
supabase gen types          # Generate types

# Project
pnpm install                # Install dependencies
pnpm dev                    # Start all apps
pnpm dev:filter <app>       # Start specific app
pnpm build                  # Build all
pnpm test                   # Run tests
pnpm lint                   # Lint code
pnpm typecheck              # Check types
```

### Decision Matrix: Supabase vs Node.js

| Scenario | Use | Reason |
|----------|-----|--------|
| CRUD operations | Supabase | Direct query, RLS protected |
| Authentication | Supabase | Built-in, OAuth support |
| File uploads | Supabase Storage | Direct upload, RLS |
| Real-time updates | Supabase Realtime | Built-in subscriptions |
| Payment processing | Node.js | Omise SDK, secret key |
| LINE messaging | Node.js | LINE SDK, webhooks |
| Google Maps | Node.js | API key protection, caching |
| Provider assignment | Node.js | Complex algorithm |
| Invoice PDF | Node.js | PDF libraries |
| Email sending | Edge Functions | Simple, serverless |
| Data aggregation | Edge Functions | Scheduled execution |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0.0 | 2026-01-14 | Supabase-first architecture | Tech Lead |

---

**เอกสารนี้เป็น "Single Source of Truth" สำหรับโปรเจกต์ The Bliss at Home**

---

*สำหรับคำถามหรือข้อเสนอแนะ กรุณาติดต่อ Constitution Keeper หรือสร้าง issue ใน project repository*
