/**
 * OAuth Callback Page
 * Handles both LINE (LIFF) and Google OAuth authentication callbacks
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_CONFIGS, authService, liffService, supabase } from '@bliss/supabase/auth'
import { AlertCircle, Loader2 } from 'lucide-react'

// Get LIFF ID from environment
const LIFF_ID = import.meta.env.VITE_LIFF_ID || ''

export function StaffAuthCallback() {
  const navigate = useNavigate()
  const config = APP_CONFIGS.STAFF
  const [error, setError] = useState<string | null>(null)
  const hasRun = useRef(false)

  useEffect(() => {
    async function handleCallback() {
      // Prevent double execution in React Strict Mode
      if (hasRun.current) {
        console.log('[Callback] Already executed, skipping...')
        return
      }
      hasRun.current = true

      try {
        console.log('[Callback] Starting callback handler...')

        // Check if this is a LINE (LIFF) callback or Google OAuth callback
        const urlParams = new URLSearchParams(window.location.search)
        const hasLiffParams = urlParams.has('liffClientId') && urlParams.has('liffRedirectUri')
        const isLiffCallback = LIFF_ID && hasLiffParams

        // === Extract deep link path from multiple sources ===
        // Strategy 1: Direct liff.state param (present when user is already LINE-logged-in)
        let deepLinkPath: string | null = urlParams.get('liff.state')
        if (deepLinkPath && deepLinkPath.startsWith('/')) {
          localStorage.setItem('staff_redirect_after_login', deepLinkPath)
          console.log('[Callback] Got deep link from liff.state param:', deepLinkPath)
        }

        // Strategy 2: Extract liff.state from liffRedirectUri param
        // When NOT logged in, LIFF encodes the deep link path inside liffRedirectUri
        // e.g. liffRedirectUri=https://example.com/login?liff.state=%2Fstaff%2Fjobs%2Fxxx
        if (!deepLinkPath || !deepLinkPath.startsWith('/')) {
          const liffRedirectUri = urlParams.get('liffRedirectUri')
          if (liffRedirectUri) {
            try {
              const redirectUrl = new URL(decodeURIComponent(liffRedirectUri))
              const stateFromRedirect = redirectUrl.searchParams.get('liff.state')
              if (stateFromRedirect && stateFromRedirect.startsWith('/')) {
                deepLinkPath = stateFromRedirect
                localStorage.setItem('staff_redirect_after_login', deepLinkPath)
                console.log('[Callback] Got deep link from liffRedirectUri:', deepLinkPath)
              }
            } catch (e) {
              console.log('[Callback] Could not parse liffRedirectUri:', liffRedirectUri)
            }
          }
        }

        // Strategy 3: Try to decode OAuth state parameter (may contain liff.state)
        if (!deepLinkPath || !deepLinkPath.startsWith('/')) {
          const oauthState = urlParams.get('state')
          if (oauthState) {
            try {
              const decoded = decodeURIComponent(oauthState)
              // Format could be: {token};liff.state={path} or contain it URL-encoded
              const stateMatch = decoded.match(/liff\.state=([^&;]+)/)
              if (stateMatch) {
                const pathFromState = decodeURIComponent(stateMatch[1])
                if (pathFromState.startsWith('/')) {
                  deepLinkPath = pathFromState
                  localStorage.setItem('staff_redirect_after_login', deepLinkPath)
                  console.log('[Callback] Got deep link from OAuth state:', deepLinkPath)
                }
              }
            } catch (e) {
              // ignore decode errors
            }
          }
        }

        // DEBUG: Log all URL params for diagnosis
        const allParams: Record<string, string> = {}
        urlParams.forEach((v, k) => { allParams[k] = v.substring(0, 200) })
        const debugLogs = JSON.parse(localStorage.getItem('_debug_liff_log') || '[]')
        debugLogs.push({ t: Date.now(), step: 'CALLBACK_PARAMS', data: { deepLinkPath, allParams }, url: window.location.href })
        if (debugLogs.length > 20) debugLogs.splice(0, debugLogs.length - 20)
        localStorage.setItem('_debug_liff_log', JSON.stringify(debugLogs))

        console.log('[Callback] Debug:', {
          LIFF_ID,
          hasLiffParams,
          isLiffCallback,
          deepLinkPath,
          allParams,
          url: window.location.href,
        })

        if (isLiffCallback) {
          // Handle LINE (LIFF) callback
          console.log('[Callback] Detected LINE LIFF callback')

          // Initialize LIFF if not already
          if (!liffService.isInitialized()) {
            if (!LIFF_ID) {
              throw new Error('LIFF ID not configured')
            }
            await liffService.initialize(LIFF_ID)
          }

          // Strategy 4: After liff.init(), SDK may have added liff.state to URL
          if (!deepLinkPath || !deepLinkPath.startsWith('/')) {
            const postInitParams = new URLSearchParams(window.location.search)
            const postInitLiffState = postInitParams.get('liff.state')
            if (postInitLiffState && postInitLiffState.startsWith('/')) {
              deepLinkPath = postInitLiffState
              localStorage.setItem('staff_redirect_after_login', deepLinkPath)
              console.log('[Callback] Got deep link after liff.init():', deepLinkPath)
            }
          }

          // Check if user is logged in
          if (!liffService.isLoggedIn()) {
            throw new Error('LINE authentication failed')
          }

          // Get LINE profile
          const profile = await liffService.getProfile()

          // Check if this is link mode (user wants to link LINE to existing account)
          const isLinkMode = localStorage.getItem('line_link_mode') === 'true'

          if (isLinkMode) {
            // Link mode: Link LINE to existing account
            console.log('[Callback] Link mode: Linking LINE to existing account')

            // Get stored user ID to prevent session switching
            const storedUserId = localStorage.getItem('line_link_user_id')
            localStorage.removeItem('line_link_mode')
            localStorage.removeItem('line_link_user_id')

            if (!storedUserId) {
              console.log('[Callback] No stored user ID found!')
              throw new Error('Session expired. Please try linking again.')
            }

            console.log('[Callback] Linking to user:', storedUserId)
            console.log('[Callback] LINE profile:', { userId: profile.userId, displayName: profile.displayName })

            // Link LINE account to stored user (not current session user)
            console.log('[Callback] Calling linkLineAccountToUser...')
            await authService.linkLineAccountToUser({
              userId: storedUserId,
              lineUserId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
            })

            console.log('[Callback] Successfully linked! Redirecting to profile...')
            // Force full page reload to refresh user data with LINE fields
            window.location.href = '/staff/profile'
          } else {
            // Login mode: Authenticate with Supabase
            console.log('[Callback] Login mode: Authenticating with LINE')

            // Check for invite data from admin invitation flow
            const inviteStaffId = localStorage.getItem('staff_invite_staff_id') || undefined
            if (inviteStaffId) {
              console.log('[Callback] Found invite staff ID:', inviteStaffId)
            }

            await authService.loginWithLine({
              lineUserId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
            }, 'STAFF', inviteStaffId)

            // Clean up invite data from localStorage
            localStorage.removeItem('staff_invite_token')
            localStorage.removeItem('staff_invite_staff_id')
            localStorage.removeItem('staff_invite_name')

            // Redirect to saved deep link path (from LIFF liff.state) or dashboard
            const savedPath = localStorage.getItem('staff_redirect_after_login')
            const targetPath = savedPath || config.defaultPath
            localStorage.removeItem('staff_redirect_after_login')
            // DEBUG
            const debugLogs = JSON.parse(localStorage.getItem('_debug_liff_log') || '[]')
            debugLogs.push({ t: Date.now(), step: 'CALLBACK_REDIRECT', data: { savedPath, targetPath }, url: window.location.href })
            localStorage.setItem('_debug_liff_log', JSON.stringify(debugLogs))
            console.log('[Callback] Redirecting to:', targetPath, '(saved:', savedPath, ')')
            window.location.href = targetPath
          }
        } else {
          // Handle Google OAuth callback
          console.log('[Callback] Detected Google OAuth callback')

          // Supabase automatically exchanges the code for session tokens
          // Just wait a moment for the session to be set
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Get current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          if (sessionError || !session) {
            throw new Error('OAuth authentication failed')
          }

          console.log('[Callback] Session obtained, checking profile...')

          // Get or create profile with STAFF role
          const expectedRole = localStorage.getItem('staff_oauth_expected_role') || 'STAFF'
          localStorage.removeItem('staff_oauth_expected_role')

          // Check current profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            throw new Error('Failed to fetch profile: ' + profileError.message)
          }

          // If profile doesn't exist or has wrong role, update it
          if (!profile || profile.role !== expectedRole) {
            console.log('[Callback] Updating profile role to', expectedRole)

            const { error: updateError } = await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
                avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
                role: expectedRole,
                status: 'ACTIVE',
                language: 'th',
              })

            if (updateError) {
              throw new Error('Failed to update profile: ' + updateError.message)
            }

            // Check if staff record exists, if not create one
            const { data: staffData, error: staffError } = await supabase
              .from('staff')
              .select('id')
              .eq('profile_id', session.user.id)
              .single()

            if (staffError && staffError.code === 'PGRST116') {
              // Staff record doesn't exist, create it
              console.log('[Callback] Creating staff record...')

              const { error: createStaffError } = await supabase
                .from('staff')
                .insert({
                  profile_id: session.user.id,
                  name_th: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Staff',
                  name_en: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Staff',
                  phone: session.user.phone || '0000000000',
                  avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
                  status: 'pending', // Requires admin approval
                })

              if (createStaffError) {
                console.error('[Callback] Failed to create staff record:', createStaffError)
                // Don't throw - staff record will be created by trigger eventually
              }
            }
          }

          console.log('[Callback] Authentication complete, redirecting...')

          // Clear OAuth parameters from URL
          window.history.replaceState({}, '', window.location.pathname)

          // Redirect to saved deep link path or dashboard
          const targetPath = localStorage.getItem('staff_redirect_after_login') || config.defaultPath
          localStorage.removeItem('staff_redirect_after_login')
          console.log('[Callback] Redirecting to:', targetPath)
          window.location.href = targetPath
        }
      } catch (err: any) {
        console.error('[Callback] Error:', err)
        setError(err.message || 'Authentication failed')
      }
    }

    handleCallback()
  }, [navigate, config.defaultPath])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/staff/login', { replace: true })}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Signing you in...
          </h2>
          <p className="text-gray-600">
            Please wait while we complete your authentication.
          </p>
        </div>
      </div>
    </div>
  )
}
