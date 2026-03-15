/**
 * Reset Password Page
 * Handles the password reset callback from Supabase email link
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '@bliss/ui'
import { APP_CONFIGS, authService, supabase } from '@bliss/supabase/auth'
import { Eye, EyeOff, Lock } from 'lucide-react'

type PageState = 'loading' | 'form' | 'success' | 'error'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const config = APP_CONFIGS.CUSTOMER
  const [pageState, setPageState] = useState<PageState>('loading')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    let cancelled = false

    const handleRecovery = async () => {
      try {
        // Check for error in URL first (expired/invalid link)
        const searchParams = new URLSearchParams(window.location.search)
        const urlError = searchParams.get('error')
        if (urlError) {
          console.error('Reset link error:', searchParams.get('error_description'))
          if (!cancelled) setPageState('error')
          return
        }

        // PKCE flow: Supabase sends ?code= in URL
        const code = searchParams.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Code exchange error:', error)
            // Fallback: session may already exist (auto-exchanged by Supabase)
            const { data: { session } } = await supabase.auth.getSession()
            if (session && !cancelled) {
              setPageState('form')
              return
            }
            if (!cancelled) setPageState('error')
            return
          }
          if (!cancelled) setPageState('form')
          return
        }

        // Implicit flow fallback: #access_token=...&type=recovery
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY' && !cancelled) {
            setPageState('form')
          }
        })

        // Timeout fallback: check if session exists
        await new Promise(resolve => setTimeout(resolve, 3000))
        if (cancelled) { subscription.unsubscribe(); return }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setPageState((prev) => (prev === 'loading' ? 'form' : prev))
        } else {
          setPageState((prev) => (prev === 'loading' ? 'error' : prev))
        }

        subscription.unsubscribe()
      } catch (err) {
        console.error('Recovery error:', err)
        if (!cancelled) setPageState('error')
      }
    }

    handleRecovery()

    return () => { cancelled = true }
  }, [])

  const validate = (): boolean => {
    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters')
      return false
    }
    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match')
      return false
    }
    setValidationError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await authService.updatePassword(newPassword)
      setPageState('success')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      appTitle={config.name}
      appLogo="/logo.svg"
      backgroundVariant="default"
      showBackLink={false}
    >
      {/* Loading State */}
      {pageState === 'loading' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-700 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your reset link...</p>
        </div>
      )}

      {/* Error State */}
      {pageState === 'error' && (
        <div className="text-center py-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Invalid or Expired Link
          </h3>
          <p className="text-gray-600 mb-6 text-sm">
            This password reset link is no longer valid. Please request a new one.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-4 py-2 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition"
          >
            Back to Login
          </button>
        </div>
      )}

      {/* Success State */}
      {pageState === 'success' && (
        <div className="text-center py-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Password Updated
          </h3>
          <p className="text-gray-600 text-sm">
            Your password has been changed successfully. Redirecting to login...
          </p>
        </div>
      )}

      {/* Form State */}
      {pageState === 'form' && (
        <div className="w-full">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
              <Lock className="h-6 w-6 text-amber-700" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Set New Password
            </h3>
            <p className="text-sm text-gray-600">
              Enter your new password below.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800" role="alert">
              {errorMessage}
            </div>
          )}

          {validationError && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800" role="alert">
              {validationError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setValidationError('') }}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setValidationError('') }}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !newPassword || !confirmPassword}
              className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/login')}
              disabled={isSubmitting}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Back to login
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
