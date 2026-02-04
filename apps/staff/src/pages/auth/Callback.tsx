/**
 * LIFF Callback Page
 * Handles LINE authentication callback after authorization
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_CONFIGS, authService, liffService } from '@bliss/supabase/auth'
import { AlertCircle, Loader2 } from 'lucide-react'

// Get LIFF ID from environment
const LIFF_ID = import.meta.env.VITE_LIFF_ID || ''

export function StaffAuthCallback() {
  const navigate = useNavigate()
  const config = APP_CONFIGS.STAFF
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      try {
        // Initialize LIFF if not already
        if (!liffService.isInitialized()) {
          if (!LIFF_ID) {
            throw new Error('LIFF ID not configured')
          }
          await liffService.initialize(LIFF_ID)
        }

        // Check if user is logged in
        if (!liffService.isLoggedIn()) {
          throw new Error('LINE authentication failed')
        }

        // Get LINE profile
        const profile = await liffService.getProfile()

        // Authenticate with Supabase
        await authService.loginWithLine({
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        })

        // Redirect to dashboard
        navigate(config.defaultPath, { replace: true })
      } catch (err: any) {
        console.error('Callback error:', err)
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
