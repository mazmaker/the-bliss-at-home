/**
 * Authentication Service
 * Handles all auth operations with role validation
 */

import { supabase } from './supabaseClient'
import type { Profile, LoginCredentials, RegisterCredentials, UserRole, AuthResponse, LineLoginCredentials } from './types'
import { AuthError } from './types'
import { ensureLiveSession, markIntentionalLogout, clearIntentionalLogout } from './ensureLiveSession'

// Cache to prevent excessive API calls.
// 🔴 v5 §2.3 null-cache fix: cache POSITIVE results only. A transient failure must NOT poison the
// cache with `{profile:null}` (that masked recovery for 30s); on failure we return the last-known-good
// profile instead of caching a null.
let profileCache: { profile: Profile; timestamp: number } | null = null
const CACHE_DURATION = 30000 // 30s to reduce API calls

/**
 * Get current user profile from profiles table
 * Auto-creates profile if it doesn't exist (for OAuth users)
 */
/**
 * Get the current user's profile.
 *
 * 🔴 v5 §2.3 (G1) — deadlock-safe: `providedSession` MUST be passed from the two onAuthStateChange
 * callbacks (AuthProvider.tsx + hooks.ts). `_callRefreshToken` emits TOKEN_REFRESHED WHILE holding the
 * auth lock; if this function called getSession()/ensureLiveSession() on that path it would enter the
 * reentrant `await last` (the in-flight refresh the emission is gated on) = circular self-await
 * deadlock → auth-lock wedged → autoRefresh freeze → the exact anon-downgrade false-reset. When
 * `providedSession` is supplied we use it DIRECTLY and acquire NO lock.
 *
 * 🔴 v5 §2.3 (G2) — cold-mount safe: when called with NO session (AuthProvider/hooks loadUser on a
 * fresh WebView reload) we mint a fresh token via the ensureLiveSession() single-flight (which
 * getSession-refreshes within the margin), NEVER by reading a possibly-expired localStorage token
 * (that would 401 → null profile → false logout to /staff/login) and NEVER via the old out-of-lock
 * raw-REST rotate (that stampeded → "Already Used").
 */
