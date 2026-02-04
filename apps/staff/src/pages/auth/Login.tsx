/**
 * Staff Login Page
 * Port 3004 - For STAFF role (LINE LIFF)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout, LoginForm, Button } from '@bliss/ui'
import { APP_CONFIGS, authService, liffService } from '@bliss/supabase/auth'
import { AlertCircle } from 'lucide-react'

// Get LIFF ID from environment
const LIFF_ID = import.meta.env.VITE_LIFF_ID || ''

export function StaffLoginPage() {
  const navigate = useNavigate()
  const config = APP_CONFIGS.STAFF
  const [isLoading, setIsLoading] = useState(false)
  const [isLiffReady, setIsLiffReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const profile = await liffService.getProfile()

      await authService.loginWithLine({
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
      })

      // Clear LIFF parameters from URL before navigating
      window.history.replaceState({}, '', window.location.pathname)
      navigate(config.defaultPath, { replace: true })
    } catch (err: any) {
      console.error('Auto-login error:', err)
      setError(err.message || 'Auto-login failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle LINE login button click
  async function handleLINELogin() {
    if (!isLiffReady) {
      setError('LINE Login is not available')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (liffService.isLoggedIn()) {
        // Already logged in, get profile and authenticate
        const profile = await liffService.getProfile()

        await authService.loginWithLine({
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        })

        // Clear LIFF parameters from URL before navigating
        window.history.replaceState({}, '', window.location.pathname)
        navigate(config.defaultPath, { replace: true })
      } else {
        // Not logged in, redirect to LINE authorization
        // LIFF will redirect back to the Endpoint URL after login
        liffService.login()
      }
    } catch (err: any) {
      console.error('LINE login error:', err)
      setError(err.message || 'LINE login failed')
      setIsLoading(false)
    }
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

      {/* LINE Login Button */}
      <div className="mb-6">
        <Button
          onClick={handleLINELogin}
          disabled={isLoading || !isLiffReady}
          className="w-full hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: '#06C755',
            height: '48px',
            fontSize: '16px',
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
              Connecting...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {/* LINE Logo */}
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.64 2 10.14c0 4.08 3.6 7.49 8.47 8.14.33.07.78.21.89.49.1.25.07.64.03.89l-.14.85c-.04.26-.2 1.02.89.56.09-.04.18-.08.27-.12 3.66-1.88 6.59-4.54 6.59-8.81C19 5.64 15.52 2 12 2zm4.24 10.15l-.98.02c-.18 0-.33-.15-.33-.33v-2.5c0-.18.15-.33.33-.33h.98c.18 0 .33.15.33.33v2.5c0 .18-.15.33-.33.33zm-2.5 0h-.98c-.18 0-.33-.15-.33-.33v-2.5c0-.18.15-.33.33-.33h.98c.18 0 .33.15.33.33v2.5c0 .18-.15.33-.33.33zm-2.5 0H8.76c-.18 0-.33-.15-.33-.33V9.34c0-.18.15-.33.33-.33h2.48c.18 0 .33.15.33.33v2.48c0 .18-.15.33-.33.33z"/>
              </svg>
              Sign in with LINE
            </span>
          )}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          {isLiffReady ? 'Recommended for staff' : 'LINE Login not available'}
        </p>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or</span>
        </div>
      </div>

      {/* Email Login Fallback */}
      <LoginForm
        appTitle={config.name}
        primaryColor={config.primaryColor}
        expectedRole="STAFF"
        redirectTo={config.defaultPath}
        showRegister={false}
        showForgotPassword={false}
        showRememberMe={true}
      />
    </AuthLayout>
  )
}
