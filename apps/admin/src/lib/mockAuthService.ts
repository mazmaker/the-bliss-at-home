/**
 * Mock Authentication Service for Admin App
 * Use this when Supabase auth is not available
 */

import { MOCK_ADMIN_USER, MOCK_CREDENTIALS, MOCK_SESSION, mockLogin, USE_MOCK_AUTH } from './mockAuth'
import type { Profile, LoginCredentials, AuthResponse } from '@bliss/supabase/auth'

/**
 * Mock login function
 */
export async function mockAuthLogin(credentials: LoginCredentials): Promise<AuthResponse> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500))

  if (!mockLogin(credentials.email, credentials.password)) {
    throw new Error('Invalid email or password')
  }

  return {
    user: MOCK_SESSION.user as any, // Supabase User type
    session: MOCK_SESSION as any, // Supabase Session type
    profile: MOCK_ADMIN_USER as Profile
  }
}

/**
 * Mock get current profile
 */
export async function mockGetCurrentProfile(): Promise<Profile | null> {
  if (!USE_MOCK_AUTH) return null

  // Check if we have a mock session (simulate being logged in)
  const mockToken = localStorage.getItem('mock-auth-token')
  if (!mockToken) return null

  return MOCK_ADMIN_USER as Profile
}

/**
 * Mock logout
 */
export async function mockLogout(): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200))

  // Clear all auth related data
  localStorage.removeItem('mock-auth-token')
  localStorage.removeItem('mock-auth-user')
  sessionStorage.removeItem('mock-auth-token')

  // Force set mock auth state to false
  setMockAuthState(false)
}

/**
 * Set mock login state
 */
export function setMockAuthState(isLoggedIn: boolean): void {
  if (isLoggedIn) {
    localStorage.setItem('mock-auth-token', 'mock-token-' + Date.now())
  } else {
    localStorage.removeItem('mock-auth-token')
  }
}