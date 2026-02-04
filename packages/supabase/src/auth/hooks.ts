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

    async function loadUser() {
      try {
        // Add timeout to prevent infinite loading (increased to 15 seconds)
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Auth timeout')), 15000)
        })

        const profile = await Promise.race([
          authService.getCurrentProfile(),
          timeoutPromise,
        ])

        if (!mounted) return

        // Validate role if expectedRole is provided
        if (expectedRole && profile && profile.role !== expectedRole) {
          // Set state FIRST to stop loading immediately
          setState({
            user: null,
            isLoading: false,
            error: 'Invalid role for this application',
            isAuthenticated: false,
          })
          // Logout in background (don't await)
          authService.logout().catch(() => {})
          return
        }

        setState({
          user: profile,
          isLoading: false,
          error: null,
          isAuthenticated: !!profile,
        })
      } catch (error) {
        if (!mounted) return

        // Only log non-timeout errors in development
        if (import.meta.env.DEV && !(error instanceof Error && error.message === 'Auth timeout')) {
          console.error('Auth loadUser error:', error)
        }

        // Set state FIRST to stop loading immediately
        setState({
          user: null,
          isLoading: false,
          error: null, // Don't show timeout error to user, just redirect to login
          isAuthenticated: false,
        })

        // Don't logout on timeout - just let the user stay logged out
        // Logging out would clear the session and cause issues with LIFF auto-login
      }
    }

    loadUser()

    // Listen for auth changes (with timeout protection)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      // Skip INITIAL_SESSION event - loadUser() handles initial load
      if (event === 'INITIAL_SESSION') {
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          // Add timeout to prevent hanging (increased to 10 seconds for slower networks)
          const timeoutPromise = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
          })
          const profile = await Promise.race([
            authService.getCurrentProfile(),
            timeoutPromise,
          ])
          if (mounted) {
            setState({
              user: profile,
              isLoading: false,
              error: null,
              isAuthenticated: !!profile,
            })
          }
        } catch (error) {
          // Silently fail on timeout during token refresh - keep current user state
          // Only log in development mode
          if (import.meta.env.DEV && !(error instanceof Error && error.message === 'Profile fetch timeout')) {
            console.error('Auth state change error:', error)
          }
          // Don't change state on error - keep current user state
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
      }
    })

    return () => {
      mounted = false
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

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.getCurrentProfile()
      setState(prev => ({
        ...prev,
        user: profile,
        isAuthenticated: !!profile,
      }))
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }, [])

  return {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshUser,
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
