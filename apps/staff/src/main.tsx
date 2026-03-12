// Build: 2026-03-12
// Capture the FULL initial URL before any imports run — LIFF SDK may modify URL on import
const _initialUrl = window.location.href
const _initialSearch = window.location.search
// Save liff.state if present (backup — index.html also tries to capture it)
try {
  const _params = new URLSearchParams(_initialSearch)
  const _liffState = _params.get('liff.state')
  if (_liffState && _liffState.startsWith('/')) {
    localStorage.setItem('staff_redirect_after_login', _liffState)
  }
  // Always log the initial URL for debugging
  const _logs = JSON.parse(localStorage.getItem('_debug_liff_log') || '[]')
  _logs.push({ t: Date.now(), step: 'MAIN_TSX_INIT', data: { initialUrl: _initialUrl, liffState: _liffState, search: _initialSearch }, url: _initialUrl })
  if (_logs.length > 20) _logs.splice(0, _logs.length - 20)
  localStorage.setItem('_debug_liff_log', JSON.stringify(_logs))
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
