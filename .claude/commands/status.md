---
description: Daily status check - pull latest code, scan progress, update dashboard, deploy to sprint.lightepic.com
---

# Daily Status Check

You are the PO (Product Owner) for "The Bliss at Home" project.
Perform a daily progress check and update the sprint dashboard.

## Step 1: Pull Latest Code

Run `git pull origin main` to get the latest code from the team.
If there are merge conflicts, report them and stop.
Show a brief summary of what changed (new commits since last check).

## Step 2: Scan Codebase for Real Progress

Thoroughly analyze the **actual source code** to calculate completion percentages.
Do NOT rely on previous data - re-scan everything fresh.

Check each area by reading actual files:

### Infrastructure
- Check `apps/server/src/` - how many API endpoints exist and work?
- Check `packages/types/` - are shared types created?
- Check `packages/i18n/` - are translation files created?
- Check if CI/CD pipeline exists (`.github/workflows/`)

### Database
- Check `supabase/migrations/` - count and verify migrations
- Check if RLS policies are comprehensive

### Authentication
- Check `packages/supabase/src/auth/` - what auth features work?
- Check for social login, OTP implementations

### Frontend Apps (Admin, Customer, Hotel, Staff)
For each app, check:
- Are pages using **real Supabase queries** or **mock/hardcoded data**?
- Do forms **persist to database** or just local state / console.log?
- Do buttons (Edit/Delete/Approve) have **real handlers** or are they non-functional?
- Are there any **new pages or components** since last check?

### Integrations
- Check `apps/server/src/` for Omise, LINE, Google Maps endpoints
- Check for webhook handlers
- Check for email/notification services

### Testing
- Check for any test files (`*.test.ts`, `*.spec.ts`, `e2e/`)

## Step 3: Calculate Percentages

For each task, use this scale:
- **0%** = Not started at all
- **5-15%** = Package/file exists but empty or placeholder
- **20%** = UI built but 100% mock data, no DB connection
- **40%** = UI + some real data queries (partial integration)
- **60%** = Functional with real data, missing some features
- **80%** = Mostly complete, minor features missing
- **100%** = Fully working, tested, production-ready

## Step 4: Update project-timeline.html

Edit `docs/project-timeline.html` and update these 3 data sections
(marked by comment markers in the file):

### 4a. PROGRESS_HISTORY (between `__PROGRESS_DATA_START__` and `__PROGRESS_DATA_END__`)
Append a new entry to the `PROGRESS_HISTORY` array:
```js
{ date: "YYYY-MM-DD", overall: <number>, focus: "<one-line summary>", sections: { infra:<n>, db:<n>, auth:<n>, ui:<n>, customer:<n>, hotel:<n>, provider:<n>, admin:<n>, payment:<n>, integrations:<n>, i18n:<n>, testing:<n> } }
```

### 4b. WEEKLY_FOCUS (between `__FOCUS_DATA_START__` and `__FOCUS_DATA_END__`)
Update the `WEEKLY_FOCUS` object with:
- Current week date range
- Current sprint name
- 3-5 specific action items for this week
- Any blockers

### 4c. DATA tasks (between `__TASK_DATA_START__` and `__TASK_DATA_END__`)
Update the `pct` value and `detail` description for every task that changed.
Add new tasks if new features were discovered in the codebase.

## Step 4d: Update docs/CHECKLIST.md

**IMPORTANT: Do NOT skip this step.**

After updating `project-timeline.html`, sync the changes to `docs/CHECKLIST.md`:

1. Read the current `docs/CHECKLIST.md`
2. For every task whose `pct` changed in Step 4c, update the corresponding entry in CHECKLIST.md:
   - Update the percentage: `[75%]` → `[80%]`
   - Update the "Remaining:" list — remove items that are now done, add newly discovered items
   - If a task reaches 100%, remove its "Remaining:" section entirely
3. If new tasks were added in Step 4c, add them to CHECKLIST.md in the correct section
4. Keep the format consistent: `- [ ] **Task Name** [XX%]` with `Remaining:` bullet list under each

This file is what developers read to know what work is left. It MUST stay in sync with project-timeline.html.

## Step 5: Deploy to sprint.lightepic.com

1. Copy updated files:
   ```
   cp docs/project-timeline.html sprint-dashboard/index.html
   cp docs/gantt-chart.html sprint-dashboard/gantt.html
   ```

2. Deploy using Wrangler (if available):
   ```
   npx wrangler pages deploy sprint-dashboard --project-name=sprint-dashboard
   ```

   If Wrangler is not logged in or fails, tell the user to manually upload
   the `sprint-dashboard/` folder at Cloudflare Pages dashboard.

**IMPORTANT:** Do NOT git commit or push the sprint-dashboard folder.
It is in .gitignore and should stay local-only. The deploy goes directly
to Cloudflare Pages via Wrangler CLI, completely separate from the dev GitHub repo.

## Step 6: Report Summary

Print a summary:
- Date
- Overall %: X% (change from last: +/- N%)
- Top 3 sections that improved
- Top 3 priorities for today/this week
- Any blockers or broken features found
- Deploy status (success/manual needed)
- Dashboard URL: **https://sprint.lightepic.com/** (always report this URL, not the Cloudflare deployment hash URL)
