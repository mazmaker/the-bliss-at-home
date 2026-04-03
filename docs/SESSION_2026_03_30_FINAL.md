# Session Context — 2026-03-30 (Final)

## Prompt สำหรับ Session ใหม่

```
cd C:\chitpon59\dev\project\theblissathome.com\the-bliss-at-home
อ่านไฟล์ docs/SESSION_2026_03_30_FINAL.md เพื่อเข้าใจบริบทงานทั้งหมด แล้วทำงานต่อ
```

---

## Project Overview
โปรเจค **The Bliss Massage at Home** — แพลตฟอร์มจองบริการนวด สปา ทำเล็บถึงบ้าน
- Monorepo: `apps/customer`, `apps/staff`, `apps/hotel`, `apps/admin`, `apps/server`
- Stack: React + Vite + TypeScript + Supabase + Omise (payment)
- Deploy: Vercel (frontend) + Supabase (DB + Auth)

---

## สิ่งที่ทำในเซสชัน 30 มี.ค. 2569

### 1. Hotel Credit 30 วัน — ทดสอบ + Commit + Deploy สำเร็จ

**Commit:** `6213ee7` → merge เข้า main → deploy ทุก app สำเร็จ

**Feature ทั้งหมด:**
- Admin: credit settings (days, start date, cycle day) per hotel + validation error messages
- Admin: credit calendar page + day detail modal + urgency colors
- Admin: Google Calendar config in Settings
- Hotel: credit widget on dashboard with urgency color coding
- Server: daily cron (09:00 ICT) for credit due/overdue notifications
- Server: email + in-app notifications to hotel & admin users
- Server: Google Calendar event creation
- Server: duplicate prevention + dev-only trigger endpoint

**ไฟล์ที่แก้ไข/สร้าง (15 ไฟล์):**
| ไฟล์ | รายละเอียด |
|------|-----------|
| `apps/admin/src/App.tsx` | เพิ่ม route `/admin/credit-calendar` |
| `apps/admin/src/components/HotelForm.tsx` | เพิ่ม credit fields + validation error messages |
| `apps/admin/src/layouts/AdminLayout.tsx` | เพิ่มเมนู "ปฏิทินเครดิต" |
| `apps/admin/src/pages/CreditCalendar.tsx` | **NEW** — หน้าปฏิทินเครดิต |
| `apps/admin/src/pages/HotelDetail.tsx` | เพิ่ม credit section |
| `apps/admin/src/pages/Hotels.tsx` | เพิ่มช่อง "เครดิต (วัน)" |
| `apps/admin/src/pages/Settings.tsx` | เพิ่ม Google Calendar config |
| `apps/hotel/src/hooks/useHotelContext.ts` | เพิ่ม credit fields |
| `apps/hotel/src/pages/Dashboard.tsx` | เพิ่ม Credit Widget |
| `apps/server/package.json` | เพิ่ม googleapis |
| `apps/server/src/index.ts` | เพิ่ม cron + dev endpoint |
| `apps/server/src/services/emailService.ts` | เพิ่ม credit email template |
| `apps/server/src/services/googleCalendarService.ts` | **NEW** — Google Calendar API |
| `apps/server/src/services/notificationService.ts` | เพิ่ม processCreditDueReminders() |
| `pnpm-lock.yaml` | updated |

**Bugfix ระหว่าง session:**
- Dev endpoint `/api/dev/trigger-credit-reminders` ต้องอยู่ก่อน 404 handler
- HotelForm validation error messages ไม่แสดง → เพิ่ม `{errors.credit_days && <p>}`

### 2. ทดสอบ Production — ผ่านทุก TC

