# The Bliss Massage at Home

> Massage/Spa/Nail services booking platform - Supabase-First Monorepo

## Team & Work Distribution

| Member | Apps | Branches |
|--------|------|----------|
| **คนที่ 1** | Admin, Hotel | `feature/admin-*`, `feature/hotel-*` |
| **คนที่ 2** | Customer, Staff | `feature/customer-*`, `feature-staff-*` |

## Project Structure

```
the-bliss-at-home/
├── apps/
│   ├── admin/        # Admin dashboard (Port 3001)
│   ├── customer/     # Customer booking app (Port 3002)
│   ├── hotel/        # Hotel staff portal (Port 3003)
│   ├── staff/        # Staff LINE LIFF (Port 3004)
│   └── server/       # Node.js API server (Port 3000)
├── packages/
│   ├── supabase/     # Shared Supabase client
│   ├── ui/           # Shared UI components
│   ├── types/        # Shared TypeScript types
│   └── i18n/         # Internationalization
├── supabase/
│   ├── migrations/   # Database migrations
│   └── config.toml   # Supabase config
└── .specify/
    └── templates/    # Project documentation
```

## Tech Stack

### Frontend
- React 18 + TypeScript 5
- Vite 5
- TanStack Query 5
- Zustand
- React Router 6
- Tailwind CSS

### Backend
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Node.js 20 + Express 4

### External Integrations
- Omise (Payment)
- LINE API (Messaging + LIFF)
- Google Maps

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker Desktop (for local Supabase)

### Installation

```bash
# Install dependencies
pnpm install
```

### Environment Setup

Copy `.env.example` to `.env.local` for each app:

```bash
# Admin
cp apps/admin/.env.example apps/admin/.env.local

# Customer
cp apps/customer/.env.example apps/customer/.env.local

# Hotel
cp apps/hotel/.env.example apps/hotel/.env.local

# Provider
cp apps/provider/.env.example apps/provider/.env.local

# Server
cp apps/server/.env.example apps/server/.env
```

Fill in your Supabase credentials.

### Development

```bash
# Start all apps
pnpm dev

# Start individual apps
pnpm dev:admin       # Admin dashboard
pnpm dev:customer    # Customer app
pnpm dev:hotel       # Hotel app
pnpm dev:provider    # Provider app
pnpm dev:server      # API server
```

### Supabase Local Development

```bash
# Start local Supabase (requires Docker Desktop)
supabase start

# Stop local Supabase
supabase stop

# Reset database
supabase db reset

# Generate types
pnpm --filter @bliss/supabase gen:types
```

## Port Assignments

| App | Port |
|-----|------|
| Server | 3000 |
| Admin | 3001 |
| Customer | 3002 |
| Hotel | 3003 |
| Staff | 3004 |

## Available Scripts

```bash
pnpm dev          # Start all apps
pnpm build        # Build all apps
pnpm test         # Run tests
pnpm lint         # Lint code
pnpm typecheck    # Check TypeScript
pnpm clean        # Clean build artifacts
```

## Documentation

- [CONSTITUTION.md](.specify/templates/constitution.md) - Architecture principles
- [IMPLEMENTATION_PLAN.md](.specify/templates/implementation-plan.md) - 12-week roadmap
- [TASKS.md](.specify/templates/tasks.md) - Incremental tasks
- [claude.md](claude.md) - Project orchestrator

## Progress

### Phase 1: Backend Infrastructure & Data Persistence

- [x] Sprint 1.1: Supabase Project Setup
- [x] Sprint 1.2: Core Data Models (In Progress)
- [ ] Sprint 1.3: Additional Data Models
- [ ] Sprint 1.4: Storage & Files

### Phase 2: Authentication & Security

- [ ] Sprint 2.1: Supabase Auth Setup
- [ ] Sprint 2.2: Auth UI Components
- [ ] Sprint 2.3: Protected Routes
- [ ] Sprint 2.4: Role-Based Access

## License

Copyright © 2026 The Bliss Massage at Home
