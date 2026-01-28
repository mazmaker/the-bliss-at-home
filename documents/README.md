# 🏠 The Bliss at Home - Booking Massage Platform

ระบบจองบริการนวด สปา และทำเล็บถึงที่ แบบ Monorepo สำหรับ 4 แอพพลิเคชัน

---

## 📚 เอกสารทั้งหมด

เอกสารทั้งหมดจัดทำขึ้นเพื่อใช้งานใน **Claude Code** สำหรับการพัฒนาโปรเจกต์

### 1. 📖 Technical Specification
**ไฟล์:** `TECHNICAL_SPECIFICATION.md`

เอกสารทางเทคนิคที่ครอบคลุม:
- ภาพรวมโปรเจกต์
- สถาปัตยกรรมระบบ
- โครงสร้าง Monorepo แบบละเอียด
- Technology Stack ทั้งหมด
- Database Schema พร้อม Prisma Models
- API Specification ทุก endpoints
- Authentication & Authorization
- รายละเอียดแต่ละแอพทั้ง 4 ตัว
- Integration Services (Omise, LINE, Google Maps, SendGrid)
- Deployment Strategy

**ใช้เมื่อ:** ต้องการเข้าใจ architecture หรือดู database schema

### 2. 🚀 Quick Start Guide
**ไฟล์:** `QUICK_START.md`

คู่มือเริ่มต้นโปรเจกต์ใน 5 นาที:
- Prerequisites ที่ต้องติดตั้ง
- Setup แต่ละ app ทีละขั้นตอน
- Environment Variables
- Database Setup
- Development Scripts
- Using Claude Code (คำสั่งที่ใช้บ่อย)
- Common Tasks Examples
- Development Workflow แบ่งตาม Phase
- Tips for Using Claude Code
- Debugging Guide
- Common Issues & Solutions

**ใช้เมื่อ:** เริ่มต้นพัฒนาครั้งแรก หรือต้องการตัวอย่างคำสั่งสำหรับ Claude Code

### 3. 💻 Code Patterns
**ไฟล์:** `CODE_PATTERNS.md`

ตัวอย่างโค้ดและ patterns ที่ใช้บ่อย:
- **Backend Examples:**
  - API Controller Pattern
  - Service Layer Pattern
  - Middleware Pattern
  - Error Handling
- **Frontend Examples:**
  - React Component with Hooks
  - Custom Hook for API
  - Form with Validation
  - State Management with Zustand
- **Integration Examples:**
  - Omise Payment Gateway
  - LINE Notification
  - Google Maps API

**ใช้เมื่อ:** ต้องการตัวอย่างโค้ดที่พร้อมใช้งาน หรือดู best practices

### 4. 🗓️ Development Roadmap
**ไฟล์:** `DEVELOPMENT_ROADMAP.md`

แผนการพัฒนา 12 สัปดาห์แบบละเอียด:
- **Phase 1:** UI/UX Design (Week 1-4)
- **Phase 2:** Core Development (Week 5-8)
- **Phase 3:** Provider & Admin (Week 9-11)
- **Phase 4:** Integration & QA (Week 12)
- งานรายวัน/รายสัปดาห์
- Task breakdown แยกตาม feature
- Testing Strategy
- Deployment Checklist
- Success Metrics

**ใช้เมื่อ:** ต้องการดู timeline หรือวางแผนงานรายสัปดาห์

---

## 🏗️ Project Structure

```
the-bliss-at-home/
├── apps/
│   ├── admin/           # Admin Web App
│   ├── customer/        # Customer Web App
│   ├── hotel/           # Hotel Web App
│   ├── provider/        # Provider LINE LIFF App
│   └── api/             # Backend API Server
├── packages/
│   ├── ui/              # Shared UI Components
│   ├── types/           # Shared TypeScript Types
│   ├── utils/           # Shared Utilities
│   ├── config/          # Shared Configuration
│   └── i18n/            # Internationalization
├── docs/                # Additional Documentation
├── docker/              # Docker Configuration
└── scripts/             # Build & Deploy Scripts
```

---

## 🎯 4 Applications Overview

### 1. 👨‍💼 Admin App
**Purpose:** จัดการระบบทั้งหมด

**Key Features:**
- Dashboard with Analytics
- Booking Management
- Service Management
- Provider Management
- Hotel Management
- Customer Management
- Payment Management
- Promotion Management
- Reports & Analytics
- System Settings