| TC | ชื่อ | App | ผล |
|----|------|-----|-----|
| 01 | ตั้งค่าเครดิตโรงแรม (Hilton Bangkok) | Admin | ✅ PASS |
| 02 | Hotel Detail แสดงเครดิต (30 วัน, 1 เม.ย., สีเขียว) | Admin | ✅ PASS |
| 04 | Validation min/max (0, 400 blocked) | Admin | ✅ PASS |
| 05 | Hotel Dashboard Credit Widget (เหลือ 32 วัน) | Hotel | ✅ PASS |
| 06 | ไม่แสดง Widget ถ้าไม่ตั้งค่า | Code | ✅ PASS |
| 07 | ปฏิทินเครดิต — 2 โรงแรม, badges, stats | Admin | ✅ PASS |
| 13 | Credit Overdue (notification_type=credit_overdue) | Server | ✅ PASS |
| 15 | In-app notification Admin (4 records) | DB | ✅ PASS |
| 17 | Google Calendar Config ("เชื่อมต่อแล้ว") | Admin | ✅ PASS |
| 18-23 | ลบ config, inactive, no email, multi hotel, colors, GCal event | Code/DB | ✅ PASS |
| 24 | Regression Login Admin + Hotel | All | ✅ PASS |

### 3. แก้เนื้อหาเงื่อนไขการคืนเงินเป็น Plain Text — เสร็จ

- Admin Settings → เงื่อนไขการคืนเงิน → ลบ markdown syntax (`##`, `###`, `-`)
- Customer app consent modal แสดง plain text ถูกต้อง ✅

### 4. ทดสอบ Invoice Email + PDF — เสร็จ

- โรงแรมทดสอบ3 → บิล INV-202602-2FE07BE0-179113
- ส่งอีเมลไป chitponphanyanon@gmail.com สำเร็จ ✅
- PDF แนบเป็นไฟล์ PDF จริง (ไม่ใช่ text file) ✅
- CDN cache หมดอายุแล้ว ทำงานถูกต้อง ✅

### 5. มีคนอื่น push commit เข้ามาด้วย

**Commit:** `726ee2e` (by BAITUAYKITTY) — fix pricing display logic
- ไม่กระทบ Hotel Credit feature
- Customer + Admin app ถูก rebuild

---

## สถานะปัจจุบัน

### Branch & Commits
```
branch: feature/staff = main = origin/main
commit ล่าสุด: 726ee2e (pricing fix by BAITUAYKITTY)
commit ของเรา: 6213ee7 (hotel credit feature)
ไม่มี uncommitted changes ที่เกี่ยวกับ feature
```

### Test Data ใน DB
- โรงแรมดุสิต เชียงใหม่: credit_days=30, credit_start_date=2026-04-01, credit_cycle_day=1
- โรงแรมฮิลตัน กรุงเทพฯ: credit_days=30, credit_start_date=2026-04-01, credit_cycle_day=1
- Google Calendar config บันทึกใน settings table แล้ว
- Test notifications ถูก cleanup แล้ว

### Dev Servers
```bash
cd /c/chitpon59/dev/project/theblissathome.com/the-bliss-at-home
nohup npx turbo run dev --parallel > /tmp/bliss-dev.log 2>&1 &

# Ports:
# Admin: http://localhost:3001
# Hotel: http://localhost:3003
# Server: http://localhost:3000
# Customer: http://localhost:3008
# Staff: http://localhost:3004
```

---

## งานที่เสร็จแล้ว (ไม่ต้องทำซ้ำ)

- [x] Hotel Credit 30 วัน — 4 Phase ครบ + ทดสอบ + deploy
- [x] แก้เนื้อหาเงื่อนไขการคืนเงินเป็น plain text
- [x] ทดสอบ Invoice Email + PDF หลัง CDN cache expire

---

## งานที่ต้องทำต่อ (ตามลำดับ priority)

### Priority สูง (Sprint ปัจจุบัน)
1. **Invoice PDF จริง** (20%) — ตอนนี้เป็น text-based PDF ต้องใช้ jsPDF สร้าง proper PDF
2. **Webhook signature verification** (55%) — ถูก disable ใน production
3. **PromptPay frontend** (0%) — Backend 75% แต่ frontend ยังไม่เชื่อม

