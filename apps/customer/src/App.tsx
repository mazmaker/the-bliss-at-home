import { useState } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useTranslation } from '@bliss/i18n'
import { ProtectedRoute } from '@bliss/ui'
import { useAuth } from '@bliss/supabase/auth'
import Header from './components/Header'
import { RefundPolicyConsent, useRefundPolicyConsent } from './components/RefundPolicyConsent'
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
import Notifications from './pages/Notifications'
import OTPVerification from './pages/OTPVerification'
import TermsPage from './pages/Terms'
import PrivacyPage from './pages/Privacy'
import PromotionsPage from './pages/Promotions'
import { CustomerLoginPage, AuthCallback, ResetPasswordPage } from './pages/auth'

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
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/design-system" element={<ColorPalette />} />

        {/* Public routes - accessible without login */}
        <Route path="/" element={<HomePageWrapper />} />
        <Route path="/services" element={<ServiceCatalogWrapper />} />
        <Route path="/services/:slug" element={<ServiceDetailsWrapper />} />
        <Route path="/promotions" element={<PromotionsPageWrapper />} />
        <Route path="/promotions/:id" element={<PromotionsPageWrapper />} />

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

        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']} redirectTo="/login">
              <NotificationsWrapper />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Consent Modal for Google login users */}
      <ConsentModalGuard />

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

function PromotionsPageWrapper() {
  return (
    <>
      <Header />
      <PromotionsPage />
    </>
  )
}

function BookingWizardWrapper() {
  const { hasAccepted, isLoading, recheckConsent } = useRefundPolicyConsent()
  const [showConsentModal, setShowConsentModal] = useState(false)

  // Show consent modal if not accepted
  if (!isLoading && hasAccepted === false && !showConsentModal) {
    setShowConsentModal(true)
  }

  return (
    <>
      <Header />
      {showConsentModal && (
        <RefundPolicyConsent
          asModal
          onAccept={() => {
            setShowConsentModal(false)
            recheckConsent()
          }}
        />
      )}
      {!showConsentModal && <BookingWizard />}
    </>
  )
}

/**
 * Global consent modal — shows after login for users who haven't accepted refund policy
 */
function ConsentModalGuard() {
  const { user } = useAuth()
  const { hasAccepted, isLoading, recheckConsent } = useRefundPolicyConsent()

  if (!user || isLoading || hasAccepted !== false) return null

  return (
    <RefundPolicyConsent
      asModal
      onAccept={() => recheckConsent()}
    />
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

function NotificationsWrapper() {
  return (
    <>
      <Header />
      <Notifications />
    </>
  )
}

export default App