**Tech Stack:** React + TypeScript + Vite + TanStack Query + Zustand + Tailwind CSS

### 2. 👤 Customer App
**Purpose:** จองบริการสำหรับลูกค้าทั่วไป

**Key Features:**
- Browse Services
- 5-Step Booking Flow
- Payment Integration (Omise)
- Booking History
- Profile Management
- Reviews & Ratings
- Multi-language (TH/EN/CN)

**Tech Stack:** React + TypeScript + Vite + TanStack Query + Zustand + Tailwind CSS + i18next

### 3. 🏨 Hotel App
**Purpose:** จัดการการจองสำหรับแขกของโรงแรม

**Key Features:**
- Hotel Dashboard
- Guest Booking Management
- Billing & Invoice System
- Booking Analytics
- Hotel Profile Management

**Tech Stack:** React + TypeScript + Vite + TanStack Query + Zustand + Tailwind CSS

### 4. 💆 Staff App (LINE LIFF)
**Purpose:** รับงานและจัดการงานสำหรับหมอนวด

**Key Features:**
- Job Notifications (LINE)
- Accept/Decline Jobs
- Job Status Management
- Schedule Calendar
- Earnings Dashboard
- Payment History
- Profile & Documents

**Tech Stack:** React + TypeScript + Vite + LINE LIFF SDK + TanStack Query + Zustand + Tailwind CSS

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 18.x
- **Language:** TypeScript 5.x
- **Build Tool:** Vite 5.x
- **State Management:** Zustand / Redux Toolkit
- **Data Fetching:** TanStack Query 5.x
- **Routing:** React Router 6.x
- **Forms:** React Hook Form + Zod
- **Styling:** Tailwind CSS 3.x
- **UI Components:** Shadcn/ui
- **i18n:** i18next

### Backend
- **Runtime:** Node.js 20.x LTS
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 16.x
- **ORM:** Prisma
- **Cache:** Redis 7.x
- **Authentication:** JWT + Bcrypt
- **Validation:** Zod
- **WebSocket:** Socket.io

### External Services
- **Payment:** Omise Payment Gateway
- **Messaging:** LINE Messaging API
- **Maps:** Google Maps API
- **Email:** SendGrid
- **Storage:** AWS S3
- **CDN:** Cloudflare

### DevOps
- **Containerization:** Docker
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry + Prometheus + Grafana
- **Process Manager:** PM2

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <repository-url>
cd the-bliss-at-home
pnpm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start Database
```bash
docker-compose up -d postgres redis
```

### 4. Run Migrations
```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
```

### 5. Start Development
```bash
# Start all apps
pnpm dev

# Or start specific app
pnpm dev:admin
pnpm dev:customer
pnpm dev:hotel
pnpm dev:provider
pnpm dev:api
```

### 6. Access Applications
- Admin: http://localhost:3001
- Customer: http://localhost:3002
- Hotel: http://localhost:3003
- Staff: http://localhost:3004
- API: http://localhost:3000

---

## 📋 Available Scripts

```bash
# Development
pnpm dev              # Start all apps
pnpm dev:admin        # Start admin app
pnpm dev:customer     # Start customer app
pnpm dev:hotel        # Start hotel app
pnpm dev:provider     # Start provider app
pnpm dev:api          # Start API server

# Build
pnpm build            # Build all apps
pnpm build:admin      # Build admin app
# ... same pattern for other apps

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage

# Linting
pnpm lint             # Lint all
pnpm lint:fix         # Lint and fix

# Type Checking
pnpm typecheck        # Check all

# Database
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate Prisma client
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database

# Clean
pnpm clean            # Clean build artifacts
```

---

## 🎨 Design Resources

### Figma
- **Design File:** [Link to Figma]
- **Component Library:** [Link to Components]
- **Style Guide:** [Link to Style Guide]

### Brand Assets
- **Colors:** Primary: #4F46E5, Secondary: #06B6D4
- **Typography:** Primary: Inter, Secondary: Sarabun
- **Logo:** Available in `/public/assets/`

---

## 📖 API Documentation

API documentation is available at:
- **Development:** http://localhost:3000/docs
- **Staging:** https://api-staging.theblissathome.com/docs
- **Production:** https://api.theblissathome.com/docs

### Key Endpoints

