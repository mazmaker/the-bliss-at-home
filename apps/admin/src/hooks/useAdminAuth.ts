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
import {
  setupActivityMonitoring,
  startSessionMonitoring,
  stopSessionMonitoring,
  refreshSession
} from '../utils/sessionManager'

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
  // Quick check for existing session in localStorage
  const hasLocalSession = !!window.localStorage.getItem('bliss-admin-auth')

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  })

  // Initialize auth state
  useEffect(() => {
    let mounted = true

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

          // First try to get session from localStorage
          if (hasLocalSession) {
            try {
              // Quick check if session is valid
              const { user, profile } = await getCurrentUserWithProfile()

              if (user && profile) {
                console.log('✅ Auth restored from local session')
                setAuthState({
                  user: profile,
                  isLoading: false,
                  error: null,
                  isAuthenticated: true,
                })
                return
              }
            } catch (quickCheckError) {
              console.log('Local session invalid, checking with server...')
            }
          }

          // Direct call without timeout - let getCurrentUserWithProfile handle it
          console.log('🔍 Getting current user and profile...')

          const { user, profile } = await getCurrentUserWithProfile()

          if (!mounted) return

          console.log('✅ Auth initialized:', {
            user: user?.email,
            userId: user?.id,
            profile: !!profile,
            profileEmail: profile?.email,
            profileRole: profile?.role
          })

          // Save successful auth to localStorage
          if (user && profile) {
            window.localStorage.setItem('bliss-admin-auth', JSON.stringify({
              userId: user.id,
              email: user.email,
              timestamp: Date.now()
            }))
          }

          setAuthState({
            user: profile,
            isLoading: false,
            error: null,
            isAuthenticated: !!user && !!profile,
          })
        }
      } catch (error) {
        if (!mounted) return

        console.error('❌ Auth initialization error:', error)

        let errorMessage = 'Failed to initialize auth'
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            errorMessage = 'Connection timeout - Please check your internet connection and refresh the page'
          } else if (error.message.includes('Network')) {
            errorMessage = 'Network error - Please check your connection'
          } else {
            errorMessage = error.message
          }
        }

        setAuthState({
          user: null,
          isLoading: false,
          error: errorMessage,
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

        console.log('🔄 Auth state change:', event, {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'
        })

        try {
          if (event === 'SIGNED_OUT' || !session) {
            console.log('👋 User signed out or no session')
            setAuthState({
              user: null,
              isLoading: false,
              error: null,
              isAuthenticated: false,
            })
            return
          }

          if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token refreshed successfully')
          }

          if (session?.user) {
            console.log('✅ Session exists, getting profile...')
            const { profile } = await getCurrentUserWithProfile()

            if (profile) {
              console.log('✅ Profile found:', profile.email)
              setAuthState({
                user: profile,
                isLoading: false,
                error: null,
                isAuthenticated: true,
              })
            } else {
              console.log('❌ No profile found for user')
              setAuthState({
                user: null,
                isLoading: false,
                error: 'No profile found',
                isAuthenticated: false,
              })
            }
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error)
          setAuthState({
            user: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Auth state error',
            isAuthenticated: false,
          })
        }
      })
    }

    // Setup session monitoring for Real Supabase Auth
    let cleanupActivityMonitoring: (() => void) | null = null

    if (!USE_MOCK_AUTH) {
      cleanupActivityMonitoring = setupActivityMonitoring()
      startSessionMonitoring()
    }

    return () => {
      mounted = false
      if (authListener) {
        authListener.data.subscription.unsubscribe()
      }
      if (cleanupActivityMonitoring) {
        cleanupActivityMonitoring()
      }
      stopSessionMonitoring()
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

  // Manual session refresh for debugging
  const manualRefreshSession = useCallback(async () => {
    if (USE_MOCK_AUTH) {
      console.log('❌ Manual refresh not available in mock mode')
      return
    }

    try {
      console.log('🔄 Manual session refresh initiated...')
      await refreshSession()
    } catch (error) {
      console.error('❌ Manual session refresh failed:', error)
      setAuthState(prev => ({
        ...prev,
        error: 'Session refresh failed'
      }))
    }
  }, [])

  return {
    ...authState,
    login,
    logout,
    clearError,
    refreshSession: manualRefreshSession,
  }
}