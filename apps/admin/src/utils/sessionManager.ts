/**
 * Session Management Utilities
 * Handles session monitoring and auto-refresh
 */

import { supabase } from '../lib/supabase'

let sessionCheckInterval: NodeJS.Timeout | null = null
let lastActivity = Date.now()

// Track user activity
export const updateActivity = () => {
  lastActivity = Date.now()
}

// Setup activity listeners
export const setupActivityMonitoring = () => {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

  events.forEach(event => {
    document.addEventListener(event, updateActivity, true)
  })

  return () => {
    events.forEach(event => {
      document.removeEventListener(event, updateActivity, true)
    })
  }
}

// Check session validity
export const checkSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('❌ Session check error:', error)
      return false
    }

    if (!session) {
      console.log('❌ No session found')
      return false
    }

    // Check if session is about to expire (5 minutes before expiry)
    const expiresAt = session.expires_at * 1000
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000)

    if (expiresAt < fiveMinutesFromNow) {
      console.log('⚠️ Session expires soon, refreshing...')

      const { data, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        console.error('❌ Token refresh failed:', refreshError)
        return false
      }

      if (data.session) {
        console.log('✅ Token refreshed successfully')
        return true
      }
    }

    return true
  } catch (error) {
    console.error('❌ Session check failed:', error)
    return false
  }
}

// Start session monitoring
export const startSessionMonitoring = () => {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval)
  }

  // Check session every 5 minutes
  sessionCheckInterval = setInterval(async () => {
    // Only check if user has been active in the last hour
    const oneHour = 60 * 60 * 1000
    const timeSinceActivity = Date.now() - lastActivity

    if (timeSinceActivity > oneHour) {
      console.log('📴 User inactive for over 1 hour, skipping session check')
      return
    }

    const isValid = await checkSession()

    if (!isValid) {
      console.log('🚨 Session invalid, forcing logout')
      // The auth state change listener will handle the logout
      await supabase.auth.signOut()
    }
  }, 5 * 60 * 1000) // Check every 5 minutes

  console.log('🕒 Session monitoring started')
}

// Stop session monitoring
export const stopSessionMonitoring = () => {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval)
    sessionCheckInterval = null
    console.log('🛑 Session monitoring stopped')
  }
}

// Force session refresh
export const refreshSession = async () => {
  try {
    console.log('🔄 Manually refreshing session...')
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error('❌ Manual session refresh failed:', error)
      throw error
    }

    console.log('✅ Session refreshed manually')
    return data.session
  } catch (error) {
    console.error('❌ Session refresh error:', error)
    throw error
  }
}