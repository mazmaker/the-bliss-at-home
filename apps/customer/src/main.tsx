// Build: 2026-04-08a — WebView OAuth fix
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, initSessionManager } from '@bliss/supabase/auth'
import { I18nProvider } from '@bliss/i18n'
import App from './App'
import './index.css'
import { startVersionGate } from './utils/versionGate'

// Auto cache-bust: detect a newer deployed bundle (on cold-load + resume) and reload to it, so users
// stop running a stale cached build after a deploy. Inert in dev. See utils/versionGate.ts.
startVersionGate()

// Initialize session manager for "Remember Me" functionality
initSessionManager()

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
      <I18nProvider>
        <BrowserRouter>
          <AuthProvider expectedRole="CUSTOMER">
            <App />
          </AuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
// build trigger 1774320818
