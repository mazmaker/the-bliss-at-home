/**
 * Customer Login Page
 * Port 3002 - For CUSTOMER role
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout, LoginForm, PasswordResetForm } from '@bliss/ui'
import { APP_CONFIGS } from '@bliss/supabase/auth'

type AuthView = 'login' | 'register' | 'forgot-password'

export function CustomerLoginPage() {
  const navigate = useNavigate()
  const config = APP_CONFIGS.CUSTOMER
  const [view, setView] = useState<AuthView>('login')

  const handleRegisterClick = () => {
    // TODO: Navigate to registration page
    console.log('Navigate to register')
  }

  const handleForgotPasswordClick = () => {
    setView('forgot-password')
  }

  const handleBackToLogin = () => {
    setView('login')
  }

  return (
    <AuthLayout
      appTitle={config.name}
      appLogo={config.logoUrl}
      backgroundVariant="default"
      backLinkText="Back to Home"
      backLinkTo="/"
    >
      {view === 'login' && (
        <LoginForm
          appTitle={config.name}
          appLogo={config.logoUrl}
          primaryColor={config.primaryColor}
          redirectTo={config.defaultPath}
          showRegister={true}
          showForgotPassword={true}
          onRegisterClick={handleRegisterClick}
          onForgotPasswordClick={handleForgotPasswordClick}
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
