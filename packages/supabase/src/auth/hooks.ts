/**
 * Authentication Hooks
 * React hooks for auth state management
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { authService } from './authService'
import type { AuthState, LoginCredentials, RegisterCredentials, UserRole } from './types'
import { AuthError } from './types'

/**
 * Main auth hook - manages auth state
 */
export function useAuth(expectedRole?: UserRole, options?: { skipInitialCheck?: boolean }) {
  // Quick check: only set isLoading=true if there's a session to check
  // BUT: if skipInitialCheck is true, never load initially (for login/register pages)
  const hasSession = typeof window !== 'undefined' && !!localStorage.getItem('bliss-customer-auth')
  const shouldLoad = hasSession && !options?.skipInitialCheck

  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: shouldLoad, // Only loading if we have a session AND not skipping!
    error: null,
    isAuthenticated: false,
  })

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    async function loadUser() {
      try {
        // Skip initial check if requested (for login/register pages)
        if (options?.skipInitialCheck) {
          if (mounted) {
            setState({
              user: null,
              isLoading: false,
              error: null,
              isAuthenticated: false,
            })
          }
          return
        }

        // Quick check: if no session exists in localStorage, skip loading entirely
        const sessionData = localStorage.getItem('bliss-customer-auth')
        if (!sessionData) {
          if (mounted) {
            setState({
              user: null,
              isLoading: false,
              error: null,
              isAuthenticated: false,
            })
          }
          return
        }

        // Set a timeout to prevent infinite loading
        // Use 10 seconds for all environments - long enough for network but not too long to hang
        const timeoutDuration = 10000 // 10 seconds

        console.log('⏱️ Starting auth check with 10s timeout')

        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ Auth loading timeout (10s) - setting not authenticated')
            // Don't clear session - just mark as not authenticated
            // This allows the user to retry without logging in again
            setState({
              user: null,
              isLoading: false,
              error: 'Authentication check timed out. Please refresh the page.',
              isAuthenticated: false,
            })
          }
        }, timeoutDuration)

        console.log('🔄 Fetching profile from authService.getCurrentProfile()')
        const profile = await authService.getCurrentProfile()
        console.log('✅ Profile fetched:', profile ? 'Success' : 'No profile found')

        // Clear timeout if we got a response
        if (timeoutId) clearTimeout(timeoutId)

        if (!mounted) return

        // If no profile but we have a session, it might be corrupt or missing
        if (!profile) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            // Session exists but no profile - might need to create profile in database
            console.warn('⚠️ Session exists but no profile found in database!')
            console.log('User ID:', session.user.id)
            console.log('User Email:', session.user.email)
            // Don't sign out - just mark as not authenticated so user can see the error
          }
        }

        // Validate role if expectedRole is provided
        if (expectedRole && profile && profile.role !== expectedRole) {
          await authService.logout()
          setState({
            user: null,
            isLoading: false,
            error: 'Invalid role for this application',
            isAuthenticated: false,
          })
          return
        }

        setState({
          user: profile,
          isLoading: false,
          error: null,
          isAuthenticated: !!profile,
        })
      } catch (error) {
        // Clear timeout on error
        if (timeoutId) clearTimeout(timeoutId)

        if (!mounted) return

        // Don't clear session on error - just mark as not authenticated
        // This allows the user to retry without logging in again
        console.error('❌ Auth error (session preserved):', error)

        setState({
          user: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load user',
          isAuthenticated: false,
        })
      }
    }

    loadUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          const profile = await authService.getCurrentProfile()
          if (mounted) {
            setState({
              user: profile,
              isLoading: false,
              error: null,
              isAuthenticated: !!profile,
            })
          }
        } catch (error) {
          console.error('❌ Error loading profile after auth change (session preserved):', error)
          if (mounted) {
            // Don't sign out - just mark as not authenticated
            setState({
              user: null,
              isLoading: false,
              error: null,
              isAuthenticated: false,
            })
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setState({
            user: null,
            isLoading: false,
            error: null,
            isAuthenticated: false,
          })
        }
      } else if (event === 'TOKEN_REFRESH_FAILED') {
        // Token refresh failed - might be temporary network issue
        // Don't immediately sign out - let Supabase retry
        console.warn('⚠️ Token refresh failed - will retry automatically')
        if (mounted) {
          setState({
            user: null,
            isLoading: false,
            error: 'Session refresh failed. Please refresh the page.',
            isAuthenticated: false,
          })
        }
      }
    })

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [expectedRole, options?.skipInitialCheck])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await authService.login(credentials, expectedRole)
      setState({
        user: response.profile,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      })
      return response
    } catch (error) {
      const errorMessage = error instanceof AuthError ? error.message : 'Login failed'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [expectedRole])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await authService.register(credentials)
      setState({
        user: response.profile,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      })
      return response
    } catch (error) {
      const errorMessage = error instanceof AuthError ? error.message : 'Registration failed'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      await authService.logout()
      setState({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      }))
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    login,
    register,
    logout,
    clearError,
  }
}

/**
 * Hook to check if user has specific role
 */
export function useHasRole(role: UserRole): boolean {
  const { user } = useAuth()
  return user?.role === role
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roles: UserRole[]): boolean {
  const { user } = useAuth()
  return user ? roles.includes(user.role) : false
}

/**
 * Hook to get current user profile with loading state
 */
export function useProfile() {
  const { user, isLoading, error } = useAuth()
  return { profile: user, isLoading, error }
}
