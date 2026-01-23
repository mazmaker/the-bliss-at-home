/**
 * Shared Login Form Component
 * Used by all 4 applications with app-specific customization
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaGoogle, FaFacebook } from 'react-icons/fa'
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
  const { login, isLoading, error, clearError } = useAuth(expectedRole)

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false,
  })

  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}

    // Email validation
    if (!credentials.email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      errors.email = 'Invalid email format'
    }

    // Password validation
    if (!credentials.password) {
      errors.password = 'Password is required'
    } else if (credentials.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
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
          <p className="text-gray-600 mt-2">Sign in to your account</p>
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

      {/* Social Login Buttons */}
      {showSocialLogin && (
        <>
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-stone-200 rounded-xl font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <FaGoogle className="w-5 h-5 text-red-500" />
              Continue with Google
            </button>

            {/* Facebook Login - Temporarily disabled due to Development mode limitations */}
            {/* Uncomment when app is in Production mode */}
            {/* <button
              type="button"
              onClick={() => handleSocialLogin('facebook')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-stone-200 rounded-xl font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <FaFacebook className="w-5 h-5" style={{ color: '#1877F2' }} />
              Continue with Facebook
            </button> */}
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-stone-500">Or continue with email</span>
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
            Email Address
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
            Password
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
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
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
                Forgot password?
              </button>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
          style={{ backgroundColor: primaryColor }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader size="sm" />
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      {/* Register Link */}
      {showRegister && onRegisterClick && (
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onRegisterClick}
            disabled={isLoading}
            className="font-medium hover:underline disabled:opacity-50"
            style={{ color: primaryColor }}
          >
            Create one
          </button>
        </p>
      )}
    </div>
  )
}
