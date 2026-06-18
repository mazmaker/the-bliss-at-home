// Build cache bust: 2026-05-29 payout cycles deployment force
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@bliss/supabase/auth'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// Create TanStack Query client - Enhanced for payout features
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Optimized for payout dashboard
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Temporarily disable Strict Mode to test focus loss issue
  // <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider expectedRole="ADMIN">
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10B981',
              },
            },
            error: {
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  // </React.StrictMode>,
)
// cache bust 1775203554
// Force admin deployment - enhanced payout features Fri May 29 17:48:00 +07 2026
// cache bust: deploy d5674a7 (BookingCancellationModal /api path fix) under F-2 — 2026-06-16
// cache bust: force admin deploy of 3478022 (/admin/staff "พร้อมรับงาน" count) — merge 84b369e's Ignored Build Step skipped admin — 2026-06-18
// cache bust #2: parent is now a non-merge commit so Ignored Build Step's `git diff HEAD~1 HEAD -- apps/admin` sees the change — 2026-06-18
