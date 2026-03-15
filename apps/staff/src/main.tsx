// Build: 2026-03-15
// Capture deep link path before any imports run — LIFF SDK may modify URL on import
const _initialUrl = window.location.href
const _initialSearch = window.location.search
try {
  const _params = new URLSearchParams(_initialSearch)
  let _deepLink: string | null = null

  // Strategy 1: Direct liff.state
  const _liffState = _params.get('liff.state')
  if (_liffState && _liffState.startsWith('/')) _deepLink = _liffState

  // Strategy 2: Extract from liffRedirectUri
  if (!_deepLink) {
    const _redir = _params.get('liffRedirectUri')
    if (_redir) {
      try {
        const _u = new URL(decodeURIComponent(_redir))
        const _s = _u.searchParams.get('liff.state')
        if (_s && _s.startsWith('/')) _deepLink = _s
      } catch(e2) {}
    }
  }

  // Strategy 3: Extract from URL pathname (LIFF secondary redirect URL format)
  if (!_deepLink) {
    const _pathname = new URL(_initialUrl).pathname
    if (_pathname.startsWith('/staff/login/staff/')) {
      _deepLink = _pathname.substring('/staff/login'.length)
    }
  }

  // Strategy 4: Direct deep link path — LIFF SDK may navigate directly to the deep link URL
  if (!_deepLink) {
    const _pathname = new URL(_initialUrl).pathname
    const _segments = _pathname.split('/').filter(Boolean)
    if (_segments.length >= 3 && _segments[0] === 'staff' &&
        !_pathname.startsWith('/staff/login') && !_pathname.startsWith('/staff/auth') &&
        !_pathname.startsWith('/staff/callback') && !_pathname.startsWith('/staff/register')) {
      _deepLink = _pathname
    }
  }

  if (_deepLink && !_deepLink.startsWith('/staff/login') && !_deepLink.startsWith('/staff/callback')) {
    localStorage.setItem('staff_redirect_after_login', _deepLink)
  }

} catch(e) {}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@bliss/supabase/auth'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider expectedRole="STAFF">
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
