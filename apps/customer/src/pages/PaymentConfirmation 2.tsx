import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Download, ArrowRight, Home, Mail } from 'lucide-react'

interface PaymentDetails {
  booking_id: string
  transaction_id: string
  amount: number
  service_name: string
  payment_method: string
  card_last_digits?: string
  transaction_date: string
  receipt_number: string
}

function PaymentConfirmation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const bookingId = searchParams.get('booking_id')
    const transactionId = searchParams.get('transaction_id')

    if (!bookingId || !transactionId) {
      navigate('/bookings')
      return
    }

    // Fetch payment details from API
    fetchPaymentDetails(bookingId, transactionId)
  }, [searchParams, navigate])

  const fetchPaymentDetails = async (bookingId: string, transactionId: string) => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/payments/receipt?transaction_id=${transactionId}`)
      // const data = await response.json()

      // Mock data for now
      setTimeout(() => {
        setPaymentDetails({
          booking_id: bookingId,
          transaction_id: transactionId,
          amount: 800,
          service_name: 'Thai Massage (2 hours)',
          payment_method: 'Credit Card',
          card_last_digits: '4242',
          transaction_date: new Date().toISOString(),
          receipt_number: `RCP-${Date.now()}`,
        })
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to fetch payment details:', error)
      setIsLoading(false)
    }
  }

  const handleDownloadReceipt = () => {
    // TODO: Implement PDF receipt download
    alert('Receipt download will be implemented with backend')
  }

  const handleEmailReceipt = () => {
    // TODO: Implement email receipt
    alert('Receipt will be sent to your email')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-amber-700 mb-4"></div>
          <p className="text-stone-600">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (!paymentDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-stone-600 mb-4">Payment details not found</p>
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800"
          >
            Go to Bookings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-in zoom-in duration-300">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Payment Successful!</h1>
          <p className="text-stone-600">Your booking has been confirmed</p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-stone-900 mb-6">Payment Details</h2>

          <div className="space-y-4">
            {/* Service */}
            <div className="flex justify-between py-3 border-b border-stone-100">
              <span className="text-stone-600">Service</span>
              <span className="font-medium text-stone-900">{paymentDetails.service_name}</span>
            </div>

            {/* Amount */}
            <div className="flex justify-between py-3 border-b border-stone-100">
              <span className="text-stone-600">Amount Paid</span>
              <span className="text-xl font-bold text-amber-700">฿{paymentDetails.amount}</span>
            </div>

            {/* Payment Method */}
            <div className="flex justify-between py-3 border-b border-stone-100">
              <span className="text-stone-600">Payment Method</span>
              <span className="font-medium text-stone-900">
                {paymentDetails.payment_method}
                {paymentDetails.card_last_digits && ` •••• ${paymentDetails.card_last_digits}`}
              </span>
            </div>

            {/* Transaction ID */}
            <div className="flex justify-between py-3 border-b border-stone-100">
              <span className="text-stone-600">Transaction ID</span>
              <span className="font-mono text-sm text-stone-900">{paymentDetails.transaction_id}</span>
            </div>

            {/* Receipt Number */}
            <div className="flex justify-between py-3 border-b border-stone-100">
              <span className="text-stone-600">Receipt No.</span>
              <span className="font-medium text-stone-900">{paymentDetails.receipt_number}</span>
            </div>

            {/* Date */}
            <div className="flex justify-between py-3">
              <span className="text-stone-600">Date & Time</span>
              <span className="font-medium text-stone-900">
                {new Date(paymentDetails.transaction_date).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleDownloadReceipt}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
          >
            <Download className="w-5 h-5" />
            Download Receipt
          </button>

          <button
            onClick={handleEmailReceipt}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
          >
            <Mail className="w-5 h-5" />
            Email Receipt
          </button>
        </div>

        {/* Navigation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            to={`/bookings/${paymentDetails.booking_id}`}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition"
          >
            View Booking Details
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <p className="font-medium mb-1">What's next?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>A confirmation email has been sent to your registered email</li>
            <li>Our staff will contact you 1 day before your appointment</li>
            <li>You can view or cancel your booking from the Bookings page</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PaymentConfirmation
