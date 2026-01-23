/**
 * Real Supabase Authentication Service
 * สำหรับการใช้งาน Supabase Auth จริง
 */

import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

// Custom AuthError class
class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export interface Profile {
  id: string
  email: string
  role: 'ADMIN' | 'CUSTOMER' | 'STAFF' | 'HOTEL'
  full_name: string
  phone?: string
  avatar_url?: string
  status: 'ACTIVE' | 'INACTIVE'
  language: 'th' | 'en'
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: User | null
  session: Session | null
  profile: Profile | null
}

/**
 * ล็อกอิน
 */
export async function signInWithEmail(credentials: LoginCredentials): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  })

  if (error) {
    throw new AuthError(error.message)
  }

  if (!data.user) {
    throw new Error('No user returned from authentication')
  }

  // ดึงข้อมูล profile หลังจาก login สำเร็จแล้ว
  const profile = await getUserProfileByEmail(data.user.email!)

  // ตรวจสอบว่าเป็น ADMIN หรือไม่
  if (!profile) {
    await supabase.auth.signOut()
    throw new Error('No profile found for this user')
  }

  if (profile.role !== 'ADMIN') {
    await supabase.auth.signOut()
    throw new Error('Access denied. Admin role required.')
  }

  return {
    user: data.user,
    session: data.session,
    profile,
  }
}

/**
 * ลงทะเบียน (สำหรับ Admin เท่านั้น)
 */
export async function signUpAdmin(credentials: LoginCredentials & { full_name: string }): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        full_name: credentials.full_name,
        role: 'ADMIN'
      }
    }
  })

  if (error) {
    throw new AuthError(error.message)
  }

  if (!data.user) {
    throw new Error('No user returned from signup')
  }

  // สร้าง profile
  const profile = await createUserProfile(data.user.id, {
    email: credentials.email,
    role: 'ADMIN',
    full_name: credentials.full_name,
    status: 'ACTIVE',
    language: 'th'
  })

  return {
    user: data.user,
    session: data.session,
    profile,
  }
}

/**
 * ออกจากระบบ
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new AuthError(error.message)
  }
}

/**
 * ดึงข้อมูล Session ปัจจุบัน
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  return data.session
}

/**
 * ดึงข้อมูล User Profile
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data as Profile
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return null
  }
}

/**
 * ดึงข้อมูล User Profile ด้วย Email
 */
export async function getUserProfileByEmail(email: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile by email:', error)
      return null
    }

    return data as Profile
  } catch (error) {
    console.error('Failed to fetch user profile by email:', error)
    return null
  }
}

/**
 * สร้าง User Profile
 */
export async function createUserProfile(
  userId: string,
  profileData: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
): Promise<Profile> {
  const newProfile = {
    id: userId,
    ...profileData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert(newProfile)
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    throw new Error(`Failed to create user profile: ${error.message}`)
  }

  return data as Profile
}

/**
 * ดึงข้อมูล Current User และ Profile
 */
export async function getCurrentUserWithProfile(): Promise<{
  user: User | null
  profile: Profile | null
}> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { user: null, profile: null }
  }

  // ลองหา profile ด้วย email ก่อน
  const profile = await getUserProfileByEmail(user.email)

  return { user, profile }
}

/**
 * ตรวจสอบสถานะการเข้าสู่ระบบ
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * รีเซ็ตรหัสผ่าน
 */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })

  if (error) {
    throw new AuthError(error.message)
  }
}

/**
 * อัปเดตรหัสผ่าน
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    throw new AuthError(error.message)
  }
}