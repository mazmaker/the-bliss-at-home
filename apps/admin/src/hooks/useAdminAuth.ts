/**
 * Admin Authentication Hook
 * Supports both Mock and Real Supabase Authentication
 */

import { useState, useEffect, useCallback } from 'react'
import { USE_MOCK_AUTH } from '../lib/mockAuth'
import { mockAuthLogin, mockGetCurrentProfile, mockLogout, setMockAuthState } from '../lib/mockAuthService'
import {
  signInWithEmail,
  signOut,
  getCurrentUserWithProfile,
  onAuthStateChange,
  type Profile,
  type LoginCredentials,
} from '../lib/supabaseAuth'

interface AuthState {
  user: Profile | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

/**
 * Admin Auth Hook - switches between Mock and Real auth
 */
export function useAdminAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  })

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    let initTimeout: NodeJS.Timeout

    async function initializeAuth() {
      console.log('🔍 Initializing auth...', { USE_MOCK_AUTH })

      try {
        if (USE_MOCK_AUTH) {
          // Mock authentication
          const profile = await mockGetCurrentProfile()

          if (!mounted) return

          setAuthState({
            user: profile,
            isLoading: false,
            error: null,
            isAuthenticated: !!profile,
          })
        } else {
          // Real Supabase authentication
          console.log('🔐 Checking Supabase session...')

          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) => {
            initTimeout = setTimeout(() => {
              reject(new Error('Auth initialization timeout (5s)'))
            }, 5000)
          })

          const authPromise = getCurrentUserWithProfile()

          try {
            const { user, profile } = await Promise.race([
              authPromise,
              timeoutPromise
            ]) as Awaited<typeof authPromise>

            clearTimeout(initTimeout)

            if (!mounted) return

            console.log('✅ Auth initialized:', { user: user?.email, profile: !!profile })

            setAuthState({
              user: profile,
              isLoading: false,
              error: null,
              isAuthenticated: !!user && !!profile,
            })
          } catch (timeoutError) {
            clearTimeout(initTimeout)
            throw timeoutError
          }
        }
      } catch (error) {
        if (!mounted) return

        console.error('❌ Auth initialization error:', error)

        setAuthState({
          user: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize auth',
          isAuthenticated: false,
        })
      }
    }

    initializeAuth()

    // Set up auth state listener for real auth
    let authListener: { data: { subscription: any } } | null = null

    if (!USE_MOCK_AUTH) {
      authListener = onAuthStateChange(async (event, session) => {
        if (!mounted) return

        try {
          if (session?.user) {
            const { profile } = await getCurrentUserWithProfile()
            setAuthState({
              user: profile,
              isLoading: false,
              error: null,
              isAuthenticated: !!profile,
            })
          } else {
            setAuthState({
              user: null,
              isLoading: false,
              error: null,
              isAuthenticated: false,
            })
          }
        } catch (error) {
          setAuthState({
            user: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Auth state error',
            isAuthenticated: false,
          })
        }
      })
    }

    return () => {
      mounted = false
      if (initTimeout) {
        clearTimeout(initTimeout)
      }
      if (authListener) {
        authListener.data.subscription.unsubscribe()
      }
    }
  }, [])

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      if (USE_MOCK_AUTH) {
        // Mock login
        const response = await mockAuthLogin(credentials)
        setMockAuthState(true)

        setAuthState({
          user: response.profile,
          isLoading: false,
          error: null,
          isAuthenticated: true,
        })

        return response
      } else {
        // Real Supabase login
        const response = await signInWithEmail(credentials)

        setAuthState({
          user: response.profile,
          isLoading: false,
          error: null,
          isAuthenticated: !!response.profile,
        })

        return response
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    // Prevent multiple calls
    if (authState.isLoading) {
      return
    }

    setAuthState(prev => ({ ...prev, isLoading: true }))

    try {
      if (USE_MOCK_AUTH) {
        // Mock logout
        await mockLogout()
        setMockAuthState(false)
      } else {
        // Real Supabase logout
        await signOut()
      }

      setAuthState({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
      })

    } catch (error) {
      console.error('Logout error:', error)
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      }))
    }
  }, [authState.isLoading])

  // Clear error function
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...authState,
    login,
    logout,
    clearError,
  }
}