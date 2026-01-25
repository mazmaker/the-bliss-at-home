/**
 * Authentication Service
 * Handles all auth operations with role validation
 */

import { supabase } from './supabaseClient'
import type { Profile, LoginCredentials, RegisterCredentials, LineLoginCredentials, UserRole, AuthResponse } from './types'
import { AuthError } from './types'

/**
 * Get current user profile from profiles table
 * Uses getSession() first (fast, cached) instead of getUser() (slow, network call)
 * If profile doesn't exist, try to create it from user metadata
 */
async function getCurrentProfile(): Promise<Profile | null> {
  // Use getSession() - this reads from localStorage and is fast
  // It also triggers background token refresh if needed
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session?.user) {
    return null
  }

  const user = session.user

  // Try to get existing profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile) {
    return profile as Profile
  }

  // Profile doesn't exist, try to create from user metadata
  if (error) {
    console.warn('Profile not found, attempting to create from user metadata')

    const metadata = user.user_metadata || {}
    const email = user.email || metadata.email || ''

    // Try to create the profile
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: email,
        full_name: metadata.full_name || metadata.name || email.split('@')[0],
        avatar_url: metadata.avatar_url || metadata.picture,
        role: metadata.role || 'CUSTOMER',
        status: 'ACTIVE',
        language: 'th',
      })
      .select()
      .single()

    if (newProfile) {
      return newProfile as Profile
    }

    if (insertError) {
      console.error('Failed to create profile:', insertError)
    }

    // Return minimal profile from user data if all else fails
    return {
      id: user.id,
      email: email,
      full_name: metadata.full_name || metadata.name || email.split('@')[0],
      avatar_url: metadata.avatar_url || metadata.picture,
      role: metadata.role || 'CUSTOMER',
      status: 'ACTIVE',
      language: 'th',
      phone: metadata.phone,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at,
    } as Profile
  }

  return null
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

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    throw new AuthError('Email already registered', 'INVALID_CREDENTIALS')
  }

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
    throw new AuthError(authError.message, 'UNKNOWN')
  }

  if (!authData.user) {
    throw new AuthError('Registration failed', 'UNKNOWN')
  }

  // Profile will be created automatically by trigger
  // But we need to update it with additional info
  const { data: profile, error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
      role,
      status: 'PENDING_VERIFICATION',
    })
    .eq('id', authData.user.id)
    .select()
    .single()

  if (updateError) {
    throw new AuthError('Failed to create profile', 'UNKNOWN')
  }

  return {
    profile: profile as Profile,
    session: {
      access_token: authData.session?.access_token || '',
      refresh_token: authData.session?.refresh_token || '',
      expires_at: authData.session?.expires_at || 0,
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
 * Login with LINE (for Staff app)
 * Creates or updates user based on LINE userId
 *
 * Strategy: Try signIn first, if fails then signUp
 * This avoids RLS issues and reduces unnecessary signUp calls
 */
async function loginWithLine(
  credentials: LineLoginCredentials,
  expectedRole: UserRole = 'STAFF'
): Promise<AuthResponse> {
  const { lineUserId, displayName, pictureUrl } = credentials

  // Generate synthetic email from LINE userId
  const syntheticEmail = `line_${lineUserId}@line.local`
  // Generate a deterministic password from LINE userId (not for security, just for Supabase auth)
  const syntheticPassword = `LINE_${lineUserId}_${lineUserId.slice(-8)}`

  // Step 1: Try to sign in first (user might already exist)
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: syntheticPassword,
  })

  // If sign in succeeded, user exists
  if (signInData?.session && signInData?.user) {
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signInData.user.id)
      .single()

    if (profileError || !profile) {
      // Profile might not exist yet (edge case), create it
      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({
          id: signInData.user.id,
          email: syntheticEmail,
          full_name: displayName,
          avatar_url: pictureUrl,
          role: expectedRole,
          status: 'ACTIVE',
          language: 'th',
        })
        .select()
        .single()

      return {
        profile: (newProfile || {
          id: signInData.user.id,
          email: syntheticEmail,
          full_name: displayName,
          avatar_url: pictureUrl,
          role: expectedRole,
          status: 'ACTIVE',
          language: 'th',
        }) as Profile,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at || 0,
        },
      }
    }

    // Update profile with latest LINE data
    await supabase
      .from('profiles')
      .update({
        full_name: displayName,
        avatar_url: pictureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    // Validate role
    if (profile.role !== expectedRole) {
      await supabase.auth.signOut()
      throw new AuthError(
        `This account is not authorized as ${expectedRole.toLowerCase()}`,
        'INVALID_ROLE'
      )
    }

    // Check account status
    if (profile.status !== 'ACTIVE') {
      await supabase.auth.signOut()
      throw new AuthError(
        `Account is ${profile.status.toLowerCase().replace('_', ' ')}`,
        'ACCOUNT_DISABLED'
      )
    }

    return {
      profile: {
        ...profile,
        full_name: displayName,
        avatar_url: pictureUrl,
      } as Profile,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_at: signInData.session.expires_at || 0,
      },
    }
  }

  // Step 2: Sign in failed, check if it's "invalid credentials" (user doesn't exist)
  // Only try signUp if the error indicates user doesn't exist
  const isUserNotFound = signInError?.message?.toLowerCase().includes('invalid') ||
                         signInError?.message?.toLowerCase().includes('credentials')

  if (!isUserNotFound) {
    // Some other error (rate limit, network, etc.)
    throw new AuthError('LINE authentication failed: ' + (signInError?.message || 'Unknown error'), 'UNKNOWN')
  }

  // Step 3: User doesn't exist, create new account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: syntheticEmail,
    password: syntheticPassword,
    options: {
      data: {
        full_name: displayName,
        avatar_url: pictureUrl,
        role: expectedRole,
        line_user_id: lineUserId,
      },
    },
  })

  if (authError) {
    // Check for rate limit error
    if (authError.message?.toLowerCase().includes('rate limit')) {
      throw new AuthError('Too many login attempts. Please wait a moment and try again.', 'UNKNOWN')
    }
    throw new AuthError('Failed to create LINE account: ' + authError.message, 'UNKNOWN')
  }

  if (!authData.user || !authData.session) {
    throw new AuthError('LINE registration failed', 'UNKNOWN')
  }

  // Create/update profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authData.user.id,
      email: syntheticEmail,
      full_name: displayName,
      avatar_url: pictureUrl,
      role: expectedRole,
      status: 'ACTIVE',
      language: 'th',
    })
    .select()
    .single()

  if (profileError) {
    // Try to fetch existing profile if upsert failed
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

    // If profile doesn't exist, return a minimal profile
    return {
      profile: {
        id: authData.user.id,
        email: syntheticEmail,
        full_name: displayName,
        avatar_url: pictureUrl,
        role: expectedRole,
        status: 'ACTIVE',
        language: 'th',
      } as Profile,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at || 0,
      },
    }
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

// Export auth service
export const authService = {
  getCurrentProfile,
  login,
  loginWithLine,
  register,
  logout,
  refreshSession,
  resetPassword,
  updatePassword,
}
