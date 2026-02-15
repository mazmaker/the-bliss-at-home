# The Bliss Massage at Home - Technical Specification Document
## เอกสารสำหรับการพัฒนาด้วย Claude Code

**เวอร์ชัน:** 1.0  
**วันที่:** 13 มกราคม 2026  
**จัดทำโดย:** AI Development Team

---

## 📋 สารบัญ

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [สถาปัตยกรรมระบบ](#2-สถาปัตยกรรมระบบ)
3. [โครงสร้าง Monorepo](#3-โครงสร้าง-monorepo)
4. [Technology Stack](#4-technology-stack)
5. [Database Schema](#5-database-schema)
6. [API Specification](#6-api-specification)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [รายละเอียดแต่ละแอพพลิเคชัน](#8-รายละเอียดแต่ละแอพพลิเคชัน)
9. [Integration Services](#9-integration-services)
10. [Deployment Strategy](#10-deployment-strategy)
11. [Development Workflow](#11-development-workflow)

---

## 1. ภาพรวมโปรเจกต์

### 1.1 วัตถุประสงค์
ระบบจองบริการนวด สปา และทำเล็บถึงที่ โดยรองรับ 4 กลุ่มผู้ใช้งานหลัก:
- **Admin** - จัดการระบบทั้งหมด
- **Customer** - ลูกค้าทั่วไปและลูกค้าจากโรงแรม
- **Hotel** - โรงแรมที่เป็นพันธมิตรธุรกิจ
- **Provider** - หมอนวดที่ให้บริการผ่าน LINE LIFF

### 1.2 Key Features
- ระบบจองแบบ Real-time
- การชำระเงินผ่าน Omise Payment Gateway
- การแจ้งเตือนผ่าน LINE Messaging API
- Multi-language Support (TH/EN/CN)
- Google Maps Integration
- Billing & Invoice Management
- Performance Analytics & Reporting

---

## 2. สถาปัตยกรรมระบบ

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer (Nginx)                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
│  Admin Web App │      │ Customer Web App│      │  Hotel Web App  │
│   (React SPA)  │      │   (React SPA)   │      │   (React SPA)   │
└────────────────┘      └─────────────────┘      └─────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │ Provider LINE LIFF│
                        │   (React + LIFF)  │
                        └───────────────────┘
                                  │
                ┌─────────────────┴─────────────────┐
                │         API Gateway (Node.js)     │
                │      Express + GraphQL/REST       │
                └─────────────────┬─────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
│   PostgreSQL   │      │  Redis Cache    │      │  S3/Storage     │
│   (Database)   │      │   (Session)     │      │  (Documents)    │
└────────────────┘      └─────────────────┘      └─────────────────┘
        │
        └─────────────────┐
                          │
        ┌─────────────────▼─────────────────┐
        │     External Services             │
        │  • Omise Payment Gateway          │
        │  • LINE Messaging API             │
        │  • Google Maps API                │
        │  • SendGrid (Email)               │
        └───────────────────────────────────┘
```

### 2.2 System Architecture Principles
- **Microservices-ready**: แยก API เป็น modules สำหรับแต่ละ domain
- **Mobile-first**: Responsive design สำหรับทุกหน้าจอ
- **Real-time Updates**: WebSocket สำหรับการอัพเดทสถานะ
- **Security**: HTTPS, JWT, RBAC, OTP
- **Scalability**: Horizontal scaling พร้อม Load Balancer

---

## 3. โครงสร้าง Monorepo

### 3.1 Folder Structure

```
the-bliss-at-home/
├── apps/
│   ├── admin/                    # Admin Web Application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/           # Redux/Zustand
│   │   │   ├── utils/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── customer/                 # Customer Web Application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   ├── utils/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── hotel/                    # Hotel Web Application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   ├── utils/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── provider/                 # Provider LINE LIFF Application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── liff/            # LINE LIFF specific
│   │   │   ├── store/
│   │   │   ├── utils/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── api/                      # Backend API Server
│       ├── src/
│       │   ├── config/           # Configuration files
│       │   ├── controllers/      # Route controllers
│       │   ├── models/           # Database models (Prisma/TypeORM)
│       │   ├── services/         # Business logic
│       │   ├── middlewares/      # Express middlewares
│       │   ├── routes/           # API routes
│       │   ├── utils/            # Utility functions
│       │   ├── validators/       # Request validation
│       │   ├── jobs/             # Background jobs
│       │   ├── websocket/        # WebSocket handlers
│       │   └── server.ts         # Entry point
│       ├── prisma/               # Prisma schema & migrations
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── tests/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                     # Shared packages
│   ├── ui/                       # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button/
│   │   │   │   ├── Input/
│   │   │   │   ├── Card/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Table/
│   │   │   │   └── ...
│   │   │   ├── layouts/
│   │   │   ├── theme/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── types/                    # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── models/
│   │   │   ├── enums/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── utils/                    # Shared utilities
│   │   ├── src/
│   │   │   ├── date.ts
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── config/                   # Shared configuration
│   │   ├── src/
│   │   │   ├── constants.ts
│   │   │   ├── env.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── i18n/                     # Internationalization
│       ├── src/
│       │   ├── locales/
│       │   │   ├── th.json
│       │   │   ├── en.json
│       │   │   └── cn.json
│       │   ├── index.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.admin
│   ├── Dockerfile.customer
│   ├── Dockerfile.hotel
│   ├── Dockerfile.provider
│   └── Dockerfile.api
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
├── scripts/
│   ├── setup.sh
│   └── migrate.sh
├── .gitignore
├── .env.example
├── package.json              # Root package.json
├── pnpm-workspace.yaml       # pnpm workspace config
├── turbo.json                # Turborepo config
├── tsconfig.json             # Root TypeScript config
└── README.md
```

### 3.2 Package Manager
ใช้ **pnpm** + **Turborepo** สำหรับจัดการ Monorepo

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "outputs": []
    }
  }
}
```

---

## 4. Technology Stack

### 4.1 Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.x | UI Framework |
| **TypeScript** | 5.x | Type Safety |
| **Vite** | 5.x | Build Tool |
| **React Router** | 6.x | Routing |
| **TanStack Query** | 5.x | Data Fetching |
| **Zustand / Redux Toolkit** | Latest | State Management |
| **Tailwind CSS** | 3.x | Styling |
| **Shadcn/ui** | Latest | UI Components |
| **React Hook Form** | 7.x | Form Management |
| **Zod** | Latest | Validation |
| **i18next** | Latest | Internationalization |
| **date-fns** | Latest | Date Utilities |
| **Axios** | Latest | HTTP Client |
| **Socket.io-client** | Latest | Real-time Communication |

#### LINE LIFF Specific
| Technology | Version | Purpose |
|-----------|---------|---------|
| **@line/liff** | Latest | LINE LIFF SDK |
| **liff-type** | Latest | LIFF TypeScript Types |

### 4.2 Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20.x LTS | Runtime |
| **TypeScript** | 5.x | Type Safety |
| **Express.js** | 4.x | Web Framework |
| **Prisma** | Latest | ORM |
| **PostgreSQL** | 16.x | Database |
| **Redis** | 7.x | Cache & Sessions |
| **Socket.io** | Latest | WebSocket |
| **JWT** | Latest | Authentication |
| **Bcrypt** | Latest | Password Hashing |
| **Zod** | Latest | Validation |
| **Winston** | Latest | Logging |
| **Bull** | Latest | Job Queue |

### 4.3 External Services

| Service | Purpose | Provider |
|---------|---------|----------|
| **Omise** | Payment Gateway | Omise Co., Ltd. |
| **LINE Messaging API** | Notifications & LIFF | LINE Corporation |
| **Google Maps API** | Location Services | Google Cloud |
| **SendGrid** | Email Service | Twilio SendGrid |
| **AWS S3** | File Storage | Amazon Web Services |
| **Cloudflare** | CDN & DDoS Protection | Cloudflare, Inc. |

### 4.4 DevOps

| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Local Development |
| **GitHub Actions** | CI/CD |
| **Nginx** | Load Balancer & Reverse Proxy |
| **PM2** | Process Manager |
| **Sentry** | Error Tracking |
| **Prometheus + Grafana** | Monitoring |

---

## 5. Database Schema

### 5.1 Core Tables

#### Users Table
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  phoneNumber   String    @unique
  passwordHash  String?
  role          UserRole
  status        UserStatus @default(ACTIVE)
  
  // Profile
  firstName     String
  lastName      String
  profileImage  String?
  language      Language   @default(TH)
  
  // Social Auth
  googleId      String?    @unique
  facebookId    String?    @unique
  lineId        String?    @unique
  
  // OTP
  otpCode       String?
  otpExpiry     DateTime?
  otpVerified   Boolean    @default(false)
  
  // Timestamps
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  lastLoginAt   DateTime?
  
  // Relations
  customerProfile  Customer?
  hotelProfile     Hotel?
  providerProfile  Provider?
  adminProfile     Admin?
  bookings         Booking[]
  reviews          Review[]
  notifications    Notification[]
  
  @@index([email])
  @@index([phoneNumber])
  @@index([role, status])
}

enum UserRole {
  CUSTOMER
  HOTEL
  PROVIDER
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  BANNED
  PENDING
}

enum Language {
  TH
  EN
  CN
}
```

#### Customer Table
```prisma
model Customer {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Preferences
  favoriteServices Service[]
  savedAddresses   Address[]
  
  // Billing Info
  taxId           String?
  companyName     String?
  billingAddress  String?
  
  // Stats
  totalBookings   Int       @default(0)
  totalSpent      Decimal   @default(0)
  loyaltyPoints   Int       @default(0)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### Hotel Table
```prisma
model Hotel {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Hotel Info
  hotelName       String
  hotelCode       String    @unique
  hotelType       String
  starRating      Int?
  
  // Contact
  address         String
  city            String
  province        String
  postalCode      String
  country         String    @default("Thailand")
  latitude        Float
  longitude       Float
  
  contactPerson   String
  contactPhone    String
  contactEmail    String
  
  // Billing
  taxId           String
  billingCycle    BillingCycle @default(MONTHLY)
  billingDay      Int       @default(1)
  creditLimit     Decimal?
  
  // Settings
  autoConfirm     Boolean   @default(false)
  commission      Decimal   @default(0)
  
  // Stats
  totalBookings   Int       @default(0)
  totalRevenue    Decimal   @default(0)
  
  // Relations
  bookings        Booking[]
  invoices        Invoice[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([hotelCode])
}

enum BillingCycle {
  WEEKLY
  MONTHLY
}
```

#### Provider Table
```prisma
model Provider {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Profile
  nickname        String
  gender          Gender
  birthDate       DateTime
  idCardNumber    String    @unique
  
  // LINE
  lineUserId      String?   @unique
  lineDisplayName String?
  
  // Skills
  skills          ProviderSkill[]
  certifications  String[]  // Array of certification URLs
  
  // Work Info
  experience      Int       // years
  rating          Decimal   @default(0)
  totalReviews    Int       @default(0)
  totalBookings   Int       @default(0)
  
  // Service Area
  serviceRadius   Int       @default(10) // km
  homeLatitude    Float?
  homeLongitude   Float?
  
  // Payment
  bankName        String?
  bankAccount     String?
  bankAccountName String?
  
  // Schedule
  availableSlots  ProviderSchedule[]
  
  // Status
  isAvailable     Boolean   @default(true)
  isVerified      Boolean   @default(false)
  
  // Stats
  totalEarnings   Decimal   @default(0)
  pendingPayment  Decimal   @default(0)
  
  // Relations
  bookings        Booking[]
  payments        ProviderPayment[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([lineUserId])
  @@index([isAvailable, isVerified])
}

enum Gender {
  MALE
  FEMALE
  OTHER
}
```

#### Service Table
```prisma
model Service {
  id              String    @id @default(cuid())
  name            String
  nameEN          String
  nameCN          String
  slug            String    @unique
  
  category        ServiceCategory
  description     String
  descriptionEN   String
  descriptionCN   String
  
  // Pricing
  basePrice       Decimal
  duration        Int       // minutes
  
  // Media
  imageUrl        String
  images          String[]
  
  // Settings
  isActive        Boolean   @default(true)
  requiresGender  Boolean   @default(false)
  
  // Add-ons
  addOns          ServiceAddOn[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([category, isActive])
  @@index([slug])
}

enum ServiceCategory {
  MASSAGE
  SPA
  NAIL
  PACKAGE
}
```

#### Booking Table
```prisma
model Booking {
  id              String    @id @default(cuid())
  bookingCode     String    @unique
  
  // Parties
  customerId      String?
  customer        User?     @relation(fields: [customerId], references: [id])
  
  hotelId         String?
  hotel           Hotel?    @relation(fields: [hotelId], references: [id])
  
  providerId      String?
  provider        Provider? @relation(fields: [providerId], references: [id])
  
  // Service Details
  serviceId       String
  service         Service   @relation(fields: [serviceId], references: [id])
  addOns          BookingAddOn[]
  
  // Schedule
  bookingDate     DateTime
  startTime       DateTime
  endTime         DateTime
  duration        Int       // minutes
  
  // Location
  address         String
  latitude        Float
  longitude       Float
  roomNumber      String?   // for hotel bookings
  specialNotes    String?
  
  // Pricing
  basePrice       Decimal
  addOnPrice      Decimal   @default(0)
  discount        Decimal   @default(0)
  tax             Decimal   @default(0)
  totalPrice      Decimal
  
  // Status
  status          BookingStatus @default(PENDING)
  paymentStatus   PaymentStatus @default(PENDING)
  
  // Provider Preference
  preferredGender Gender?
  
  // Cancellation
  cancelledAt     DateTime?
  cancelledBy     String?
  cancellationReason String?
  refundAmount    Decimal?
  
  // Relations
  payment         Payment?
  review          Review?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([bookingCode])
  @@index([status])
  @@index([bookingDate])
  @@index([customerId])
  @@index([hotelId])
  @@index([providerId])
}

enum BookingStatus {
  PENDING
  CONFIRMED
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  PAID
  REFUNDED
  FAILED
}
```

#### Payment Table
```prisma
model Payment {
  id              String    @id @default(cuid())
  bookingId       String    @unique
  booking         Booking   @relation(fields: [bookingId], references: [id])
  
  // Omise
  omiseChargeId   String?   @unique
  omiseCustomerId String?
  
  // Payment Info
  amount          Decimal
  currency        String    @default("THB")
  method          PaymentMethod
  status          PaymentStatus
  
  // Card Info (if applicable)
  cardBrand       String?
  cardLastDigits  String?
  
  // Timeline
  paidAt          DateTime?
  refundedAt      DateTime?
  
  // Receipt
  receiptUrl      String?
  invoiceNumber   String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([omiseChargeId])
  @@index([status])
}

enum PaymentMethod {
  CREDIT_CARD
  DEBIT_CARD
  PROMPTPAY
  BANK_TRANSFER
  CASH
}
```

#### Review Table
```prisma
model Review {
  id              String    @id @default(cuid())
  bookingId       String    @unique
  booking         Booking   @relation(fields: [bookingId], references: [id])
  
  customerId      String
  customer        User      @relation(fields: [customerId], references: [id])
  
  providerId      String
  provider        Provider  @relation(fields: [providerId], references: [id])
  
  // Ratings (1-5)
  overallRating   Int
  serviceRating   Int
  attitudeRating  Int
  cleanlinessRating Int
  
  // Comments
  comment         String?
  
  // Status
  isPublic        Boolean   @default(true)
  isVerified      Boolean   @default(false)
  
  // Response
  providerResponse String?
  respondedAt     DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([providerId])
  @@index([overallRating])
}
```

### 5.2 Supporting Tables

#### Promotion Table
```prisma
model Promotion {
  id              String    @id @default(cuid())
  code            String    @unique
  name            String
  nameEN          String
  nameCN          String
  description     String
  
  // Discount
  discountType    DiscountType
  discountValue   Decimal
  maxDiscount     Decimal?
  minPurchase     Decimal?
  
  // Conditions
  applicableServices String[] // Service IDs
  userTypes       UserRole[]
  
  // Limits
  totalLimit      Int?
  userLimit       Int       @default(1)
  usedCount       Int       @default(0)
  
  // Validity
  startDate       DateTime
  endDate         DateTime
  isActive        Boolean   @default(true)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([code])
  @@index([isActive, startDate, endDate])
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}
```

#### Notification Table
```prisma
model Notification {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type            NotificationType
  title           String
  message         String
  
  // Reference
  referenceType   String?   // e.g., "booking", "payment"
  referenceId     String?
  
  // Status
  isRead          Boolean   @default(false)
  readAt          DateTime?
  
  // Delivery
  sentVia         String[]  // ["app", "email", "line"]
  
  createdAt       DateTime  @default(now())
  
  @@index([userId, isRead])
  @@index([createdAt])
}

enum NotificationType {
  BOOKING_CONFIRMED
  BOOKING_CANCELLED
  PAYMENT_SUCCESS
  PAYMENT_FAILED
  PROVIDER_ASSIGNED
  SERVICE_STARTED
  SERVICE_COMPLETED
  REVIEW_REQUEST
  PROMOTION
  SYSTEM
}
```

#### Invoice Table
```prisma
model Invoice {
  id              String    @id @default(cuid())
  invoiceNumber   String    @unique
  
  hotelId         String
  hotel           Hotel     @relation(fields: [hotelId], references: [id])
  
  // Period
  billingPeriod   String    // e.g., "2026-01"
  startDate       DateTime
  endDate         DateTime
  
  // Items
  items           InvoiceItem[]
  
  // Amounts
  subtotal        Decimal
  tax             Decimal   @default(0)
  discount        Decimal   @default(0)
  total           Decimal
  
  // Status
  status          InvoiceStatus @default(PENDING)
  dueDate         DateTime
  paidAt          DateTime?
  
  // Files
  pdfUrl          String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([hotelId])
  @@index([invoiceNumber])
  @@index([status])
}

enum InvoiceStatus {
  PENDING
  APPROVED
  PAID
  OVERDUE
  CANCELLED
}

model InvoiceItem {
  id              String    @id @default(cuid())
  invoiceId       String
  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  bookingId       String
  description     String
  quantity        Int       @default(1)
  unitPrice       Decimal
  amount          Decimal
  
  createdAt       DateTime  @default(now())
}
```

---

## 6. API Specification

### 6.1 API Structure

**Base URL:** `https://api.theblissathome.com/v1`

**Authentication:**
- Header: `Authorization: Bearer <JWT_TOKEN>`

**Response Format:**
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}
```

### 6.2 Main API Endpoints

#### Authentication (`/auth`)
```
POST   /auth/register              # Register new user
POST   /auth/login                 # Login
POST   /auth/logout                # Logout
POST   /auth/refresh               # Refresh token
POST   /auth/verify-otp            # Verify OTP
POST   /auth/resend-otp            # Resend OTP
POST   /auth/forgot-password       # Request password reset
POST   /auth/reset-password        # Reset password
POST   /auth/social/google         # Google OAuth
POST   /auth/social/facebook       # Facebook OAuth
POST   /auth/social/line           # LINE OAuth
```

#### Users (`/users`)
```
GET    /users/me                   # Get current user profile
PATCH  /users/me                   # Update current user profile
GET    /users/:id                  # Get user by ID (admin)
PATCH  /users/:id/status           # Update user status (admin)
DELETE /users/:id                  # Delete user (admin)
```

#### Bookings (`/bookings`)
```
GET    /bookings                   # List bookings
POST   /bookings                   # Create booking
GET    /bookings/:id               # Get booking details
PATCH  /bookings/:id               # Update booking
DELETE /bookings/:id               # Cancel booking
POST   /bookings/:id/assign        # Assign provider (admin)
PATCH  /bookings/:id/status        # Update status
GET    /bookings/:id/tracking      # Get real-time tracking
```

#### Services (`/services`)
```
GET    /services                   # List services
GET    /services/:id               # Get service details
POST   /services                   # Create service (admin)
PATCH  /services/:id               # Update service (admin)
DELETE /services/:id               # Delete service (admin)
GET    /services/categories        # Get categories
```

#### Providers (`/providers`)
```
GET    /providers                  # List providers
GET    /providers/:id              # Get provider details
POST   /providers                  # Create provider (admin)
PATCH  /providers/:id              # Update provider
GET    /providers/:id/schedule     # Get schedule
PATCH  /providers/:id/schedule     # Update schedule
GET    /providers/:id/earnings     # Get earnings
GET    /providers/:id/jobs         # Get jobs
PATCH  /providers/:id/jobs/:jobId  # Accept/decline job
```

#### Hotels (`/hotels`)
```
GET    /hotels                     # List hotels (admin)
GET    /hotels/:id                 # Get hotel details
POST   /hotels                     # Create hotel (admin)
PATCH  /hotels/:id                 # Update hotel
GET    /hotels/:id/bookings        # Get hotel bookings
GET    /hotels/:id/invoices        # Get invoices
GET    /hotels/:id/invoice/:invoiceId # Get invoice details
```

#### Payments (`/payments`)
```
POST   /payments                   # Create payment
GET    /payments/:id               # Get payment details
POST   /payments/:id/refund        # Refund payment (admin)
GET    /payments/methods           # Get available payment methods
POST   /payments/webhook/omise     # Omise webhook
```

#### Promotions (`/promotions`)
```
GET    /promotions                 # List active promotions
GET    /promotions/:code           # Validate promo code
POST   /promotions                 # Create promotion (admin)
PATCH  /promotions/:id             # Update promotion (admin)
DELETE /promotions/:id             # Delete promotion (admin)
```

#### Reviews (`/reviews`)
```
GET    /reviews                    # List reviews
POST   /reviews                    # Create review
GET    /reviews/:id                # Get review details
PATCH  /reviews/:id                # Update review
DELETE /reviews/:id                # Delete review (admin)
POST   /reviews/:id/response       # Add provider response
```

#### Notifications (`/notifications`)
```
GET    /notifications              # List notifications
PATCH  /notifications/:id/read     # Mark as read
PATCH  /notifications/read-all     # Mark all as read
DELETE /notifications/:id          # Delete notification
```

#### Reports (`/reports`)
```
GET    /reports/bookings           # Booking report
GET    /reports/revenue            # Revenue report
GET    /reports/providers          # Provider performance
GET    /reports/hotels             # Hotel usage
GET    /reports/customers          # Customer analytics
POST   /reports/export             # Export report
```

#### Admin (`/admin`)
```
GET    /admin/dashboard            # Dashboard stats
GET    /admin/analytics            # Analytics data
GET    /admin/settings             # Get settings
PATCH  /admin/settings             # Update settings
GET    /admin/logs                 # System logs
POST   /admin/broadcast            # Send broadcast notification
```

---

## 7. Authentication & Authorization

### 7.1 JWT Token Structure

**Access Token:**
```typescript
interface JWTPayload {
  sub: string         // User ID
  role: UserRole
  email: string
  iat: number        // Issued at
  exp: number        // Expires at (15 minutes)
}
```

**Refresh Token:**
```typescript
interface RefreshTokenPayload {
  sub: string
  iat: number
  exp: number        // Expires at (7 days)
}
```

### 7.2 Role-Based Access Control (RBAC)

**Permissions Matrix:**

| Feature | Customer | Hotel | Provider | Admin |
|---------|----------|-------|----------|-------|
| Create Booking | ✅ | ✅ | ❌ | ✅ |
| View Own Bookings | ✅ | ✅ | ✅ | ✅ |
| View All Bookings | ❌ | ❌ | ❌ | ✅ |
| Cancel Booking | ✅ (own) | ✅ (own) | ❌ | ✅ |
| Manage Services | ❌ | ❌ | ❌ | ✅ |
| Accept/Decline Jobs | ❌ | ❌ | ✅ | ✅ |
| View Reports | ❌ | ✅ (own) | ✅ (own) | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| Manage Promotions | ❌ | ❌ | ❌ | ✅ |

### 7.3 OTP Flow

```typescript
// 1. Request OTP
POST /auth/verify-otp
{
  phoneNumber: "+66812345678"
}

// 2. Verify OTP
POST /auth/verify-otp
{
  phoneNumber: "+66812345678",
  otpCode: "123456"
}

// Response
{
  success: true,
  data: {
    accessToken: "...",
    refreshToken: "...",
    user: { ... }
  }
}
```

---

## 8. รายละเอียดแต่ละแอพพลิเคชัน

### 8.1 Admin Web App

**Main Features:**
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

**Key Pages:**
```
/                           # Dashboard
/bookings                   # Bookings List
/bookings/:id               # Booking Details
/services                   # Services Management
/services/new               # Add New Service
/services/:id/edit          # Edit Service
/providers                  # Providers List
/providers/:id              # Provider Details
/hotels                     # Hotels List
/hotels/:id                 # Hotel Details
/customers                  # Customers List
/customers/:id              # Customer Details
/payments                   # Payments List
/payments/:id               # Payment Details
/promotions                 # Promotions Management
/reports                    # Reports
/reports/bookings           # Booking Reports
/reports/revenue            # Revenue Reports
/reports/providers          # Provider Performance
/reports/hotels             # Hotel Reports
/settings                   # System Settings
/settings/general           # General Settings
/settings/notifications     # Notification Settings
/settings/payment           # Payment Settings
```

**State Management:**
```typescript
// Zustand Store Example
interface AdminStore {
  // Dashboard
  stats: DashboardStats | null
  loadStats: () => Promise<void>
  
  // Bookings
  bookings: Booking[]
  filters: BookingFilters
  loadBookings: () => Promise<void>
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<void>
  
  // Services
  services: Service[]
  loadServices: () => Promise<void>
  createService: (data: CreateServiceDto) => Promise<void>
  updateService: (id: string, data: UpdateServiceDto) => Promise<void>
  deleteService: (id: string) => Promise<void>
  
  // And more...
}
```

### 8.2 Customer Web App

**Main Features:**
- Browse Services
- Step-by-Step Booking
- Payment Integration
- Booking History
- Profile Management
- Reviews & Ratings
- Multi-language Support

**Key Pages:**
```
/                           # Home
/services                   # Service Catalog
/services/:slug             # Service Details
/booking                    # Booking Flow
/booking/confirm            # Booking Confirmation
/booking/payment            # Payment
/booking/success            # Success Page
/bookings                   # My Bookings
/bookings/:id               # Booking Details
/profile                    # Profile
/profile/addresses          # Manage Addresses
/profile/settings           # Settings
/reviews                    # My Reviews
/help                       # Help Center
```

**Booking Flow:**
```typescript
// Booking State
interface BookingState {
  step: 1 | 2 | 3 | 4 | 5
  service: Service | null
  addOns: ServiceAddOn[]
  date: Date | null
  time: string | null
  address: Address | null
  preferredGender: Gender | null
  specialNotes: string
  promotion: Promotion | null
  
  // Actions
  selectService: (service: Service) => void
  toggleAddOn: (addOn: ServiceAddOn) => void
  setDateTime: (date: Date, time: string) => void
  setAddress: (address: Address) => void
  setPreferredGender: (gender: Gender) => void
  setSpecialNotes: (notes: string) => void
  applyPromotion: (code: string) => Promise<void>
  
  // Calculate
  calculateTotal: () => number
  
  // Submit
  submitBooking: () => Promise<void>
}
```

### 8.3 Hotel Web App

**Main Features:**
- Hotel Dashboard
- Guest Booking Management
- Billing & Invoice Management
- Hotel Profile

**Key Pages:**
```
/                           # Dashboard
/bookings                   # Bookings List
/bookings/new               # Create Booking for Guest
/bookings/:id               # Booking Details
/billing                    # Billing Overview
/billing/invoices           # Invoices List
/billing/invoices/:id       # Invoice Details
/profile                    # Hotel Profile
/settings                   # Settings
```

**Dashboard Widgets:**
```typescript
interface HotelDashboard {
  bookingOverview: {
    today: number
    upcoming: number
    completed: number
    cancelled: number
  }
  billingSummary: {
    currentPeriod: string
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    status: InvoiceStatus
  }
  recentBookings: Booking[]
  upcomingAppointments: Booking[]
  guestActivity: {
    totalGuests: number
    repeatGuests: number
    averageRating: number
  }
}
```

### 8.4 Provider LINE LIFF App

**Main Features:**
- Job Management via LINE
- Real-time Job Notifications
- Schedule Calendar
- Earnings Tracking
- Profile & Documents

**Key Pages:**
```
/                           # Jobs Feed
/jobs/:id                   # Job Details
/jobs/:id/accept            # Accept Job
/jobs/:id/start             # Start Service
/jobs/:id/complete          # Complete Service
/schedule                   # Calendar View
/earnings                   # Earnings Dashboard
/earnings/history           # Payment History
/profile                    # Profile
/profile/documents          # Documents
/profile/bank               # Bank Account
/settings                   # Settings
```

**LINE LIFF Integration:**
```typescript
// LIFF Initialization
import liff from '@line/liff'

const initializeLiff = async () => {
  try {
    await liff.init({ liffId: 'YOUR_LIFF_ID' })
    
    if (liff.isLoggedIn()) {
      // Get user profile
      const profile = await liff.getProfile()
      const accessToken = liff.getAccessToken()
      
      // Authenticate with backend
      const response = await api.post('/auth/line', {
        lineUserId: profile.userId,
        lineAccessToken: accessToken
      })
      
      // Store JWT
      localStorage.setItem('token', response.data.accessToken)
    } else {
      liff.login()
    }
  } catch (error) {
    console.error('LIFF init error:', error)
  }
}
```

**Job Notification Flow:**
```typescript
// Backend sends LINE notification
const sendJobNotification = async (provider: Provider, booking: Booking) => {
  const message = {
    type: 'flex',
    altText: 'งานใหม่!',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🔔 งานใหม่!',
            weight: 'bold',
            size: 'xl'
          },
          {
            type: 'text',
            text: booking.service.name,
            size: 'md',
            margin: 'md'
          },
          {
            type: 'text',
            text: `📅 ${formatDate(booking.bookingDate)}`,
            size: 'sm',
            color: '#666666'
          },
          {
            type: 'text',
            text: `⏰ ${formatTime(booking.startTime)}`,
            size: 'sm',
            color: '#666666'
          },
          {
            type: 'text',
            text: `📍 ${booking.address}`,
            size: 'sm',
            color: '#666666',
            wrap: true
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียด',
              uri: `https://liff.line.me/${LIFF_ID}/jobs/${booking.id}`
            },
            style: 'primary'
          }
        ]
      }
    }
  }
  
  await lineClient.pushMessage(provider.lineUserId, message)
}
```

---

## 9. Integration Services

### 9.1 Omise Payment Gateway

**Setup:**
```typescript
import Omise from 'omise'

const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY,
  secretKey: process.env.OMISE_SECRET_KEY
})
```

**Create Charge:**
```typescript
const createPayment = async (booking: Booking, tokenId: string) => {
  try {
    const charge = await omise.charges.create({
      amount: Math.round(booking.totalPrice * 100), // Convert to satang
      currency: 'THB',
      card: tokenId,
      description: `Booking #${booking.bookingCode}`,
      metadata: {
        bookingId: booking.id,
        customerId: booking.customerId,
        serviceType: booking.service.category
      },
      return_uri: `${process.env.FRONTEND_URL}/booking/payment/callback`
    })
    
    // Save payment record
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        omiseChargeId: charge.id,
        amount: booking.totalPrice,
        currency: 'THB',
        method: PaymentMethod.CREDIT_CARD,
        status: charge.status === 'successful' 
          ? PaymentStatus.PAID 
          : PaymentStatus.PENDING,
        cardBrand: charge.card?.brand,
        cardLastDigits: charge.card?.last_digits,
        paidAt: charge.paid ? new Date() : null
      }
    })
    
    return charge
  } catch (error) {
    throw new Error('Payment failed')
  }
}
```

**Webhook Handler:**
```typescript
app.post('/payments/webhook/omise', async (req, res) => {
  const event = req.body
  
  if (event.key === 'charge.complete') {
    const chargeId = event.data.id
    
    // Update payment status
    const payment = await prisma.payment.update({
      where: { omiseChargeId: chargeId },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date()
      },
      include: { booking: true }
    })
    
    // Update booking status
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: BookingStatus.CONFIRMED
      }
    })
    
    // Send confirmation notification
    await sendBookingConfirmation(payment.booking)
  }
  
  res.json({ received: true })
})
```

### 9.2 LINE Messaging API

**Setup:**
```typescript
import { Client } from '@line/bot-sdk'

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
})
```

**Send Push Message:**
```typescript
const sendJobNotification = async (
  lineUserId: string,
  booking: Booking
) => {
  await lineClient.pushMessage(lineUserId, {
    type: 'flex',
    altText: 'งานใหม่!',
    contents: {
      // Flex Message JSON
    }
  })
}
```

### 9.3 Google Maps API

**Geocoding:**
```typescript
import { Client } from '@googlemaps/google-maps-services-js'

