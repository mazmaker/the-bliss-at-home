/**
 * Complete Payment Page
 * Allows customers to complete payment for pending bookings
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, CreditCard, AlertTriangle } from 'lucide-react'
import { useBookingByNumber } from '@bliss/supabase/hooks/useBookings'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700"></div>
      </div>
    )
  }

  if (bookingError || !bookingData) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-stone-900 mb-2">ไม่พบการจอง</h1>
          <p className="text-stone-600 mb-4">ไม่สามารถหาการจองที่ต้องการชำระเงินได้</p>
          <Link
            to="/bookings"
            className="text-amber-700 hover:text-amber-800 font-medium"
          >
            กลับไปยังรายการจอง
          </Link>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-stone-900 mb-2">กรุณาเข้าสู่ระบบ</h1>
          <p className="text-stone-600 mb-4">กรุณาเข้าสู่ระบบเพื่อชำระเงิน</p>
          <Link
            to="/auth/signin"
            className="text-amber-700 hover:text-amber-800 font-medium"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-stone-600 hover:text-stone-900 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-stone-900">ชำระเงิน</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* Booking Summary */}
        <div className="bg-white rounded-xl p-6 mb-6 border border-stone-200">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">สรุปการจอง</h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-stone-600">หมายเลขจอง</span>
              <span className="font-medium">{bookingData.booking_number}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-stone-600">บริการ</span>
              <span className="font-medium">{bookingData.service?.name_th}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-stone-600">วันที่</span>
              <span className="font-medium">
                {new Date(bookingData.booking_date).toLocaleDateString('th-TH')} {bookingData.booking_time}
              </span>
            </div>

            <div className="border-t border-stone-200 pt-3 mt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>ยอดชำระ</span>
                <span className="text-amber-700">฿{bookingData.final_price?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-xl p-6 border border-stone-200">
          <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            ชำระเงินด้วยบัตรเครดิต
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
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-stone-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-stone-600 text-center">
            🔒 การชำระเงินปลอดภัยด้วยระบบ SSL และ Omise
          </p>
        </div>
      </div>
    </div>
  )
}

export default CompletePayment