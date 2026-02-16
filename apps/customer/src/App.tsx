import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useTranslation } from '@bliss/i18n'
import { ProtectedRoute } from '@bliss/ui'
import Header from './components/Header'
import './debug-session' // Load debug utilities
import HomePage from './pages/Home'
import ServiceCatalog from './pages/ServiceCatalog'
import ServiceDetails from './pages/ServiceDetails'
import BookingWizard from './pages/BookingWizard'
import BookingHistory from './pages/BookingHistory'
import BookingDetails from './pages/BookingDetails'
import Profile from './pages/Profile'
import ColorPalette from './pages/ColorPalette'
import Register from './pages/Register'
import PaymentConfirmation from './pages/PaymentConfirmation'
import TransactionHistory from './pages/TransactionHistory'
import OTPVerification from './pages/OTPVerification'
import TermsPage from './pages/Terms'
import PrivacyPage from './pages/Privacy'
import { CustomerLoginPage, AuthCallback } from './pages/auth'

function App() {
  const { t } = useTranslation('common')
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      <Toaster position="top-right" />
      <Routes>
        {/* Public routes - Login only */}
        <Route path="/login" element={<CustomerLoginPageWrapper />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/design-system" element={<ColorPalette />} />

        {/* Public routes - accessible without login */}
        <Route path="/" element={<HomePageWrapper />} />
        <Route path="/services" element={<ServiceCatalogWrapper />} />
        <Route path="/services/:slug" element={<ServiceDetailsWrapper />} />

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
        <Route
          path="/verify-otp"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']} redirectTo="/login">
              <OTPVerificationWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/confirmation"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']} redirectTo="/login">
              <PaymentConfirmationWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']} redirectTo="/login">
              <TransactionHistoryWrapper />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-stone-200 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500 text-sm pt-4">
            <p>{t('footer.copyright')}</p>
            <div className="flex justify-center gap-4 mt-4">
              <Link to="/terms" className="hover:text-amber-700 transition font-medium">
                {t('footer.terms')}
              </Link>
              <span>|</span>
              <Link to="/privacy" className="hover:text-amber-700 transition font-medium">
                {t('footer.privacy')}
              </Link>
              <span>|</span>
              <a href="mailto:support@theblissathome.com" className="hover:text-amber-700 transition font-medium">
                {t('footer.contact')}
              </a>
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

function HomePageWrapper() {
  return (
    <>
      <Header />
      <HomePage />
    </>
  )
}

function ServiceCatalogWrapper() {
  return (
    <>
      <Header />
      <ServiceCatalog />
    </>
  )
}

function ServiceDetailsWrapper() {
  return (
    <>
      <Header />
      <ServiceDetails />
    </>
  )
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

function OTPVerificationWrapper() {
  return (
    <>
      <Header />
      <OTPVerification />
    </>
  )
}

function PaymentConfirmationWrapper() {
  return (
    <>
      <Header />
      <PaymentConfirmation />
    </>
  )
}

function TransactionHistoryWrapper() {
  return (
    <>
      <Header />
      <TransactionHistory />
    </>
  )
}

export default App