```
Authentication:
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/verify-otp

Bookings:
GET    /api/v1/bookings
POST   /api/v1/bookings
GET    /api/v1/bookings/:id
PATCH  /api/v1/bookings/:id
DELETE /api/v1/bookings/:id

Services:
GET    /api/v1/services
GET    /api/v1/services/:id
POST   /api/v1/services        # Admin only
PATCH  /api/v1/services/:id    # Admin only

Payments:
POST   /api/v1/payments
GET    /api/v1/payments/:id
POST   /api/v1/payments/:id/refund

... more endpoints in TECHNICAL_SPECIFICATION.md
```

---

## 🧪 Testing

### Unit Tests
```bash
pnpm test
```

### Integration Tests
```bash
pnpm test:integration
```

### E2E Tests
```bash
pnpm test:e2e
```

### Test Coverage
```bash
pnpm test:coverage
```

---

## 🚢 Deployment

### Staging
```bash
git push origin staging
# GitHub Actions will automatically deploy
```

### Production
```bash
git push origin main
# Requires manual approval in GitHub Actions
```

### Manual Deployment
```bash
# Build all apps
pnpm build

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔒 Security

### Authentication
- JWT tokens (15 min expiry)
- Refresh tokens (7 days expiry)
- OTP verification for sensitive operations
- Rate limiting on auth endpoints

### Authorization
- Role-Based Access Control (RBAC)
- Route-level permissions
- API key validation

### Data Protection
- HTTPS only in production
- Password hashing (bcrypt)
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

---

## 📊 Monitoring

### Error Tracking
- **Sentry:** Real-time error tracking
- **Logs:** Winston logger with rotation

### Performance
- **Prometheus:** Metrics collection
- **Grafana:** Visualization dashboards

### Uptime
- **UptimeRobot:** 24/7 monitoring
- **Target:** 99.5% uptime

---

## 🤝 Contributing

### Branching Strategy
- `main` - Production
- `staging` - Staging environment
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fixes
- `hotfix/*` - Production hotfixes

### Commit Convention
Use Conventional Commits:
```
feat: add booking cancellation feature
fix: resolve payment webhook issue
docs: update API documentation
refactor: improve booking service logic
test: add booking service tests
chore: update dependencies
```

### Pull Request Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Push to remote
4. Create Pull Request to `develop`
5. Wait for review and approval
6. Merge and deploy to staging
7. After testing, merge to `main`

---

## 📞 Support & Contact

### Documentation
- Technical Specification: `TECHNICAL_SPECIFICATION.md`
- Quick Start: `QUICK_START.md`
- Code Patterns: `CODE_PATTERNS.md`
- Development Roadmap: `DEVELOPMENT_ROADMAP.md`

### External Documentation
- [Prisma Docs](https://www.prisma.io/docs)
- [React Docs](https://react.dev)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com)
- [LINE LIFF](https://developers.line.biz/en/docs/liff/)
- [Omise API](https://docs.opn.ooo)

### Team
- **Project Manager:** [Name]
- **Tech Lead:** [Name]
- **Frontend Developers:** [Names]
- **Backend Developers:** [Names]
- **UI/UX Designer:** [Name]

---

## 📝 License

This project is proprietary software. All rights reserved.

© 2026 The Bliss at Home. All rights reserved.

---

## 🎯 Project Status

**Current Phase:** Setup & Planning
**Start Date:** January 13, 2026
**Expected Launch:** April 13, 2026 (12 weeks)

### Milestones
- [x] Requirements Analysis Complete
- [x] Technical Documentation Complete
- [ ] UI/UX Design (Week 1-4)
- [ ] Core Development (Week 5-8)
- [ ] Provider & Admin (Week 9-11)
- [ ] Integration & QA (Week 12)
- [ ] Production Launch

---

## 🌟 Key Features Summary

✅ **4 Separate Applications** in Monorepo
✅ **Real-time Updates** with WebSocket
✅ **Multi-language Support** (TH/EN/CN)
✅ **Payment Integration** (Omise)
✅ **LINE LIFF** for Staff App
✅ **Google Maps** Integration
✅ **Comprehensive Admin Panel**
✅ **Mobile-First Design**
✅ **Automated Billing** for Hotels
✅ **Analytics & Reporting**

---

**Ready to start building? Check out `QUICK_START.md` to begin! 🚀**

