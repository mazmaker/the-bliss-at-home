/**
 * Hotel Authentication Management Utilities
 * ใช้สำหรับจัดการบัญชีผู้ใช้ของโรงแรมในแอดมิน
 */

export interface HotelAuthStatus {
  hasAccount: boolean
  lastLogin?: string
  loginEmail?: string
  loginEnabled?: boolean
  temporaryPassword?: string
  passwordChangeRequired?: boolean
}

export interface CreateHotelAccountRequest {
  hotelId: string
  email: string
  name: string
}

export interface CreateHotelAccountResponse {
  success: boolean
  userId?: string
  temporaryPassword?: string
  loginEmail?: string
  error?: string
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

const API_BASE_URL = `${import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/hotels`
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN || 'admin-secret-token-2026'

/**
 * แปลง error ภาษาอังกฤษ/ภาษา dev จากเซิร์ฟเวอร์ให้เป็นข้อความภาษาไทยที่ผู้ใช้เข้าใจง่าย
 * (ถ้าเซิร์ฟเวอร์ส่งข้อความไทยมาแล้วให้คงไว้ตามเดิม)
 */
function toThaiHotelAuthError(serverError?: string, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'): string {
  const e = (serverError || '').toLowerCase()
  if (e.includes('already in use') || e.includes('already been registered') || e.includes('already registered'))
    return 'อีเมลนี้ถูกใช้เป็นบัญชีเข้าใช้งานแล้ว กรุณาใช้อีเมลอื่น'
  if (e.includes('hotel already has an account')) return 'โรงแรมนี้มีบัญชีเข้าใช้งานอยู่แล้ว'
  if (e.includes('does not have an account') || e.includes('not set up')) return 'โรงแรมนี้ยังไม่มีบัญชีเข้าใช้งาน กรุณาสร้างบัญชีก่อน'
  if (e.includes('hotel not found')) return 'ไม่พบข้อมูลโรงแรม'
  if (e.includes('login is disabled')) return 'บัญชีเข้าใช้งานของโรงแรมนี้ถูกปิดอยู่'
  if (e.includes('failed to create') || e.includes('failed to create auth user')) return 'ไม่สามารถสร้างบัญชีเข้าใช้งานให้โรงแรมได้ กรุณาลองใหม่อีกครั้ง'
  if (e.includes('failed to reset') || e.includes('failed to update password')) return 'ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง'
  if (e.includes('failed to send') || e.includes('email')) return 'ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง'
  if (e.includes('unauthorized') || e.includes('admin access')) return 'ไม่มีสิทธิ์ดำเนินการ (โปรดตรวจสอบการตั้งค่าเซิร์ฟเวอร์)'
  // เซิร์ฟเวอร์ส่งข้อความไทยมาแล้ว → คงไว้; อื่น ๆ → ข้อความ fallback ภาษาไทย
  if (/[฀-๿]/.test(serverError || '')) return serverError as string
  return fallback
}

/**
 * สร้างบัญชีผู้ใช้สำหรับโรงแรม
 */
export async function createHotelAccount({
  hotelId,
  email,
  name,
}: CreateHotelAccountRequest): Promise<CreateHotelAccountResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/create-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ hotelId, loginEmail: email, name }),
    })

    const result = await response.json()

    if (response.ok) {
      return {
        success: true,
        userId: result.userId,
        temporaryPassword: result.temporaryPassword,
        loginEmail: result.loginEmail,
      }
    } else {
      return {
        success: false,
        error: toThaiHotelAuthError(result.message || result.error, 'ไม่สามารถสร้างบัญชีได้'),
      }
    }
  } catch (error: any) {
    console.error('Error creating hotel account:', error)
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์',
    }
  }
}

/**
 * ตรวจสอบว่าอีเมลนี้ยัง "ว่าง" (ยังไม่มีบัญชีเข้าใช้งานในระบบ) ก่อนสร้างโรงแรมใหม่
 * ป้องกันไม่ให้เกิด "โรงแรมค้างไม่มีบัญชี" — เรียกก่อน insert แถวโรงแรมในหน้าเพิ่มโรงแรม
 * fail-closed: ถ้าตรวจสอบไม่สำเร็จ (server ล่ม/เชื่อมต่อไม่ได้) คืน available=false + error ภาษาไทย
 * เพื่อให้ผู้เรียกบล็อกการบันทึกไว้ก่อน (ถ้าปล่อยผ่าน createHotelAccount ก็จะล้มเหลว → เกิดโรงแรมค้างอยู่ดี)
 */
export async function checkHotelEmailAvailable(
  email: string
): Promise<{ available: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ email }),
    })

    const result = await response.json()

    if (response.ok) {
      return { available: !!result.available }
    }
    return {
      available: false,
      error: toThaiHotelAuthError(result.message || result.error, 'ไม่สามารถตรวจสอบอีเมลได้ กรุณาลองใหม่อีกครั้ง'),
    }
  } catch (error: any) {
    console.error('Error checking hotel email availability:', error)
    return {
      available: false,
      error: 'ไม่สามารถตรวจสอบอีเมลได้ กรุณาลองใหม่อีกครั้ง (เชื่อมต่อเซิร์ฟเวอร์ไม่ได้)',
    }
  }
}

/**
 * ส่งอีเมลเชิญใช้งานไปยังโรงแรม
 */
export async function sendHotelInvitation(hotelId: string): Promise<APIResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/send-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ hotelId }),
    })

    const result = await response.json()

    if (response.ok) {
      return { success: true, data: result }
    } else {
      return {
        success: false,
        error: toThaiHotelAuthError(result.message || result.error, 'ไม่สามารถส่งอีเมลได้'),
      }
    }
  } catch (error: any) {
    console.error('Error sending invitation:', error)
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์',
    }
  }
}

