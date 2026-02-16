/**
 * Authentication Hooks
 * React hooks for auth state management
 *
 * When used inside an AuthProvider, useAuth() reads from shared context (single listener).
 * When used without AuthProvider, falls back to standalone mode (each call creates its own listener).
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { authService } from './authService'
import type { AuthState, LoginCredentials, RegisterCredentials, UserRole } from './types'
import { AuthError } from './types'
import { useOptionalAuthContext } from './AuthProvider'

/**
 * Main auth hook - manages auth state
 *
 * If AuthProvider is available, reads from shared context (recommended).
 * Otherwise falls back to standalone mode for backward compatibility.
 */
export function useAuth(expectedRole?: UserRole, options?: { skipInitialCheck?: boolean }) {
  // Always call useContext (safe even if no provider - returns null)
  const contextValue = useOptionalAuthContext()
  const hasProvider = contextValue !== null

  // Always call standalone hook (React rules: hooks must always be called)
  // When provider exists, pass skipInitialCheck to minimize work
  const standaloneResult = useAuthStandalone(
    hasProvider ? undefined : expectedRole,
    hasProvider ? { skipInitialCheck: true } : options
  )

  // If provider is available AND not skipping initial check, use context
  if (hasProvider && !options?.skipInitialCheck) {
    return contextValue
  }

  // Fallback: standalone mode
  return standaloneResult
}

/**
 * Standalone auth hook - original implementation
 * Used when no AuthProvider is available, or for login pages with skipInitialCheck
 */
function useAuthStandalone(expectedRole?: UserRole, options?: { skipInitialCheck?: boolean }) {
  const hasSession = typeof window !== 'undefined' && !!localStorage.getItem('bliss-customer-auth')
  const shouldLoad = hasSession && !options?.skipInitialCheck

  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: shouldLoad,
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

        const timeoutDuration = 10000

        console.log('⏱️ Starting auth check with 10s timeout')

        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ Auth loading timeout (10s) - setting not authenticated')
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

        if (timeoutId) clearTimeout(timeoutId)
        if (!mounted) return

        if (!profile) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.warn('⚠️ Session exists but no profile found in database!')
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
        if (timeoutId) clearTimeout(timeoutId)
        if (!mounted) return

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

    // Listen for auth changes - debounce to prevent rapid re-fetches
    let lastProfileFetchTime = 0
    const PROFILE_FETCH_DEBOUNCE = 2000

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const now = Date.now()
        if (now - lastProfileFetchTime < PROFILE_FETCH_DEBOUNCE) {
          console.log('⏭️ Skipping profile fetch (debounced)', event)
          return
        }
        lastProfileFetchTime = now

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
      } else if ((event as string) === 'TOKEN_REFRESH_FAILED') {
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
