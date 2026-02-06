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

// Module-level flags to prevent concurrent profile fetches across all hook instances
let isFetchingProfile = false
let lastFetchTime = 0
let loadedUserId: string | null = null // Track which user profile is loaded
let fetchingUserId: string | null = null // Track which user is currently being fetched
const FETCH_DEBOUNCE_MS = 100 // Debounce multiple rapid calls
const CACHE_STALE_TIME = 5 * 60 * 1000 // Cache valid for 5 minutes

// Get cached profile from localStorage for instant loading
function getCachedProfile(): { profile: Profile | null; isStale: boolean } {
  try {
    const cached = window.localStorage.getItem('bliss-admin-profile-cache')
    if (!cached) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Cache check: No cache found in localStorage')
      }
      return { profile: null, isStale: true }
    }

    const data = JSON.parse(cached)
    const age = Date.now() - data.timestamp
    const isStale = age > CACHE_STALE_TIME

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Cache check:', {
        hasCache: true,
        cacheAge: `${Math.floor(age / 1000)}s`,
        isStale,
        staleTime: `${CACHE_STALE_TIME / 1000}s`,
        profileEmail: data.profile?.email
      })
    }

    return { profile: data.profile, isStale }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Cache check: Parse error', error)
    }
    return { profile: null, isStale: true }
  }
}

/**
 * Admin Auth Hook - switches between Mock and Real auth
 */
