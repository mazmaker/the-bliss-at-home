# Google OAuth Setup for Staff App

This guide explains how to enable Google OAuth login for the Staff application.

## Overview
Staff can now register and login using their Google account in addition to LINE login. When staff register via Google, they will:
1. Be created with `profiles.status='ACTIVE'` (can login)
2. Be created with `staff.status='pending'` (requires admin approval to work)
3. See eligibility dashboard showing their approval status

## Supabase Configuration

### 1. Enable Google Provider in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Google** in the provider list
3. Click **Enable**

### 2. Create Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable **Google+ API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**

4. Create OAuth 2.0 Client ID:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized redirect URIs:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     http://localhost:54321/auth/v1/callback (for local development)
     ```
   - Copy the **Client ID** and **Client Secret**

### 3. Configure Supabase with Google Credentials

Back in **Supabase Dashboard** → **Authentication** → **Providers** → **Google**:
1. Paste **Client ID**
2. Paste **Client Secret**
3. Click **Save**

### 4. Add Authorized Domains (Optional)

If you want to restrict which Google accounts can sign up:
1. In Google Cloud Console → **OAuth consent screen**
2. Add authorized domains
3. Configure user type (Internal/External)

## Application Configuration

### 1. Environment Variables

No additional environment variables needed! The app uses the Supabase client which automatically handles OAuth configuration.

### 2. Callback URL

The staff app is configured to redirect to:
```
http://localhost:3004/staff/auth/callback (development)
https://YOUR_DOMAIN/staff/auth/callback (production)
```

Make sure this URL is added to:
- Google Cloud Console → Authorized redirect URIs
- Supabase Dashboard → Site URL (optional, for additional security)

## Testing Google Login

### Local Development

1. Start the staff app:
   ```bash
   cd apps/staff
   pnpm dev
   ```

2. Navigate to `http://localhost:3004/staff/login`

3. Click **Sign in with Google**

4. Complete Google OAuth flow

5. You should be redirected to the staff dashboard

6. Check your profile to see the eligibility status (should show "ยังไม่พร้อมรับงาน" - not ready to work)

### Verify Database Records

```sql
-- Check profile was created
SELECT id, email, role, status, full_name
FROM profiles
WHERE email = 'your-google-email@gmail.com';

-- Check staff record was created
SELECT s.id, s.status, s.name_th, s.name_en, s.profile_id
FROM staff s
JOIN profiles p ON p.id = s.profile_id
WHERE p.email = 'your-google-email@gmail.com';
```

Expected results:
- Profile: `role='STAFF'`, `status='ACTIVE'`
- Staff: `status='pending'`

## Approval Workflow

After a staff member registers via Google:

1. **Staff sees**: "ยังไม่พร้อมรับงาน" (Not ready to work) dashboard
2. **Admin must**:
   - Go to Admin app → Staff Management
   - Find the new staff member (status: pending)
   - Review their information
   - Click "Approve" to change status to 'active'
3. **Staff must**:
   - Upload required documents (ID card, bank statement)
   - Wait for admin to verify documents
4. **Once approved**: Staff can see "พร้อมรับงาน" (Ready to work) and start accepting jobs

## Troubleshooting

### Issue: "OAuth authentication failed"
- Check that Google OAuth is enabled in Supabase Dashboard
- Verify Client ID and Secret are correct
- Ensure redirect URI matches exactly

### Issue: "This account is not authorized as staff"
- Check that the callback handler is setting role='STAFF'
- Verify the profile was created/updated correctly
- Check browser console for detailed error logs

### Issue: Staff record not created
- The database trigger should auto-create staff records for STAFF role users
- If missing, check migration `20260213000000_set_staff_pending_on_signup.sql` was applied
- Manually create staff record if needed:
  ```sql
  INSERT INTO staff (profile_id, name_th, name_en, phone, status)
  VALUES ('USER_ID', 'Name', 'Name', '0000000000', 'pending');
  ```

### Issue: "Site URL not whitelisted"
- In Supabase Dashboard → Authentication → URL Configuration
- Add your app URL to **Redirect URLs** list
- Format: `http://localhost:3004/**, https://yourdomain.com/**`

## Security Considerations

### Email Verification
By default, Google OAuth users don't need to verify their email because Google has already verified it. However, you can enable additional verification in Supabase settings if needed.

### Role Assignment
The callback handler automatically assigns the STAFF role to Google OAuth users. Make sure:
- The callback logic is secure and cannot be bypassed
- Only intended users can access the staff login page
- Consider adding domain restrictions in Google OAuth settings

### Data Privacy
Staff profiles created via Google OAuth will include:
- Email (from Google)
- Full name (from Google)
- Avatar URL (from Google profile picture)
- Role: STAFF
- Status: ACTIVE (for login), staff.status: pending (for work)

Make sure this complies with your privacy policy.

## Related Files

- Login page: `apps/staff/src/pages/auth/Login.tsx`
- OAuth callback: `apps/staff/src/pages/auth/Callback.tsx`
- Database trigger: `supabase/migrations/20260213000000_set_staff_pending_on_signup.sql`
- Auth service: `packages/supabase/src/auth/authService.ts`
- Staff service: `packages/supabase/src/staff/staffService.ts`
- Eligibility check: `packages/supabase/src/staff/staffService.ts` (canStaffStartWork)

## Next Steps

After enabling Google OAuth, you may want to:
1. Test the complete registration → approval → document upload → work flow
2. Update staff onboarding documentation to include Google login option
3. Train admin staff on approving Google OAuth registered staff
4. Monitor for any issues or edge cases in production
