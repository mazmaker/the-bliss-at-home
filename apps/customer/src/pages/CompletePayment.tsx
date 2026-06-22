/**
 * Complete Payment Page
 * Allows customers to complete payment for pending bookings
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, CreditCard, AlertTriangle, QrCode } from 'lucide-react'
import { useBookingByNumber } from '@bliss/supabase/hooks/useBookings'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import { supabase } from '@bliss/supabase/auth'
import PaymentForm from '../components/PaymentForm'
import { useTranslation } from '@bliss/i18n'

function CompletePayment() {
  const { t } = useTranslation(['booking', 'common'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: bookingData, isLoading: bookingLoading, error: bookingError } = useBookingByNumber(id)
  const { data: customer } = useCurrentCustomer()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // [R1] Admin-controlled payment-channel allowlist (default = PromptPay only).
  const [enabledChannels, setEnabledChannels] = useState<string[]>(['promptpay'])
  const [promptpayQR, setPromptpayQR] = useState<string | null>(null)
  const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')

  useEffect(() => {
    fetch(`${apiBase}/api/payments/enabled-channels`)
      .then(r => r.json())
      .then(d => { if (d?.success && Array.isArray(d.channels) && d.channels.length > 0) setEnabledChannels(d.channels) })
      .catch(err => console.error('Failed to fetch enabled payment channels:', err))
  }, [])

  const cardEnabled = enabledChannels.includes('credit_card')
  const promptpayEnabled = enabledChannels.includes('promptpay')

  const pollPromptPayStatus = (chargeId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/payments/status/${chargeId}`)
        const data = await res.json()
        if (data.status === 'successful') {
          clearInterval(pollInterval)
          navigate(`/bookings/${bookingData?.booking_number}?payment=success`)
        } else if (data.status === 'failed') {
          clearInterval(pollInterval)
          setIsProcessing(false)
          setError(t('booking:payment.failed'))
          setPromptpayQR(null)
        }
      } catch (err) {
        console.error('Error polling payment status:', err)
      }
    }, 3000)
    setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000)
  }

  const handlePayWithPromptPay = async () => {
    if (!customer || !bookingData) return
    setIsProcessing(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/payments/create-source`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          booking_id: bookingData.id,
          customer_id: customer.id,
          amount: bookingData.final_price || 0,
          source_type: 'promptpay',
          payment_method: 'promptpay',
        }),
      })
      const data = await res.json()
      if (data.success && data.qr_code_url) {
        setPromptpayQR(data.qr_code_url)
        pollPromptPayStatus(data.charge_id)
      } else {
        throw new Error(data.error || t('booking:payment.qrGenerationFailed'))
      }
    } catch (err: any) {
      console.error('PromptPay payment error:', err)
      setError(err.message || t('booking:payment.errorGeneric'))
      setIsProcessing(false)
    }
  }

  // Redirect if booking not found or payment already completed
  useEffect(() => {
    if (bookingData) {
      if (bookingData.payment_status === 'paid') {
        navigate(`/bookings/${bookingData.booking_number}`)
        return
      }
      if (bookingData.status === 'cancelled') {
        navigate(`/bookings/${bookingData.booking_number}`)
        return
      }
    }
  }, [bookingData, navigate])

  const handlePaymentSuccess = () => {
    navigate(`/bookings/${bookingData?.booking_number}?payment=success`)
  }

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
    setIsProcessing(false)
  }

  if (bookingLoading) {
    return (
      <div className="min-h-screen bg-bliss-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bliss-600"></div>
      </div>
    )
  }

  if (bookingError || !bookingData) {
    return (
      <div className="min-h-screen bg-bliss-100 flex items-center justify-center p-4">
        <div className="bg-bliss-50 rounded-xl p-6 text-center max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-bliss-900 mb-2">{t('booking:bookingNotFound.title')}</h1>
          <p className="text-bliss-700 mb-4">{t('booking:bookingNotFound.message')}</p>
          <Link
            to="/bookings"
            className="text-bliss-600 hover:text-bliss-700 font-medium"
          >
            {t('common:backToBookings')}
          </Link>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-bliss-100 flex items-center justify-center p-4">
        <div className="bg-bliss-50 rounded-xl p-6 text-center max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-bliss-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-bliss-900 mb-2">{t('auth:signInRequired.title')}</h1>
          <p className="text-bliss-700 mb-4">{t('auth:signInRequired.message')}</p>
          <Link
            to="/auth/signin"
            className="text-bliss-600 hover:text-bliss-700 font-medium"
          >
            {t('auth:signIn')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bliss-100">
      {/* Header */}
      <div className="bg-bliss-50 border-b border-bliss-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-bliss-700 hover:text-bliss-900 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-bliss-900">{t('booking:payment.pageTitle')}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* Booking Summary */}
        <div className="bg-bliss-50 rounded-xl p-6 mb-6 border border-bliss-200">
          <h2 className="text-lg font-semibold text-bliss-900 mb-4">{t('booking:bookingSummary.title')}</h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-bliss-700">{t('booking:bookingSummary.bookingNumber')}</span>
              <span className="font-medium">{bookingData.booking_number}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-bliss-700">{t('services:service.label')}</span>
              <span className="font-medium">{bookingData.service?.name_th}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-bliss-700">{t('booking:bookingSummary.date')}</span>
              <span className="font-medium">
                {new Date(bookingData.booking_date).toLocaleDateString('th-TH')} {bookingData.booking_time}
              </span>
            </div>

            <div className="border-t border-bliss-200 pt-3 mt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>{t('booking:bookingSummary.amount')}</span>
                <span className="text-bliss-600">฿{bookingData.final_price?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form — gated by the admin payment-channel allowlist (R1) */}
        <div className="bg-bliss-50 rounded-xl p-6 border border-bliss-200">
          {cardEnabled ? (
            <>
              <h3 className="text-lg font-semibold text-bliss-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {t('booking:payment.creditCard')}
              </h3>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              <PaymentForm
                amount={bookingData.final_price || 0}
                bookingId={bookingData.id}
                customerId={customer.id}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </>
          ) : promptpayEnabled ? (
            <>
              <h3 className="text-lg font-semibold text-bliss-900 mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                {t('booking:payment.promptpay')}
              </h3>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              {!promptpayQR ? (
                <button
                  onClick={handlePayWithPromptPay}
                  disabled={isProcessing}
                  className="w-full py-3 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition disabled:opacity-50"
                >
                  {isProcessing ? t('booking:payment.generatingQR') : t('booking:payment.generateQRButton', { amount: bookingData.final_price?.toLocaleString() })}
                </button>
              ) : (
                <div className="text-center">
                  <img src={promptpayQR} alt={t('booking:payment.qrCodeAlt')} className="w-64 h-64 mx-auto" />
                  <p className="text-sm text-bliss-700 mt-3">{t('booking:payment.waitingForPayment')}</p>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bliss-600 mx-auto mt-3"></div>
                </div>
              )}
            </>
          ) : (
            <p className="text-bliss-700 text-center py-4">{t('booking:payment.noChannelsAvailable')}</p>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-bliss-100 border border-bliss-300 rounded-xl">
          <p className="text-sm text-bliss-700 text-center">
            {t('common:payment.securityNotice')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default CompletePayment