export function useAdminAuth() {
  // Initialize with cached profile for instant loading
  const cachedData = getCachedProfile()

  const [authState, setAuthState] = useState<AuthState>({
    user: cachedData.profile,
    isLoading: true,
    error: null,
    isAuthenticated: !!cachedData.profile,
  })

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Initializing auth...', { USE_MOCK_AUTH })
      }

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
          if (process.env.NODE_ENV === 'development') {
            console.log('🔐 Checking Supabase session...')
          }

          // Check if we have valid cached profile
          const { profile: cachedProfile, isStale } = getCachedProfile()
          if (cachedProfile && !isStale) {
            if (process.env.NODE_ENV === 'development') {
              console.log('⚡ Using cached profile (still fresh)')
            }
            // Update loadedUserId from cache
            loadedUserId = cachedProfile.id
            // Set isLoading to false when using cache
            setAuthState(prev => ({
              ...prev,
              isLoading: false,
              isAuthenticated: true
            }))
            return // Skip fetch if cache is still valid
          }

          // Prevent concurrent profile fetches with debouncing
          const now = Date.now()
          if (isFetchingProfile && now - lastFetchTime < FETCH_DEBOUNCE_MS) {
            if (process.env.NODE_ENV === 'development') {
              console.log('⏭️ Profile fetch already in progress during init, skipping...')
            }
            // Set isLoading to false to prevent stuck loading screen
            setAuthState(prev => ({ ...prev, isLoading: false }))
            return
          }

          if (isFetchingProfile) {
            if (process.env.NODE_ENV === 'development') {
              console.log('⏳ Waiting for previous fetch to complete...')
            }
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 50))
            if (isFetchingProfile) {
              if (process.env.NODE_ENV === 'development') {
                console.log('⏭️ Previous fetch still running, skipping...')
              }
              // Set isLoading to false to prevent stuck loading screen
              setAuthState(prev => ({ ...prev, isLoading: false }))
              return
            }
          }

          isFetchingProfile = true
          lastFetchTime = now

          let fetchedUser: any = null
          let fetchedProfile: any = null

          try {
            // Get current user and profile - Supabase will restore from localStorage automatically
            const result = await getCurrentUserWithProfile()
            fetchedUser = result.user
            fetchedProfile = result.profile

            if (!mounted) return

            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Auth initialized:', {
                user: fetchedUser?.email,
                userId: fetchedUser?.id,
                profile: !!fetchedProfile,
                profileEmail: fetchedProfile?.email,
                profileRole: fetchedProfile?.role
              })
            }

            // Save both user and profile to cache for instant loading on next visit
            if (fetchedUser && fetchedProfile) {
              window.localStorage.setItem('bliss-admin-profile-cache', JSON.stringify({
                profile: fetchedProfile,
                timestamp: Date.now()
              }))
              // Keep user cache for backward compatibility
              window.localStorage.setItem('bliss-admin-user-cache', JSON.stringify({
                userId: fetchedUser.id,
                email: fetchedUser.email,
                timestamp: Date.now()
              }))
            } else {
              // Clear caches if no user
              window.localStorage.removeItem('bliss-admin-profile-cache')
              window.localStorage.removeItem('bliss-admin-user-cache')
            }

            setAuthState({
              user: fetchedProfile,
              isLoading: false,
              error: null,
              isAuthenticated: !!fetchedUser && !!fetchedProfile,
            })
          } finally {
            // Set loadedUserId in finally block to prevent race condition
            if (fetchedUser && fetchedProfile) {
              loadedUserId = fetchedUser.id
              fetchingUserId = null
              if (process.env.NODE_ENV === 'development') {
                console.log('📍 Loaded user ID set:', fetchedUser.id)
              }
            } else {
              loadedUserId = null
              fetchingUserId = null
            }
            isFetchingProfile = false
          }
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

        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Auth state change:', event, {
            hasSession: !!session,
            hasUser: !!session?.user,
            userEmail: session?.user?.email,
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'
          })
        }

        try {
          if (event === 'SIGNED_OUT' || !session) {
            if (process.env.NODE_ENV === 'development') {
              console.log('👋 User signed out or no session')
            }
            loadedUserId = null // Clear loaded user ID
            window.localStorage.removeItem('bliss-admin-profile-cache')
            window.localStorage.removeItem('bliss-admin-user-cache')
            setAuthState({
              user: null,
              isLoading: false,
              error: null,
              isAuthenticated: false,
            })
            return
          }

          if (event === 'TOKEN_REFRESHED') {
            // Don't fetch profile on token refresh, just ensure state is correct
            if (loadedUserId && loadedUserId === session?.user?.id && !authState.isAuthenticated) {
              if (process.env.NODE_ENV === 'development') {
                console.log('🔄 Updating auth state to authenticated after token refresh')
              }
              setAuthState(prev => ({
                ...prev,
                isLoading: false,
                isAuthenticated: true
              }))
            }
            return
          }

          if (session?.user) {
            // Check if profile is already loaded for this user
            if (loadedUserId && loadedUserId === session.user.id) {
              // Just ensure auth state is correct, don't fetch again
              if (!authState.isAuthenticated) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('🔄 Updating auth state to authenticated')
                }
                setAuthState(prev => ({
                  ...prev,
                  isLoading: false,
                  isAuthenticated: true
                }))
              }
              return
            }

            // Check if we're already fetching profile for this user
            if (fetchingUserId === session.user.id) {
              if (process.env.NODE_ENV === 'development') {
                console.log('⏭️ Already fetching profile for this user, skipping...')
              }
              return
            }

            // Profile not loaded yet - fetch it (only for INITIAL_SESSION or SIGNED_IN)
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
              if (process.env.NODE_ENV === 'development') {
                console.log('📥 Fetching profile for auth event:', event)
              }

              // Prevent concurrent fetches
              if (isFetchingProfile) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('⏭️ Profile fetch already in progress, skipping...')
                }
                return
              }

              // Mark that we're fetching for this specific user
              fetchingUserId = session.user.id
              isFetchingProfile = true
              lastFetchTime = Date.now()

              try {
                const { user, profile } = await getCurrentUserWithProfile()

                if (!mounted) return

                if (process.env.NODE_ENV === 'development') {
                  console.log('✅ Profile fetched on auth event:', {
                    user: user?.email,
                    profile: !!profile
                  })
                }

                if (user && profile) {
                  loadedUserId = user.id
                  // Save to cache
                  window.localStorage.setItem('bliss-admin-profile-cache', JSON.stringify({
                    profile,
                    timestamp: Date.now()
                  }))
                  setAuthState({
                    user: profile,
                    isLoading: false,
                    error: null,
                    isAuthenticated: true,
                  })
                }
              } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                  console.error('❌ Failed to fetch profile on auth event:', error)
                }
              } finally {
                isFetchingProfile = false
                fetchingUserId = null
              }
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ Session user mismatch on event:', event)
              }
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ Auth state change error:', error)
          }
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