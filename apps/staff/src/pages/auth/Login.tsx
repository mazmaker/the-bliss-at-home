/**
 * Staff Login Page
 * Port 3004 - For STAFF role (LINE LIFF)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout, LoginForm, Button } from '@bliss/ui'
import { APP_CONFIGS } from '@bliss/supabase/auth'

export function StaffLoginPage() {
  const navigate = useNavigate()
  const config = APP_CONFIGS.STAFF
  const [isLoading, setIsLoading] = useState(false)

  const handleLINELogin = () => {
    // TODO: Implement LINE LIFF login
    setIsLoading(true)
    // This will use LINE LIFF SDK
    console.log('LINE Login via LIFF')
    setTimeout(() => {
      setIsLoading(false)
      navigate(config.defaultPath)
    }, 1000)
  }

  return (
    <AuthLayout
      appTitle={config.name}
      backgroundVariant="gradient"
      showBackLink={false}
    >
      {/* LINE Login Button */}
      <div className="mb-6">
        <Button
          onClick={handleLINELogin}
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-600"
          style={{
            backgroundColor: config.primaryColor,
            height: '48px',
            fontSize: '16px',
            fontWeight: '600',
          }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⟳</span>
              Connecting...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              Sign in with LINE
            </span>
          )}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Recommended for staff
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
        redirectTo={config.defaultPath}
        showRegister={false}
        showForgotPassword={false}
        showRememberMe={true}
      />
    </AuthLayout>
  )
}
