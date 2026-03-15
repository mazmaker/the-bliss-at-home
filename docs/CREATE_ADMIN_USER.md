# Creating Admin User for Supabase Authentication

## 📋 Prerequisites

1. **Service Role Key** from Supabase Dashboard
2. **Node.js** and **pnpm** installed

## 🔑 Step 1: Get Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/settings/api)
2. Navigate to **Settings** → **API**
3. Find **Service Role Key** (under "Project API keys")
4. Copy the key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI...`)

## 🚀 Step 2: Create Admin User

### Option A: Using Environment Variable

```bash
cd apps/admin

# Set service role key (replace with your actual key)
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Run the script
pnpm create-admin
```

### Option B: Manual in Supabase Dashboard

1. Go to [Authentication → Users](https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/auth/users)
2. Click **Add user** → **Create new user**
3. Enter:
   - Email: `admin@theblissathome.com`
   - Password: `Admin123456!`
   - Check "Auto Confirm User"
4. Click **Create user**
5. Go to [Table Editor → profiles](https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/editor/10866)
6. Find the newly created user and update:
   - role: `ADMIN`
   - full_name: `ผู้ดูแลระบบ`
   - status: `ACTIVE`

## 🔐 Admin Credentials

Once created, you can login with:
- **Email:** `admin@theblissathome.com`
- **Password:** `Admin123456!`

## 🧪 Test Login

1. Start the admin app:
   ```bash
   cd apps/admin
   pnpm dev
   ```

2. Open http://localhost:3001/admin/login

3. Login with the admin credentials

## ❓ Troubleshooting

### User already exists
If you get "already been registered" error, the user already exists. You can:
1. Login with existing credentials
2. Or reset password in Supabase Dashboard

### Cannot connect to Supabase
1. Check if `VITE_SUPABASE_URL` is correct in `.env.local`
2. Check if `VITE_SUPABASE_ANON_KEY` is correct
3. Ensure `VITE_USE_MOCK_AUTH=false` in `.env.local`

### Profile not updating
1. Check if profiles table has RLS policies enabled
2. Ensure the user has the correct role in profiles table

## 📝 Notes

- The script will automatically create/update the admin profile
- If user exists, it will update the profile to ADMIN role
- Password must be at least 6 characters (we use stronger password for security)