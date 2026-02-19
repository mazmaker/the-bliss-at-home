# The Bliss at Home - AI Assistant Guidelines

## Project Overview
This is a monorepo for The Bliss at Home service booking platform with:
- `apps/admin` - Admin dashboard (React + Vite, port 3001)
- `apps/customer` - Customer app (React + Vite, port 5173)
- `apps/staff` - Staff app (React + Vite, port 3004)
- `apps/server` - Backend API (Express, port 3000)
- `packages/supabase` - Shared Supabase client, hooks, services

## MCP Tools Usage Guidelines

Use the following MCP tools proactively based on the task context:

### 1. Context7 (Documentation Lookup)
**When to use:** Looking up library/framework documentation, API references, code examples

**Tools:**
- `mcp__context7__resolve-library-id` - Find library ID first
- `mcp__context7__query-docs` - Query documentation with the library ID

**Workflow:**
1. User asks about React hooks → resolve-library-id for "react"
2. Then query-docs with the library ID and specific question

### 2. Supabase (Database & Backend)
**When to use:** Database operations, schema changes, auth, edge functions, project management

**Key tools:**
- `mcp__supabase__search_docs` - Search Supabase documentation (GraphQL)
- `mcp__supabase__list_tables` - View database schema
- `mcp__supabase__execute_sql` - Run SELECT queries
- `mcp__supabase__apply_migration` - DDL changes (CREATE, ALTER, DROP)
- `mcp__supabase__get_logs` - Debug issues (api, auth, postgres, edge-function)
- `mcp__supabase__deploy_edge_function` - Deploy serverless functions
- `mcp__supabase__generate_typescript_types` - Generate types from schema

**Always:** Check docs first when unsure about Supabase features

### 3. Playwright (Browser Automation)
**When to use:** Testing UI, web scraping, form filling, taking screenshots

**Key tools:**
- `mcp__playwright__browser_navigate` - Go to URL
- `mcp__playwright__browser_snapshot` - Get page accessibility tree (preferred over screenshot)
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_type` - Type text
- `mcp__playwright__browser_fill_form` - Fill multiple form fields
- `mcp__playwright__browser_take_screenshot` - Capture visual state

**Workflow:** Always use `browser_snapshot` first to understand page structure before interacting

### 4. shadcn-ui (UI Components)
**When to use:** Adding UI components, finding component examples, building interfaces

**Key tools:**
- `mcp__shadcn-ui__get_project_registries` - Check configured registries
- `mcp__shadcn-ui__search_items_in_registries` - Find components by name
- `mcp__shadcn-ui__view_items_in_registries` - Get component code
- `mcp__shadcn-ui__get_item_examples_from_registries` - Get usage examples
- `mcp__shadcn-ui__get_add_command_for_items` - Get CLI install command

**Workflow:** Search → View examples → Get add command → Install

---

## Decision Matrix

| Task Type | Primary MCP | Secondary MCP |
|-----------|-------------|---------------|
| "How do I use X library?" | context7 | - |
| "Add a button component" | shadcn-ui | context7 |
| "Create database table" | supabase | - |
| "Debug API error" | supabase (logs) | - |
| "Test the login flow" | playwright | - |
| "Check if UI renders correctly" | playwright | - |
| "Implement Supabase auth" | supabase (docs) | context7 |
| "Build a form with validation" | shadcn-ui | context7 |

## Rules
1. **Always search docs first** when implementing new features
2. **Use Supabase MCP** for any database-related questions (don't guess schema)
3. **Use Playwright snapshot** before any browser interaction
4. **Use shadcn examples** to understand component patterns before coding
5. **Combine MCPs** when needed (e.g., shadcn for UI + supabase for data)

---

## Development Commands

```bash
# Start all apps
pnpm dev

# Start individual apps
pnpm dev:admin    # Admin on port 3001
pnpm dev:customer # Customer on port 5173
pnpm dev:staff    # Staff on port 3004
pnpm dev:server   # Server on port 3000

# Create cloudflared tunnel for mobile testing
cloudflared tunnel --url http://localhost:3004
```

## Database
- **Project:** The Bliss at Home (Supabase)
- **Key tables:** bookings, staff, customers, services, notifications, profiles
- **Always use migrations** for schema changes via `mcp__supabase__apply_migration`

## Language
- UI text: Thai (ภาษาไทย)
- Code comments: English
- Variable names: English
