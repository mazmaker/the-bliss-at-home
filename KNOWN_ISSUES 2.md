# Known Issues - The Bliss Massage at Home

## 🚨 Critical Issues

### 1. Auth Corruption: admin@theblissathome.com
**Status:** 🔴 Unresolved
**Date Discovered:** January 26, 2026
**Severity:** High

#### Problem Description:
- Cannot delete user `admin@theblissathome.com` from Supabase Auth
- Login attempts return: `Database error querying schema` (500 error)
- User exists in profiles table but auth.users entry is corrupted

#### Root Cause:
- Possible mismatched user ID between auth.users and profiles
- Corrupted metadata in auth.users table
- Potential database trigger loop or constraint violation

#### Current Workaround:
- Use `admin2@theblissathome.com` / `AdminBliss2026!` instead
- Both accounts have full ADMIN privileges

#### Files Affected:
- `/apps/admin/src/scripts/createAdminUser.ts` (original creation script)
- `/apps/admin/src/scripts/updateAdminProfile.ts` (update attempt)
- `/supabase/migrations/20260125_fix_auth_profiles.sql` (fix attempt)

#### Attempted Solutions:
1. ❌ Delete user via Supabase Dashboard - Failed (cannot delete)
2. ❌ Reset password via Dashboard - Failed
3. ❌ Update profile via service role - Profile updated but auth still broken
4. ✅ Created admin2@theblissathome.com - Working alternative

#### Future Fix Options:
1. Contact Supabase Support
   - Project ID: `rbdvlfriqjnwpxmmgisf`
   - Issue: Auth corruption for admin@theblissathome.com

2. Direct SQL Fix (requires DB access):
   ```sql
   -- WARNING: Dangerous operation
   DELETE FROM auth.users WHERE email = 'admin@theblissathome.com';
   ```

3. Nuclear Option: Export data → New project → Import data

#### Related Service Keys:
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc`
- Service Role: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY`

---

## 📝 Notes for Future Resolution

When ready to fix:
1. Check if Supabase has released any auth repair tools
2. Backup all data before attempting fixes
3. Test in staging environment first
4. Document the solution for future reference

**Last Updated:** January 26, 2026
**Updated By:** Claude + User