# The Bliss Massage at Home - Quick Start Guide for Claude Code

## 🎯 สำหรับการใช้งานใน Claude Code

เอกสารนี้จัดทำขึ้นเพื่อให้คุณสามารถเริ่มพัฒนาโปรเจกต์ The Bliss Massage at Home ใน Claude Code ได้ทันที

---

## 📦 Prerequisites

ก่อนเริ่มต้น ตรวจสอบว่าคุณมีสิ่งเหล่านี้ติดตั้งแล้ว:

- Node.js 20.x หรือสูงกว่า
- pnpm 8.x
- PostgreSQL 16.x
- Redis 7.x
- Git

## 🚀 Quick Setup (5 นาที)

### 1. Create Project Structure

```bash
# สร้างโฟลเดอร์หลัก
mkdir the-bliss-at-home
cd the-bliss-at-home

# สร้างโครงสร้างพื้นฐาน
mkdir -p apps/{admin,customer,hotel,provider,api}
mkdir -p packages/{ui,types,utils,config,i18n}
mkdir -p docker docs scripts

# Initialize pnpm workspace
cat > pnpm-workspace.yaml << EOF
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Initialize root package.json
pnpm init
```

### 2. Install Root Dependencies

```bash
# Root dependencies
pnpm add -D typescript @types/node turbo prettier eslint
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D eslint-config-prettier eslint-plugin-react
pnpm add -D eslint-plugin-react-hooks

# Create tsconfig.json
cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
EOF
```

### 3. Setup API (Backend)

```bash
cd apps/api

# Initialize package.json
pnpm init

# Install dependencies
pnpm add express cors helmet morgan
pnpm add @prisma/client bcryptjs jsonwebtoken
pnpm add dotenv zod socket.io
pnpm add @line/bot-sdk @googlemaps/google-maps-services-js
pnpm add @sendgrid/mail omise bull

# Dev dependencies
pnpm add -D @types/express @types/cors @types/node
pnpm add -D @types/bcryptjs @types/jsonwebtoken
pnpm add -D prisma tsx nodemon typescript

# Initialize Prisma
npx prisma init

# Create basic server structure
mkdir -p src/{config,controllers,models,services,middlewares,routes,utils,validators}
```

**src/server.ts:**
```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { config } from './config'
import routes from './routes'

const app = express()

// Middlewares
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/v1', routes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Start server
const PORT = config.port || 3000
app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`)
})
```

### 4. Setup Admin App (Frontend)

```bash
cd apps/admin

# Create Vite + React + TypeScript project
pnpm create vite . --template react-ts

# Install dependencies
pnpm add react-router-dom @tanstack/react-query zustand
pnpm add axios zod react-hook-form @hookform/resolvers
pnpm add tailwindcss postcss autoprefixer
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm add date-fns recharts lucide-react

# Initialize Tailwind
npx tailwindcss init -p
```

### 5. Setup Customer App

```bash
cd apps/customer

# Create Vite + React + TypeScript project
pnpm create vite . --template react-ts

# Install same dependencies as admin
pnpm add react-router-dom @tanstack/react-query zustand
pnpm add axios zod react-hook-form @hookform/resolvers
pnpm add tailwindcss postcss autoprefixer
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm add date-fns lucide-react i18next react-i18next
```

### 6. Setup Hotel App

```bash
cd apps/hotel

# Create Vite + React + TypeScript project
pnpm create vite . --template react-ts

# Install dependencies (same as admin)
pnpm add react-router-dom @tanstack/react-query zustand
pnpm add axios zod react-hook-form @hookform/resolvers
pnpm add tailwindcss postcss autoprefixer
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm add date-fns recharts lucide-react
```

### 7. Setup Staff App (LINE LIFF)

```bash
cd apps/provider

# Create Vite + React + TypeScript project
pnpm create vite . --template react-ts

# Install dependencies including LINE LIFF
pnpm add react-router-dom @tanstack/react-query zustand
pnpm add axios zod react-hook-form @hookform/resolvers
pnpm add tailwindcss postcss autoprefixer
pnpm add @line/liff liff-type
pnpm add date-fns lucide-react
```

### 8. Setup Shared Packages

**packages/types:**
```bash
cd packages/types
pnpm init
mkdir src

# Create basic types
cat > src/index.ts << EOF
export * from './models'
export * from './api'
export * from './enums'
EOF
```

**packages/ui:**
```bash
cd packages/ui
pnpm init
mkdir -p src/components

pnpm add react react-dom
pnpm add -D @types/react @types/react-dom
pnpm add tailwindcss
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm add lucide-react
```

**packages/utils:**
```bash
cd packages/utils
pnpm init
mkdir src