### Features ที่ยังไม่ได้ทำ
```
- เพิ่มเวลาบริการ (extend session) — 12-16 ชม.
- Staff เลือกรอบจ่ายเงิน — 10-14 ชม.
- จ่ายเงิน Staff อัตโนมัติ — 30-40 ชม.
```

### งานค้างแยกตาม App
| App | ค่าเฉลี่ย | งานสำคัญ |
|-----|-----------|---------|
| Customer | ~78% | Home page, Promotions, Booking summary PDF |
| Hotel | ~66% | Invoice PDF (jsPDF), Hotel Profile + Map |
| Staff | ~85% | LINE Job Notification (60%), Document upload |
| Admin | ~85% | Hotel Credit เสร็จแล้ว ✅ |
| Auth | ~83% | Social login (60%), OTP (35%) |

---

## Production URLs & Test Accounts

| App | URL |
|-----|-----|
| Customer | https://customer.theblissmassageathome.com |
| Staff | https://staff.theblissmassageathome.com |
| Hotel | https://hotel.theblissmassageathome.com |
| Admin | https://admin.theblissmassageathome.com |

| App | Username | Password |
|-----|----------|----------|
| Customer | mazmakerdesign@gmail.com | U9B*B2LE#8-q!m8 |
| Hotel (ฮิลตัน) | reservations@hilton.com | Hotel123. |
| Hotel (ดุสิต) | mazmakerv3.sup@gmail.com | Hotel123. |
| Admin | admintest@theblissathome.com | Admin@12345 |
| Staff | LINE LIFF auto-login (ทดสอบ999) | — |

---

## Google Calendar Setup

| รายการ | ค่า |
|--------|-----|
| Google Cloud Project | billboardmap (billboardmap-395702) |
| Service Account | bliss-calendar@billboardmap-395702.iam.gserviceaccount.com |
| Calendar Name | Bliss Credit Reminders |
| Calendar ID | ed13fc04bec6ed2c9f28b820983b1b462dadb753465e8ab222b93e7d68ac90bd@group.calendar.google.com |

---

## MCP Servers (ทั้งหมดพร้อมใช้งาน)
| Server | หมายเหตุ |
|--------|----------|
| supabase | project: theblissathome, ref: rbdvlfriqjnwpxmmgisf |
| vercel-deploy | ชื่อ "vercel-deploy" (ห้ามใช้ "vercel") |
| context7 | Library docs lookup |
| shadcn-ui / shadcn | UI components |
| playwright | Browser automation |
| Canva | Design management |

---

## Prompt สำหรับทดสอบ Feature

```
ทดสอบ [ชื่อฟีเจอร์] ครบทุก case บน [localhost/production]

- ทดสอบผ่าน UI ด้วย Playwright MCP
- ครอบคลุมทั้ง happy path และ edge cases
- ถ้า FAIL ให้แก้โค้ดแล้วทดสอบซ้ำจนผ่าน
- สรุปผลเป็นตาราง PASS/FAIL

Login:
- Admin: admintest@theblissathome.com / Admin@12345
- Hotel: reservations@hilton.com / Hotel123.

URL: https://admin.theblissmassageathome.com
```

---

## เอกสารที่เกี่ยวข้อง
- `docs/CHECKLIST.md` — Dev task checklist ทุก feature
- `docs/PLAN_HOTEL_CREDIT_NOTIFICATION.md` — แผนพัฒนา Hotel Credit
- `docs/REPORT_HOTEL_CREDIT_SYSTEM.md` — รายงานการเปลี่ยนแปลง
- `docs/TEST_PLAN_HOTEL_CREDIT.md` — แผนทดสอบ 25 TC
- `docs/SESSION_2026_03_29.md` — บริบท session ก่อนหน้า
- `docs/SESSION_2026_03_30.md` — บริบท session เช้า
