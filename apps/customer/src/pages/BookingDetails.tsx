import { useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Calendar, Clock, MapPin, Map, Star, CreditCard, Sparkles, MessageCircle, XCircle } from 'lucide-react'
import { useBookingByNumber } from '@bliss/supabase/hooks/useBookings'

function BookingDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Fetch booking data from Supabase
  const { data: bookingData, isLoading, error } = useBookingByNumber(id)

  // Transform booking data to match UI format
  const booking = useMemo(() => {
    if (!bookingData) return null

    return {
      id: bookingData.booking_number,
      serviceName: bookingData.service?.name_en || bookingData.service?.name_th || 'Unknown Service',
      serviceSlug: bookingData.service?.slug || '',
      date: new Date(bookingData.booking_date).toISOString().split('T')[0],
      time: new Date(bookingData.booking_date).toTimeString().slice(0, 5),
      status: bookingData.status,
      price: Number(bookingData.service_price),
      duration: bookingData.duration_minutes / 60,
      addOns: bookingData.addons?.map((a) => ({
        name: a.addon?.name_en || a.addon?.name_th || 'Add-on',
        price: Number(a.total_price),
      })) || [],
      address: {
        name: bookingData.recipient_name,
        phone: bookingData.recipient_phone,
        address: bookingData.address_line,
        district: bookingData.district || '',
        subdistrict: bookingData.subdistrict || '',
        province: bookingData.province || '',
        zipcode: bookingData.zipcode || '',
      },
      notes: bookingData.notes || '',
      provider: bookingData.staff
        ? {
            name: `${bookingData.staff.first_name || ''} ${bookingData.staff.last_name || ''}`.trim(),
            rating: 4.8, // TODO: Calculate from reviews
            reviews: 0, // TODO: Count from reviews
          }
        : {
            name: 'Staff TBA',
            rating: 0,
            reviews: 0,
          },
      payment: {
        method: bookingData.payment_method || 'cash',
        status: bookingData.payment_status || 'pending',
      },
      createdAt: new Date(bookingData.created_at).toISOString().split('T')[0],
      image: bookingData.service?.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
    }
  }, [bookingData])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
            <p className="text-stone-600 mt-4">Loading booking details...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-stone-900 mt-4 mb-2">Error Loading Booking</h2>
            <p className="text-stone-600 mb-6">{error.message}</p>
            <Link
              to="/bookings"
              className="inline-block bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition"
            >
              Back to Booking History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <XCircle className="w-16 h-16 text-stone-400 mx-auto" />
            <h2 className="text-2xl font-bold text-stone-900 mt-4 mb-2">Booking Not Found</h2>
            <p className="text-stone-600 mb-6">The booking you're looking for doesn't exist</p>
            <Link
              to="/bookings"
              className="inline-block bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition"
            >
              Back to Booking History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed'
      case 'completed':
        return 'Completed'
      case 'pending':
        return 'Pending'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'credit_card':
        return 'Credit/Debit Card'
      case 'bank_transfer':
        return 'Bank Transfer'
      case 'cash':
        return 'Cash'
      default:
        return method
    }
  }

  const totalAddOnsPrice = booking.addOns.reduce((sum: number, a: any) => sum + a.price, 0)
  const totalPrice = booking.price + totalAddOnsPrice

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/bookings" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-4">
            <ChevronLeft className="w-5 h-5" />
            Back to Booking History
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">Booking Details</h1>
        </div>

        {/* Status Banner */}
        <div className={`p-6 rounded-2xl mb-6 ${
          booking.status === 'confirmed'
            ? 'bg-blue-50 border-2 border-blue-200'
            : booking.status === 'completed'
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-stone-50 border-2 border-stone-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600 mb-1">Booking Number</p>
              <p className="font-bold text-stone-900">{booking.id}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(booking.status)}`}>
              {getStatusText(booking.status)}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Service Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4">Booked Service</h2>

              <div className="flex items-start gap-4 p-4 bg-stone-50 rounded-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-amber-100 rounded-xl overflow-hidden">
                  <img src={booking.image} alt={booking.serviceName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-stone-900 mb-1">{booking.serviceName}</h3>
                  <p className="text-sm text-stone-600 mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> {booking.duration} hours</p>
                  <p className="text-lg font-bold text-amber-700">฿{booking.price}</p>
                </div>
              </div>

              {booking.addOns.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <h4 className="font-medium text-stone-900 mb-3">Add-ons</h4>
                  {booking.addOns.map((addon: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2">
                      <span className="text-stone-600">{addon.name}</span>
                      <span className="text-amber-700 font-medium">+฿{addon.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" /> Appointment Date & Time</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-stone-900 font-semibold">
                    {new Date(booking.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-stone-600 flex items-center gap-1"><Clock className="w-4 h-4" /> {booking.time}</p>
                </div>
                {booking.status === 'confirmed' && (
                  <div className="text-right">
                    <button className="text-amber-700 hover:text-amber-900 font-medium text-sm">
                      Reschedule
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" /> Service Location</h2>
              <div className="space-y-2">
                <p className="text-stone-900 font-medium">{booking.address.name}</p>
                <p className="text-stone-600">{booking.address.phone}</p>
                <p className="text-stone-600">{booking.address.address}</p>
                <p className="text-stone-600">
                  {booking.address.subdistrict} {booking.address.district}
                </p>
                <p className="text-stone-600">
                  {booking.address.province} {booking.address.zipcode}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-stone-100">
                <button className="text-amber-700 hover:text-amber-900 font-medium text-sm flex items-center gap-1">
                  <Map className="w-4 h-4" />
                  View Map
                </button>
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-stone-900 mb-4">Notes</h2>
                <p className="text-stone-600 bg-stone-50 p-4 rounded-xl">{booking.notes}</p>
              </div>
            )}

            {/* Provider Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4">Service Provider</h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-amber-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-amber-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-900">{booking.provider.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>{booking.provider.rating}</span>
                    <span>•</span>
                    <span>{booking.provider.reviews} reviews</span>
                  </div>
                </div>
                {booking.status === 'confirmed' && (
                  <button className="text-amber-700 hover:text-amber-900 font-medium text-sm flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Price Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4">Price Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-stone-600">
                  <span>Main Service</span>
                  <span>฿{booking.price}</span>
                </div>
                {booking.addOns.map((addon: any, index: number) => (
                  <div key={index} className="flex justify-between text-stone-600">
                    <span>{addon.name}</span>
                    <span>฿{addon.price}</span>
                  </div>
                ))}
                <div className="flex justify-between text-stone-600">
                  <span>Service Fee</span>
                  <span>฿0</span>
                </div>
                <div className="pt-3 border-t border-stone-200">
                  <div className="flex justify-between">
                    <span className="font-bold text-stone-900">Total</span>
                    <span className="font-bold text-xl text-amber-700">฿{totalPrice}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payment</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-stone-600">
                  <span>Payment Method</span>
                  <span className="text-stone-900 font-medium">{getPaymentMethodText(booking.payment.method)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    booking.payment.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {booking.payment.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {booking.status === 'confirmed' && (
                <>
                  <button className="w-full bg-amber-700 text-white py-3 rounded-xl font-medium hover:bg-amber-800 transition">
                    Edit Booking
                  </button>
                  <button className="w-full border-2 border-red-200 text-red-600 py-3 rounded-xl font-medium hover:bg-red-50 transition">
                    Cancel Booking
                  </button>
                </>
              )}

              {booking.status === 'completed' && (
                <>
                  <button className="w-full bg-amber-700 text-white py-3 rounded-xl font-medium hover:bg-amber-800 transition">
                    Book Again
                  </button>
                  <button className="w-full border-2 border-amber-200 text-amber-700 py-3 rounded-xl font-medium hover:bg-amber-50 transition">
                    Rate & Review
                  </button>
                </>
              )}

              <button
                onClick={() => navigate(`/services/${booking.serviceSlug}`)}
                className="w-full border-2 border-stone-200 text-stone-700 py-3 rounded-xl font-medium hover:bg-stone-50 transition"
              >
                View This Service
              </button>

              <button className="w-full text-stone-500 py-2 text-sm hover:text-stone-700">
                Contact Support
              </button>
            </div>

            {/* Booking Info */}
            <div className="bg-stone-50 rounded-xl p-4 text-sm">
              <p className="text-stone-600">
                Booked on {new Date(booking.createdAt).toLocaleDateString('en-US', {
                  dateStyle: 'long',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingDetails
