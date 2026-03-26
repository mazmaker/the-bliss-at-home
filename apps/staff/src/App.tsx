import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { ProtectedRoute } from '@bliss/ui'
import { useAuth } from '@bliss/supabase/auth'
import toast, { Toaster } from 'react-hot-toast'
import StaffLayout from './layouts/StaffLayout'
import StaffDashboard from './pages/StaffDashboard'
import StaffJobDetail from './pages/StaffJobDetail'
import StaffSchedule from './pages/StaffSchedule'
import StaffHistory from './pages/StaffHistory'
import StaffEarnings from './pages/StaffEarnings'
import StaffProfile from './pages/StaffProfile'
import StaffSettings from './pages/StaffSettings'
import { StaffLoginPage, StaffRegisterPage, StaffAuthCallback } from './pages/auth'

// Helper: check if a path is a valid deep link target (not login/auth pages)
function isValidDeepLink(path: string | null): boolean {
  if (!path) return false
  if (!path.startsWith('/staff/')) return false
  if (path.startsWith('/staff/login')) return false
  if (path.startsWith('/staff/auth')) return false
  if (path.startsWith('/staff/callback')) return false
  if (path.startsWith('/staff/register')) return false
  return true
}

/**
 * Handle LIFF deep link: liff.state query param contains the target path
 * Only saves valid deep links and never overwrites an existing valid one.
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

      // Only save if it's a valid deep link and doesn't overwrite an existing valid one
      if (isValidDeepLink(liffState) && !isValidDeepLink(localStorage.getItem('staff_redirect_after_login'))) {
        localStorage.setItem('staff_redirect_after_login', liffState)
      }

      const isLiffCallback = params.has('liffClientId') || params.has('code')
      if (isLiffCallback) return

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
    <>
    <Routes>
      {/* Public login route */}
      <Route
        path="/staff/login"
        element={
          (() => {
            const urlParams = new URLSearchParams(window.location.search)
            const isLiffCallback = urlParams.has('liffClientId') && urlParams.has('liffRedirectUri')

            if (isLiffCallback) {
              return <StaffAuthCallback />
            }

            // Save liff.state if it's a valid deep link and doesn't overwrite existing valid one
            const liffState = urlParams.get('liff.state')
            if (isValidDeepLink(liffState) && !isValidDeepLink(localStorage.getItem('staff_redirect_after_login'))) {
              localStorage.setItem('staff_redirect_after_login', liffState!)
            }

            // If already authenticated, redirect to deep link path or dashboard
            if (isAuthenticated) {
              const savedPath = localStorage.getItem('staff_redirect_after_login')
              if (savedPath) {
                return <Navigate to={savedPath} replace />
              }
              return <Navigate to="/staff/jobs" replace />
            }

            return <StaffLoginPage />
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
        <Route path="notifications" element={<Navigate to="/staff" replace />} />
      </Route>

      {/* Default redirect - handle LIFF callback at root (LIFF Endpoint URL) */}
      <Route path="/" element={
        (() => {
          const params = new URLSearchParams(window.location.search)
          const isLiffCallback = params.has('liffClientId') || params.has('code')
          if (isLiffCallback) {
            return <StaffAuthCallback />
          }

          const liffState = params.get('liff.state')
          if (liffState && liffState.startsWith('/')) {
            if (isValidDeepLink(liffState) && !isValidDeepLink(localStorage.getItem('staff_redirect_after_login'))) {
              localStorage.setItem('staff_redirect_after_login', liffState)
            }
            return <Navigate to={liffState} replace />
          }

          return <Navigate to="/staff" replace />
        })()
      } />

      {/* Catch-all: handle LIFF secondary redirect URLs */}
      <Route path="*" element={
        (() => {
          const pathname = window.location.pathname
          if (pathname.startsWith('/staff/login/staff/')) {
            const deepLink = pathname.substring('/staff/login'.length)
            localStorage.setItem('staff_redirect_after_login', deepLink)
            return <Navigate to="/staff/login" replace />
          }
          return <Navigate to="/staff" replace />
        })()
      } />
    </Routes>

    {/* Toast notifications for extend session */}
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 6000,
        style: {
          background: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fcd34d',
          borderRadius: '12px',
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: '#f59e0b',
            secondary: '#fff',
          },
        },
      }}
    />
    </>
  )
}

export default App
