# Admin Login Guide - The Bliss at Home

## 🎯 Admin User Information

**User UID:** `6d5eee8b-799b-4eb4-8650-d43eadd0fd6f`
**Email:** `admin@theblissathome.com`
**Created:** 21 Jan, 2026 13:57

## 🔧 Setup Admin Profile

Since the admin user already exists in Supabase Authentication, we need to update the profile:

### Step 1: Get Service Role Key

1. Go to [Supabase Settings → API](https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/settings/api)
2. Copy the **Service Role Key** (secret key)

### Step 2: Update Admin Profile

```bash
cd apps/admin

# Set service role key
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Run update script
pnpm update-admin
```

This will:
- Create/update profile with role = ADMIN
- Set full_name = "ผู้ดูแลระบบ"
- Set status = ACTIVE

## 🔐 Login to Admin App

1. Make sure the app is running:
   ```bash
   cd apps/admin
   pnpm dev
   ```

2. Open http://localhost:3001/admin/login

3. Login with:
   - **Email:** `admin@theblissathome.com`
   - **Password:** (the password you set in Supabase)

## ✅ Verify Setup

### Check in Supabase Dashboard

1. [Authentication → Users](https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/auth/users)
   - ✓ User exists with email `admin@theblissathome.com`

2. [Table Editor → profiles](https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/editor/10866)
   - ✓ Profile exists with:
     - role = ADMIN
     - status = ACTIVE
     - full_name = ผู้ดูแลระบบ

### Test Login

1. Try logging in at http://localhost:3001/admin/login
2. You should be redirected to dashboard after successful login
3. Logout button should work and redirect to login page

## 🐛 Troubleshooting

### Cannot Login

1. **Wrong password?**
   - Reset password in [Supabase Authentication](https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/auth/users)
   - Click on user → Send password reset

2. **Profile not found?**
   - Run `pnpm update-admin` to create/update profile
   - Check profiles table in Supabase

3. **Authentication error?**
   - Check `.env.local` has `VITE_USE_MOCK_AUTH=false`
   - Verify Supabase URL and anon key are correct

### Debug Mode

Check browser console for:
- Network requests to Supabase
- Authentication errors
- Profile loading errors

### Manual Profile Update

If script doesn't work, manually update in [Supabase Table Editor](https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/editor/10866):

```sql
UPDATE profiles
SET
  role = 'ADMIN',
  full_name = 'ผู้ดูแลระบบ',
  status = 'ACTIVE',
  phone = '0812345678'
WHERE id = '6d5eee8b-799b-4eb4-8650-d43eadd0fd6f';
```

## 📝 Notes

- Admin user must have role = 'ADMIN' in profiles table
- Authentication is handled by Supabase Auth
- Profile data is stored in profiles table
- RLS policies control data access