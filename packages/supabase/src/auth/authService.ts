/**
 * Authentication Service
 * Handles all auth operations with role validation
 */

import { supabase } from './supabaseClient'
import type { Profile, LoginCredentials, RegisterCredentials, UserRole, AuthResponse, LineLoginCredentials } from './types'
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
  // Clear session data
  localStorage.removeItem('bliss-customer-auth')
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

/**
 * Login with LINE (for Staff app)
 * Creates or updates user profile with LINE account info
 */
async function loginWithLine(
  credentials: LineLoginCredentials,
  expectedRole: UserRole = 'STAFF',
  inviteStaffId?: string
): Promise<AuthResponse> {
  const { lineUserId, displayName, pictureUrl } = credentials

  // Generate synthetic email from LINE userId
  const syntheticEmail = `line_${lineUserId}@line.local`
  // Generate a deterministic password from LINE userId (not for security, just for Supabase auth)
  const syntheticPassword = `LINE_${lineUserId}_${lineUserId.slice(-8)}`

  console.log('🔵 [LINE Login] Attempting to sign in with LINE account')

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
    // BUT: If user has an admin-created staff record, keep the admin-set name instead of LINE display name
    const { data: linkedStaff } = await supabase
      .from('staff')
      .select('name_th')
      .eq('profile_id', profile.id)
      .single()

    const nameToUse = linkedStaff?.name_th || displayName

    await supabase
      .from('profiles')
      .update({
        full_name: nameToUse,
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

    // If user already exists but has an invite, try to link the admin-created staff record
    if (inviteStaffId) {
      console.log('🔵 [LINE Login] Existing user with invite, attempting to link staff record')
      console.log('🔵 [LINE Login] Invite staff ID:', inviteStaffId, 'User ID:', signInData.user.id)

      // Step A: Check if this user already has a trigger-created staff record (self-signup duplicate)
      const { data: existingStaff } = await supabase
        .from('staff')
        .select('id, name_th')
        .eq('profile_id', signInData.user.id)
        .single()

      if (existingStaff && existingStaff.id !== inviteStaffId) {
        // User has a duplicate staff record created by trigger (self-signup path)
        // Delete it first so we can link to the admin-created one
        console.log('🔵 [LINE Login] Found duplicate trigger-created staff:', existingStaff.id, existingStaff.name_th)
        console.log('🔵 [LINE Login] Deleting duplicate to link invite staff record...')
        const { error: deleteError } = await supabase
          .from('staff')
          .delete()
          .eq('id', existingStaff.id)
          .eq('profile_id', signInData.user.id) // Safety: only delete if it belongs to this user

        if (deleteError) {
          console.error('🔴 [LINE Login] Failed to delete duplicate staff:', deleteError)
        } else {
          console.log('🔵 [LINE Login] Duplicate staff deleted successfully')
        }
      }

      // Step B: Link the admin-created staff record to this user
      const { data: linkResult, error: linkError } = await supabase
        .from('staff')
        .update({
          profile_id: signInData.user.id,
          avatar_url: pictureUrl,
          invite_token: null,
          invite_token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inviteStaffId)
        .is('profile_id', null)
        .select('id, name_th')

      if (linkError) {
        console.error('🔴 [LINE Login] Failed to link invite staff:', linkError)
      } else if (linkResult && linkResult.length > 0) {
        console.log('✅ [LINE Login] Successfully linked staff:', linkResult[0].name_th, '(', linkResult[0].id, ')')

        // Step C: Update profile.full_name to match the admin-created staff name
        // This ensures the dashboard shows the correct name (admin-set name, not LINE display name)
        const staffName = linkResult[0].name_th
        if (staffName) {
          console.log('🔵 [LINE Login] Updating profile name to match staff:', staffName)
          await supabase
            .from('profiles')
            .update({ full_name: staffName, updated_at: new Date().toISOString() })
            .eq('id', signInData.user.id)

          // Also update the profile object we'll return
          profile.full_name = staffName
        }
      } else {
        console.warn('🟡 [LINE Login] Link returned 0 rows - staff may already be linked or invite expired')
      }
    }

    return {
      profile: {
        ...profile,
        full_name: nameToUse,
        avatar_url: pictureUrl,
      } as Profile,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_at: signInData.session.expires_at || 0,
      },
    }
  }

  // Step 2: Sign in failed, user might not exist or password is wrong
  console.log('🔵 [LINE Login] Sign in failed:', signInError?.message)

  // Step 3: Try to create new account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: syntheticEmail,
    password: syntheticPassword,
    options: {
      emailRedirectTo: undefined, // Disable email confirmation redirect
      data: {
        full_name: displayName,
        avatar_url: pictureUrl,
        role: expectedRole,
        line_user_id: lineUserId,
        ...(inviteStaffId ? { invite_staff_id: inviteStaffId } : {}),
      },
    },
  })

  // If signup fails because user already exists, try to recover the account
  if (authError?.message?.toLowerCase().includes('already')) {
    console.log('🔵 [LINE Login] User already exists, checking profiles table')

    // User exists but we can't sign in - check if profile exists
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', syntheticEmail)
      .limit(1)

    if (profiles && profiles.length > 0) {
      // Profile exists - the issue is password mismatch
      // This can happen if user was created with different password or account state changed
      console.error('🔴 [LINE Login] Account exists but password mismatch')
      throw new AuthError(
        'บัญชี LINE นี้มีอยู่แล้ว แต่ไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลระบบ',
        'ACCOUNT_EXISTS_PASSWORD_MISMATCH'
      )
    }

    // Profile doesn't exist but auth user does - this is unusual
    console.error('🔴 [LINE Login] Auth user exists but no profile')
    throw new AuthError(
      'พบปัญหาในการเข้าสู่ระบบ กรุณาติดต่อผู้ดูแลระบบ',
      'ORPHANED_AUTH_USER'
    )
  }

  if (authError) {
    // Check for rate limit error
    if (authError.message?.toLowerCase().includes('rate limit')) {
      throw new AuthError('Too many login attempts. Please wait a moment and try again.', 'RATE_LIMIT')
    }
    console.error('🔴 [LINE Login] Signup failed:', authError)
    throw new AuthError('Failed to create LINE account: ' + authError.message, 'SIGNUP_FAILED')
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
    throw new AuthError('Failed to create profile: ' + profileError.message, 'UNKNOWN')
  }

  // Fallback: If invite was provided, verify the link succeeded (trigger should have handled this)
  if (inviteStaffId && authData.user) {
    console.log('🔵 [LINE Login] Verifying invite link after signup...')
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('id, profile_id, name_th')
      .eq('id', inviteStaffId)
      .single()

    if (staffRecord && staffRecord.profile_id === authData.user.id) {
      console.log('✅ [LINE Login] Trigger successfully linked staff:', staffRecord.name_th)
      // Update profile name to match admin-set staff name
      if (staffRecord.name_th) {
        await supabase
          .from('profiles')
          .update({ full_name: staffRecord.name_th, updated_at: new Date().toISOString() })
          .eq('id', authData.user.id)
      }
    } else {
      // Trigger didn't link — handle duplicate and do it manually
      console.warn('🟡 [LINE Login] Trigger link may have failed, attempting manual link')

      // Check if trigger created a SEPARATE staff record (self-signup path)
      const { data: duplicateStaff } = await supabase
        .from('staff')
        .select('id, name_th')
        .eq('profile_id', authData.user.id)
        .neq('id', inviteStaffId)
        .single()

      if (duplicateStaff) {
        console.log('🔵 [LINE Login] Found trigger-created duplicate staff:', duplicateStaff.id, duplicateStaff.name_th)
        const { error: delErr } = await supabase
          .from('staff')
          .delete()
          .eq('id', duplicateStaff.id)
          .eq('profile_id', authData.user.id)

        if (delErr) {
          console.error('🔴 [LINE Login] Failed to delete duplicate:', delErr)
        } else {
          console.log('🔵 [LINE Login] Duplicate deleted, now linking invite staff...')
        }
      }

      // Link the admin-created staff record
      const { data: linkResult, error: linkError } = await supabase
        .from('staff')
        .update({
          profile_id: authData.user.id,
          avatar_url: pictureUrl,
          invite_token: null,
          invite_token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inviteStaffId)
        .is('profile_id', null)
        .select('id, name_th')

      if (linkError) {
        console.error('🔴 [LINE Login] Manual link failed:', linkError)
      } else if (linkResult && linkResult.length > 0) {
        console.log('✅ [LINE Login] Manually linked staff:', linkResult[0].name_th)
        // Update profile name to match admin-set staff name
        if (linkResult[0].name_th) {
          await supabase
            .from('profiles')
            .update({ full_name: linkResult[0].name_th, updated_at: new Date().toISOString() })
            .eq('id', authData.user.id)
        }
      } else {
        console.warn('🟡 [LINE Login] Manual link returned 0 rows')
      }
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

/**
 * Link LINE account to existing user profile
 * For users who registered via Email/Google and want to connect their LINE account
 */
async function linkLineAccount(credentials: LineLoginCredentials): Promise<void> {
  const { lineUserId, displayName, pictureUrl } = credentials

  // Get current session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    throw new AuthError('Please login first', 'UNAUTHORIZED')
  }

  // Check if LINE account is already linked to another user
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('line_user_id', lineUserId)
    .neq('id', session.user.id) // Exclude current user
    .maybeSingle()

  if (checkError) {
    throw new AuthError('Failed to check LINE account status', 'DATABASE_ERROR')
  }

  if (existingProfile) {
    throw new AuthError(
      `บัญชี LINE นี้ถูกเชื่อมต่อกับบัญชี ${existingProfile.email || existingProfile.full_name} อยู่แล้ว กรุณาใช้บัญชี LINE อื่น`,
      'LINE_ALREADY_LINKED'
    )
  }

  // Update profile with LINE information
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      line_user_id: lineUserId,
      line_display_name: displayName,
      line_picture_url: pictureUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id)

  if (updateError) {
    throw new AuthError('Failed to link LINE account', 'DATABASE_ERROR')
  }
}

/**
 * Link LINE account to specific user (bypassing session check)
 * Used when session might have changed during OAuth redirect
 */
async function linkLineAccountToUser(credentials: LineLoginCredentials & { userId: string }): Promise<void> {
  const { userId, lineUserId, displayName, pictureUrl } = credentials

  console.log('[linkLineAccountToUser] Linking LINE to user:', userId)

  // Check if LINE account is already linked to another user
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('line_user_id', lineUserId)
    .neq('id', userId) // Exclude current user
    .maybeSingle()

  if (checkError) {
    console.error('[linkLineAccountToUser] Check failed:', checkError)
    throw new AuthError('Failed to check LINE account status', 'DATABASE_ERROR')
  }

  if (existingProfile) {
    console.error('[linkLineAccountToUser] LINE already linked to:', existingProfile)
    throw new AuthError(
      `บัญชี LINE นี้ถูกเชื่อมต่อกับบัญชี ${existingProfile.email || existingProfile.full_name} อยู่แล้ว กรุณาใช้บัญชี LINE อื่น`,
      'LINE_ALREADY_LINKED'
    )
  }

  // Update profile with LINE information using explicit user ID
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      line_user_id: lineUserId,
      line_display_name: displayName,
      line_picture_url: pictureUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    console.error('[linkLineAccountToUser] Update failed:', updateError)
    throw new AuthError('Failed to link LINE account: ' + updateError.message, 'DATABASE_ERROR')
  }

  console.log('[linkLineAccountToUser] Successfully linked!')
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
  loginWithLine,
  linkLineAccount,
  linkLineAccountToUser,
}
