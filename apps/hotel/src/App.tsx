import { Routes, Route, Navigate } from 'react-router-dom'
// import { ProtectedRoute } from '@bliss/ui'
// import { useAuth } from '@bliss/supabase/auth'
import HotelLayout from './layouts/HotelLayout'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import BookForGuest from './pages/BookForGuest'
import GuestBookings from './pages/GuestBookings'
import BookingHistory from './pages/BookingHistory'
import MonthlyBill from './pages/MonthlyBill'
import HotelProfile from './pages/HotelProfile'
import HotelSettings from './pages/HotelSettings'
// import { HotelLoginPage } from './pages/auth'

function App() {
  // Temporarily disable authentication for development
  // const { isLoading, isAuthenticated } = useAuth()

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
  //     </div>
  //   )
  // }

  return (
    <Routes>
      {/* Public login route (disabled for now) */}
      <Route
        path="/hotel/login"
        element={<Navigate to="/hotel" replace />}
      />

      {/* Hotel routes with hotel ID parameter */}
      <Route path="/hotel/:hotelId" element={<HotelLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="bookings" element={<Dashboard />} />
        <Route path="services" element={<Services />} />
        <Route path="book" element={<BookForGuest />} />
        <Route path="guests" element={<GuestBookings />} />
        <Route path="history" element={<BookingHistory />} />
        <Route path="bill" element={<MonthlyBill />} />
        <Route path="profile" element={<HotelProfile />} />
        <Route path="settings" element={<HotelSettings />} />
      </Route>

      {/* Default redirects */}
      <Route path="/hotel" element={
        <Navigate to="/hotel/550e8400-e29b-41d4-a716-446655440002" replace />
      } />
      <Route path="/" element={
        <Navigate to="/hotel/550e8400-e29b-41d4-a716-446655440002" replace />
      } />
    </Routes>
  )
}

export default App