const mapsClient = new Client({})

const geocodeAddress = async (address: string) => {
  const response = await mapsClient.geocode({
    params: {
      address,
      key: process.env.GOOGLE_MAPS_API_KEY
    }
  })
  
  const result = response.data.results[0]
  return {
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    formattedAddress: result.formatted_address
  }
}
```

**Distance Calculation:**
```typescript
const calculateDistance = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) => {
  const response = await mapsClient.distancematrix({
    params: {
      origins: [`${origin.lat},${origin.lng}`],
      destinations: [`${destination.lat},${destination.lng}`],
      key: process.env.GOOGLE_MAPS_API_KEY
    }
  })
  
  const element = response.data.rows[0].elements[0]
  return {
    distance: element.distance.value, // meters
    duration: element.duration.value, // seconds
    distanceText: element.distance.text,
    durationText: element.duration.text
  }
}
```

### 9.4 SendGrid Email

**Setup:**
```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)
```

**Send Email:**
```typescript
const sendBookingConfirmation = async (booking: Booking) => {
  const msg = {
    to: booking.customer.email,
    from: 'noreply@theblissathome.com',
    subject: `การจองของคุณได้รับการยืนยันแล้ว - ${booking.bookingCode}`,
    html: `
      <h1>การจองของคุณได้รับการยืนยันแล้ว</h1>
      <p>รหัสการจอง: ${booking.bookingCode}</p>
      <p>บริการ: ${booking.service.name}</p>
      <p>วันที่: ${formatDate(booking.bookingDate)}</p>
      <p>เวลา: ${formatTime(booking.startTime)}</p>
      <p>สถานที่: ${booking.address}</p>
      <p>ราคา: ฿${booking.totalPrice}</p>
    `
  }
  
  await sgMail.send(msg)
}
```

---

## 10. Deployment Strategy

### 10.1 Environment Setup

**Development:**
```bash
# .env.development
NODE_ENV=development
API_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/bliss_dev
REDIS_URL=redis://localhost:6379
```

**Staging:**
```bash
# .env.staging
NODE_ENV=staging
API_URL=https://api-staging.theblissathome.com
DATABASE_URL=postgresql://user:pass@staging-db:5432/bliss_staging
REDIS_URL=redis://staging-redis:6379
```

**Production:**
```bash
# .env.production
NODE_ENV=production
API_URL=https://api.theblissathome.com
DATABASE_URL=postgresql://user:pass@prod-db:5432/bliss_production
REDIS_URL=redis://prod-redis:6379
```

### 10.2 Docker Setup

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: bliss_production
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  
  # API Server
  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
  
  # Admin App
  admin:
    build:
      context: .
      dockerfile: docker/Dockerfile.admin
    ports:
      - "3001:80"
    depends_on:
      - api
  
  # Customer App
  customer:
    build:
      context: .
      dockerfile: docker/Dockerfile.customer
    ports:
      - "3002:80"
    depends_on:
      - api
  
  # Hotel App
  hotel:
    build:
      context: .
      dockerfile: docker/Dockerfile.hotel
    ports:
      - "3003:80"
    depends_on:
      - api
  
  # Staff App
  provider:
    build:
      context: .
      dockerfile: docker/Dockerfile.provider
    ports:
      - "3004:80"
    depends_on:
      - api
  
  # Nginx
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
      - admin
      - customer
      - hotel
      - provider

volumes:
  postgres_data:
  redis_data:
```

