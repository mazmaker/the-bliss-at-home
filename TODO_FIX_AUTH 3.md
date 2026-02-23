# 🚨 TODO: Fix Admin Auth Issue

## Reminder for Future Fix

**Problem:** `admin@theblissathome.com` cannot be used due to auth corruption

**Current Workaround:** Using `admin2@theblissathome.com`

## When You're Ready to Fix:

1. **Read Full Details:** See `KNOWN_ISSUES.md`

2. **Try These Solutions:**
   - Contact Supabase Support (Project: rbdvlfriqjnwpxmmgisf)
   - Direct SQL deletion (if you get DB access)
   - Export/Import to new project (last resort)

3. **Test Scripts Available:**
   - `src/scripts/testAuth.ts` - Test authentication
   - `src/scripts/fixOriginalAdmin.ts` - Attempt fix
   - `src/scripts/diagnoseAuthProblem.ts` - Diagnose issue

4. **After Fixing:**
   - Update all documentation
   - Remove admin2 references
   - Delete this TODO file
   - Update KNOWN_ISSUES.md

---

**Don't forget to fix this!** 🔧