/**
 * Customer Cancel Booking Modal
 * Allows customers to cancel their bookings with policy-based rules
 */

import { useState, useEffect } from 'react'
import { Modal } from '@bliss/ui'
import { useTranslation } from '@bliss/i18n'
import { AlertTriangle, Clock, Ban, CheckCircle, RefreshCw, Info } from 'lucide-react'

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

interface CancellationPolicy {
  settings: {
    policy_title_th: string | null
    policy_description_th: string | null
    refund_processing_days: number
  } | null
  tiers: Array<{
    min_hours_before: number
    max_hours_before: number | null
    can_cancel: boolean
    refund_percentage: number
    label_th: string | null
  }>
}

interface CancelBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  bookingId: string
  bookingNumber: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  totalPrice: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  // R-5 G19/D2: manual-QR booking → no on-platform refund; show "contact LINE OA" instead of "฿X จะคืน"
  isManualQr?: boolean
}

// Pre-defined cancellation reasons (i18n keys, resolved at render time)
const CANCELLATION_REASONS = [
  { key: 'booking:cancelReason.urgent' },
  { key: 'booking:cancelReason.travelPlanChange' },
  { key: 'booking:cancelReason.notConvenient' },
  { key: 'booking:cancelReason.health' },
  { key: 'booking:cancelReason.other' },
]

// Stable key for the "other" reason (used for logic comparisons)
const OTHER_REASON_KEY = 'booking:cancelReason.other'