async function getCurrentProfile(
  providedSession?: { access_token?: string; user?: { id?: string } | null } | null
): Promise<Profile | null> {
  // Cache check (positive results only — see profileCache doc).
  if (profileCache && Date.now() - profileCache.timestamp < CACHE_DURATION) {
    return profileCache.profile
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

  try {
    let accessToken: string | undefined
    let userId: string | undefined

    if (providedSession?.access_token && providedSession.user?.id) {
      // onAuthStateChange path — use the session the SDK already delivered to the callback. NO lock.
      accessToken = providedSession.access_token
      userId = providedSession.user.id
    } else {
      // Cold-mount path — get a live token via the single-flight (refreshes within margin, no rotate).
      const live = await ensureLiveSession()
      if (live.token && live.userId) {
        accessToken = live.token
        userId = live.userId
      } else {
        // unknown/anon with no usable token → keep last-known-good (do NOT poison to null).
        return profileCache?.profile ?? null
      }
    }

    if (!accessToken || !userId) {
      return profileCache?.profile ?? null
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // Transient/auth error — return last-known-good WITHOUT deleting the session or caching null,
      // so a refresh can recover.
      console.log('📍 getCurrentProfile: API error:', response.status)
      return profileCache?.profile ?? null
    }

    const profiles = await response.json()
    const profile = profiles[0]

    if (!profile) {
      // No row. Could be a genuinely-new profile OR a lapsed session that slipped through — either way
      // do NOT cache null; return last-known-good so a transient miss can't strand the user for 30s.
      return profileCache?.profile ?? null
    }

    const result = profile as Profile
    profileCache = { profile: result, timestamp: Date.now() }
    return result
  } catch (error) {
    console.error('❌ getCurrentProfile: Error caught (session preserved):', error)
    // Do NOT poison the cache with null and do NOT delete the session — return last-known-good.
    return profileCache?.profile ?? null
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
  clearIntentionalLogout() // a fresh sign-in cancels a prior intentional-logout state

  // Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    throw new AuthError('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'INVALID_CREDENTIALS')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (profileError || !profile) {
    throw new AuthError('ไม่พบโปรไฟล์ผู้ใช้', 'UNKNOWN')
  }

  // Check account status
  if (profile.status !== 'ACTIVE') {
    await supabase.auth.signOut()
    throw new AuthError('บัญชีนี้ถูกระงับการใช้งาน', 'ACCOUNT_DISABLED')
  }

  // Validate role if expectedRole is provided
  if (expectedRole && profile.role !== expectedRole) {
    await supabase.auth.signOut()
    throw new AuthError('บัญชีนี้ไม่มีสิทธิ์เข้าถึง', 'INVALID_ROLE')
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
  clearIntentionalLogout()

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
      throw new AuthError('อีเมลนี้ถูกใช้งานแล้ว', 'INVALID_CREDENTIALS')
    }
    throw new AuthError(authError.message, 'UNKNOWN')
  }

  if (!authData.user) {
    throw new AuthError('การลงทะเบียนล้มเหลว', 'UNKNOWN')
  }

  if (!authData.session) {
    throw new AuthError('การลงทะเบียนล้มเหลว - ไม่สามารถสร้างเซสชันได้', 'UNKNOWN')
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
  // 🔴 v5 §2.1 — mark this as an INTENTIONAL logout so ensureLiveSession resolves 'anon' (not 'unknown')
  // for the real sign-out, while a transient/probe-triggered SIGNED_OUT still resolves 'unknown'.
  markIntentionalLogout()
  try {
    // Use local scope to avoid 403 Forbidden error with global scope
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      console.warn('⚠️ Supabase logout warning (continuing with local cleanup):', error.message)
    } else {
      console.log('✅ Supabase logout successful')
    }
  } catch (error) {
    // Don't throw error - continue with local session cleanup
    console.warn('⚠️ Supabase logout failed (continuing with local cleanup):', error)
  }

  // Clear all session-related storage (always do this regardless of Supabase result)
  localStorage.removeItem('bliss-customer-auth')  // Main session key
  localStorage.removeItem('rememberMe')
  sessionStorage.removeItem('sessionOnly')

  // Clear profile cache
  profileCache = null

  console.log('🔐 Logout: All session storage cleared')
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
    throw new AuthError('ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้', 'UNKNOWN')
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
    throw new AuthError('ไม่สามารถอัปเดตรหัสผ่านได้', 'UNKNOWN')
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
    throw new AuthError('ไม่สามารถเข้าสู่ระบบด้วย Google ได้', 'OAUTH_ERROR')
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
    throw new AuthError('ไม่สามารถเข้าสู่ระบบด้วย Facebook ได้', 'OAUTH_ERROR')
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
  clearIntentionalLogout()

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
          avatar_url: pictureUrl, // [R2] first-login seed (profile was missing → avatar empty)
          line_picture_url: pictureUrl,
          role: expectedRole,
          status: 'ACTIVE',
          language: 'th',
          line_user_id: lineUserId,
          line_display_name: displayName,
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
        // [R2] Don't clobber an uploaded/admin-set avatar on every login. Keep the LINE
        // picture in line_picture_url; only seed avatar_url on first login (when empty).
        line_picture_url: pictureUrl,
        ...(profile.avatar_url ? {} : { avatar_url: pictureUrl }),
        line_user_id: lineUserId,
        line_display_name: displayName,
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
          // [R2] deprecate staff.avatar_url — source of truth is profiles.avatar_url
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
        // [R2] return the DB avatar (uploaded/admin-set); fall back to LINE pic only if empty
        avatar_url: profile.avatar_url || pictureUrl,
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
        avatar_url: pictureUrl, // [R2] first-login seed (new signup)
        line_picture_url: pictureUrl,
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
      throw new AuthError('เข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่', 'RATE_LIMIT')
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
      avatar_url: pictureUrl, // [R2] first-login seed (new signup)
      line_picture_url: pictureUrl,
      role: expectedRole,
      status: 'ACTIVE',
      language: 'th',
      line_user_id: lineUserId,
      line_display_name: displayName,
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
          // [R2] deprecate staff.avatar_url — source of truth is profiles.avatar_url
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
