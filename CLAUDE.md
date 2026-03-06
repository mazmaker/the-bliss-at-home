# The Bliss at Home - AI Assistant Guidelines

## Project Overview
Monorepo for **The Bliss at Home** — a massage/spa/nail service booking platform.

### Apps
| App | Path | Port | Description |
|-----|------|------|-------------|
| Admin | `apps/admin` | 3001 | Admin dashboard |
| Customer | `apps/customer` | 3002 | Customer booking app |
| Hotel | `apps/hotel` | 3003 | Hotel partner portal |
| Staff | `apps/staff` | 3004 | Staff LINE LIFF app |
| Server | `apps/server` | 3000 | Express API server |

### Shared Packages
| Package | Path | Description |
|---------|------|-------------|
| `@bliss/supabase` | `packages/supabase` | Supabase client, hooks, services |
| `@bliss/ui` | `packages/ui` | Shared UI components |
| `@bliss/types` | `packages/types` | Shared TypeScript types |
| `@bliss/i18n` | `packages/i18n` | Internationalization (TH/EN) |

## Development Commands

```bash
# Start all apps
pnpm dev

# Start individual apps
pnpm dev:admin     # Admin on port 3001
pnpm dev:customer  # Customer on port 3002
pnpm dev:hotel     # Hotel on port 3003
pnpm dev:staff     # Staff on port 3004
pnpm dev:server    # Server on port 3000

# Testing
pnpm test          # Run unit tests (vitest)
pnpm test:run      # Run once (no watch)
pnpm test:coverage # With coverage report
pnpm e2e           # Playwright E2E tests

# Code quality
pnpm lint          # Lint all apps
pnpm typecheck     # TypeScript check
pnpm format        # Prettier format

# Mobile testing via Cloudflare tunnel
cloudflared tunnel --url http://localhost:3004
```

## Database
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Migrations:** `supabase/migrations/` (219 migration files)
- **Key tables:** bookings, staff, customers, services, notifications, profiles, hotels, reviews, payments, earnings
- **Always use migrations** for schema changes via `mcp__supabase__apply_migration`

## Project Key Files
| File | Purpose |
|------|---------|
| `docs/CHECKLIST.md` | Dev task checklist with remaining work per feature |
| `docs/project-timeline.html` | Sprint dashboard (deploys to sprint.lightepic.com) |
| `docs/gantt-chart.html` | Gantt chart view |
| `.claude/commands/status.md` | Daily status check command (`/status`) |

## Language
- UI text: Thai (ภาษาไทย)
- Code comments: English
- Variable names: English

## File Organization Rules
- **No scripts at root** — use `scripts/` folder
- **No SQL files at root** — use `supabase/migrations/`
- **No docs at root** (except README.md, CLAUDE.md) — use `docs/`
- `.gitignore` blocks `/*.js` and `/*.sql` at root to prevent clutter

## MCP Tools Usage

### Context7 (Documentation Lookup)
```
resolve-library-id → query-docs
```

### Supabase (Database & Backend)
- `search_docs` — Search Supabase documentation
- `list_tables` / `execute_sql` — View schema and query data
- `apply_migration` — DDL changes (CREATE, ALTER, DROP)
- `get_logs` — Debug issues (api, auth, postgres, edge-function)
- `deploy_edge_function` — Deploy serverless functions
- `generate_typescript_types` — Generate types from schema

### Playwright (Browser Automation)
Always use `browser_snapshot` first to understand page structure before interacting.

### Decision Matrix

| Task Type | Primary MCP | Secondary |
|-----------|-------------|-----------|
| Library docs lookup | Context7 | - |
| Database operations | Supabase | - |
| Debug API errors | Supabase (logs) | - |
| Test UI flow | Playwright | - |
| Implement auth | Supabase (docs) | Context7 |

## Rules
1. **Always search docs first** when implementing new features
2. **Use Supabase MCP** for database questions (don't guess schema)
3. **Use Playwright snapshot** before browser interactions
4. **Check `docs/CHECKLIST.md`** to see current task status and remaining work
