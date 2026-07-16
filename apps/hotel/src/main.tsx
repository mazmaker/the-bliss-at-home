// Hotel portal entry point — v2026-03-15
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@bliss/supabase/auth'
import App from './App'
import './index.css'
import { startVersionGate } from './utils/versionGate'

// Auto cache-bust: detect a newer deployed bundle (on cold-load + resume) and reload to it, so users
// stop running a stale cached build after a deploy. Inert in dev. See utils/versionGate.ts.
startVersionGate()

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
      <BrowserRouter>
        <AuthProvider expectedRole="HOTEL">
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
// cache bust 1775203554

// force prod build 2026-06-21 (B4/B6/B7 — ignore-step cache-bust)
