# Fix Staff Skills RLS Policies Migration

## Problem
Staff members getting **409 Conflict** errors when trying to add skills to their profile.

Error:
```
POST https://rbdvlfriqjnwpxmmgisf.supabase.co/rest/v1/staff_skills 409 (Conflict)
```

## Root Cause
The RLS policies for `staff_skills` table used `FOR ALL` with only `USING` clause and missing `WITH CHECK` clause:

```sql
CREATE POLICY "Staff can manage own skills" ON staff_skills
  FOR ALL USING (...)  -- Missing WITH CHECK!
```

In PostgreSQL RLS:
- `USING` clause controls which existing rows can be seen/modified
- `WITH CHECK` clause controls what values can be written
- For INSERT/UPDATE operations, **both clauses are required**
- `FOR ALL` with null `with_check` doesn't properly split into UPDATE/INSERT/DELETE operations

## Solution
1. **Updated `addSkill()` function** to use `upsert()` instead of `insert()`:
   - File: `packages/supabase/src/staff/staffService.ts`
   - Changed from `.insert()` to `.upsert()` with `onConflict: 'staff_id,skill_id'`
   - This allows updating existing skills instead of throwing conflict errors

2. **Fixed RLS policies** by replacing single `FOR ALL` policies with explicit operation policies:
   - Migration file: `20260211_fix_staff_skills_rls_policies.sql`
   - Created separate policies for SELECT, INSERT, UPDATE, DELETE
   - Each policy has both `USING` and `WITH CHECK` clauses where needed

## How to Run

### Option 1: Using Supabase CLI (Recommended)
```bash
npx supabase db push
```

### Option 2: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/sql/new
2. Copy and paste the contents of `20260211_fix_staff_skills_rls_policies.sql`
3. Click "Run"

### Option 3: Using SQL Editor
```bash
psql $DATABASE_URL -f supabase/migrations/20260211_fix_staff_skills_rls_policies.sql
```

## Testing
After running the migration:

1. Login as a staff member in the Staff app
2. Go to Profile page
3. Click "เพิ่มทักษะ" (Add Skill)
4. Select a skill, level, and years of experience
5. Click "เพิ่มทักษะ" to save
6. Should save successfully without 409 Conflict error
7. Try adding the same skill again - should update instead of error

## Verify
Check that the new policies are in place:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'staff_skills'
ORDER BY policyname;
```

Expected output should show:
- 8 policies total (4 for staff, 4 for admin)
- Each policy for a specific command (SELECT, INSERT, UPDATE, DELETE)
- UPDATE and INSERT policies have `has_with_check = true`
- All policies have `has_using = true` (except INSERT which only needs WITH CHECK)

## Related Issues
This is the same issue we fixed for the `bookings` table in migration `20260209_fix_bookings_admin_update_policy.sql`

## Files Changed
- `packages/supabase/src/staff/staffService.ts` - Changed `addSkill()` to use `upsert()`
- `supabase/migrations/20260211_fix_staff_skills_rls_policies.sql` - New migration file
