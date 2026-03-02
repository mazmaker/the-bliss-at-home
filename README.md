# The Bliss at Home

> On-demand massage, spa, and nail services booking platform

## Project Structure

```
the-bliss-at-home/
├── apps/
│   ├── admin/          # Admin dashboard (port 3001)
│   ├── customer/       # Customer booking app (port 3002)
│   ├── hotel/          # Hotel partner portal (port 3003)
│   ├── staff/          # Staff LINE LIFF app (port 3004)
│   └── server/         # Express API server (port 3000)
├── packages/
│   ├── supabase/       # Shared Supabase client, hooks, services
│   ├── ui/             # Shared UI components
│   ├── types/          # Shared TypeScript types
│   └── i18n/           # Internationalization (TH/EN)
├── supabase/
│   └── migrations/     # Database migrations (219 files)
├── scripts/            # Utility scripts (seeding, migrations)
├── docs/               # Project documentation
│   ├── CHECKLIST.md    # Dev task checklist
│   └── project-timeline.html  # Sprint dashboard
├── e2e/                # Playwright E2E tests
└── .github/workflows/  # CI/CD pipeline
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5 |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack Query 5, Zustand |
| Routing | React Router 6 |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| API Server | Node.js 20, Express 4 |
| Payment | Omise |
| Messaging | LINE API, LINE LIFF |
| Maps | Google Maps |
| Testing | Vitest (2,420 unit tests), Playwright (E2E) |

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 8

### Installation

```bash
pnpm install
```

### Environment Setup

Copy `.env.example` to `.env.local` for each app:

```bash
cp apps/admin/.env.example apps/admin/.env.local
cp apps/customer/.env.example apps/customer/.env.local
cp apps/hotel/.env.example apps/hotel/.env.local
cp apps/staff/.env.example apps/staff/.env.local
cp apps/server/.env.example apps/server/.env
```

### Development

```bash
# Start all apps
pnpm dev

# Start individual apps
pnpm dev:admin       # port 3001
pnpm dev:customer    # port 3002
pnpm dev:hotel       # port 3003
pnpm dev:staff       # port 3004
pnpm dev:server      # port 3000
```

### Testing

```bash
pnpm test            # Run unit tests (watch mode)
pnpm test:run        # Run once
pnpm test:coverage   # With coverage report
pnpm e2e             # Playwright E2E tests
```

### Other Commands

```bash
pnpm build           # Build all apps
pnpm lint            # Lint code
pnpm typecheck       # TypeScript check
pnpm format          # Prettier format
pnpm clean           # Clean build artifacts
```

## Sprint Dashboard

Live at **https://sprint.lightepic.com/**

## Documentation

See the [`docs/`](docs/) folder:

- [CHECKLIST.md](docs/CHECKLIST.md) — Current task status and remaining work
- [TECHNICAL_SPECIFICATION.md](docs/TECHNICAL_SPECIFICATION.md) — Architecture details
- [CODE_PATTERNS.md](docs/CODE_PATTERNS.md) — Code conventions
- [GOOGLE_MAPS_SETUP.md](docs/GOOGLE_MAPS_SETUP.md) — Google Maps integration
- [GOOGLE_OAUTH_SETUP.md](docs/GOOGLE_OAUTH_SETUP.md) — Google OAuth setup
- [PAYMENT_INTEGRATION.md](docs/PAYMENT_INTEGRATION.md) — Omise payment integration

## License

Copyright 2026 The Bliss at Home
