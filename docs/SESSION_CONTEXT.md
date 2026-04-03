# Session Context — The Bliss at Home

> **วิธีใช้:** Copy prompt ด้านล่างนี้วางให้ Claude AI อ่านเมื่อเริ่ม session ใหม่
> อัปเดตล่าสุด: 2026-03-16 (session 2)

---

## Prompt สำหรับ Claude AI

```
คุณกำลังทำงานต่อจาก session ก่อนหน้าในโปรเจกต์ "The Bliss at Home"
อ่านบริบทด้านล่างนี้ให้ครบก่อนเริ่มทำงาน

---

### โปรเจกต์คืออะไร

"The Bliss at Home" คือแพลตฟอร์มจอง Massage / Spa / Nail แบบ On-demand
ลูกค้าจองออนไลน์ → Staff มารับงาน → บริการถึงบ้าน/โรงแรม

Repository: `c:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home`
Monorepo ใช้ Turborepo + pnpm workspaces

---

### Apps ทั้ง 5

| App | Path | Production URL |
|-----|------|---------------|
| Customer | apps/customer | https://customer.theblissmassageathome.com |
| Hotel | apps/hotel | https://hotel.theblissmassageathome.com |
| Staff | apps/staff | https://staff.theblissmassageathome.com |
| Admin | apps/admin | https://admin.theblissmassageathome.com |
| Server | apps/server | Express API — deploy บน Vercel |

### Shared Packages
- `packages/supabase` — Supabase client, hooks, services
- `packages/i18n` — TH/EN/CN translations
- `packages/types` — TypeScript types
- `packages/ui` — Shared UI components

---

### Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime) + Express API บน Vercel
- **Payment**: Omise (credit card, PromptPay, internet banking)
- **LINE**: LIFF (Staff App login) + Messaging API (notifications)
- **Deploy**: Vercel (all apps)
- **MCP Servers**: context7, vercel-deploy, shadcn-ui, shadcn, playwright, supabase, Canva

---

### Test Credentials

| App | Email / Login | Password |
|-----|--------------|----------|
| Customer | mazmakerdesign@gmail.com | U9B*B2LE#8-q!m8 |
| Hotel | reservations@hilton.com | Hotel123. |
| Admin | (ดูใน apps/admin/ADMIN_CREDENTIALS.md) | — |
| Staff | LINE LIFF auto-login (ทดสอบ999) | — |

### Supabase Project
- Project: `theblissathome` (ref: `rbdvlfriqjnwpxmmgisf`)
- Region: ap-northeast-1

---

### สิ่งที่ทำใน Sessions ที่ผ่านมา

#### ✅ Session 1 (2026-03-16 — ช่วงเช้า)

**1. ลบตัวเลือก "สลับกัน" ออกจาก UI**

เหตุผล: Staff App ยังไม่รองรับ sequential workflow → ลบ UI ออกก่อน รอ implement ครบค่อยเปิด

ไฟล์ที่แก้ไข:
- `apps/customer/src/components/CustomerTypeSelector.tsx`
  - ลบ button "สลับกัน" (sequential) ออก เหลือแค่ "พร้อมกัน"
- `apps/hotel/src/components/CoupleFormatSelector.tsx`
  - ลบ sequential entry ออกจาก formats array
  - ลบ ArrowRight import

Commit: `cae15b54` — "remove sequential/ทีละท่าน service format option from customer and hotel apps"

**2. ทดสอบ Full Booking Flow**

Customer App:
- Login → เลือกบริการ (คู่/พร้อมกัน) → เลือกวัน/เวลา → เลือกที่อยู่ → ชำระเงิน (credit card)
- จอง #BK20260316-0231 สำเร็จ ✅
- Staff ได้รับ LINE + in-app notification ✅
- Admin ได้รับ LINE + in-app notification ✅

Hotel App:
- Login (Hilton Bangkok) → เลือกบริการ → กรอกข้อมูลแขก → เลือกวัน/เวลา → ยืนยัน
- จอง #BK20260316-0232 สำเร็จ ✅
- Staff ได้รับ notification ✅

#### ✅ Session 2 (2026-03-16 — ช่วงบ่าย)

**3. แก้ปัญหา Vercel Spend Management + Resume Deployments**

สาเหตุ: Spend Management limit ตั้งไว้ $1 แต่ usage เดือนนี้ $1.53 → Vercel pause production deployments ทุก project
อาการ: ทุก app แสดง `503: DEPLOYMENT_PAUSED`

สิ่งที่ทำ:
- เพิ่ม Spend Management limit จาก **$1 → $20** (ผ่าน Vercel Billing Settings)
  URL: https://vercel.com/mazmakerv2sup-8973s-projects/~/settings/billing
- Resume production deployments ทุก 5 project:
  - ✅ the-bliss-at-home-customer
  - ✅ the-bliss-at-home-staff
  - ✅ the-bliss-at-home-admin
  - ✅ the-bliss-at-home-hotel
  - ✅ the-bliss-at-home-server

ขั้นตอน resume (ถ้าเกิดซ้ำอีก):
1. ไปที่ Vercel Billing → Spend Management → เพิ่ม limit
2. ไปที่ Settings ของแต่ละ project → คลิก "Resume Service" → Continue

**หมายเหตุ Vercel Spend Management:**
- ปัจจุบัน on-demand usage: $1.53 / $20 limit (8%)
- ถ้า usage ถึง $20 จะ pause อีกครั้ง → แก้ด้วยการเพิ่ม limit หรือลด usage
- Billing cycle: March 10 - April 10, 2026

---

### งานที่ยังค้างอยู่ — Sequential Booking (ยังไม่ได้ implement)

**เป้าหมาย:** นำตัวเลือก "สลับกัน" กลับมาและทำให้ใช้งานได้จริง

**สิ่งที่พร้อมแล้ว (ไม่ต้องแก้):**
- Database schema — `service_format: 'single' | 'simultaneous' | 'sequential'`
- SQL functions — คำนวณ duration (sequential = รวม + buffer 15 นาที)
- `notificationService.ts` — createJobsFromBooking() รองรับ sequential แล้ว
- Admin App — แสดงผล "สลับกัน (ผู้ให้บริการ 1 คน)" ถูกต้องแล้ว
- i18n translations — TH/EN/CN พร้อมหมด

**สิ่งที่ต้องแก้ไข (3 จุด):**

จุดที่ 1 — Customer App UI (สำคัญที่สุด)
ไฟล์: `apps/customer/src/components/CustomerTypeSelector.tsx`
งาน: เพิ่ม button "สลับกัน" กลับไป (i18n keys มีอยู่แล้ว)

จุดที่ 2 — Hotel App
ไฟล์ 1: `apps/hotel/src/components/CoupleFormatSelector.tsx`
งาน: เพิ่ม sequential entry กลับใน formats array

ไฟล์ 2: `apps/server/src/routes/secure-bookings-v2.ts` (บรรทัด ~117-128)
ปัญหา: hardcode `service_format = 'simultaneous'` เสมอ
งาน: แก้ให้รับค่า service_format จาก request body แทน

จุดที่ 3 — Staff App UI (ปานกลาง)
ปัจจุบัน: Staff เห็น 2 jobs แยกกัน แต่ไม่รู้ว่าเป็น sequential
ปัญหา: Sequential = 1 provider บริการ 2 ท่าน ทีละคน แต่ตอนนี้ staff 2 คนอาจมารับคนละ job
งาน: เพิ่ม visual indicator "งานต่อเนื่อง คนที่ 1/2" และ logic กัน staff 2 คนรับงาน sequential เดียวกัน

---

### Key Architecture — Booking & Notification Flow

```
Customer/Hotel ชำระเงิน
    ↓
