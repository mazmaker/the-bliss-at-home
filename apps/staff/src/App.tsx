import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { ProtectedRoute } from '@bliss/ui'
import { useAuth } from '@bliss/supabase/auth'
import StaffLayout from './layouts/StaffLayout'
import StaffDashboard from './pages/StaffDashboard'
import StaffJobDetail from './pages/StaffJobDetail'
import StaffSchedule from './pages/StaffSchedule'
import StaffHistory from './pages/StaffHistory'
import StaffEarnings from './pages/StaffEarnings'
import StaffProfile from './pages/StaffProfile'
import StaffSettings from './pages/StaffSettings'
import { StaffLoginPage, StaffRegisterPage, StaffAuthCallback } from './pages/auth'

/**
 * Handle LIFF deep link: liff.state query param contains the target path
 * e.g. ?liff.state=%2Fstaff%2Fjobs%2Fxxx → navigate to /staff/jobs/xxx
 *
 * If user is not authenticated, saves path to sessionStorage so Login.tsx
 * can redirect there after successful login (prevents infinite loop).
 */
function useLiffStateRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    const params = new URLSearchParams(window.location.search)
    const liffState = params.get('liff.state')
    if (liffState && liffState.startsWith('/')) {
      handled.current = true

      // Always save the deep link path so login/callback can restore it
      sessionStorage.setItem('staff_redirect_after_login', liffState)

      // If LIFF callback params are present (code, liffClientId), do NOT navigate.
      // The callback handler at "/" must process the auth code first.
      // After auth completes, it will redirect to the saved path.
      const isLiffCallback = params.has('liffClientId') || params.has('code')
      if (isLiffCallback) {
        console.log('[LiffState] LIFF callback detected, saving deep link path but NOT navigating:', liffState)
        return
      }

      // No callback params — safe to navigate to the deep link path
      params.delete('liff.state')
      const cleanSearch = params.toString()
      const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '')
      window.history.replaceState({}, '', cleanUrl)

      navigate(liffState, { replace: true })
    }
  }, [location.search, navigate, isAuthenticated])
}

function App() {
  const { isLoading, isAuthenticated } = useAuth()
  useLiffStateRedirect()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public login route */}
      <Route
        path="/staff/login"
        element={
          (() => {
            // Check if this is a LIFF callback (has liffClientId and liffRedirectUri params)
            const urlParams = new URLSearchParams(window.location.search)
            const isLiffCallback = urlParams.has('liffClientId') && urlParams.has('liffRedirectUri')

            if (isLiffCallback) {
              // This is a LIFF callback, use Callback component
              return <StaffAuthCallback />
            }

            // Normal login page
            return isAuthenticated ? (
              <Navigate to="/staff/jobs" replace />
            ) : (
              <StaffLoginPage />
            )
          })()
        }
      />

      {/* Public register route */}
      <Route
        path="/staff/register"
        element={
          isAuthenticated ? (
            <Navigate to="/staff/jobs" replace />
          ) : (
            <StaffRegisterPage />
          )
        }
      />

      {/* OAuth Callback route */}
      <Route path="/staff/auth/callback" element={<StaffAuthCallback />} />

      {/* LIFF Callback route */}
      <Route path="/staff/callback" element={<StaffAuthCallback />} />

      {/* Protected staff routes - require STAFF role */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={['STAFF']} redirectTo="/staff/login">
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffDashboard />} />
        <Route path="jobs" element={<StaffDashboard />} />
        <Route path="jobs/:id" element={<StaffJobDetail />} />
        <Route path="schedule" element={<StaffSchedule />} />
        <Route path="history" element={<StaffHistory />} />
        <Route path="earnings" element={<StaffEarnings />} />
        <Route path="profile" element={<StaffProfile />} />
        <Route path="settings" element={<StaffSettings />} />
        {/* Notifications is handled via panel in header, redirect to dashboard */}
        <Route path="notifications" element={<Navigate to="/staff" replace />} />
      </Route>

      {/* Default redirect - handle LIFF callback at root (LIFF Endpoint URL) */}
      <Route path="/" element={
        (() => {
          const params = new URLSearchParams(window.location.search)
          const isLiffCallback = params.has('liffClientId') || params.has('code')
          if (isLiffCallback) {
            // Render callback handler directly at root URL so liff.init()
            // can process the OAuth code on the LIFF Endpoint URL
            return <StaffAuthCallback />
          }
          return <Navigate to="/staff" replace />
        })()
      } />
    </Routes>
  )
}

export default App
