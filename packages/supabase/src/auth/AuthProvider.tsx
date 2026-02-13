/**
 * AuthProvider - Centralized Auth State Management
 *
 * Solves the problem where multiple useAuth() calls each create their own
 * useEffect + onAuthStateChange listener, causing getCurrentProfile() to be
 * called dozens of times.
 *
 * With AuthProvider, auth state is managed ONCE at the top of the component tree,
 * and all useAuth() consumers read from the shared context.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { authService } from './authService'
import type { AuthState, LoginCredentials, RegisterCredentials, UserRole } from './types'
import { AuthError } from './types'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<any>
  register: (credentials: RegisterCredentials) => Promise<any>
  logout: () => Promise<void>
  clearError: () => void
  expectedRole?: UserRole
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
  expectedRole?: UserRole
}

/**
 * AuthProvider - Wrap your app with this to provide auth state to all children.
 * Only ONE instance should exist per app.
 */
export function AuthProvider({ children, expectedRole }: AuthProviderProps) {
  const hasSession = typeof window !== 'undefined' && !!localStorage.getItem('bliss-customer-auth')

  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: hasSession,
    error: null,
    isAuthenticated: false,
  })

  // Track if initial load has completed to prevent duplicate fetches
  const initialLoadDone = useRef(false)

  // Initialize auth state - runs ONCE
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    async function loadUser() {
      // Prevent duplicate initial loads (React StrictMode)
      if (initialLoadDone.current) return
      initialLoadDone.current = true

      try {
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
        console.log('⏱️ [AuthProvider] Starting auth check with 10s timeout')

        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ [AuthProvider] Auth loading timeout (10s)')
            setState({
              user: null,
              isLoading: false,
              error: 'Authentication check timed out. Please refresh the page.',
              isAuthenticated: false,
            })
          }
        }, timeoutDuration)

        console.log('🔄 [AuthProvider] Fetching profile...')
        const profile = await authService.getCurrentProfile()
        console.log('✅ [AuthProvider] Profile fetched:', profile ? 'Success' : 'No profile')

        if (timeoutId) clearTimeout(timeoutId)
        if (!mounted) return

        if (!profile) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.warn('⚠️ [AuthProvider] Session exists but no profile found')
          }
        }

        // Validate role
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

        console.error('❌ [AuthProvider] Auth error:', error)
        setState({
          user: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load user',
          isAuthenticated: false,
        })
      }
    }

    loadUser()

    // Listen for auth changes - single listener for the entire app
    let lastProfileFetchTime = 0
    const PROFILE_FETCH_DEBOUNCE = 2000

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const now = Date.now()
        if (now - lastProfileFetchTime < PROFILE_FETCH_DEBOUNCE) {
          console.log('⏭️ [AuthProvider] Skipping profile fetch (debounced)', event)
          return
        }
        lastProfileFetchTime = now

        try {
          const profile = await authService.getCurrentProfile()
          if (mounted) {
            // Validate role
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
          }
        } catch (error) {
          console.error('❌ [AuthProvider] Error loading profile after auth change:', error)
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
        console.warn('⚠️ [AuthProvider] Token refresh failed')
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
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
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
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
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

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    expectedRole,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to consume auth context from AuthProvider.
 * Must be used within an AuthProvider.
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

/**
 * Hook that returns auth context if available, or null if no AuthProvider exists.
 * Always safe to call (no conditional hooks).
 */
export function useOptionalAuthContext(): AuthContextType | null {
  return useContext(AuthContext)
}

/**
 * Check if AuthProvider is available (for backward compatibility)
 */
export function useAuthProviderAvailable(): boolean {
  const context = useContext(AuthContext)
  return context !== null
}
