/**
 * Customer App - ExtendServiceModal Component
 * Modal for customers to extend their booking service duration
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Clock, CreditCard, AlertTriangle, CheckCircle, User, Users, Calendar, Sparkles, Tag } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'
import { useExtendBooking } from '../hooks/useExtendBooking'
import { pickLang } from '../utils/serviceUtils'
import { BookingWithExtensions, ExtensionOption, EXTENSION_BUSINESS_RULES } from '../types/extendService'
import { getBookingExtensionInfo, type BookingExtensionInfo } from '../services/extendBookingService'
import { VoucherCodeInput } from './VoucherCodeInput'
import type { PromoValidationResult } from '../types/promotion'

interface ExtendServiceModalProps {
  booking: BookingWithExtensions
  onConfirm: () => void
  onCancel: () => void
}

export function ExtendServiceModal({
  booking,
  onConfirm,
  onCancel
}: ExtendServiceModalProps) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('extension')
  const [selectedDuration, setSelectedDuration] = useState<number>()
  const [notes, setNotes] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState<PromoValidationResult | null>(null)
  // COUPLE support: per-recipient info + which recipient(s) the customer chose to extend.
  const [coupleInfo, setCoupleInfo] = useState<BookingExtensionInfo | null>(null)
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([])

  const {
    loading,
    error,
    extensionOptions,
    loadExtensionOptions,
    clearError
  } = useExtendBooking()

  // Load extension options when modal opens
  useEffect(() => {
    loadExtensionOptions(booking.id)
  }, [booking.id, loadExtensionOptions])

  // Load per-recipient info (drives the couple selector). Default the selection to the first recipient.
  useEffect(() => {
    let active = true
    getBookingExtensionInfo(booking.id)
      .then((info) => {
        if (!active) return
        setCoupleInfo(info)
        setSelectedRecipients(info.recipients.length > 0 ? [info.recipients[0].recipientIndex] : [])
      })
      .catch(() => { if (active) setCoupleInfo(null) })
    return () => { active = false }
  }, [booking.id])

  const isCouple = !!coupleInfo?.isCouple

  // Couple: recompute duration options for the SELECTED recipient(s) (each priced by its own service;
  // "ทั้งคู่" sums both). Single/non-couple keeps the server-computed extensionOptions unchanged.
  const coupleOptions = useMemo<ExtensionOption[]>(() => {
    if (!coupleInfo || !isCouple || selectedRecipients.length === 0) return []
    const chosen = coupleInfo.recipients.filter(r => selectedRecipients.includes(r.recipientIndex))
    if (chosen.length === 0) return []
    const maxCurrent = Math.max(...chosen.map(r => r.currentDuration))
    // Deadline gates on the earliest-ending SELECTED recipient (each has its own end); a duration is
    // offered only if EVERY chosen recipient's service supports it (avoids a phantom ฿0 option when the
    // two couple services have different duration_options).
    const selectionWithinDeadline = chosen.every(r => r.withinDeadline)
    return coupleInfo.availableDurations
      .filter(d => d > 0 && chosen.every(r => r.prices[d] !== undefined))
      .map(d => {
        const price = chosen.reduce((sum, r) => sum + (r.prices[d] ?? 0), 0)
        const totalNewDuration = maxCurrent + d
        const isAvailable = selectionWithinDeadline
          && totalNewDuration <= EXTENSION_BUSINESS_RULES.MAX_TOTAL_DURATION
          && coupleInfo.extensionCount < EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING
          && d >= EXTENSION_BUSINESS_RULES.MIN_EXTENSION_DURATION
        return { duration: d, price, totalNewDuration, totalNewPrice: booking.final_price + price, isAvailable }
      })
      .filter(o => o.isAvailable)
  }, [coupleInfo, isCouple, selectedRecipients, booking.final_price])

  const displayOptions = isCouple ? coupleOptions : extensionOptions

  // Reset the chosen duration if it's no longer offered after a recipient change.
  useEffect(() => {
    if (selectedDuration && !displayOptions.some(o => o.duration === selectedDuration)) {
      setSelectedDuration(undefined)
    }
  }, [displayOptions, selectedDuration])

  // Calculate current totals
  const currentTotals = useMemo(() => {
    // Couple: show the current duration of the selected recipient(s) (max), not a cross-recipient sum.
    if (isCouple && coupleInfo && selectedRecipients.length > 0) {
      const chosen = coupleInfo.recipients.filter(r => selectedRecipients.includes(r.recipientIndex))
      return {
        duration: chosen.length > 0 ? Math.max(...chosen.map(r => r.currentDuration)) : 0,
        price: booking.final_price,
        extensionCount: coupleInfo.extensionCount,
      }
    }
    // Single: duration from booking_services (base recipient) or booking.duration.
    const targetRecipient = booking.booking_services?.find(s => !s.is_extension)?.recipient_index ?? 0
    const totalDuration = booking.booking_services && booking.booking_services.length > 0
      ? booking.booking_services
          .filter(service => (service.recipient_index ?? 0) === targetRecipient)
          .reduce((sum, service) => sum + service.duration, 0)
      : booking.duration || 0

    return {
      duration: totalDuration,
      price: booking.final_price,
      extensionCount: booking.extension_count || 0
    }
  }, [booking, isCouple, coupleInfo, selectedRecipients])

  // Get selected option details with promo discount
  const selectedOption = useMemo(() => {
    if (!displayOptions || !Array.isArray(displayOptions)) return null
    const option = displayOptions.find(option => option.duration === selectedDuration)
    if (!option) return null

    // Apply promo discount if available
    const discountAmount = appliedPromo?.valid ? appliedPromo.discountAmount : 0
    const finalPrice = Math.max(0, option.price - discountAmount)
    const finalTotalPrice = Math.max(0, option.totalNewPrice - discountAmount)

    return {
      ...option,
      discountedPrice: finalPrice,
      discountedTotalPrice: finalTotalPrice,
      discount: discountAmount
    }
  }, [displayOptions, selectedDuration, appliedPromo])

  const handleConfirm = () => {
    if (!selectedDuration) {
      alert(t('modal.alertSelectDuration'))
      return
    }

    const finalPrice = selectedOption ? (selectedOption.discountedPrice ?? selectedOption.price) : 0

    if (finalPrice > 0 && !acceptTerms) {
      alert(t('modal.alertAcceptTerms'))
      return
    }

    // COUPLE: pass the chosen recipient(s) so the server extends the right person(s), not [0].
    const recipientParam = isCouple && selectedRecipients.length > 0 ? selectedRecipients.join(',') : ''

    if (finalPrice === 0) {
      // Free extension: navigate to extension-payment with zero amount so it handles immediately
      const params = new URLSearchParams({
        booking_id: booking.id,
        booking_number: booking.booking_number || '',
        duration: String(selectedDuration),
        amount: '0',
      })
      if (recipientParam) params.set('recipient_indices', recipientParam)
      if (notes.trim()) params.set('notes', notes.trim())
      navigate(`/extension-payment?${params.toString()}`)
      onConfirm()
      return
    }

    // Paid extension: navigate to payment page for method selection
    const params = new URLSearchParams({
      booking_id: booking.id,
      booking_number: booking.booking_number || '',
      duration: String(selectedDuration),
      amount: String(finalPrice),
    })
    if (recipientParam) params.set('recipient_indices', recipientParam)
    // Promo is offered for single-recipient extends only (couple discount-splitting is not supported).
    if (!isCouple && appliedPromo?.valid && appliedPromo.promotion?.id) {
      params.set('promotion_id', appliedPromo.promotion.id)
    }
    if (!isCouple && appliedPromo?.valid && appliedPromo.discountAmount && appliedPromo.discountAmount > 0) {
      params.set('discount_amount', String(appliedPromo.discountAmount))
    }
    if (notes.trim()) params.set('notes', notes.trim())
    navigate(`/extension-payment?${params.toString()}`)
  }

  const handleCancel = () => {
    clearError()
    onCancel()
  }

  // Show loading state while loading options
  if (loading && extensionOptions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-bliss-50 rounded-2xl p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bliss-600"></div>
            <span className="ml-3 text-bliss-700">{t('modal.loadingOptions')}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bliss-50 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-bliss-200">
          <h3 className="text-xl font-semibold text-bliss-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-bliss-600" />
            {t('modal.title')}
          </h3>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-bliss-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-bliss-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current booking info */}
          <div className="bg-bliss-100 p-4 rounded-xl border border-bliss-300">
            <h4 className="font-medium text-bliss-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('modal.currentBooking')}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-bliss-700">
                  <User className="w-4 h-4" />
                  {t('modal.service')}
                </span>
                <span className="font-medium">{pickLang(booking.service, 'name', i18n.language)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-bliss-700">
                  <Clock className="w-4 h-4" />
                  {t('modal.duration')}
                </span>
                <span className="font-medium">{currentTotals.duration} {t('modal.minutes')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-bliss-700">
                  <CreditCard className="w-4 h-4" />
                  {t('modal.price')}
                </span>
                <span className="font-medium">฿{currentTotals.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-bliss-700">
                  <Calendar className="w-4 h-4" />
                  {t('modal.bookingNumber')}
                </span>
                <span className="font-medium text-bliss-600">{booking.booking_number}</span>
              </div>
            </div>

            {currentTotals.extensionCount > 0 && (
              <div className="mt-3 p-2 bg-bliss-200 border border-bliss-400 rounded-lg">
                <span className="text-xs text-bliss-700 font-medium">
                  {t('modal.extendedTimes', { count: currentTotals.extensionCount })}
                </span>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">{t('modal.cannotExtend')}</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Recipient selector (COUPLE only) — choose คนที่1 / คนที่2 / ทั้งคู่ */}
          {isCouple && coupleInfo && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 font-medium text-bliss-700">
                <Users className="w-4 h-4" />
                {i18n.language === 'en' ? 'Extend for' : i18n.language === 'zh' ? '为谁延长' : 'เพิ่มเวลาให้'}
              </h4>
              <div className="grid gap-2">
                {[
                  ...coupleInfo.recipients.map((r) => ({
                    key: `r${r.recipientIndex}`,
                    indices: [r.recipientIndex],
                    label: (i18n.language === 'en' ? `Person ${r.recipientIndex + 1}` : i18n.language === 'zh' ? `第${r.recipientIndex + 1}人` : `คนที่ ${r.recipientIndex + 1}`),
                    sub: (i18n.language === 'en' ? r.serviceNameEn : r.serviceNameTh) || '',
                  })),
                  {
                    key: 'both',
                    indices: coupleInfo.recipients.map((r) => r.recipientIndex),
                    label: (i18n.language === 'en' ? 'Both' : i18n.language === 'zh' ? '两人' : 'ทั้งคู่'),
                    sub: '',
                  },
                ].map((choice) => {
                  const active = selectedRecipients.length === choice.indices.length &&
                    choice.indices.every((i) => selectedRecipients.includes(i))
                  return (
                    <label
                      key={choice.key}
                      className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${active ? 'border-bliss-600 bg-bliss-100' : 'border-bliss-200 hover:bg-bliss-100'}`}
                    >
                      <input
                        type="radio"
                        name="recipient"
                        checked={active}
                        onChange={() => setSelectedRecipients(choice.indices)}
                        className="w-5 h-5 text-bliss-600 focus:ring-bliss-600"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-bliss-900">{choice.label}</div>
                        {choice.sub && <div className="text-sm text-bliss-600">{choice.sub}</div>}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Extension options */}
          <div className="space-y-4">
            <h4 className="font-medium text-bliss-700">{t('modal.selectDuration')}</h4>

            {displayOptions.length === 0 ? (
              <div className="text-center py-8 text-bliss-500 bg-bliss-100 rounded-xl">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <p className="font-medium">{t('modal.noOptions')}</p>
                <p className="text-sm mt-1">
                  {t('modal.noOptionsHint')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayOptions.map((option) => (
                  <label
                    key={option.duration}
                    className={`
                      flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all
                      ${selectedDuration === option.duration
                        ? 'border-bliss-600 bg-bliss-100 shadow-lg shadow-bliss-600/20'
                        : 'border-bliss-200 hover:bg-bliss-100 hover:border-bliss-300'
                      }
                      ${!option.isAvailable ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
                    `}
                  >
                    <input
                      type="radio"
                      name="duration"
                      value={option.duration}
                      checked={selectedDuration === option.duration}
                      onChange={(e) => setSelectedDuration(Number(e.target.value))}
                      disabled={!option.isAvailable}
                      className="w-5 h-5 text-bliss-600 focus:ring-bliss-600"
                    />

                    <div className="flex-1">
                      <div className="font-semibold text-bliss-900">
                        {t('modal.addMinutes', { minutes: option.duration })}
                      </div>
                      <div className="text-bliss-600 font-medium">
                        ฿{option.price.toLocaleString()}
                      </div>
                      <div className="text-sm text-bliss-700 mt-1">
                        {t('modal.totalAll', { duration: option.totalNewDuration, price: option.totalNewPrice.toLocaleString() })}
                      </div>
                    </div>

                    {option.isAvailable && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Promo Code — single-recipient extends only (couple discount-splitting unsupported) */}
          {!isCouple && (
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-medium text-bliss-700">
                <Tag className="w-4 h-4" />
                {t('modal.promoCode')}
              </h4>
              <VoucherCodeInput
                orderAmount={selectedOption?.price || 0}
                userId={booking.customer_id}
                serviceIds={[booking.service.id]}
                categories={[booking.service.category]}
                appliedPromo={appliedPromo}
                onApply={setAppliedPromo}
                onRemove={() => setAppliedPromo(null)}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-bliss-700 mb-2">
              {t('modal.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('modal.notesPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-bliss-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600"
            />
          </div>

          {/* Payment terms */}
          {selectedOption && (selectedOption.discountedPrice || selectedOption.price) > 0 && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h5 className="font-medium text-blue-800 mb-2">{t('modal.paymentTitle')}</h5>
                <div className="text-sm text-blue-700 space-y-1">
                  {selectedOption.discount > 0 && (
                    <>
                      <div className="line-through text-blue-500">{t('modal.fullPrice', { price: selectedOption.price.toLocaleString() })}</div>
                      <div className="text-green-600 font-medium">{t('modal.discount', { amount: selectedOption.discount.toLocaleString() })}</div>
                      <div className="font-bold">{t('modal.amount', { amount: (selectedOption.discountedPrice || 0).toLocaleString() })}</div>
                    </>
                  )}
                  {(!selectedOption.discount || selectedOption.discount === 0) && (
                    <div>{t('modal.amount', { amount: selectedOption.price.toLocaleString() })}</div>
                  )}
                  <div>{t('modal.payImmediately')}</div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-bliss-600 focus:ring-bliss-600"
                />
                <span className="text-sm text-bliss-700">
                  {t('modal.acceptTerms', { amount: (selectedOption.discountedPrice || selectedOption.price).toLocaleString() })}
                </span>
              </label>
            </div>
          )}

          {/* Summary */}
          {selectedOption && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h5 className="font-medium text-green-800 mb-2">{t('modal.summaryTitle')}</h5>
              <div className="text-sm text-green-700 space-y-1">
                <div>{t('modal.summaryDuration', { from: currentTotals.duration, to: selectedOption.totalNewDuration })}</div>
                <div>{t('modal.summaryPrice', { from: currentTotals.price.toLocaleString(), to: (selectedOption.discountedTotalPrice || selectedOption.totalNewPrice).toLocaleString() })}</div>
                <div>{t('modal.summaryExtra', { amount: (selectedOption.discountedPrice || selectedOption.price).toLocaleString() })}</div>
                {selectedOption.discount > 0 && (
                  <div className="text-green-600 font-medium">{t('modal.summarySaved', { amount: selectedOption.discount.toLocaleString() })}</div>
                )}
                {(selectedOption.discountedPrice || selectedOption.price) === 0 && (
                  <div className="text-green-600 font-medium">{t('modal.summaryFree')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-bliss-200 bg-bliss-100">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 border border-bliss-300 rounded-xl text-bliss-700 font-medium hover:bg-bliss-50 transition-colors"
          >
            {t('modal.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              !selectedDuration ||
              displayOptions.length === 0 ||
              (selectedOption && (selectedOption.discountedPrice ?? selectedOption.price) > 0 && !acceptTerms)
            }
            className={`
              flex-1 px-4 py-3 rounded-xl font-medium transition-colors
              ${(!selectedDuration || extensionOptions.length === 0 || (selectedOption && (selectedOption.discountedPrice ?? selectedOption.price) > 0 && !acceptTerms))
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-bliss-600 hover:bg-bliss-600 text-white shadow-lg shadow-bliss-600/20'
              }
            `}
          >
            {selectedOption && (selectedOption.discountedPrice ?? selectedOption.price) > 0
              ? t('modal.confirmPay', { amount: (selectedOption.discountedPrice ?? selectedOption.price).toLocaleString() })
              : t('modal.confirmFree')}
          </button>
        </div>
      </div>
    </div>
  )
}