### 10.3 CI/CD Pipeline

**GitHub Actions (.github/workflows/deploy.yml):**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install
      - run: pnpm test
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push API
        uses: docker/build-push-action@v4
        with:
          context: .
          file: docker/Dockerfile.api
          push: true
          tags: thebliss/api:latest
      
      - name: Build and push Admin
        uses: docker/build-push-action@v4
        with:
          context: .
          file: docker/Dockerfile.admin
          push: true
          tags: thebliss/admin:latest
      
      # Similar for other apps...
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /var/www/thebliss
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

---

## 11. Development Workflow

### 11.1 Getting Started

**1. Clone Repository:**
```bash
git clone https://github.com/your-org/the-bliss-at-home.git
cd the-bliss-at-home
```

**2. Install Dependencies:**
```bash
pnpm install
```

**3. Setup Environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

**4. Setup Database:**
```bash
# Start PostgreSQL & Redis
docker-compose up -d postgres redis

# Run migrations
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate

# Seed database (optional)
pnpm prisma db seed
```

**5. Start Development:**
```bash
# Start all apps
pnpm dev

# Or start specific app
pnpm dev --filter admin
pnpm dev --filter customer
pnpm dev --filter hotel
pnpm dev --filter provider
pnpm dev --filter api
```

### 11.2 Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Start all apps
pnpm dev:admin        # Start admin only
pnpm dev:customer     # Start customer only
pnpm dev:hotel        # Start hotel only
pnpm dev:provider     # Start provider only
pnpm dev:api          # Start API only

