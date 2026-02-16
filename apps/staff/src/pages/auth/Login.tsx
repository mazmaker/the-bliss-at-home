/**
 * Staff Login Page
 * Port 3004 - For STAFF role (LINE Only)
 *
 * Also handles invite token from admin-created staff accounts.
 * When LIFF opens with ?token=xxx, this page validates the token
 * and stores invite data in localStorage before proceeding with LINE login.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout, Button } from '@bliss/ui'
import { APP_CONFIGS, authService, liffService, supabase } from '@bliss/supabase/auth'
import { AlertCircle, UserCheck, Loader2 } from 'lucide-react'

// Get LIFF ID from environment
const LIFF_ID = import.meta.env.VITE_LIFF_ID || ''

// Module-level flag to prevent auto-login across re-mounts within the same page load
let skipAutoLoginForSession = false

export function StaffLoginPage() {
  const navigate = useNavigate()
  const config = APP_CONFIGS.STAFF
  const [isLoading, setIsLoading] = useState(false)
  const [isLiffReady, setIsLiffReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteProcessing, setInviteProcessing] = useState(false)
  const [inviteStaffName, setInviteStaffName] = useState<string | null>(null)

  // Process invite token from URL params (sent via LIFF invite link)
  useEffect(() => {
    async function processInviteFromUrl() {
      // Check for token in URL params (LIFF passes query params through)
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')

      // Also check liff.state param (LIFF sometimes encodes params there)
      const liffState = urlParams.get('liff.state')
      let tokenFromState: string | null = null
      if (liffState) {
        try {
          const stateParams = new URLSearchParams(liffState)
          tokenFromState = stateParams.get('token')
        } catch (e) {
          // ignore parse errors
        }
      }

      const inviteToken = token || tokenFromState

      if (!inviteToken) return // No invite token, normal login flow

      // Already processed this token?
      const existingToken = localStorage.getItem('staff_invite_token')
      if (existingToken === inviteToken) {
        console.log('[Invite] Token already processed, skipping validation')
        return
      }

      console.log('[Invite] Found invite token in URL, validating...')
      setInviteProcessing(true)

      try {
        // Validate token against database
        const { data, error: queryError } = await supabase
          .from('staff')
          .select('id, name_th, invite_token_expires_at')
          .eq('invite_token', inviteToken)
          .is('profile_id', null)
          .single()

        if (queryError || !data) {
          console.error('[Invite] Token validation failed:', queryError)
          setError('ลิงก์คำเชิญไม่ถูกต้องหรือถูกใช้งานแล้ว')
          setInviteProcessing(false)
          return
        }

        // Check expiry
        if (data.invite_token_expires_at && new Date(data.invite_token_expires_at) < new Date()) {
          setError('ลิงก์คำเชิญหมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบ')
          setInviteProcessing(false)
          return
        }

        // Store invite data in localStorage (survives LIFF redirect)
        localStorage.setItem('staff_invite_token', inviteToken)
        localStorage.setItem('staff_invite_staff_id', data.id)
        localStorage.setItem('staff_invite_name', data.name_th)

        console.log('[Invite] Token valid! Staff:', data.name_th, 'ID:', data.id)
        setInviteStaffName(data.name_th)
        setInviteProcessing(false)

        // Clean token from URL to avoid re-processing
        window.history.replaceState({}, '', window.location.pathname)
      } catch (err) {
        console.error('[Invite] Error processing token:', err)
        setError('เกิดข้อผิดพลาดในการตรวจสอบคำเชิญ')
        setInviteProcessing(false)
      }
    }

    processInviteFromUrl()
  }, [])

  // Initialize LIFF on mount
  useEffect(() => {
    async function initLiff() {
      if (!LIFF_ID) {
        console.warn('LIFF ID not configured')
        setIsLiffReady(false)
        return
      }

      try {
        await liffService.initialize(LIFF_ID)
        setIsLiffReady(true)

        // Check if user just logged out - skip auto-login to prevent loop
        // Use both localStorage flag AND module-level guard (for React StrictMode double-mount)
        const justLoggedOut = localStorage.getItem('staff_just_logged_out')
        if (justLoggedOut || skipAutoLoginForSession) {
          console.log('[LIFF] User just logged out, skipping auto-login')
          localStorage.removeItem('staff_just_logged_out')
          skipAutoLoginForSession = true // Keep guard active for subsequent re-mounts
          setIsLoading(false)
          return
        }

        // Auto-login if already logged in via LIFF
        if (liffService.isLoggedIn()) {
          await handleLiffAutoLogin()
        }
      } catch (err) {
        console.error('LIFF init error:', err)
        setError('Failed to initialize LINE Login')
        setIsLiffReady(false)
      }
    }

    initLiff()
  }, [])

  // Handle auto-login when LIFF is already logged in
  async function handleLiffAutoLogin() {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[Auto-login] Getting LIFF profile...')
      const profile = await liffService.getProfile()
      console.log('[Auto-login] LIFF profile:', profile)

      // Check for invite data from admin invitation flow
      const inviteStaffId = localStorage.getItem('staff_invite_staff_id') || undefined

      console.log('[Auto-login] Calling loginWithLine...', inviteStaffId ? `(invite: ${inviteStaffId})` : '')
      const result = await authService.loginWithLine({
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
      }, 'STAFF', inviteStaffId)
      console.log('[Auto-login] Login successful:', result)

      // Clean up invite data from localStorage
      localStorage.removeItem('staff_invite_token')
      localStorage.removeItem('staff_invite_staff_id')
      localStorage.removeItem('staff_invite_name')

      // Mark that user logged in via LIFF (for logout later)
      localStorage.setItem('staff_logged_in_via_liff', 'true')

      // Wait for auth state to update (onAuthStateChange event)
      console.log('[Auto-login] Waiting for auth state update...')
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Clear LIFF parameters from URL before navigating
      window.history.replaceState({}, '', window.location.pathname)

      // Use window.location to force a full page reload with updated auth state
      console.log('[Auto-login] Redirecting to:', config.defaultPath)
      window.location.href = config.defaultPath
    } catch (err: any) {
      // If auto-login fails (e.g., expired token), silently fail and show login button
      console.error('[Auto-login] Error:', err)
      console.log('[Auto-login] Falling back to manual login')
      setIsLoading(false)
      // Don't set error - just let user click the login button
    }
  }

  // Handle LINE login button click
  async function handleLINELogin() {
    if (!isLiffReady) {
      setError('LINE Login is not available')
      return
    }

    // User explicitly clicked login - clear the skip guard
    skipAutoLoginForSession = false

    setIsLoading(true)
    setError(null)

    try {
      console.log('[LINE Login] Checking LIFF login status...')
      if (liffService.isLoggedIn()) {
        console.log('[LINE Login] Already logged in, getting profile...')
        // Already logged in, get profile and authenticate
        const profile = await liffService.getProfile()
        console.log('[LINE Login] LIFF profile:', profile)

        // Check for invite data from admin invitation flow
        const inviteStaffId = localStorage.getItem('staff_invite_staff_id') || undefined

        console.log('[LINE Login] Calling loginWithLine...', inviteStaffId ? `(invite: ${inviteStaffId})` : '')
        const result = await authService.loginWithLine({
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        }, 'STAFF', inviteStaffId)
        console.log('[LINE Login] Login successful:', result)

        // Clean up invite data from localStorage
        localStorage.removeItem('staff_invite_token')
        localStorage.removeItem('staff_invite_staff_id')
        localStorage.removeItem('staff_invite_name')

        // Mark that user logged in via LIFF (for logout later)
        localStorage.setItem('staff_logged_in_via_liff', 'true')

        // Wait for auth state to update (onAuthStateChange event)
        console.log('[LINE Login] Waiting for auth state update...')
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Clear LIFF parameters from URL before navigating
        window.history.replaceState({}, '', window.location.pathname)

        // Use window.location to force a full page reload with updated auth state
        console.log('[LINE Login] Redirecting to:', config.defaultPath)
        window.location.href = config.defaultPath
      } else {
        console.log('[LINE Login] Not logged in, redirecting to LINE authorization...')
        // Not logged in, redirect to LINE authorization
        // LIFF will redirect back to the Endpoint URL after login
        liffService.login()
      }
    } catch (err: any) {
      console.error('[LINE Login] Error:', err)
      setError(err.message || 'LINE login failed')
      setIsLoading(false)
    }
  }


  // Show loading state while processing invite token
  if (inviteProcessing) {
    return (
      <AuthLayout
        appTitle={config.name}
        backgroundVariant="gradient"
        showBackLink={false}
      >
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-stone-600">กำลังตรวจสอบคำเชิญ...</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      appTitle={config.name}
      backgroundVariant="gradient"
      showBackLink={false}
    >
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Invite Welcome Banner */}
      {(inviteStaffName || localStorage.getItem('staff_invite_name')) && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <UserCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800">
              ยินดีต้อนรับ {inviteStaffName || localStorage.getItem('staff_invite_name')}!
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              กดปุ่มด้านล่างเพื่อเข้าสู่ระบบด้วย LINE และเชื่อมต่อบัญชีของคุณ
            </p>
          </div>
        </div>
      )}

      {/* LINE Login Button - Staff ลงทะเบียนและเข้าสู่ระบบผ่าน LINE เท่านั้น */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">เข้าสู่ระบบ Staff</h2>
        <p className="text-sm text-stone-600">ใช้บัญชี LINE ของคุณในการเข้าสู่ระบบ</p>
      </div>

      <Button
        onClick={handleLINELogin}
        disabled={isLoading || !isLiffReady}
        className="w-full hover:opacity-90 transition-opacity"
        style={{
          backgroundColor: '#06C755',
          height: '56px',
          fontSize: '18px',
          fontWeight: '600',
        }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </span>
            กำลังเชื่อมต่อ...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-3">
            {/* LINE Logo */}
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 5.64 2 10.14c0 4.08 3.6 7.49 8.47 8.14.33.07.78.21.89.49.1.25.07.64.03.89l-.14.85c-.04.26-.2 1.02.89.56.09-.04.18-.08.27-.12 3.66-1.88 6.59-4.54 6.59-8.81C19 5.64 15.52 2 12 2zm4.24 10.15l-.98.02c-.18 0-.33-.15-.33-.33v-2.5c0-.18.15-.33.33-.33h.98c.18 0 .33.15.33.33v2.5c0 .18-.15.33-.33.33zm-2.5 0h-.98c-.18 0-.33-.15-.33-.33v-2.5c0-.18.15-.33.33-.33h.98c.18 0 .33.15.33.33v2.5c0 .18-.15.33-.33.33zm-2.5 0H8.76c-.18 0-.33-.15-.33-.33V9.34c0-.18.15-.33.33-.33h2.48c.18 0 .33.15.33.33v2.48c0 .18-.15.33-.33.33z"/>
            </svg>
            เข้าสู่ระบบด้วย LINE
          </span>
        )}
      </Button>

      <p className="text-xs text-stone-500 text-center mt-3">
        {isLiffReady ? 'ยังไม่มีบัญชี? ระบบจะสร้างบัญชีให้อัตโนมัติเมื่อคุณเข้าสู่ระบบครั้งแรก' : 'LINE Login not available'}
      </p>
    </AuthLayout>
  )
}
