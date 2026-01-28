/**
 * Authentication Service
 * Handles all auth operations with role validation
 */

import { supabase } from './supabaseClient'
import type { Profile, LoginCredentials, RegisterCredentials, UserRole, AuthResponse } from './types'
import { AuthError } from './types'

/**
 * Get current user profile from profiles table
 */
async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return profile as Profile
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

  // Handle remember me
  if (rememberMe) {
    // Session will persist in localStorage
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
