---
title: The Bliss at Home Project
category: project
tags: [massage, spa, booking-platform, react, supabase, typescript]
related: [bliss-product-catalog.md]
sources: [bliss-product-catalog]
updated: 2026-05-18
---

# The Bliss at Home Project

Monorepo for massage/spa/nail service booking platform. React + Supabase + TypeScript stack with 5 apps and shared packages.

## Architecture Overview

**Monorepo Structure**:
```
apps/
├── admin/     (port 3001) - Admin dashboard
├── customer/  (port 3002) - Customer booking app  
├── hotel/     (port 3003) - Hotel partner portal
├── staff/     (port 3004) - Staff LINE LIFF app
└── server/    (port 3000) - Express API server

packages/
├── supabase/  - Database client & services
├── ui/        - Shared components
├── types/     - TypeScript definitions
└── i18n/      - Thai/English localization
```

## Product Catalog Integration

**Physical Products** (from catalog ingest):
- 4 signature massage products: foot cream, body oil, aromatherapy oil, herbal balm
- 100% natural formulations with Thai traditional herbs
- Professional-grade for spa therapy use

**Business Model Alignment**:
- Premium positioning matches high-end spa services
- Natural ingredients appeal to wellness-conscious customers
- Thai heritage aligns with traditional massage therapy
- Professional formulation supports therapist quality standards

## Tech Stack

**Frontend**: React, TypeScript, Tailwind CSS
**Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)  
**API**: Express.js server
**Mobile**: LINE LIFF integration for staff app
**Deployment**: Vercel (5 separate projects)

## Database Schema

**54 tables** covering:
- Bookings & scheduling
- Staff management & GPS tracking
- Customer profiles & preferences  
- Service catalog & pricing
- Hotel partnerships & commissions
- Payment processing & earnings
- Review system & ratings

## Key Features

**Customer Experience**:
- Online booking system
- Real-time staff tracking
- Emergency booking banner
- Multi-language support (TH/EN)

**Staff Management**:
- GPS location tracking
- Job assignment & routing
- Earnings tracking (fixed amounts, not commission)
- LINE LIFF mobile interface

**Admin Controls**:
- Dashboard analytics
- Staff performance monitoring
- Hotel partnership management
- Service pricing & availability

**Hotel Integration**:
- Partner portal access
- Discount rate configuration
- Recommended sales staff assignment
- Session extension capabilities

## Current Development Status

**Recent Features** (from git history):
- ✅ GPS tracking system implementation
- ✅ Hotel authentication & discount fixes  
- ✅ Emergency booking banner design
- ✅ Extension service system
- ✅ Staff earnings transition to fixed amounts

**In Progress**:
- Testing & quality assurance
- Performance optimization  
- Production deployment readiness

## Development Workflow

```bash
# Start all services
pnpm dev

# Individual apps
pnpm dev:customer  # Customer booking
pnpm dev:staff     # Staff mobile app
pnpm dev:admin     # Admin dashboard

# Testing
pnpm test          # Unit tests (vitest)
pnpm e2e           # E2E tests (playwright)
```

## Deployment Architecture

**Vercel Projects**:
- `the-bliss-at-home-customer`
- `the-bliss-at-home-staff` 
- `the-bliss-at-home-admin`
- `the-bliss-at-home-hotel`
- `the-bliss-at-home-server`

**Database**: Supabase cloud instance with 219+ migrations

## Business Intelligence

**Market Position**: Premium home massage services with professional spa-quality products

**Competitive Advantage**:
- Integrated booking + GPS tracking + payment
- Thai traditional medicine product line
- Hotel partnership network
- Real-time service delivery monitoring

**Revenue Streams**:
- Service booking commissions
- Premium product sales
- Hotel partnership fees
- Staff placement services

## See Also
- [[supabase-development-patterns]]
- [[react-monorepo-architecture]]
- [[thai-spa-industry]]
- [[gps-tracking-implementation]]