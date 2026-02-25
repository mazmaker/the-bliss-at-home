import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@bliss/ui'
import { useAuth } from '@bliss/supabase/auth'
import { Toaster } from 'react-hot-toast'
import HotelLayout from './layouts/HotelLayout'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import BookingHistory from './pages/BookingHistory'
import MonthlyBill from './pages/MonthlyBill'
import HotelProfile from './pages/HotelProfile'
import HotelSettings from './pages/HotelSettings'
import { EnhancedHotelLogin } from './pages/auth'
import DynamicHotelRedirect from './components/DynamicHotelRedirect'

function App() {
  const { isLoading, isAuthenticated } = useAuth()

  // Don't show loading screen during login attempts - this unmounts the entire route tree!
  // Only show loading screen during initial app load
  const [initialLoad, setInitialLoad] = React.useState(true)

  React.useEffect(() => {
    if (!isLoading) {
      setInitialLoad(false)
    }
  }, [isLoading])

  if (isLoading && initialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* Public login route */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <DynamicHotelRedirect />
            ) : (
              <EnhancedHotelLogin />
            )
          }
        />

        {/* Protected hotel routes with hotel slug parameter - require HOTEL role */}
        <Route
          path="/hotel/:hotelSlug"
          element={
            <ProtectedRoute allowedRoles={['HOTEL']} redirectTo="/login">
              <HotelLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="bookings" element={<Dashboard />} />
          <Route path="services" element={<Services />} />
          <Route path="history" element={<BookingHistory />} />
          <Route path="bill" element={<MonthlyBill />} />
          <Route path="profile" element={<HotelProfile />} />
          <Route path="settings" element={<HotelSettings />} />
        </Route>

        {/* Default redirects */}
        <Route path="/hotel" element={<DynamicHotelRedirect />} />
        <Route path="/" element={
          isAuthenticated ? (
            <DynamicHotelRedirect />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            fontSize: '14px',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e5e7eb',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #10b981',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #ef4444',
            },
          },
          loading: {
            iconTheme: {
              primary: '#f59e0b',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #f59e0b',
            },
          },
        }}
      />
    </>
  )
}

export default App
