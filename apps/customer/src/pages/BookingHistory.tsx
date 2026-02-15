import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList, Calendar, Clock } from 'lucide-react'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import { useCustomerBookings } from '@bliss/supabase/hooks/useBookings'
import { useTranslation } from '@bliss/i18n'

function BookingHistory() {
  const { t } = useTranslation(['booking', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || 'all'

  const { data: customer } = useCurrentCustomer()
  const { data: bookingsData, isLoading, error } = useCustomerBookings(customer?.id)

  // Transform and filter bookings
  const bookings = useMemo(() => {
    if (!bookingsData) return []

    let filtered = bookingsData.map((booking) => ({
      id: booking.id,
      bookingNumber: booking.booking_number,
      serviceName: booking.service?.name_en || booking.service?.name_th || 'Unknown Service',
      date: booking.booking_date, // Already in YYYY-MM-DD format
      time: booking.booking_time || '00:00', // Already in HH:MM format
      status: booking.status ?? 'pending',
      price: Number(booking.final_price || 0),
      image: booking.service?.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
    }))

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'upcoming') {
        filtered = filtered.filter(b => ['confirmed', 'pending'].includes(b.status) && new Date(b.date) >= new Date())
      } else {
        filtered = filtered.filter(b => b.status === statusFilter)
      }
    }

    return filtered
  }, [bookingsData, statusFilter])

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
        return t('common:status.confirmed')
      case 'completed':
        return t('common:status.completed')
      case 'pending':
        return t('common:status.pending')
      case 'cancelled':
        return t('common:status.cancelled')
      default:
        return status
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
          <p className="text-stone-600 mt-4">{t('common:loading.bookings')}</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 text-lg">{t('common:auth.pleaseLoginBookings')}</p>
          <Link to="/login" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
            {t('common:auth.goToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-stone-900 mb-8">{t('history.title')}</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          <button
            onClick={() => setSearchParams(statusFilter === 'all' ? {} : {})}
            className={`px-6 py-2 rounded-full font-medium whitespace-nowrap ${
              statusFilter === 'all' ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {t('history.all')}
          </button>
          <button
            onClick={() => setSearchParams({ status: 'upcoming' })}
            className={`px-6 py-2 rounded-full font-medium whitespace-nowrap ${
              statusFilter === 'upcoming' ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {t('history.upcoming')}
          </button>
          <button
            onClick={() => setSearchParams({ status: 'completed' })}
            className={`px-6 py-2 rounded-full font-medium whitespace-nowrap ${
              statusFilter === 'completed' ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {t('history.completed')}
          </button>
          <button
            onClick={() => setSearchParams({ status: 'cancelled' })}
            className={`px-6 py-2 rounded-full font-medium whitespace-nowrap ${
              statusFilter === 'cancelled' ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {t('history.cancelled')}
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600">{t('common:errors.failedToLoadBookings')}</p>
          </div>
        )}

        {/* Bookings List */}
        {!error && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Link
                key={booking.id}
                to={`/bookings/${booking.bookingNumber}`}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition p-6 block"
              >
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-amber-100 rounded-xl overflow-hidden">
                    <img src={booking.image} alt={booking.serviceName} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-stone-900 mb-1">{booking.serviceName}</h3>
                    <p className="text-sm text-stone-500 mb-1">{t('history.bookingNumber', { number: booking.bookingNumber })}</p>
                    <div className="flex items-center gap-4 text-sm text-stone-600">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {booking.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {booking.time}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusText(booking.status)}
                    </span>
                    <p className="text-lg font-bold text-amber-700 mt-2">฿{booking.price.toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : !error && (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-stone-400 mx-auto" />
            <p className="text-stone-500 mt-4 mb-4">{t('history.noBookings')}</p>
            <Link to="/services" className="inline-block bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition">
              {t('history.viewServices')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingHistory