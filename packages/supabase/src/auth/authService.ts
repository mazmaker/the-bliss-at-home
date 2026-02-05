/**
 * Authentication Service
 * Handles all auth operations with role validation
 */

import { supabase } from './supabaseClient'
import type { Profile, LoginCredentials, RegisterCredentials, UserRole, AuthResponse } from './types'
import { AuthError } from './types'

/**
 * Get current user profile from profiles table
 * Auto-creates profile if it doesn't exist (for OAuth users)
 */
async function getCurrentProfile(): Promise<Profile | null> {
  console.log('📍 getCurrentProfile: Starting...')

  try {
    // WORKAROUND: Read session from localStorage directly instead of using getSession()
    // because getSession() hangs with OAuth sessions
    console.log('📍 getCurrentProfile: Reading session from localStorage directly...')

    const sessionData = localStorage.getItem('bliss-customer-auth')
    if (!sessionData) {
      console.log('📍 getCurrentProfile: No session found in localStorage')
      return null
    }

    const session = JSON.parse(sessionData)

    // Log full structure to debug
    console.log('📍 getCurrentProfile: Full session structure:', {
      keys: Object.keys(session),
      hasUser: !!session.user,
      hasCurrentSession: !!session.currentSession,
      userId_direct: session.user?.id,
      userId_nested: session.currentSession?.user?.id,
    })

    // Try different possible structures
    const user = session.user || session.currentSession?.user
    const accessToken = session.access_token
    const refreshToken = session.refresh_token

    if (!user) {
      console.log('📍 getCurrentProfile: No valid user found in session')
      return null
    }

    // Check if session is expired
    const expiresAt = session.expires_at || session.currentSession?.expires_at
    if (expiresAt && expiresAt < Date.now() / 1000) {
      console.log('📍 getCurrentProfile: Session expired')
      localStorage.removeItem('bliss-customer-auth')
      return null
    }

    console.log('📍 getCurrentProfile: Session valid, fetching profile for user:', user.id)

    // IMPORTANT: Use direct REST API call with access token to avoid setSession() hanging
    if (!accessToken) {
      console.log('📍 getCurrentProfile: No access token found')
      return null
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log('📍 getCurrentProfile: API error:', response.status, errorText)
      return null
    }

    const profiles = await response.json()
    const profile = profiles[0]

    if (!profile) {
      console.log('📍 getCurrentProfile: No profile found')
      return null
    }

    console.log('📍 getCurrentProfile: Profile found!')
    return profile as Profile
  } catch (error) {
    console.error('❌ getCurrentProfile: Error caught:', error)

    // If there's an error parsing session or fetching profile, return null
    // This allows the user to login again
    return null
  }
}

/**
 * Login with email/password and validate role
 */
async function login(
  credentials: LoginCredentials,
  expectedRole?: UserRole
): Promise<AuthResponse> {
  const { email, password, rememberMe } = credentials

  // Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (profileError || !profile) {
    throw new AuthError('Profile not found', 'UNKNOWN')
  }

  // Check account status
  if (profile.status !== 'ACTIVE') {
    await supabase.auth.signOut()
    throw new AuthError(
      `Account is ${profile.status.toLowerCase().replace('_', ' ')}`,
      'ACCOUNT_DISABLED'
    )
  }

  // Validate role if expectedRole is provided
  if (expectedRole && profile.role !== expectedRole) {
    await supabase.auth.signOut()
    throw new AuthError(
      `This account is not authorized as ${expectedRole.toLowerCase()}`,
      'INVALID_ROLE'
    )
  }

  // Update last login
  await supabase
    .from('profiles')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', profile.id)

  // Handle remember me - store preference for session management
  if (rememberMe) {
    // Keep session in localStorage (default behavior)
    localStorage.setItem('rememberMe', 'true')
  } else {
    // Don't remember - mark for cleanup on browser close
    localStorage.setItem('rememberMe', 'false')
    sessionStorage.setItem('sessionOnly', 'true')
  }

  return {
    profile: profile as Profile,
    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at || 0,
    },
  }
}

/**
 * Register new user with role
 */
async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const { email, password, fullName, phone, role } = credentials

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role,
      },
    },
  })

  if (authError) {
    // Check if email already exists
    if (authError.message.includes('already registered')) {
      throw new AuthError('Email already registered', 'INVALID_CREDENTIALS')
    }
    throw new AuthError(authError.message, 'UNKNOWN')
  }

  if (!authData.user) {
    throw new AuthError('Registration failed', 'UNKNOWN')
  }

  if (!authData.session) {
    throw new AuthError('Registration failed - no session created', 'UNKNOWN')
  }

  // Create profile manually
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: authData.user.email!,
      full_name: fullName,
      phone,
      role,
      status: 'ACTIVE',
    })
    .select()
    .single()

  if (profileError) {
    // If profile already exists (from trigger), fetch it
    if (profileError.code === '23505') {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (existingProfile) {
        return {
          profile: existingProfile as Profile,
          session: {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
            expires_at: authData.session.expires_at || 0,
          },
        }
      }
    }

    throw new AuthError('Failed to create profile: ' + profileError.message, 'UNKNOWN')
  }

  return {
    profile: profile as Profile,
    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at || 0,
    },
  }
}

/**
 * Logout current user
 */
async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new AuthError('Failed to logout', 'UNKNOWN')
  }
  // Clear remember me preferences
  localStorage.removeItem('rememberMe')
  sessionStorage.removeItem('sessionOnly')
}

/**
 * Refresh session
 */
async function refreshSession(): Promise<void> {
  const { error } = await supabase.auth.refreshSession()
  if (error) {
    throw new AuthError('Failed to refresh session', 'UNKNOWN')
  }
}

/**
 * Reset password
 */
async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) {
    throw new AuthError('Failed to send reset email', 'UNKNOWN')
  }
}

/**
 * Update password
 */
async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw new AuthError('Failed to update password', 'UNKNOWN')
  }
}

/**
 * Sign in with Google OAuth
 */
async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    throw new AuthError('Failed to sign in with Google', 'OAUTH_ERROR')
  }
}

/**
 * Sign in with Facebook OAuth
 */
async function signInWithFacebook(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      // Remove scopes to use default permissions (public_profile)
      // Email will be included automatically if available
    },
  })

  if (error) {
    throw new AuthError('Failed to sign in with Facebook', 'OAUTH_ERROR')
  }
}

// Export auth service
export const authService = {
  getCurrentProfile,
  login,
  register,
  logout,
  refreshSession,
  resetPassword,
  updatePassword,
  signInWithGoogle,
  signInWithFacebook,
}