export function CancelBookingModal({
  isOpen,
  onClose,
  onConfirm,
  bookingId,
  bookingNumber,
  serviceName,
  bookingDate,
  bookingTime,
  totalPrice,
  paymentStatus,
  isManualQr = false,
}: CancelBookingModalProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'cn' ? 'zh-CN' : i18n.language === 'en' ? 'en-US' : i18n.language === 'kr' ? 'ko-KR' : i18n.language === 'jp' ? 'ja-JP' : 'th-TH'
  // Auto UI/UX review test - improved component structure
  const [step, setStep] = useState<'check' | 'reason' | 'confirm' | 'result'>('check')
  const [eligibility, setEligibility] = useState<CancellationEligibility | null>(null)
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [refundAmount, setRefundAmount] = useState(0)

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
      setSelectedReason('')
      setCustomReason('')
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  const checkEligibility = async () => {
    setLoading(true)
    setError('')

    try {
      // Fetch cancellation policy
      const policyRes = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/cancellation-policy`)

      // WORKAROUND: Handle case where server returns 404 status but valid JSON data
      const responseText = await policyRes.text()
      let policyData = null

      try {
        const parsed = JSON.parse(responseText)
        if (parsed.success && parsed.data) {
          policyData = parsed
          console.log('📋 Policy data retrieved (status:', policyRes.status, ')')
        }
      } catch (parseError) {
        // If it's not JSON, then it's a real error
        if (policyRes.ok) {
          console.error('Failed to parse policy response:', parseError)
        }
      }

      if (policyData) {
        setPolicy(policyData.data)
      }

      // Check booking eligibility
      const checkRes = await fetch(
        `${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/cancellation-policy/check/${bookingId}`
      )

      // WORKAROUND: Handle case where server returns 404 status but valid JSON data
      const checkResponseText = await checkRes.text()
      let checkData = null

      try {
        const parsed = JSON.parse(checkResponseText)
        if (parsed.success && parsed.data) {
          checkData = parsed
          console.log('✅ Booking eligibility retrieved (status:', checkRes.status, ')')
        } else if (parsed.success === false) {
          throw new Error(parsed.error || t('booking:cancelBooking.checkError'))
        }
      } catch (parseError) {
        // If it's not JSON, then it's a real error
        if (!checkRes.ok) {
          throw new Error(t('booking:cancelBooking.checkError'))
        }
      }

      if (!checkData) {
        throw new Error(t('booking:cancelBooking.checkError'))
      }

      // Safe check for API response
      if (!checkData || !checkData.data) {
        throw new Error(t('booking:cancelBooking.invalidData'))
      }

      const eligibilityData = checkData.data
      setEligibility(eligibilityData)

      // Calculate refund amount with safe checking
      // R-5 G19: manual-QR booking gets no on-platform refund — keep refundAmount at 0
      if (!isManualQr && paymentStatus === 'paid' && eligibilityData.refundPercentage && eligibilityData.refundPercentage > 0) {
        setRefundAmount(Math.round(totalPrice * eligibilityData.refundPercentage / 100))
      }

      // Auto move to reason step if eligible
      if (eligibilityData.canCancel) {
        setStep('reason')
      }
    } catch (err: any) {
      setError(err.message || t('booking:cancelBooking.checkFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCancel = async () => {
    const reason = selectedReason === OTHER_REASON_KEY ? customReason : t(selectedReason)

    if (!reason.trim()) {
      setError(t('booking:cancelBooking.reasonRequired'))
      return
    }

    setLoading(true)
    setError('')

    try {
      await onConfirm(reason)
      setSuccess(true)
      setStep('result')
    } catch (err: any) {
      setError(err.message || t('booking:cancelBooking.cancelFailed'))
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('booking:cancelBooking.title')} size="md">
      <div className="py-4">
        {/* Loading State */}
        {loading && step === 'check' && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-bliss-600 animate-spin mx-auto mb-4" />
            <p className="text-bliss-700">{t('booking:cancelBooking.checking')}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Cannot Cancel */}
        {!loading && eligibility && !eligibility.canCancel && step === 'check' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-bliss-900 mb-2">{t('booking:cancelBooking.cannotCancel')}</h3>
            <p className="text-bliss-700 mb-4">
              {eligibility.reason || t('booking:cancelBooking.notEligible')}
            </p>

            {eligibility.hoursUntilBooking > 0 && (
              <div className="bg-bliss-100 border border-bliss-300 rounded-xl p-4 text-left mb-6">
                <div className="flex items-center gap-2 text-bliss-700 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">{t('booking:cancelBooking.hoursUntilBooking', { hours: eligibility.hoursUntilBooking.toFixed(1) })}</span>
                </div>
                <p className="text-sm text-bliss-600">
                  {t('booking:cancelBooking.policyMessage')}
                </p>
              </div>
            )}

            {/* P6: reschedule is admin-only — the "you can reschedule instead" hint was removed
                (customers can no longer self-reschedule; they contact the admin via LINE). */}

            <button
              onClick={onClose}
              className="px-6 py-3 bg-bliss-100 text-bliss-700 rounded-xl font-medium hover:bg-bliss-200 transition"
            >
              {t('common:button.close')}
            </button>
          </div>
        )}

        {/* Reason Selection */}
        {step === 'reason' && eligibility?.canCancel && (
          <div className="space-y-6">
            {/* Booking Summary */}
            <div className="bg-bliss-100 rounded-xl p-4">
              <p className="text-sm text-bliss-500 mb-1">{t('booking:cancelBooking.bookingSummary')}</p>
              <p className="font-medium text-bliss-900">{serviceName}</p>
              <p className="text-sm text-bliss-700">{t('booking:dateTime', { date: formatDate(bookingDate), time: bookingTime })}</p>
              <p className="text-sm text-bliss-500">{t('booking:bookingNumberLabel')} {bookingNumber}</p>
            </div>

            {/* Refund Info */}
            {/* R-5 G19/D2: manual-QR → off-platform refund notice, not the fake "฿X จะคืน" */}
            {paymentStatus === 'paid' && isManualQr && (
              <div className="bg-bliss-100 border border-bliss-300 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-bliss-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-bliss-700">{t('booking:cancelBooking.manualQrRefundNotice')}</p>
                </div>
              </div>
            )}
            {paymentStatus === 'paid' && !isManualQr && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-800">{t('booking:cancelBooking.refundAmount')}</p>
                    <p className="text-sm text-green-700">
                      {t('booking:cancelBooking.refundPercentage', { percentage: eligibility.refundPercentage })}
                      {policy?.settings?.refund_processing_days && (
                        <span> {t('booking:cancelBooking.refundWithinDays', { days: policy.settings.refund_processing_days })}</span>
                      )}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">฿{refundAmount.toLocaleString()}</p>
                </div>
              </div>
            )}

            {paymentStatus === 'paid' && !isManualQr && eligibility.refundPercentage === 0 && (
              <div className="bg-bliss-100 border border-bliss-300 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-bliss-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-bliss-700">{t('booking:cancelBooking.noRefund')}</p>
                    <p className="text-sm text-bliss-600">
                      {t('booking:cancelBooking.noRefundReason')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-3">
                {t('booking:cancelBooking.reasonLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {CANCELLATION_REASONS.map((reason) => (
                  <label
                    key={reason.key}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      selectedReason === reason.key
                        ? 'border-bliss-600 bg-bliss-100'
                        : 'border-bliss-200 hover:border-bliss-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason.key}
                      checked={selectedReason === reason.key}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="w-4 h-4 text-bliss-600 focus:ring-bliss-600"
                    />
                    <span className="text-bliss-700">{t(reason.key)}</span>
                  </label>
                ))}
              </div>

              {selectedReason === OTHER_REASON_KEY && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder={t('booking:cancelBooking.reasonPlaceholder')}
                  rows={3}
                  className="w-full mt-3 px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-bliss-300 text-bliss-700 rounded-xl font-medium hover:bg-bliss-100 transition"
              >
                {t('common:button.cancel')}
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedReason || (selectedReason === OTHER_REASON_KEY && !customReason.trim())}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common:button.continue')}
              </button>
            </div>
          </div>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-bliss-900 mb-2">{t('booking:cancelBooking.confirmTitle')}</h3>
            <p className="text-bliss-700 mb-6">
              {t('booking:cancelBooking.confirmMessage')}
            </p>

            <div className="bg-bliss-100 rounded-xl p-4 text-left mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-bliss-700">{t('booking:cancelBooking.service')}</span>
                  <span className="font-medium text-bliss-900">{serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bliss-700">{t('booking:cancelBooking.date')}</span>
                  <span className="font-medium text-bliss-900">{formatDate(bookingDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bliss-700">{t('booking:cancelBooking.time')}</span>
                  <span className="font-medium text-bliss-900">{bookingTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bliss-700">{t('booking:cancelBooking.reason')}</span>
                  <span className="font-medium text-bliss-900">
                    {selectedReason === OTHER_REASON_KEY ? customReason : t(selectedReason)}
                  </span>
                </div>
                {/* R-5 G19/D2: manual-QR → off-platform refund notice in the confirm summary */}
                {paymentStatus === 'paid' && isManualQr && (
                  <div className="flex justify-between pt-2 border-t border-bliss-200">
                    <span className="text-bliss-700">{t('booking:cancelBooking.refund')}</span>
                    <span className="text-sm text-bliss-700 text-right max-w-[60%]">{t('booking:cancelBooking.manualQrRefundNotice')}</span>
                  </div>
                )}
                {paymentStatus === 'paid' && !isManualQr && refundAmount > 0 && (
                  <div className="flex justify-between pt-2 border-t border-bliss-200">
                    <span className="text-bliss-700">{t('booking:cancelBooking.refund')}</span>
                    <span className="font-bold text-green-600">฿{refundAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('reason')}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-bliss-300 text-bliss-700 rounded-xl font-medium hover:bg-bliss-100 transition disabled:opacity-50"
              >
                {t('common:button.back')}
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {t('booking:cancelBooking.processing')}
                  </>
                ) : (
                  t('booking:cancelBooking.confirmButton')
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
            <h3 className="text-xl font-bold text-bliss-900 mb-2">{t('booking:cancelBooking.successTitle')}</h3>
            <p className="text-bliss-700 mb-4">
              {t('booking:cancelBooking.successMessage', { bookingNumber })}
            </p>

            {/* R-5 G19/D2: manual-QR → post-cancel off-platform refund notice, not the fake "฿X จะคืน" green box */}
            {paymentStatus === 'paid' && isManualQr && (
              <div className="bg-bliss-100 border border-bliss-300 rounded-xl p-4 text-left mb-6">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-bliss-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-bliss-700">{t('booking:cancelBooking.manualQrRefundNotice')}</p>
                </div>
              </div>
            )}
            {paymentStatus === 'paid' && !isManualQr && refundAmount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left mb-6">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">{t('booking:cancelBooking.refundProcessing')}</p>
                    <p className="text-sm text-green-700">
                      {t('booking:cancelBooking.refundInfo', { amount: refundAmount.toLocaleString(), days: policy?.settings?.refund_processing_days || 14 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-8 py-3 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition"
            >
              {t('common:button.close')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