POST /api/payments/create-charge (Server App)
    ↓ charge.paid = true
UPDATE bookings SET status='confirmed'
    ↓
processBookingConfirmed(bookingId)
    ├── createJobsFromBooking()
    │   ├── single → 1 job
    │   ├── simultaneous couple → 2 jobs (1 per recipient, ต้องการ 2 staff)
    │   └── sequential couple → 2 jobs (1 per recipient, staff เดียวกัน)
    └── sendBookingConfirmedNotifications()
        ├── LINE multicast → staff ที่มี line_user_id + filter by provider_preference
        ├── In-app notification → staff ทุกคนที่ active
        └── LINE push + in-app → admin ทุกคน
```

### Key Files

| ไฟล์ | หน้าที่ |
|------|---------|
| `apps/server/src/services/notificationService.ts` | สร้าง jobs + ส่ง notifications |
| `apps/server/src/services/lineService.ts` | LINE Messaging API |
| `apps/server/src/routes/payment.ts` | Payment + webhook handler |
| `apps/server/src/routes/secure-bookings-v2.ts` | Hotel booking API (มี bug hardcode simultaneous) |
| `packages/supabase/src/services/bookingService.ts` | createBookingWithServices() |
| `apps/customer/src/pages/BookingWizard.tsx` | Customer booking flow |
| `apps/hotel/src/components/BookingModalNew.tsx` | Hotel booking modal |
| `apps/customer/src/components/CustomerTypeSelector.tsx` | เลือก single/couple + format |
| `apps/hotel/src/components/CoupleFormatSelector.tsx` | เลือก simultaneous/sequential (hotel) |

---

### DB ข้อมูลสำคัญ (ณ 2026-03-16)

service_format breakdown:
- single: 125 bookings
- simultaneous: 49 bookings
- sequential: 0 bookings (ยังไม่มีเลย — feature ยังไม่เปิด)

Staff ที่มี LINE ID (จะได้รับ LINE notification):
- BD.GIFT (Uc0bf2d...)
- เตย ʕᵔᴥᵔʔ (U576a...)
- ทดสอบ999 (U4cae7...)

Staff ที่ไม่มี LINE ID (ได้แค่ in-app):
- ทดสอบ, ทดสอบพนักงาน, สมหญิง นวดเก่ง

---

### Vercel Projects

| App | Vercel Project |
|-----|---------------|
| Admin | the-bliss-at-home-admin |
| Customer | the-bliss-at-home-customer |
| Hotel | the-bliss-at-home-hotel |
| Staff | the-bliss-at-home-staff |
| Server | the-bliss-at-home-server |

**Vercel Spend Management (สำคัญ!):**
- Limit ปัจจุบัน: $20 / billing cycle
- หาก apps แสดง 503 DEPLOYMENT_PAUSED → ดูหัวข้อ "แก้ปัญหา Vercel" ด้านบน
- Billing cycle: March 10 - April 10, 2026

**Vercel Monorepo Build Cache Note:**
- `exit 1` ใน ignoreCommand = proceed with build (non-zero = don't ignore)
- ถ้า shared package เปลี่ยนแต่ deployed bundle ไม่อัปเดต → แก้ไขไฟล์ใน apps/X/src/ เพื่อ bust cache

---

### MCP Servers ที่ใช้งานได้

| Server | ใช้สำหรับ |
|--------|----------|
| supabase | query DB, apply migration, get logs |
| vercel-deploy | check deployment status, get logs |
| playwright | browser automation, UI testing |
| context7 | library documentation lookup |
| shadcn-ui / shadcn | UI components |
| Canva | design assets |

---

### ถ้าจะทดสอบ UI ด้วย Playwright

- Browser session ต้อง login ใหม่ทุกครั้งที่เปิด session ใหม่ เพราะ localStorage หายไประหว่าง navigate
- Admin App URL: https://admin.theblissmassageathome.com/admin/login (ไม่ใช่ /login)
- ใช้ `browser_snapshot` ก่อนเสมอเพื่อเข้าใจ page structure

---

### งานถัดไปที่แนะนำ (เรียงลำดับความสำคัญ)

1. **Implement sequential booking** — นำตัวเลือก "สลับกัน" กลับมาพร้อมทำให้ใช้งานได้จริง
   - แก้ 3 จุดตามที่ระบุข้างต้น
   - ทดสอบ full flow: จอง sequential → staff เห็นงานถูกต้อง → assign staff คนเดียวทั้ง 2 job

2. **ตรวจสอบ SOS alert** ใน Admin App
   - ตอนเปิด browser เห็นมี SOS alert และ urgent notifications หลายรายการ
   - URL: https://admin.theblissmassageathome.com/admin/reports
```

---

## หมายเหตุ

- ไฟล์นี้ควรอัปเดตทุกครั้งหลังทำงานเสร็จแต่ละ session
- Memory ของ Claude อยู่ที่: `C:\Users\chitp\.claude\projects\c--chitpon59-dev-project-theblissathome-com\memory\`
- CLAUDE.md หลักอยู่ที่ root ของ repo — ใช้ describe project structure และ MCP tools
