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
export function useAuth(expectedRole?: UserRole) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  })

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    async function loadUser() {
      try {
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Auth loading timeout - clearing session')
            // Clear potentially corrupt session
            supabase.auth.signOut({ scope: 'local' })
            setState({
              user: null,
              isLoading: false,
              error: null,
              isAuthenticated: false,
            })
          }
        }, 10000) // 10 second timeout

        const profile = await authService.getCurrentProfile()

        // Clear timeout if we got a response
        if (timeoutId) clearTimeout(timeoutId)

        if (!mounted) return

        // If no profile but we have a session, it might be corrupt
        if (!profile) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            // Session exists but no profile - clear it
            console.warn('Session exists but no profile found - clearing session')
            await supabase.auth.signOut({ scope: 'local' })
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

        // Clear potentially corrupt session on error
        console.error('Auth error - clearing session:', error)
        await supabase.auth.signOut({ scope: 'local' })

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
          console.error('Error loading profile after auth change:', error)
          if (mounted) {
            await supabase.auth.signOut({ scope: 'local' })
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
        // Token refresh failed - clear session and redirect to login
        console.warn('Token refresh failed - clearing session')
        if (mounted) {
          await supabase.auth.signOut({ scope: 'local' })
          setState({
            user: null,
            isLoading: false,
            error: null,
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
  }, [expectedRole])

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
