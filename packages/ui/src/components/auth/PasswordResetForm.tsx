/**
 * Password Reset Form Component
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../Button'
import Input from '../Input'
import Loader from '../Loader'
import { authService } from '@bliss/supabase/auth'

export interface PasswordResetFormProps {
  /**
   * Redirect path after successful reset request
   */
  redirectTo?: string
  /**
   * Show back to login link
   */
  showBackLink?: boolean
  onBackToLogin?: () => void
}

export function PasswordResetForm({
  redirectTo = '/login',
  showBackLink = true,
  onBackToLogin,
}: PasswordResetFormProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await authService.resetPassword(email)
      setSuccess(true)
      setTimeout(() => {
        if (redirectTo) navigate(redirectTo)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Check your email
        </h3>
        <p className="text-gray-600 mb-4">
          We've sent a password reset link to {email}
        </p>
        {showBackLink && (
          <button
            onClick={onBackToLogin || (() => navigate(redirectTo))}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Back to login
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Reset your password
        </h3>
        <p className="text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>

      {error && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="reset-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <Input
            id="reset-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || !email}
          className="w-full"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader size="sm" />
              Sending...
            </span>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>

      {showBackLink && (
        <div className="mt-4 text-center">
          <button
            onClick={onBackToLogin || (() => navigate(redirectTo))}
            disabled={isLoading}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Back to login
          </button>
        </div>
      )}
    </div>
  )
}
