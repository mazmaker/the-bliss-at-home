import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { ProtectedRoute } from '@bliss/ui'
import { useAuth } from '@bliss/supabase/auth'

// TEMPORARY DEBUG: Track deep link flow - remove after debugging
function debugLog(step: string, data?: any) {
  const logs = JSON.parse(localStorage.getItem('_debug_liff_log') || '[]')
  logs.push({ t: Date.now(), step, data, url: window.location.href })
  // Keep last 20 entries
  if (logs.length > 20) logs.splice(0, logs.length - 20)
  localStorage.setItem('_debug_liff_log', JSON.stringify(logs))
}

// TEMPORARY: Debug overlay component
function DebugOverlay() {
  const [show, setShow] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  useEffect(() => {
    const stored = localStorage.getItem('_debug_liff_log')
    if (stored) setLogs(JSON.parse(stored))
  }, [show])
  const savedPath = localStorage.getItem('staff_redirect_after_login')
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999 }}>
      {!show ? (
        <button onClick={() => setShow(true)} style={{ background: '#f59e0b', color: '#fff', padding: '4px 12px', fontSize: '11px', borderRadius: '8px 8px 0 0', border: 'none' }}>
          DEBUG (saved: {savedPath || 'none'})
        </button>
      ) : (
        <div style={{ background: '#1e293b', color: '#e2e8f0', padding: '8px', maxHeight: '50vh', overflow: 'auto', fontSize: '10px', fontFamily: 'monospace' }}>
          <button onClick={() => setShow(false)} style={{ float: 'right', background: '#ef4444', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>Close</button>
          <button onClick={() => { localStorage.removeItem('_debug_liff_log'); setLogs([]) }} style={{ float: 'right', background: '#6b7280', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', marginRight: '4px' }}>Clear</button>
          <div style={{ marginBottom: '4px', color: '#fbbf24' }}>saved_path: {savedPath || 'NULL'}</div>
          <div style={{ marginBottom: '4px', color: '#fbbf24' }}>current_url: {window.location.href}</div>
          <hr style={{ borderColor: '#475569', margin: '4px 0' }} />
          {logs.map((l, i) => (
            <div key={i} style={{ marginBottom: '2px', borderBottom: '1px solid #334155', paddingBottom: '2px' }}>
              <span style={{ color: '#38bdf8' }}>{new Date(l.t).toLocaleTimeString()}</span>{' '}
              <span style={{ color: '#4ade80' }}>{l.step}</span>{' '}
              {l.data && <span style={{ color: '#cbd5e1' }}>{JSON.stringify(l.data)}</span>}
              <div style={{ color: '#64748b', fontSize: '9px' }}>{l.url}</div>
            </div>
          ))}
          {logs.length === 0 && <div style={{ color: '#64748b' }}>No logs yet</div>}
        </div>
      )}
    </div>
  )
}
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
    debugLog('useLiffStateRedirect', { liffState, search: window.location.search, path: window.location.pathname })
    if (liffState && liffState.startsWith('/')) {
      handled.current = true

      localStorage.setItem('staff_redirect_after_login', liffState)
      debugLog('SAVED_PATH', { liffState, source: 'useLiffStateRedirect' })

      const isLiffCallback = params.has('liffClientId') || params.has('code')
      if (isLiffCallback) {
        debugLog('SKIP_NAV_CALLBACK', { liffState })
        return
      }

      params.delete('liff.state')
      const cleanSearch = params.toString()
      const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '')
      window.history.replaceState({}, '', cleanUrl)

      debugLog('NAVIGATE_TO', { liffState })
      navigate(liffState, { replace: true })
    }
  }, [location.search, navigate, isAuthenticated])
}

function App() {
  const { isLoading, isAuthenticated } = useAuth()
  useLiffStateRedirect()

  // TEMPORARY: Log initial URL on every render
  debugLog('APP_RENDER', { isLoading, isAuthenticated, path: window.location.pathname, search: window.location.search })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        <DebugOverlay />
      </div>
    )
  }

  return (
    <>
    <DebugOverlay />
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

            // Save liff.state before any Navigate strips query params
            const liffState = urlParams.get('liff.state')
            if (liffState && liffState.startsWith('/')) {
              localStorage.setItem('staff_redirect_after_login', liffState)
            }

            // If already authenticated, redirect to deep link path or dashboard
            if (isAuthenticated) {
              const savedPath = localStorage.getItem('staff_redirect_after_login')
              if (savedPath) {
                localStorage.removeItem('staff_redirect_after_login')
                return <Navigate to={savedPath} replace />
              }
              return <Navigate to="/staff/jobs" replace />
            }

            // Normal login page (liff.state already saved to localStorage above)
            return (
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
          debugLog('ROOT_IIFE', { isLiffCallback, search: window.location.search, liffState: params.get('liff.state') })
          if (isLiffCallback) {
            return <StaffAuthCallback />
          }

          const liffState = params.get('liff.state')
          if (liffState && liffState.startsWith('/')) {
            localStorage.setItem('staff_redirect_after_login', liffState)
            debugLog('ROOT_SAVE_NAV', { liffState })
            return <Navigate to={liffState} replace />
          }

          return <Navigate to="/staff" replace />
        })()
      } />
    </Routes>
    </>
  )
}

export default App