cat > src/index.ts << EOF
export * from './date'
export * from './format'
export * from './validation'
EOF
```

### 9. Environment Variables

**apps/api/.env:**
```bash
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/bliss_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Omise
OMISE_PUBLIC_KEY=pkey_test_xxx
OMISE_SECRET_KEY=skey_test_xxx

# LINE
LINE_CHANNEL_ID=xxx
LINE_CHANNEL_SECRET=xxx
LINE_CHANNEL_ACCESS_TOKEN=xxx
LIFF_ID=xxx

# Google Maps
GOOGLE_MAPS_API_KEY=xxx

# SendGrid
SENDGRID_API_KEY=xxx
SENDGRID_FROM_EMAIL=noreply@theblissathome.com

# Frontend URLs
ADMIN_URL=http://localhost:3001
CUSTOMER_URL=http://localhost:3002
HOTEL_URL=http://localhost:3003
STAFF_URL=http://localhost:3004
```

### 10. Database Setup

**apps/api/prisma/schema.prisma:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Start with basic User model
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  phoneNumber   String   @unique
  passwordHash  String?
  role          UserRole
  status        UserStatus @default(ACTIVE)
  
  firstName     String
  lastName      String
  profileImage  String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([email])
  @@index([phoneNumber])
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
```

**Run migrations:**
```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

---

## 🎨 Development Scripts

เพิ่ม scripts ใน root package.json:

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "dev:api": "turbo run dev --filter=api",
    "dev:admin": "turbo run dev --filter=admin",
    "dev:customer": "turbo run dev --filter=customer",
    "dev:hotel": "turbo run dev --filter=hotel",
    "dev:provider": "turbo run dev --filter=provider",
    
    "build": "turbo run build",
    "build:api": "turbo run build --filter=api",
    "build:admin": "turbo run build --filter=admin",
    
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    
    "db:migrate": "cd apps/api && npx prisma migrate dev",
    "db:generate": "cd apps/api && npx prisma generate",
    "db:studio": "cd apps/api && npx prisma studio",
    
    "clean": "turbo run clean && rm -rf node_modules"
  }
}
```

---

## 📝 Using Claude Code

### สร้างไฟล์ใหม่

**คำสั่งที่ใช้บ่อย:**

```
# Create API endpoint
"Create a new API endpoint for booking management at apps/api/src/routes/bookings.ts with CRUD operations"

# Create React component
"Create a BookingCard component in apps/customer/src/components/BookingCard.tsx that displays booking information"

# Create database model
"Add a Booking model to prisma/schema.prisma with these fields: id, customerId, serviceId, date, time, status"

# Create service
"Create a booking service at apps/api/src/services/booking.service.ts that handles booking creation and validation"

# Create utility function
"Create a date formatting utility in packages/utils/src/date.ts"
```

### แก้ไขไฟล์

```
# Fix bug
"Fix the authentication middleware in apps/api/src/middlewares/auth.ts to properly validate JWT tokens"

# Refactor code
"Refactor the BookingForm component to use react-hook-form and zod validation"

# Add feature
"Add real-time booking status updates using socket.io in the booking details page"
```

### ทดสอบ

```
# Add tests
"Create unit tests for the booking service"

# Add integration tests
"Create integration tests for the booking API endpoints"
```

---

## 🔧 Common Tasks with Claude Code

### 1. สร้าง API Endpoint

```
"Create a POST /api/v1/bookings endpoint that:
1. Validates the request body using zod
2. Checks if the user is authenticated
3. Creates a new booking in the database
4. Returns the created booking with 201 status"
```

### 2. สร้าง React Page

```
"Create a booking history page at apps/customer/src/pages/BookingHistory.tsx that:
1. Fetches bookings using TanStack Query
2. Displays bookings in a responsive grid
3. Shows loading and error states
4. Allows filtering by status
5. Uses Tailwind CSS for styling"
```

### 3. เพิ่ม Database Model

```
"Update prisma/schema.prisma to add a Service model with:
- id (cuid)
- name (string)
- description (string)
- basePrice (decimal)
- duration (int, in minutes)
- category (enum: MASSAGE, SPA, NAIL, PACKAGE)
- isActive (boolean, default true)
- timestamps

Also create the migration"
```

### 4. สร้าง Shared Component

```
"Create a reusable Button component in packages/ui/src/components/Button.tsx that:
1. Supports variants: primary, secondary, outline, ghost
2. Supports sizes: sm, md, lg
3. Supports loading state with spinner
4. Uses Tailwind CSS
5. Exports TypeScript types"
```

### 5. เพิ่ม Authentication

