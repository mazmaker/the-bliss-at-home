import { useState, useEffect } from 'react'
import { Clock, User, MapPin, Car, Sparkles, CheckCircle, Phone, RefreshCw } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'

type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'ASSIGNED'
  | 'STAFF_EN_ROUTE'
  | 'STAFF_ARRIVED'
  | 'SERVICE_IN_PROGRESS'
  | 'COMPLETED'
  | 'cancelled'

interface BookingStatusCardEnhancedProps {
  booking: {
    status: string
    status_v2?: BookingStatus
    travel_started_at?: string
    service_started_at?: string
    actual_arrival?: string
    provider: {
      name: string
      phone?: string
      avatar?: string
      rating?: number
      reviews?: number
    }
  } | null
  bookingData?: any
  onRefresh?: () => void
  activeJourneyId?: string | null
}

const BookingStatusCardEnhanced = ({ booking, bookingData, onRefresh, activeJourneyId }: BookingStatusCardEnhancedProps) => {
  const { t } = useTranslation()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!booking) return null

  // Use status_v2 if available, fallback to legacy status
  let currentStatus = booking.status_v2 || booking.status?.toUpperCase() || 'PENDING'

  // ✅ Override status when there's an active GPS journey
  if (activeJourneyId && (currentStatus.toUpperCase() === 'CONFIRMED' || currentStatus.toUpperCase() === 'ASSIGNED')) {
    currentStatus = 'STAFF_EN_ROUTE'
  }

  const getStatusConfig = (status: BookingStatus) => {
    const configs = {
      'pending': {
        title: t('booking:status.pending.title'),
        description: t('booking:status.pending.description'),
        icon: '',
        color: 'gray',
        showProgress: true,
        currentStep: 0,
        billing: t('booking:status.pending.billingStatus')
      },
      'confirmed': {
        title: t('booking:status.confirmed.title'),
        description: t('booking:status.confirmed.description'),
        icon: '',
        color: 'amber',
        showProgress: true,
        currentStep: 1,
        billing: t('booking:status.confirmed.billingStatus')
      },
      'assigned': {
        title: t('booking:status.assigned.title'),
        description: t('booking:status.assigned.description'),
        icon: '',
        color: 'blue',
        showStaff: true,
        showProgress: true,
        currentStep: 2,
        billing: t('booking:status.assigned.billingStatus')
      },
      'ASSIGNED': {
        title: t('booking:status.ASSIGNED.title'),
        description: t('booking:status.ASSIGNED.description'),
        icon: '',
        color: 'blue',
        showStaff: true,
        showProgress: true,
        currentStep: 2,
        billing: t('booking:status.ASSIGNED.billingStatus')
      },
      'STAFF_EN_ROUTE': {
        title: t('booking:status.STAFF_EN_ROUTE.title'),
        description: t('booking:status.STAFF_EN_ROUTE.description'),
        icon: '',
        color: 'amber',
        showStaff: true,
        showETA: true,
        showProgress: true,
        currentStep: 2,
        billing: t('booking:status.STAFF_EN_ROUTE.billingStatus')
      },
      'STAFF_ARRIVED': {
        title: t('booking:status.STAFF_ARRIVED.title'),
        description: t('booking:status.STAFF_ARRIVED.description'),
        icon: '',
        color: 'green',
        showStaff: true,
        showContact: true,
        showProgress: true,
        currentStep: 3.5,
        billing: t('booking:status.STAFF_ARRIVED.billingStatus')
      },
      'SERVICE_IN_PROGRESS': {
        title: t('booking:status.SERVICE_IN_PROGRESS.title'),
        description: t('booking:status.SERVICE_IN_PROGRESS.description'),
        icon: '',
        color: 'emerald',
        showStaff: true,
        showTimer: true,
        showProgress: true,
        currentStep: 4,
        billing: t('booking:status.SERVICE_IN_PROGRESS.billingStatus')
      },
      'COMPLETED': {
        title: t('booking:status.COMPLETED.title'),
        description: t('booking:status.COMPLETED.description'),
        icon: '',
        color: 'violet',
        showReview: true,
        billing: t('booking:status.COMPLETED.billingStatus')
      },
      'cancelled': {
        title: t('booking:status.cancelled.title'),
        description: t('booking:status.cancelled.description'),
        icon: '',
        color: 'red',
        billing: t('booking:status.cancelled.billingStatus')
      }
    }

    return configs[status] || configs.pending
  }

  const config = getStatusConfig(currentStatus as BookingStatus)

  // Check actual payment status vs booking status
  const isPaymentPending = booking && booking.payment &&
    booking.payment.status === 'pending'
  const isBookingConfirmed = ['confirmed', 'assigned', 'ASSIGNED'].includes(currentStatus)

  // Override billing message if payment is pending
  if (isPaymentPending && isBookingConfirmed) {
    config.billing = t('booking:payment.warningIncomplete')
  }
  const progressSteps = [t('booking:progress.step.booking'), t('booking:progress.step.findStaff'), t('booking:progress.step.travel'), t('booking:progress.step.service')]

  // Calculate durations
  const calculateDuration = (startTime: string, endTime?: Date) => {
    const start = new Date(startTime)
    const end = endTime || currentTime
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60)) // minutes
  }

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hrs > 0 ? `${hrs} ${t('common:time.hours')} ${mins} ${t('common:time.minutes')}` : `${mins} ${t('common:time.minutes')}`
  }

  const travelDuration = booking.travel_started_at && booking.service_started_at ?
    calculateDuration(booking.travel_started_at, new Date(booking.service_started_at)) :
    booking.travel_started_at && currentStatus === 'STAFF_EN_ROUTE' ?
    calculateDuration(booking.travel_started_at) : 0

  const serviceDuration = booking.service_started_at ?
    calculateDuration(booking.service_started_at) : 0

  return (
    <div className={`bg-${config.color}-50 border border-${config.color}-200 rounded-2xl p-6 mb-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <h2 className={`text-xl font-bold text-${config.color}-900`}>
              {config.title}
            </h2>
            <p className={`text-${config.color}-700 text-sm`}>
              {config.description}
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className={`p-2 rounded-lg bg-${config.color}-100 hover:bg-${config.color}-200 transition-colors`}
            title={t('common:action.refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      {config.showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {progressSteps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                  index < (config.currentStep || 0) ? `bg-green-600 text-white` :
                  index === Math.floor(config.currentStep || 0) ? `bg-${config.color}-600 text-white` :
                  `bg-gray-200 text-gray-500`
                }`}>
                  {index < (config.currentStep || 0) ? '✓' : index + 1}
                </div>
                <span className={`ml-2 text-xs ${
                  index < (config.currentStep || 0) ? 'text-green-700' :
                  index === Math.floor(config.currentStep || 0) ? `text-${config.color}-700` :
                  'text-gray-500'
                }`}>
                  {step}
                </span>
                {index < progressSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${
                    index < (config.currentStep || 0) ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Info & Travel Status */}
      {config.showStaff && booking.provider.name !== t('booking:provider.notAssigned') && (
        <div className="bg-white rounded-xl p-4 mb-4">
          {/* Staff Basic Info */}
          <div className="flex items-center gap-3 mb-4">
            {booking.provider.avatar ? (
              <img
                src={booking.provider.avatar}
                alt={booking.provider.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{booking.provider.name}</p>
              {booking.provider.reviews ? (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span>⭐ {booking.provider.rating?.toFixed(1)}</span>
                </div>
              ) : null}
            </div>
            {config.showContact && booking.provider.phone && (
              <a
                href={`tel:${booking.provider.phone}`}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm transition-colors"
              >
                <Phone className="w-4 h-4" />
                {t('booking:action.call')}
              </a>
            )}
          </div>

          {/* Travel Duration (when en route) */}
          {booking.travel_started_at && currentStatus === 'STAFF_EN_ROUTE' && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Car className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-gray-900">{t('booking:duration.travelTime')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-amber-600">
                    {formatDuration(travelDuration)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('booking:booking.travelStartedAt')}{new Date(booking.travel_started_at).toLocaleTimeString('th-TH')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-amber-600">{t('booking:duration.travelTime')}</div>
                  <div className="text-xs text-amber-500">{t('booking:duration.notCountedAsServiceTime')}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Service Timer */}
      {config.showTimer && booking.service_started_at && (
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-gray-900">{t('booking:duration.serviceTime')}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-emerald-600">
                {formatDuration(serviceDuration)}
              </div>
              <div className="text-sm text-gray-600">
                {t('booking:booking.serviceStartedAt')}{new Date(booking.service_started_at).toLocaleTimeString('th-TH')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-emerald-600">{t('booking:billing.inProgress')}</div>
              <div className="text-xs text-emerald-500">
                ~{(serviceDuration * 30).toLocaleString()} {t('common:unit.baht')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Warning Banner */}
      {isPaymentPending && isBookingConfirmed && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-red-700">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-medium">{t('booking:payment.incompleteHeading')}</p>
              <p className="text-sm text-red-600 mt-1">
                {t('booking:payment.incompleteMessage')}
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Additional Info based on status */}
      {currentStatus === 'STAFF_ARRIVED' && (
        <div className="mt-4 bg-green-100 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{t('booking:status.staffReady')}</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            {t('booking:status.staffReadyMessage')}
          </p>
        </div>
      )}
    </div>
  )
}

// Helper function to add to BookingDetails.tsx imports
const BookingStatusCardEnhancedWrapper = ({ booking, bookingData, onRefresh, activeJourneyId }: BookingStatusCardEnhancedProps) => {
  return <BookingStatusCardEnhanced booking={booking} bookingData={bookingData} onRefresh={onRefresh} activeJourneyId={activeJourneyId} />
}

export default BookingStatusCardEnhancedWrapper