/**
 * รีเซ็ตรหัสผ่านโรงแรม
 */
export async function resetHotelPassword(hotelId: string): Promise<APIResponse<{ temporaryPassword: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ hotelId }),
    })

    const result = await response.json()

    if (response.ok) {
      return {
        success: true,
        data: { temporaryPassword: result.data?.temporaryPassword || result.temporaryPassword }
      }
    } else {
      return {
        success: false,
        error: toThaiHotelAuthError(result.message || result.error, 'ไม่สามารถรีเซ็ตรหัสผ่านได้'),
      }
    }
  } catch (error: any) {
    console.error('Error resetting password:', error)
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์',
    }
  }
}

/**
 * เปิด/ปิดการเข้าสู่ระบบของโรงแรม
 */
export async function toggleHotelLoginAccess(hotelId: string, enabled: boolean): Promise<APIResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/toggle-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ hotelId, enabled }),
    })

    const result = await response.json()

    if (response.ok) {
      return { success: true, data: result }
    } else {
      return {
        success: false,
        error: toThaiHotelAuthError(result.message || result.error, 'ไม่สามารถเปลี่ยนสถานะได้'),
      }
    }
  } catch (error: any) {
    console.error('Error toggling login access:', error)
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์',
    }
  }
}

/**
 * โหลดสถานะการยืนยันตัวตนของโรงแรมจากฐานข้อมูล
 */
export async function loadHotelAuthStatus(hotelId: string): Promise<HotelAuthStatus | null> {
  try {
    // Import supabase ภายในฟังก์ชันเพื่อหลีกเลี่ยง circular imports
    const { supabase } = await import('../lib/supabase')

    const { data, error } = await supabase
      .from('hotels')
      .select('auth_user_id, login_email, last_login, login_enabled, password_change_required, temporary_password')
      .eq('id', hotelId)
      .single()

    if (error) {
      console.error('Error loading hotel auth status:', error)
      return null
    }

    return {
      hasAccount: !!data.auth_user_id,
      lastLogin: data.last_login,
      loginEmail: data.login_email,
      loginEnabled: data.login_enabled || false,
      passwordChangeRequired: data.password_change_required || false,
      temporaryPassword: data.temporary_password || '',
    }
  } catch (error) {
    console.error('Error loading hotel auth status:', error)
    return null
  }
}

/**
 * สร้างรหัสผ่านชั่วคราวแบบสุ่ม
 * ใช้สำหรับการแสดงผลเท่านั้น - รหัสผ่านจริงสร้างจากเซิร์ฟเวอร์
 */
export function generateDisplayPassword(length: number = 12): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

/**
 * คัดลอกข้อความไปยัง clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    return false
  }
}

/**
 * ตรวจสอบความแข็งแกร่งของรหัสผ่าน
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  requirements: {
    minLength: boolean
    hasUpperCase: boolean
    hasLowerCase: boolean
    hasNumbers: boolean
    hasSpecialChars: boolean
  }
} {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }

  const score = Object.values(requirements).filter(Boolean).length
  const isValid = score >= 4 // อย่างน้อย 4 จาก 5 เงื่อนไข

  return {
    isValid,
    score,
    requirements,
  }
}

/**
 * จัดรูปแบบวันที่แสดงผล
 */
export function formatLastLogin(lastLogin: string | null): string {
  if (!lastLogin) return 'ยังไม่เคยเข้าสู่ระบบ'

  const date = new Date(lastLogin)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return `วันนี้ ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
  } else if (days === 1) {
    return `เมื่อวาน ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
  } else if (days < 7) {
    return `${days} วันที่แล้ว`
  } else {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

/**
 * ตรวจสอบว่าอีเมลมีรูปแบบที่ถูกต้องหรือไม่
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * สร้าง URL สำหรับโรงแรมเข้าสู่ระบบ
 */
export function generateHotelLoginURL(): string {
  return 'http://localhost:3006/login'
}

/**
 * ข้อความช่วยเหลือสำหรับการจัดการบัญชีโรงแรม
 */
export const HELP_MESSAGES = {
  createAccount: 'สร้างบัญชี Supabase Auth สำหรับโรงแรม พร้อมรหัสผ่านชั่วคราว',
  sendInvitation: 'ส่งอีเมลพร้อมข้อมูลการเข้าสู่ระบบและรหัสผ่านชั่วคราว',
  resetPassword: 'สร้างรหัสผ่านชั่วคราวใหม่และส่งอีเมลแจ้งเตือน',
  toggleLogin: 'เปิด/ปิดการเข้าสู่ระบบของโรงแรมในแอปพลิเคชัน Hotel',
  temporaryPassword: 'รหัสผ่านชั่วคราวที่โรงแรมต้องเปลี่ยนในการเข้าสู่ระบบครั้งแรก',
  loginURL: 'ลิงก์สำหรับโรงแรมเข้าสู่ระบบแอปพลิเคชัน Hotel',
}

export default {
  createHotelAccount,
  checkHotelEmailAvailable,
  sendHotelInvitation,
  resetHotelPassword,
  toggleHotelLoginAccess,
  loadHotelAuthStatus,
  generateDisplayPassword,
  copyToClipboard,
  validatePasswordStrength,
  formatLastLogin,
  validateEmail,
  generateHotelLoginURL,
  HELP_MESSAGES,
}