```
"Implement JWT authentication:
1. Create auth middleware in apps/api/src/middlewares/auth.ts
2. Create login endpoint at apps/api/src/routes/auth.ts
3. Add password hashing using bcryptjs
4. Generate and verify JWT tokens
5. Add refresh token functionality"
```

---

## 🎯 Development Workflow with Claude Code

### Phase 1: Core Setup (Week 1)
```
1. "Setup the API server with Express, Prisma, and PostgreSQL"
2. "Create User, Customer, and Admin models in Prisma"
3. "Implement JWT authentication with login and registration"
4. "Setup React apps with routing and basic layout"
5. "Create shared UI components library"
```

### Phase 2: Customer Features (Week 2-3)
```
1. "Create Service model and API endpoints"
2. "Implement service catalog page with search and filters"
3. "Create booking flow with step-by-step wizard"
4. "Integrate Omise payment gateway"
5. "Add booking history and details pages"
```

### Phase 3: Hotel Features (Week 4)
```
1. "Create Hotel model and dashboard"
2. "Implement guest booking management"
3. "Create billing and invoice system"
4. "Add hotel profile management"
```

### Phase 4: Provider Features (Week 5)
```
1. "Create Provider model and LINE integration"
2. "Implement job notification system"
3. "Create job management interface"
4. "Add earnings tracking"
5. "Implement schedule calendar"
```

### Phase 5: Admin Features (Week 6-7)
```
1. "Create admin dashboard with analytics"
2. "Implement booking management"
3. "Add service management"
4. "Create provider management"
5. "Implement reporting system"
```

### Phase 6: Integration & Testing (Week 8)
```
1. "Add WebSocket for real-time updates"
2. "Implement notification system"
3. "Add comprehensive error handling"
4. "Create unit and integration tests"
5. "Setup CI/CD pipeline"
```

---

## 💡 Tips for Using Claude Code

### 1. Be Specific
```
❌ "Create a booking page"
✅ "Create a booking history page at apps/customer/src/pages/BookingHistory.tsx 
   that displays bookings in a table with columns: booking code, service name, 
   date, status, and action buttons"
```

### 2. Provide Context
```
"Update the booking API endpoint to include provider assignment logic. 
The endpoint should:
- Find available providers within 10km radius
- Check provider schedule for availability
- Prefer providers with higher ratings
- Assign the best match automatically"
```

### 3. Specify Technology
```
"Create a booking form using react-hook-form for form management, 
zod for validation, and Tailwind CSS for styling"
```

### 4. Include Examples
```
"Create a ServiceCard component similar to the BookingCard but with:
- Service name and description
- Price and duration
- Category badge
- Add to cart button"
```

### 5. Ask for Best Practices
```
"Create an authentication service following security best practices including:
- Password hashing with bcrypt
- JWT token generation
- Token refresh mechanism
- Rate limiting
- Input sanitization"
```

---

## 🐛 Debugging with Claude Code

```
# Debug API issue
"Debug the booking creation endpoint. The booking is not being saved to the database. 
The error log shows: [paste error]. The code is in apps/api/src/controllers/booking.controller.ts"

# Fix TypeScript error
"Fix TypeScript errors in BookingForm component. Errors: [paste errors]"

# Optimize query
"Optimize the booking query in apps/api/src/services/booking.service.ts. 
It's taking 5+ seconds to load bookings with provider and service details"

# Fix styling
"Fix the mobile responsive layout of the booking card. 
On small screens, the content is overflowing"
```

---

## 📚 Reference Commands

### Database
```bash
# Create migration
pnpm db:migrate

# Generate Prisma client
pnpm db:generate

# Open Prisma Studio
pnpm db:studio

# Reset database
cd apps/api && npx prisma migrate reset
```

### Development
```bash
# Start all apps
pnpm dev

# Start specific app
pnpm dev:api
pnpm dev:admin
pnpm dev:customer

# Build all
pnpm build

# Test
pnpm test

# Lint
pnpm lint
```

### Docker
```bash
# Start services
docker-compose up -d postgres redis

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 🚨 Common Issues & Solutions

### 1. Port Already in Use
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

### 2. Database Connection Error
```bash
# Check PostgreSQL is running
docker ps

# Restart PostgreSQL
docker-compose restart postgres
```

### 3. Prisma Client Not Generated
```bash
cd apps/api
npx prisma generate
```

### 4. Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

---

## 📞 Support

ถ้าคุณมีปัญหาหรือข้อสงสัย สามารถ:
1. ตรวจสอบเอกสาร Technical Specification
2. ดู API documentation
3. ตรวจสอบ example code ใน repository
4. ถามใน team chat

---

**Happy Coding! 🚀**