# Build
pnpm build            # Build all apps
pnpm build:admin      # Build admin only
# etc...

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage

# Linting
pnpm lint             # Lint all
pnpm lint:fix         # Lint and fix

# Type checking
pnpm typecheck        # Check all

# Database
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate Prisma client
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio

# Clean
pnpm clean            # Clean all build artifacts
```

### 11.3 Branching Strategy

**Branches:**
- `main` - Production
- `staging` - Staging environment
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Hotfix branches

**Workflow:**
```bash
# Create feature branch
git checkout -b feature/booking-flow

# Work on feature
git add .
git commit -m "feat: implement booking flow"

# Push to remote
git push origin feature/booking-flow

# Create Pull Request to develop
# After review and approval, merge to develop
# Then deploy to staging for testing
# Finally, merge to main for production
```

### 11.4 Code Standards

**ESLint Config:**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error"],
    "react/react-in-jsx-scope": "off"
  }
}
```

**Prettier Config:**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "avoid"
}
```

### 11.5 Commit Convention

ใช้ **Conventional Commits:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code refactoring
- `test` - Testing
- `chore` - Maintenance

**Examples:**
```bash
feat(booking): add payment integration
fix(auth): resolve token refresh issue
docs(api): update API documentation
refactor(ui): improve button component
test(services): add service tests
chore(deps): update dependencies
```

---

## 📝 Additional Resources

### Documentation Links
- **Prisma Docs:** https://www.prisma.io/docs
- **React Docs:** https://react.dev
- **Vite Docs:** https://vitejs.dev
- **TanStack Query:** https://tanstack.com/query
- **Tailwind CSS:** https://tailwindcss.com
- **Shadcn/ui:** https://ui.shadcn.com
- **LINE LIFF:** https://developers.line.biz/en/docs/liff/overview/
- **Omise:** https://docs.opn.ooo
- **Google Maps:** https://developers.google.com/maps

### Project Links
- **Repository:** [GitHub URL]
- **Staging:** https://staging.theblissathome.com
- **Production:** https://theblissathome.com
- **API Docs:** https://api.theblissathome.com/docs
- **Design System:** [Figma URL]

---

## 🚀 Next Steps

1. **Setup Development Environment**
   - Install required tools
   - Clone repository
   - Setup database
   - Configure environment variables

2. **Review Designs**
   - Study UI/UX designs
   - Review component library
   - Understand user flows

3. **Setup Monorepo**
   - Initialize project structure
   - Configure build tools
   - Setup shared packages

4. **Start Development**
   - Implement core features
   - Write tests
   - Document code

5. **Integration**
   - Connect external services
   - Test integrations
   - Handle edge cases

6. **Testing & QA**
   - Unit tests
   - Integration tests
   - E2E tests
   - UAT

7. **Deployment**
   - Setup CI/CD
   - Deploy to staging
   - Deploy to production
   - Monitor & maintain

---

**Document Version:** 1.0  
**Last Updated:** 13 มกราคม 2026  
**Prepared For:** Claude Code Development

