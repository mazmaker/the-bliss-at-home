/**
 * Customer Login Page
 * Port 3002 - For CUSTOMER role
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout, LoginForm, PasswordResetForm } from '@bliss/ui'
import { APP_CONFIGS, authService } from '@bliss/supabase/auth'
import { useTranslation } from '@bliss/i18n'

type AuthView = 'login' | 'register' | 'forgot-password'

export function CustomerLoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const config = APP_CONFIGS.CUSTOMER
  const [view, setView] = useState<AuthView>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegisterClick = () => {
    navigate('/register')
  }

  const handleForgotPasswordClick = () => {
    setView('forgot-password')
  }

  const handleBackToLogin = () => {
    setView('login')
    setError(null)
  }

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(true)
    setError(null)
    try {
      if (provider === 'google') {
        await authService.signInWithGoogle()
      } else {
        await authService.signInWithFacebook()
      }
      // OAuth will redirect to callback URL
    } catch (err) {
      console.error('Social login error:', err)
      setError(t('login.socialLoginError', { provider: provider === 'google' ? 'Google' : 'Facebook' }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      appTitle={config.name}
      appLogo="/logo.svg"
      backgroundVariant="default"
      showBackLink={false}
    >
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {view === 'login' && (
        <LoginForm
          appTitle=""
          primaryColor={config.primaryColor}
          expectedRole={config.allowedRole}
          redirectTo="/"
          showRegister={true}
          showForgotPassword={true}
          showSocialLogin={true}
          onRegisterClick={handleRegisterClick}
          onForgotPasswordClick={handleForgotPasswordClick}
          onSocialLogin={handleSocialLogin}
          showRememberMe={true}
        />
      )}

      {view === 'forgot-password' && (
        <PasswordResetForm
          redirectTo="/login"
          showBackLink={true}
          onBackToLogin={handleBackToLogin}
        />
      )}
    </AuthLayout>
  )
}
