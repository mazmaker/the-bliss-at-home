# Pre-Existing Typecheck and Build Errors - Fix Guide

**Created:** 2026-02-18
**Context:** Found during Unit Testing Phase 2 (203 tests pass, but typecheck/build have pre-existing errors)
**Target:** Dev teams Claude Code to follow and fix

---

## Summary

| Package | Error Type | Severity | Est. Fix Time |
|---------|-----------|----------|---------------|
| @bliss/server | Missing dependency types | HIGH | 15 min |
| @bliss/i18n | Missing dependency types | HIGH | 10 min |
| @bliss/ui | No tsconfig.json (uses root, no JSX) | HIGH | 15 min |
| @bliss/supabase | No tsconfig.json (uses root, no JSX) | HIGH | 15 min |
| Multiple packages | Duplicate files (name 2.ts) | MEDIUM | 10 min |
| @bliss/ui components | Minor type errors | LOW | 20 min |

---

## Fix 1: @bliss/server - Missing Dependency Types

### Problem

tsc reports Cannot find module for: express, cors, @supabase/supabase-js, nodemailer, twilio

### Root Cause

Dependencies are listed in apps/server/package.json but node_modules is missing (never installed).

### Fix

```bash
cd apps/server
pnpm install
```

Also move @types/nodemailer from dependencies to devDependencies in apps/server/package.json.

---

## Fix 2: @bliss/i18n - Missing Dependency Types

### Problem

tsc reports Cannot find module for: i18next, react-i18next, and missing declaration for react

### Root Cause

Dependencies listed but node_modules not installed.

### Fix

```bash
cd packages/i18n
pnpm install
```

---

## Fix 3: @bliss/ui - Create tsconfig.json

### Problem

packages/ui/ has NO tsconfig.json. When tsc --noEmit runs, it falls back to root tsconfig which:
- Has no jsx setting (causes --jsx is not set errors for all .tsx files)
- Has no include restriction (picks up files from ALL packages)

### Fix

Create packages/ui/tsconfig.json:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@bliss/supabase": ["../../packages/supabase/src"],
      "@bliss/types": ["../../packages/types/src"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Key: jsx: react-jsx required for .tsx, include: [src] restricts to own source only.

---

## Fix 4: @bliss/supabase - Create tsconfig.json

### Problem

packages/supabase/ has NO tsconfig.json. Same issue as @bliss/ui.

### Fix

Create packages/supabase/tsconfig.json:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@bliss/types": ["../../packages/types/src"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Key: No jsx needed (pure TS). include: [src] prevents picking up apps/ files.

---

## Fix 5: Remove Duplicate Files

### Problem

Multiple duplicate files exist (likely from copy-paste accidents):

- apps/server/src/routes/hotel 2.ts
- apps/server/src/services/emailService 2.ts
- packages/i18n/src/config 2.ts
- packages/i18n/src/I18nProvider 2.tsx
- packages/i18n/src/index 2.ts

### Fix

```bash
# Verify duplicates are identical first with diff
# Then delete the duplicates:
rm "apps/server/src/routes/hotel 2.ts"
rm "apps/server/src/services/emailService 2.ts"
rm "packages/i18n/src/config 2.ts"
rm "packages/i18n/src/I18nProvider 2.tsx"
rm "packages/i18n/src/index 2.ts"
```

---

## Fix 6: @bliss/ui Component Type Errors

### 6a. Pagination.tsx - className not on PaginationProps

File: packages/ui/src/components/Pagination.tsx

Problem: PaginationProps extends ButtonHTMLAttributes but root element is div.

Fix: Change the interface:

```typescript
// Before
export interface PaginationProps extends ButtonHTMLAttributes<HTMLButtonElement> {

// After
export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  className?: string
}
```

### 6b. StatusBadge.tsx - Index signature error

File: packages/ui/src/components/StatusBadge.tsx

Problem: Line 31 - statusConfig[type][status] has no matching index signature.

Fix: Use proper type narrowing:

```typescript
// Before
const config = statusConfig[type][status as keyof typeof statusConfig[typeof type]]

// After
const typeConfig = statusConfig[type]
const config = typeConfig[status as keyof typeof typeConfig]
```

### 6c. Loader.tsx - className not on LoaderProps

File: packages/ui/src/components/Loader.tsx

Fix: Add className?: string to the LoaderProps interface.

---

## Recommended Fix Order

1. Fix 5 (Delete duplicate files) - Quick win, reduces noise
2. Fix 1 (Server deps) - cd apps/server and pnpm install
3. Fix 2 (i18n deps) - cd packages/i18n and pnpm install
4. Fix 3 (UI tsconfig) - Create tsconfig.json
5. Fix 4 (Supabase tsconfig) - Create tsconfig.json
6. Fix 6 (Component types) - Minor type fixes

After all fixes, verify:

```bash
pnpm typecheck   # Should pass all 9 packages
pnpm build       # Should pass all 5 build targets
pnpm test:run    # Should still pass 203 tests
```

---

## Notes

- These errors existed BEFORE the testing phase. No test files caused these issues.
- apps/admin, apps/hotel, apps/customer, apps/staff typecheck passes individually (they have jsx: react-jsx and restricted include: [src]).
- Root tsconfig.json has no jsx setting and no include restriction = problems for any package without its own tsconfig.
