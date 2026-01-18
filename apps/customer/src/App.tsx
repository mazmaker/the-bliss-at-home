import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@bliss/ui'
import Header from './components/Header'
import HomePage from './pages/Home'
import ServiceCatalog from './pages/ServiceCatalog'
import ServiceDetails from './pages/ServiceDetails'
import BookingWizard from './pages/BookingWizard'
import BookingHistory from './pages/BookingHistory'
import BookingDetails from './pages/BookingDetails'
import Profile from './pages/Profile'
import ColorPalette from './pages/ColorPalette'
import { CustomerLoginPage } from './pages/auth'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<CustomerLoginPageWrapper />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServiceCatalog />} />
        <Route path="/services/:slug" element={<ServiceDetails />} />
        <Route path="/design-system" element={<ColorPalette />} />

        {/* Protected routes - require CUSTOMER role */}
        <Route
          path="/booking"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']} redirectTo="/login">
              <BookingWizardWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']} redirectTo="/login">
              <BookingHistoryWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']} redirectTo="/login">
              <BookingDetailsWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']} redirectTo="/login">
              <ProfileWrapper />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-stone-200 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500 text-sm">
            <p>© 2026 The Bliss at Home. All rights reserved.</p>
            <div className="flex justify-center gap-4 mt-4">
              <a href="#" className="hover:text-amber-700 transition">Terms of Service</a>
              <span>|</span>
              <a href="#" className="hover:text-amber-700 transition">Privacy Policy</a>
              <span>|</span>
              <a href="#" className="hover:text-amber-700 transition">Contact Us</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Wrapper components to include Header
function CustomerLoginPageWrapper() {
  return <CustomerLoginPage />
}

function BookingWizardWrapper() {
  return (
    <>
      <Header />
      <BookingWizard />
    </>
  )
}

function BookingHistoryWrapper() {
  return (
    <>
      <Header />
      <BookingHistory />
    </>
  )
}

function BookingDetailsWrapper() {
  return (
    <>
      <Header />
      <BookingDetails />
    </>
  )
}

function ProfileWrapper() {
  return (
    <>
      <Header />
      <Profile />
    </>
  )
}

export default App
