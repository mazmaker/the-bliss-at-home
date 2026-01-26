/**
 * Mock Authentication for Testing
 * Use this when Supabase user creation is not available
 */

export const MOCK_ADMIN_USER = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', // Use consistent UUID
  email: 'admin2@theblissathome.com',
  role: 'ADMIN' as const,
  full_name: 'ผู้ดูแลระบบ 2',
  phone: '0812345679',
  avatar_url: null,
  status: 'ACTIVE' as const,
  language: 'th',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const MOCK_CREDENTIALS = [
  {
    email: 'admin@theblissathome.com',
    password: 'admin123456'
  },
  {
    email: 'admin2@theblissathome.com',
    password: 'AdminBliss2026!'
  }
]

/**
 * Mock login function for testing
 */
export function mockLogin(email: string, password: string): boolean {
  return MOCK_CREDENTIALS.some(cred =>
    cred.email === email && cred.password === password
  )
}

/**
 * Enable mock authentication based on environment
 * - Development: ใช้ Mock Auth (ไม่ต้องสร้าง User จริง)
 * - Production: ใช้ Supabase Auth จริง
 */
export const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

/**
 * Mock session for testing
 */
export const MOCK_SESSION = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: MOCK_ADMIN_USER
}