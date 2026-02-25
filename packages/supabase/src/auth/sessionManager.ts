/**
 * Session Manager
 * Handles session persistence based on "Remember Me" preference
 */

import { supabase } from './supabaseClient'

/**
 * Initialize session manager to handle "Remember Me" logic
 * Call this when the app starts
 */
export function initSessionManager(): void {
  // Skip session manager in development mode to avoid HMR reload issues
  const isDevelopment = import.meta.env?.DEV || import.meta.env?.MODE === 'development'

  if (isDevelopment) {
    console.log('🔧 Session manager disabled in development mode')
    return
  }

  // Check if this is a session-only login (rememberMe = false)
  const isSessionOnly = sessionStorage.getItem('sessionOnly') === 'true'
  const rememberMe = localStorage.getItem('rememberMe') === 'true'

  if (isSessionOnly || !rememberMe) {
    // Setup listener to clear session when browser/tab closes
    window.addEventListener('beforeunload', () => {
      // Only clear if user didn't check "Remember Me"
      if (localStorage.getItem('rememberMe') === 'false') {
        // Clear Supabase session
        supabase.auth.signOut({ scope: 'local' })
        // Clear all session-related storage
        localStorage.removeItem('bliss-customer-auth')  // Main session key
        localStorage.removeItem('rememberMe')
        sessionStorage.removeItem('sessionOnly')
      }
    })
  }
}

/**
 * Check if current session should persist
 */
export function shouldPersistSession(): boolean {
  return localStorage.getItem('rememberMe') === 'true'
}

/**
 * Clear session manually (for logout)
 */
export async function clearSession(): Promise<void> {
  await supabase.auth.signOut()

  // Clear all session-related storage
  localStorage.removeItem('bliss-customer-auth')  // Main session key
  localStorage.removeItem('rememberMe')
  sessionStorage.removeItem('sessionOnly')
}
