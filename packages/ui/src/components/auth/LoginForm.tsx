/**
 * Shared Login Form Component
 * Used by all 4 applications with app-specific customization
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaGoogle, FaFacebook, FaExternalLinkAlt } from 'react-icons/fa'
import { useTranslation } from '@bliss/i18n'

function isWebView(): boolean {
  const ua = navigator.userAgent || ''
  // LINE, Facebook, Instagram, Messenger, WeChat, Twitter, Snapchat
  if (/\b(FBAN|FBAV|FBIOS|Instagram|Line|MicroMessenger|WeChat|Twitter|Snapchat)\b/i.test(ua)) return true
  // Android WebView marker
  if (/\bwv\b/.test(ua)) return true
  // iOS WebView: has iPhone/iPad but no Safari token
  if (/iPhone|iPad|iPod/.test(ua) && !/Safari/.test(ua)) return true
  return false
}
import Button from '../Button'
import Input from '../Input'
import Loader from '../Loader'
import { useAuth, type LoginCredentials, type UserRole } from '@bliss/supabase/auth'

export interface LoginFormProps {
  /**
   * App-specific configuration
   */
  appTitle: string
  appLogo?: string
  primaryColor?: string

  /**
   * Expected user role for login validation
   */
  expectedRole?: UserRole

  /**
   * Additional actions (e.g., "Register", "Forgot Password")
   */
  showRegister?: boolean
  showForgotPassword?: boolean
  onRegisterClick?: () => void
  onForgotPasswordClick?: () => void

  /**
   * Custom redirect path after successful login
   */
  redirectTo?: string

  /**
   * Show remember me checkbox
   */
  showRememberMe?: boolean

  /**
   * Show social login buttons
   */
  showSocialLogin?: boolean
  onSocialLogin?: (provider: 'google' | 'facebook') => void
}

export function LoginForm({
  appTitle,
  appLogo,
  primaryColor = '#6366f1',
  expectedRole,
  showRegister = false,
  showForgotPassword = true,
  onRegisterClick,
  onForgotPasswordClick,
  redirectTo,
  showRememberMe = true,
  showSocialLogin = true,
  onSocialLogin,
}: LoginFormProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  // Skip initial auth check on login page - only load during login attempt
  const { login, isLoading, error, clearError } = useAuth(expectedRole, { skipInitialCheck: true })

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false,
  })

  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const inWebView = useMemo(() => isWebView(), [])
  const [copied, setCopied] = useState(false)

  const handleOpenInBrowser = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback: prompt user
      window.prompt(t('webView.copyUrl'), url)
    }
  }

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}

    // Email validation
    if (!credentials.email) {
      errors.email = t('validation.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      errors.email = t('validation.emailInvalid')
    }

    // Password validation
    if (!credentials.password) {
      errors.password = t('validation.passwordRequired')
    } else if (credentials.password.length < 6) {
      errors.password = t('validation.passwordMinLength')
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) {
      return
    }

    try {
      await login(credentials)
      // Navigate to redirect path or default
      if (redirectTo) {
        navigate(redirectTo)
      }
    } catch {
      // Error is handled by useAuth hook
    }
  }

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({ ...prev, [field]: e.target.value }))
    // Clear validation error for this field
    setValidationErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    if (onSocialLogin) {
      onSocialLogin(provider)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* App Header */}
      {appTitle && (
        <div className="text-center mb-8">
          {appLogo && (
            <img src={appLogo} alt={appTitle} className="h-16 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{appTitle}</h1>
          <p className="text-gray-600 mt-2">{t('login.headerSubtitle')}</p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
        >
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* WebView Warning Banner */}
      {showSocialLogin && inWebView && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800 font-medium mb-2">
            {t('webView.title')}
          </p>
          <p className="text-xs text-amber-700 mb-3">
            {t('webView.description')}
          </p>
          <button
            type="button"
            onClick={handleOpenInBrowser}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-100 border border-amber-300 rounded-lg text-sm font-medium text-amber-900 hover:bg-amber-200 transition-colors"
          >
            <FaExternalLinkAlt className="w-3.5 h-3.5" />
            {copied ? t('webView.copiedUrl') : t('webView.copyUrl')}
          </button>
        </div>
      )}

      {/* Social Login Buttons — hidden in WebView */}
      {showSocialLogin && !inWebView && (
        <>
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-stone-200 rounded-xl font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <FaGoogle className="w-5 h-5 text-red-500" />
              {t('login.googleButton')}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-stone-500">{t('login.orWithEmail')}</span>
            </div>
          </div>
        </>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('login.emailLabel')}
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={credentials.email}
            onChange={handleInputChange('email')}
            error={validationErrors.email}
            disabled={isLoading}
            autoComplete="email"
            required
          />
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('login.passwordLabel')}
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={credentials.password}
            onChange={handleInputChange('password')}
            error={validationErrors.password}
            disabled={isLoading}
            autoComplete="current-password"
            required
          />
        </div>

        {/* Remember Me & Forgot Password */}
        {(showRememberMe || showForgotPassword) && (
          <div className="flex items-center justify-between">
            {showRememberMe && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={credentials.rememberMe}
                  onChange={e =>
                    setCredentials(prev => ({
                      ...prev,
                      rememberMe: e.target.checked,
                    }))
                  }
                  disabled={isLoading}
                  className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-2 focus:ring-offset-0"
                  style={{ accentColor: primaryColor }}
                />
                <span className="ml-2 text-sm text-gray-600">{t('rememberMe')}</span>
              </label>
            )}

            {showForgotPassword && (
              <button
                type="button"
                onClick={onForgotPasswordClick}
                disabled={isLoading}
                className="text-sm font-medium hover:underline disabled:opacity-50"
                style={{ color: primaryColor }}
              >
                {t('login.forgotPassword')}
              </button>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full [background-image:none]"
          style={{ backgroundColor: primaryColor }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader size="sm" />
              {t('login.submitting')}
            </span>
          ) : (
            t('login.submit')
          )}
        </Button>
      </form>

      {/* Register Link */}
      {showRegister && onRegisterClick && (
        <p className="mt-6 text-center text-sm text-gray-600">
          {t('login.noAccount')}{' '}
          <button
            type="button"
            onClick={onRegisterClick}
            disabled={isLoading}
            className="font-medium hover:underline disabled:opacity-50"
            style={{ color: primaryColor }}
          >
            {t('login.createAccount')}
          </button>
        </p>
      )}
    </div>
  )
}
