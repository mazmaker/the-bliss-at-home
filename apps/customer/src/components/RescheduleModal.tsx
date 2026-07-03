/**
 * Customer Reschedule Modal
 * Allows customers to reschedule their bookings with policy-based rules
 */

import { useState, useEffect } from 'react'
import { Modal, isRescheduleDateSelectable, isRescheduleTimeAvailable, isSameBookingSlot } from '@bliss/ui'
import { useTranslation } from '@bliss/i18n'

// Same-day reschedule lead time — matches the customer new-booking flow (isTimeSlotAvailable = 3h).
const RESCHEDULE_MIN_LEAD_MINUTES = 180
import { AlertTriangle, Clock, Ban, CheckCircle, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface CancellationEligibility {
  canCancel: boolean
  canReschedule: boolean
  refundPercentage: number
  rescheduleFee: number
  hoursUntilBooking: number
  tier: {
    label_th: string | null
    label_en: string | null
  } | null
  reason?: string
}

interface RescheduleOutcome {
  staff_kept?: boolean
  staff_unassigned?: boolean
}

interface RescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newDate: string, newTime: string) => Promise<RescheduleOutcome | void>
  bookingId: string
  bookingNumber: string
  serviceName: string
  currentDate: string
  currentTime: string
  duration: number // in hours
}

