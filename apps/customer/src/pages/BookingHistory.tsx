import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList, Calendar, Clock, X } from 'lucide-react'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import { useCustomerBookings } from '@bliss/supabase/hooks/useBookings'
import { useTranslation } from '@bliss/i18n'
import { getServiceImage } from '../utils/imageUtils'
import { pickLang } from '../utils/serviceUtils'

function BookingHistory() {
  const { t, i18n } = useTranslation(['booking', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || 'all'

  const { data: customer } = useCurrentCustomer()
  const { data: bookingsData, isLoading, error } = useCustomerBookings(customer?.id)

  // Search filters: date range + service
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [serviceFilter, setServiceFilter] = useState('all')

  const hasActiveFilters = dateFrom !== '' || dateTo !== '' || serviceFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setServiceFilter('all')
    setSearchParams({})
  }

  // Distinct service names for the dropdown (from the customer's own bookings)
  const serviceOptions = useMemo(() => {
    if (!bookingsData) return []
    const names = bookingsData.map(
      (b) => pickLang(b.service, 'name', i18n.language) || 'Unknown Service'
    )
    return Array.from(new Set(names)).sort()
  }, [bookingsData, i18n.language])

  // Transform and filter bookings
  const bookings = useMemo(() => {
    if (!bookingsData) return []

    let filtered = bookingsData.map((booking) => ({
      id: booking.id,
      bookingNumber: booking.booking_number,
      serviceName: pickLang(booking.service, 'name', i18n.language) || 'Unknown Service',
      serviceNameTh: booking.service?.name_th || booking.service?.name_en || 'Unknown Service',
      date: booking.booking_date, // Already in YYYY-MM-DD format
      time: booking.booking_time || '00:00', // Already in HH:MM format
      status: booking.status ?? 'pending',
      price: Number(booking.final_price || 0),
      image: getServiceImage(booking.service?.image_url, booking.service?.category || 'massage'),
    }))

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'upcoming') {
        // Compare date strings (YYYY-MM-DD) so today's bookings are included
        const today = new Date().toISOString().split('T')[0]
        filtered = filtered.filter(b => ['confirmed', 'pending', 'in_progress'].includes(b.status) && b.date >= today)
      } else {
        filtered = filtered.filter(b => b.status === statusFilter)
      }
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(b => b.date >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter(b => b.date <= dateTo)
    }

    // Filter by service
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(b => b.serviceNameTh === serviceFilter)
    }

    return filtered
  }, [bookingsData, statusFilter, dateFrom, dateTo, serviceFilter, i18n.language])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-700'
      case 'in_progress':
        return 'bg-purple-100 text-purple-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-bliss-600'
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
      case 'in_progress':
        return t('common:status.inProgress')
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bliss-600 mx-auto"></div>
          <p className="text-bliss-700 mt-4">{t('common:loading.bookings')}</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-bliss-700 text-lg">{t('common:auth.pleaseLoginBookings')}</p>
          <Link to="/login" className="inline-block mt-4 text-bliss-600 hover:text-bliss-700 font-medium">
            {t('common:auth.goToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-bliss-900 mb-8">{t('history.title')}</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          <button
            onClick={() => setSearchParams(statusFilter === 'all' ? {} : {})}
            className={`px-6 py-2 rounded-full font-medium whitespace-nowrap ${
              statusFilter === 'all' ? 'bg-bliss-600 text-white' : 'bg-bliss-100 text-bliss-700 hover:bg-bliss-200'
            }`}
          >
            {t('history.all')}
          </button>
          <button
            onClick={() => setSearchParams({ status: 'upcoming' })}
            className={`px-6 py-2 rounded-full font-medium whitespace-nowrap ${
              statusFilter === 'upcoming' ? 'bg-bliss-600 text-white' : 'bg-bliss-100 text-bliss-700 hover:bg-bliss-200'
            }`}
          >
            {t('history.upcoming')}
          </button>
          <button
            onClick={() => setSearchParams({ status: 'completed' })}
            className={`px-6 py-2 rounded-full font-medium whitespace-nowrap ${
              statusFilter === 'completed' ? 'bg-bliss-600 text-white' : 'bg-bliss-100 text-bliss-700 hover:bg-bliss-200'
            }`}
          >
            {t('history.completed')}
          </button>
          <button
            onClick={() => setSearchParams({ status: 'cancelled' })}
            className={`px-6 py-2 rounded-full font-medium whitespace-nowrap ${
              statusFilter === 'cancelled' ? 'bg-bliss-600 text-white' : 'bg-bliss-100 text-bliss-700 hover:bg-bliss-200'
            }`}
          >
            {t('history.cancelled')}
          </button>
        </div>

        {/* Search Filters: date range + service */}
        <div className="bg-white rounded-2xl shadow-sm border border-bliss-100 p-4 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-bliss-500 mb-1.5">
                  {t('common:filters.status')}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    e.target.value === 'all'
                      ? setSearchParams({})
                      : setSearchParams({ status: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-bliss-300 rounded-xl text-sm focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600 bg-bliss-50"
                >
                  <option value="all">{t('booking:history.filterAllStatuses')}</option>
                  <option value="upcoming">{t('booking:history.upcoming')}</option>
                  <option value="pending">{t('common:status.pending')}</option>
                  <option value="confirmed">{t('common:status.confirmed')}</option>
                  <option value="in_progress">{t('common:status.inProgress')}</option>
                  <option value="completed">{t('common:status.completed')}</option>
                  <option value="cancelled">{t('common:status.cancelled')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-bliss-500 mb-1.5">
                  {t('booking:history.filters.fromDate')}
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                  className="w-full px-3 py-2.5 border border-bliss-300 rounded-xl text-sm focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600 bg-bliss-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-bliss-500 mb-1.5">
                  {t('booking:history.filters.toDate')}
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="w-full px-3 py-2.5 border border-bliss-300 rounded-xl text-sm focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600 bg-bliss-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-bliss-500 mb-1.5">
                  {t('booking:history.filters.service')}
                </label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="w-full px-3 py-2.5 border border-bliss-300 rounded-xl text-sm focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600 bg-bliss-50"
                >
                  <option value="all">{t('booking:history.filters.allServices')}</option>
                  {serviceOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-bliss-500 hover:text-bliss-700"
              >
                <X className="w-3.5 h-3.5" />
                {t('common:buttons.clearFilters')}
              </button>
            )}
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
                  <div className="w-20 h-20 bg-bliss-100 rounded-xl overflow-hidden">
                    <img src={booking.image} alt={booking.serviceName} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-bliss-900 mb-1">{booking.serviceName}</h3>
                    <p className="text-sm text-bliss-500 mb-1">{t('history.bookingNumber', { number: booking.bookingNumber })}</p>
                    <div className="flex items-center gap-4 text-sm text-bliss-700">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {booking.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {booking.time}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusText(booking.status)}
                    </span>
                    <p className="text-lg font-bold text-bliss-600 mt-2">฿{booking.price.toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : !error && (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-bliss-400 mx-auto" />
            {hasActiveFilters ? (
              <>
                <p className="text-bliss-500 mt-4 mb-4">{t('booking:history.noResultsFiltered')}</p>
                <button
                  onClick={clearFilters}
                  className="inline-block bg-bliss-100 text-bliss-700 px-6 py-3 rounded-xl font-medium hover:bg-bliss-200 transition"
                >
                  {t('common:buttons.clearFilters')}
                </button>
              </>
            ) : (
              <>
                <p className="text-bliss-500 mt-4 mb-4">{t('history.noBookings')}</p>
                <Link to="/services" className="inline-block bg-bliss-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-bliss-700 transition">
                  {t('history.viewServices')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingHistory