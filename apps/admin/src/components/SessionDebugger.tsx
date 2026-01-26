/**
 * Session Debugger Component
 * Shows session status and debugging info in development
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { USE_MOCK_AUTH } from '../lib/mockAuth'

interface SessionInfo {
  hasSession: boolean
  userEmail: string | null
  expiresAt: string | null
  timeToExpiry: string | null
  refreshToken: boolean
}

export function SessionDebugger() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { refreshSession, user, isAuthenticated } = useAdminAuth()

  const updateSessionInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const expiresAt = new Date(session.expires_at * 1000)
        const now = new Date()
        const timeToExpiry = Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60) // minutes

        setSessionInfo({
          hasSession: true,
          userEmail: session.user.email || null,
          expiresAt: expiresAt.toLocaleString(),
          timeToExpiry: `${timeToExpiry} minutes`,
          refreshToken: !!session.refresh_token
        })
      } else {
        setSessionInfo({
          hasSession: false,
          userEmail: null,
          expiresAt: null,
          timeToExpiry: null,
          refreshToken: false
        })
      }
    } catch (error) {
      console.error('Error getting session info:', error)
    }
  }

  useEffect(() => {
    updateSessionInfo()
    const interval = setInterval(updateSessionInfo, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleRefreshSession = async () => {
    try {
      await refreshSession()
      updateSessionInfo()
    } catch (error) {
      console.error('Session refresh failed:', error)
    }
  }

  // Only show in development and for real auth
  if (process.env.NODE_ENV === 'production' || USE_MOCK_AUTH) {
    return null
  }

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed top-4 right-20 z-50">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-blue-600 text-white p-2 rounded-lg text-xs font-mono shadow-lg hover:bg-blue-700 transition"
          title="Session Debug Info"
        >
          🔍 Session
        </button>
      </div>

      {/* Debug Panel */}
      {isVisible && (
        <div className="fixed top-16 right-4 bg-white border shadow-lg rounded-lg p-4 z-50 w-80 text-sm font-mono">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-blue-600">Session Debug</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600">Auth Mode:</span>
              <span className="font-semibold text-green-600">Real Supabase</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600">Authenticated:</span>
              <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {isAuthenticated ? '✅ Yes' : '❌ No'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600">User:</span>
              <span className="font-semibold truncate">
                {user?.email || 'None'}
              </span>
            </div>

            {sessionInfo && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-600">Has Session:</span>
                  <span className={sessionInfo.hasSession ? 'text-green-600' : 'text-red-600'}>
                    {sessionInfo.hasSession ? '✅ Yes' : '❌ No'}
                  </span>
                </div>

                {sessionInfo.hasSession && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-gray-600">Expires:</span>
                      <span className="font-semibold text-orange-600">
                        {sessionInfo.timeToExpiry}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-gray-600">Expires At:</span>
                      <span className="text-xs text-gray-500 break-words">
                        {sessionInfo.expiresAt}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-gray-600">Refresh Token:</span>
                      <span className={sessionInfo.refreshToken ? 'text-green-600' : 'text-red-600'}>
                        {sessionInfo.refreshToken ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={updateSessionInfo}
              className="w-full bg-blue-100 text-blue-700 px-3 py-2 rounded text-xs hover:bg-blue-200 transition"
            >
              🔄 Refresh Info
            </button>

            <button
              onClick={handleRefreshSession}
              className="w-full bg-green-100 text-green-700 px-3 py-2 rounded text-xs hover:bg-green-200 transition"
            >
              🔑 Refresh Session
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            Updates every 30s
          </div>
        </div>
      )}
    </>
  )
}