// Generate time slots from 9:00 to 20:00
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 9; hour <= 20; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    if (hour < 20) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function RescheduleModal({
  isOpen,
  onClose,
  onConfirm,
  bookingId,
  bookingNumber,
  serviceName,
  currentDate,
  currentTime,
  duration,
}: RescheduleModalProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'cn' ? 'zh-CN' : i18n.language === 'en' ? 'en-US' : 'th-TH'
  const [step, setStep] = useState<'check' | 'select' | 'confirm' | 'result'>('check')
  const [eligibility, setEligibility] = useState<CancellationEligibility | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [rescheduleResult, setRescheduleResult] = useState<RescheduleOutcome | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Check eligibility when modal opens
  useEffect(() => {
    if (isOpen && bookingId) {
      checkEligibility()
    }
  }, [isOpen, bookingId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('check')
      setSelectedDate('')
      setSelectedTime('')
      setError('')
      setSuccess(false)
      setRescheduleResult(null)
      setCurrentMonth(new Date())
    }
  }, [isOpen])

  const checkEligibility = async () => {
    setLoading(true)
    setError('')

    try {
      // Check booking eligibility
      const checkRes = await fetch(
        `${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/cancellation-policy/check/${bookingId}`
      )

      if (!checkRes.ok) {
        throw new Error(t('booking:reschedule.checkError'))
      }

      const checkData = await checkRes.json()
      setEligibility(checkData.data)

      // Auto move to select step if eligible
      if (checkData.data.canReschedule) {
        setStep('select')
      }
    } catch (err: any) {
      setError(err.message || t('booking:reschedule.checkFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      setError(t('booking:reschedule.selectDateTimeRequired'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const outcome = await onConfirm(selectedDate, selectedTime)
      setRescheduleResult(outcome || null)
      setSuccess(true)
      setStep('result')
    } catch (err: any) {
      setError(err.message || t('booking:reschedule.error'))
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    // Add all days in the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  // Same-day reschedule is allowed now (the old `!== currentBookingDate` block is gone).
  // Past/no-op slots are filtered at the time-picker level via the shared @bliss/ui helpers,
  // so customer + hotel stay in sync.
  const isDateSelectable = (date: Date) => isRescheduleDateSelectable(date)

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('booking:reschedule.modalTitle')} size="md">
      <div className="py-4 max-h-[70vh] overflow-y-auto">
        {/* Loading State */}
        {loading && step === 'check' && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-bliss-600 animate-spin mx-auto mb-4" />
            <p className="text-bliss-700">{t('booking:reschedule.checking')}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Cannot Reschedule */}
        {!loading && eligibility && !eligibility.canReschedule && step === 'check' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-bliss-900 mb-2">{t('booking:reschedule.cannotReschedule')}</h3>
            <p className="text-bliss-700 mb-4">
              {eligibility.reason || t('booking:reschedule.notEligibleDefault')}
            </p>

            {eligibility.hoursUntilBooking > 0 && (
              <div className="bg-bliss-100 border border-bliss-300 rounded-xl p-4 text-left mb-6">
                <div className="flex items-center gap-2 text-bliss-700 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">{t('booking:reschedule.hoursUntilBooking', { hours: eligibility.hoursUntilBooking.toFixed(1) })}</span>
                </div>
                <p className="text-sm text-bliss-600">
                  {t('booking:reschedule.policyMessage')}
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-6 py-3 bg-bliss-100 text-bliss-700 rounded-xl font-medium hover:bg-bliss-200 transition"
            >
              {t('common:action.close')}
            </button>
          </div>
        )}

        {/* Date/Time Selection */}
        {step === 'select' && eligibility?.canReschedule && (
          <div className="space-y-6">
            {/* Current Booking Info */}
            <div className="bg-bliss-100 rounded-xl p-4">
              <p className="text-sm text-bliss-500 mb-1">{t('booking:reschedule.currentBooking')}</p>
              <p className="font-medium text-bliss-900">{serviceName}</p>
              <p className="text-sm text-bliss-700">{t('booking:dateTime', { date: formatDate(currentDate), time: currentTime })}</p>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-3">
                {t('booking:reschedule.selectNewDate')}
              </label>
              <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-bliss-100 rounded-lg transition"
                  >
                    <ChevronLeft className="w-5 h-5 text-bliss-700" />
                  </button>
                  <span className="font-medium text-bliss-900">
                    {currentMonth.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-bliss-100 rounded-lg transition"
                  >
                    <ChevronRight className="w-5 h-5 text-bliss-700" />
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['common:dayOfWeek.sun', 'common:dayOfWeek.mon', 'common:dayOfWeek.tue', 'common:dayOfWeek.wed', 'common:dayOfWeek.thu', 'common:dayOfWeek.fri', 'common:dayOfWeek.sat'].map((dayKey) => (
                    <div key={dayKey} className="text-center text-xs font-medium text-bliss-500 py-2">
                      {t(dayKey)}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentMonth).map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} />
                    }

                    // Use local date format to avoid timezone issues
                    const year = date.getFullYear()
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const day = String(date.getDate()).padStart(2, '0')
                    const dateStr = `${year}-${month}-${day}`
                    const isSelectable = isDateSelectable(new Date(date))
                    const isSelected = selectedDate === dateStr
                    const isToday = new Date().toDateString() === date.toDateString()

                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          if (isSelectable) {
                            setSelectedDate(dateStr)
                            setSelectedTime('')
                          }
                        }}
                        disabled={!isSelectable}
                        className={`p-2 text-sm rounded-lg transition ${
                          isSelected
                            ? 'bg-bliss-600 text-white font-bold'
                            : isSelectable
                            ? 'hover:bg-bliss-200 text-bliss-700'
                            : 'text-bliss-300 cursor-not-allowed'
                        } ${isToday && !isSelected ? 'ring-2 ring-bliss-400' : ''}`}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-1">
                  {t('booking:reschedule.selectNewTime')}
                </label>
                <p className="text-xs text-bliss-500 mb-3">{t('booking:reschedule.timeHint')}</p>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {TIME_SLOTS.map((time) => {
                    const isSelected = selectedTime === time
                    // Same-day only: block slots already past / inside the lead-time window,
                    // and the booking's own current slot (no-op reschedule).
                    const isPast = !isRescheduleTimeAvailable(selectedDate, time, { minLeadMinutes: RESCHEDULE_MIN_LEAD_MINUTES })
                    const isNoOp = isSameBookingSlot(selectedDate, time, currentDate, currentTime)
                    const isDisabled = isPast || isNoOp

                    return (
                      <button
                        key={time}
                        onClick={() => !isDisabled && setSelectedTime(time)}
                        disabled={isDisabled}
                        className={`px-3 py-2 text-sm rounded-lg border-2 transition ${
                          isSelected
                            ? 'border-bliss-600 bg-bliss-100 text-bliss-600 font-medium'
                            : isDisabled
                            ? 'border-bliss-100 text-bliss-300 cursor-not-allowed'
                            : 'border-bliss-200 hover:border-bliss-400 text-bliss-700'
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-bliss-300 text-bliss-700 rounded-xl font-medium hover:bg-bliss-100 transition"
              >
                {t('common:action.cancel')}
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 px-6 py-3 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('booking:reschedule.continue')}
              </button>
            </div>
          </div>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-bliss-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-bliss-600" />
            </div>
            <h3 className="text-xl font-bold text-bliss-900 mb-2">{t('booking:reschedule.confirmTitle')}</h3>
            <p className="text-bliss-700 mb-6">
              {t('booking:reschedule.confirmMessage')}
            </p>

            <div className="bg-bliss-100 rounded-xl p-4 text-left mb-6 space-y-4">
              <div>
                <p className="text-sm text-bliss-500 mb-1">{t('booking:reschedule.originalDateTime')}</p>
                <p className="font-medium text-bliss-900 line-through opacity-60">
                  {t('booking:dateTime', { date: formatDate(currentDate), time: currentTime })}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 bg-bliss-200 rounded-full flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-bliss-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-bliss-500 mb-1">{t('booking:reschedule.newDateTime')}</p>
                <p className="font-bold text-bliss-600 text-lg">
                  {t('booking:dateTime', { date: formatDate(selectedDate), time: selectedTime })}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-bliss-300 text-bliss-700 rounded-xl font-medium hover:bg-bliss-100 transition disabled:opacity-50"
              >
                {t('common:action.back')}
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {t('booking:reschedule.processing')}
                  </>
                ) : (
                  t('booking:reschedule.confirmButton')
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success Result */}
        {step === 'result' && success && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-bliss-900 mb-2">{t('booking:reschedule.successTitle')}</h3>
            <p className="text-bliss-700 mb-4">
              {t('booking:reschedule.successMessage', { number: bookingNumber })}
            </p>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left mb-6">
              <div className="flex items-start gap-2">
                <Calendar className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">{t('booking:reschedule.newAppointment')}</p>
                  <p className="text-sm text-green-700">
                    {t('booking:dateTime', { date: formatDate(selectedDate), time: selectedTime })}
                  </p>
                </div>
              </div>
            </div>

            {/* Staff-lock outcome: same therapist kept vs re-acceptance pending */}
            {rescheduleResult?.staff_kept && (
              <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4 text-left mb-6 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-bliss-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-bliss-700">{t('booking:reschedule.staffKept')}</p>
              </div>
            )}
            {rescheduleResult?.staff_unassigned && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6 flex items-start gap-2">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">{t('booking:reschedule.staffReaccept')}</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-8 py-3 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition"
            >
              {t('common:action.close')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
