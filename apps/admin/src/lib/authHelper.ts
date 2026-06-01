/**
 * Unified Auth Helper - รองรับทั้ง Admin Auth และ Supabase Auth
 * แก้ปัญหา Auth session missing โดยไม่ทำลายระบบอื่น
 */

import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  role: string
  full_name: string
}

/**
 * ตรวจสอบ Authentication ทั้งสองระบบ
 */
export async function getCurrentAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    // ลองใช้ Supabase Auth ก่อน (สำหรับระบบอื่น)
    const { data: { user }, error } = await supabase.auth.getUser()

    if (user && !error) {
      console.log('🔐 Using Supabase Auth:', user.email)

      // ดึง profile จาก database
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        return {
          id: user.id,
          email: user.email || profile.email,
          role: profile.role,
          full_name: profile.full_name
        }
      }
    }

    // ถ้า Supabase Auth ไม่มี ลองใช้ Admin Auth
    const adminAuth = localStorage.getItem('bliss-admin-auth')
    if (adminAuth) {
      const authData = JSON.parse(adminAuth)
      console.log('🔐 Using Admin Auth:', authData.user?.email)

      if (authData.user && authData.access_token) {
        // ตรวจสอบว่าหมดอายุหรือยัง
        const now = Math.floor(Date.now() / 1000)
        if (authData.expires_at && authData.expires_at < now) {
          console.warn('⚠️ Admin auth expired')
          return null
        }

        return {
          id: authData.user.id,
          email: authData.user.email,
          role: authData.user.role,
          full_name: authData.user.full_name
        }
      }
    }

    return null

  } catch (error) {
    console.error('Auth check error:', error)
    return null
  }
}

/**
 * ตรวจสอบว่าเป็น Admin หรือไม่
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentAuthenticatedUser()
  return user?.role === 'ADMIN'
}