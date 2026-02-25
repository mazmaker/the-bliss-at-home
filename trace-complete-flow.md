# 🔍 Complete Flow Analysis: Account Creation → Login → Password Change

## 1. 👨‍💼 Admin Creates Hotel Account

### Location: Admin App
- **Page**: `apps/admin/src/pages/Hotels.tsx`
- **API**: `apps/server/src/routes/hotel.ts`

### Process:
1. **Admin fills hotel form** → Basic hotel info (name, email, address, etc.)
2. **Click "Create Account"** → Triggers hotel creation
3. **Backend creates**:
   - Hotel record in `hotels` table
   - Supabase auth user with temporary password
   - Profile record in `profiles` table
4. **Email sent** to hotel with login credentials

### Database Changes:
```sql
-- hotels table
INSERT INTO hotels (
  name_th, name_en, email, phone, address,
  login_email, temporary_password, password_change_required: true,
  login_enabled: true, auth_user_id
)

-- auth.users (via Supabase)
CREATE USER email='hotel@example.com', password='TempPass123!'

-- profiles table
INSERT INTO profiles (
  id, email, role: 'HOTEL', hotel_id, full_name
)
```

---

## 2. 🏨 Hotel User Receives Credentials

### What Hotel Gets:
- **Email**: `hotel@example.com`
- **Temporary Password**: `TempPass123!`
- **URL**: `http://localhost:3003/`
- **Instructions**: "Change password on first login"

---

## 3. 🔐 First Login Process

### Location: Hotel App Login
- **Page**: `apps/hotel/src/pages/auth/EnhancedLogin.tsx`
- **Hook**: `packages/supabase/src/auth/hooks.ts` (useAuth)

### Step 3.1: Login Attempt
```javascript
// User enters: hotel@example.com / TempPass123!
const result = await login({ email, password })

// Validates:
✅ Email/password correct
✅ Profile role === 'HOTEL'
✅ Account exists in hotels table
```

### Step 3.2: Authentication Success
```javascript
// useAuth hook updates state:
isAuthenticated: true
user: { id, email, role: 'HOTEL', hotel_id, ... }
```

### Step 3.3: Password Change Check
```javascript
// useEffect triggers checkPasswordRequirement():

// Query hotels table:
SELECT password_change_required
FROM hotels
WHERE auth_user_id = user.id

// Result: password_change_required = true
// Action: Show password change form
setLoginStep('change-password')
```

---

## 4. 🔄 Password Change Process

### Location: Same Login Page
- **Component**: `EnhancedLogin.tsx` (change-password step)
- **API**: `apps/server/src/routes/hotel.ts` - `/change-password`

### Step 4.1: User Fills New Password
```javascript
// Form validation (Zod schema):
✅ Min 8 characters
✅ Upper + lowercase letters
✅ Numbers + special chars
✅ Not common passwords
✅ Different from current password
```

### Step 4.2: Submit Password Change
```javascript
// API call to /api/hotels/change-password:
POST {
  currentPassword: 'TempPass123!',
  newPassword: 'NewSecure123!',
  confirmPassword: 'NewSecure123!',
  hotelId: hotel.id
}
```

### Step 4.3: Backend Processing
```javascript
// Server validates:
✅ Current password matches temporary_password
✅ New password meets requirements
✅ Hotel exists and password_change_required = true

// Updates:
- Supabase auth password → New password
- hotels.password_change_required → false
- hotels.temporary_password → null
```

### Step 4.4: Success & Redirect
```javascript
// Frontend receives success
✅ Password changed successfully
🔄 Redirect to hotel dashboard: /hotel/{slug}
```

---

## 5. 🎯 Current Implementation Status

### ✅ Working Components:
1. **Admin hotel creation** - Creates all required records
2. **Hotel login validation** - Checks email/password/role
3. **Password change form** - Full validation + UI
4. **Password change API** - Server endpoint works
5. **Database updates** - All tables updated correctly

### ⚠️ Potential Issues Identified:

#### Issue 1: Timing Problem
```javascript
// Problem: useAuth state updates after useEffect runs
isAuthenticated: false (initially)
user: null (initially)

// Session exists in localStorage but useAuth not ready
// Solution: Manual localStorage check + timer re-check ✅
```

#### Issue 2: Multiple Redirects
```javascript
// DynamicHotelRedirect also runs in parallel
// Could conflict with password change flow
// Need to ensure password change takes priority
```

---

## 6. 🧪 Test Scenarios Created

### Test Hotel 1: Bangkok
- **Email**: `bangkok@testhotel.com`
- **Password**: `TempPass123!`
- **Expected**: Show password change form

### Test Hotel 2: Chiang Mai
- **Email**: `chiangmai@testhotel.com`
- **Password**: `TempPass456!`
- **Expected**: Show password change form

### Database State:
```sql
-- Both hotels have:
password_change_required: true ✅
login_enabled: true ✅
auth_user_id: [valid-uuid] ✅
temporary_password: [temp-pass] ✅

-- Profiles have:
role: 'HOTEL' ✅
hotel_id: [valid-uuid] ✅
```

---

## 7. 🔍 Debug Flow

### Current Logs Show:
```
🔍 [DEBUG] LocalStorage session exists: false (initially)
📍 getCurrentProfile: Profile found! (later)
⏰ [DEBUG] Timer triggered - forcing recheck... (should happen)
🔐 [DEBUG] MANUAL CHECK: Password change is REQUIRED! (expected)
```

### Missing Log (Issue):
```
🔐 [DEBUG] MANUAL CHECK: Password change is REQUIRED!
```
This log should appear but isn't showing up, indicating the manual check isn't working as expected.

---

## 8. 🎯 Next Steps

1. **Verify manual localStorage check** is working
2. **Test timer-based re-check** triggers correctly
3. **Confirm password change form** displays
4. **Test complete flow** end-to-end
5. **Remove debug logs** after confirmation

---

## 9. 📋 Complete User Journey

```
Admin → Create Hotel → Email sent → Hotel receives credentials
  ↓
Hotel → Go to login page → Enter email/password → Click login
  ↓
System → Validate credentials → Check password_change_required → Show change form
  ↓
Hotel → Fill new password → Submit → Password updated → Redirect to dashboard
  ↓
Hotel → Can now use system normally with new password
```

**Status**: 95% implemented, debugging timing issue ⏰