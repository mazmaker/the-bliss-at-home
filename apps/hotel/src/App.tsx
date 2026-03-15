import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@bliss/ui'
import { useAuth } from '@bliss/supabase/auth'
import HotelLayout from './layouts/HotelLayout'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import BookForGuest from './pages/BookForGuest'
import GuestBookings from './pages/GuestBookings'
import BookingHistory from './pages/BookingHistory'
import MonthlyBill from './pages/MonthlyBill'
import HotelProfile from './pages/HotelProfile'
import HotelSettings from './pages/HotelSettings'
import { HotelLoginPage } from './pages/auth'

function App() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public login route */}
      <Route
        path="/hotel/login"
        element={
          isAuthenticated ? (
            <Navigate to="/hotel/resort-chiang-mai" replace />
          ) : (
            <HotelLoginPage />
          )
        }
      />

      {/* Protected hotel routes with dynamic slug - require HOTEL role */}
      <Route
        path="/hotel/:hotelSlug"
        element={
          <ProtectedRoute allowedRoles={['HOTEL']} redirectTo="/hotel/login">
            <HotelLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="services" element={<Services />} />
        <Route path="book" element={<BookForGuest />} />
        <Route path="guests" element={<GuestBookings />} />
        <Route path="history" element={<BookingHistory />} />
        <Route path="bill" element={<MonthlyBill />} />
        <Route path="profile" element={<HotelProfile />} />
        <Route path="settings" element={<HotelSettings />} />
      </Route>

      {/* Legacy routes - redirect to slug-based routing */}
      <Route
        path="/hotel"
        element={<Navigate to="/hotel/resort-chiang-mai" replace />}
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/hotel/resort-chiang-mai" replace />} />
    </Routes>
  )
}

export default App
