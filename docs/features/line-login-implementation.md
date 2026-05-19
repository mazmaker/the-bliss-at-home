# LINE Login Implementation Plan

## Phase 2: Frontend Implementation (5-7 hours)

### 2.1 Install Dependencies (15 min)
```bash
cd apps/customer
npm install @supabase/auth-helpers-react
```

### 2.2 Create LINE Login Component (2 hours)
```typescript
// apps/customer/src/components/LineLogin.tsx
import { useState } from 'react'
import { supabase } from '@bliss/supabase'

export default function LineLogin() {
  const [loading, setLoading] = useState(false)

  const handleLineLogin = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'line',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) throw error
    } catch (error) {
      console.error('LINE Login error:', error)
      alert('การเข้าสู่ระบบด้วย LINE ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLineLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 bg-[#06C755] hover:bg-[#05b84d] text-white py-3 px-4 rounded-lg font-medium transition"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        </svg>
      )}
      {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย LINE'}
    </button>
  )
}
```

### 2.3 Create Auth Callback Page (1 hour)
```typescript
// apps/customer/src/pages/AuthCallback.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@bliss/supabase/auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    // Handle auth callback
    const handleAuthCallback = async () => {
      try {
        // Wait for auth state to update
        if (user) {
          // Redirect to intended page or home
          const redirectTo = localStorage.getItem('line_login_redirect') || '/'
          localStorage.removeItem('line_login_redirect')
          navigate(redirectTo)
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/login?error=auth_failed')
      }
    }

    handleAuthCallback()
  }, [user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังเข้าสู่ระบบ...</p>
      </div>
    </div>
  )
}
```

### 2.4 Update AuthProvider (1.5 hours)
```typescript
// packages/supabase/src/auth/AuthProvider.tsx - Updates needed
// Add LINE auth handling
// Sync LINE profile data with local profiles table
// Handle profile creation for new LINE users
```

### 2.5 Update Login/Register Pages (1 hour)
```typescript
// Add LineLogin component to existing auth pages
// Update UI to show both email and LINE options
// Add proper error handling
```

## Phase 3: Backend Integration (2-3 hours)

### 3.1 Profile Sync Function (1.5 hours)
```typescript
// Create function to sync LINE profile → Supabase profiles
// Handle profile picture from LINE
// Sync display name, email (if available)
```

### 3.2 Update RLS Policies (30 min)
```sql
-- Ensure LINE authenticated users can access necessary data
-- Update existing policies if needed
```

### 3.3 Error Handling (1 hour)
```typescript
// Handle LINE auth errors
// Handle profile sync errors  
// Add fallback mechanisms
```

## Phase 4: Testing (3-5 hours)

### 4.1 Development Testing (2 hours)
- Test LINE login flow
- Test profile creation
- Test existing user login
- Test error scenarios

### 4.2 Production Testing (1-2 hours)  
- Test with real LINE accounts
- Test callback URLs
- Performance testing

### 4.3 Edge Case Testing (1 hour)
- Network failures
- LINE API errors
- Token expiration
- Multiple device login

## Phase 5: UI/UX Polish (1-2 hours)

### 5.1 Design Integration
- Match LINE button with app design
- Add loading states
- Error message styling

### 5.2 User Flow Optimization
- Remember login method preference
- Smooth transitions
- Clear error messages

## Potential Issues & Solutions

### Issue 1: LINE Profile vs App Profile
**Problem:** LINE profile data might not match app requirements
**Solution:** Create profile completion flow for first-time LINE users

### Issue 2: Email Availability
**Problem:** LINE doesn't always provide email
**Solution:** Make email optional or ask user to provide

### Issue 3: Token Management
**Problem:** LINE tokens need proper handling
**Solution:** Let Supabase handle token refresh automatically

### Issue 4: Multiple Auth Methods
**Problem:** User might have both email and LINE accounts
**Solution:** Account linking functionality (future enhancement)