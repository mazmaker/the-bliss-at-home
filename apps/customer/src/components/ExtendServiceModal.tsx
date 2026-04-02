/**
 * Customer App - ExtendServiceModal Component
 * Modal for customers to extend their booking service duration
 */

import React, { useState, useEffect, useMemo } from 'react'
import { X, Clock, CreditCard, AlertTriangle, CheckCircle, User, Calendar, Sparkles, Tag } from 'lucide-react'
import { useExtendBooking } from '../hooks/useExtendBooking'
import { BookingWithExtensions, ExtensionOption } from '../types/extendService'
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
  const [selectedDuration, setSelectedDuration] = useState<number>()
  const [notes, setNotes] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState<PromoValidationResult | null>(null)

  const {
    loading,
    error,
    extensionOptions,
    extendBooking,
    loadExtensionOptions,
    clearError
  } = useExtendBooking()

  // Load extension options when modal opens
  useEffect(() => {
    loadExtensionOptions(booking.id)
  }, [booking.id, loadExtensionOptions])

  // Calculate current totals
  const currentTotals = useMemo(() => {
    const totalDuration = booking.booking_services
      .reduce((sum, service) => sum + service.duration, 0)

    return {
      duration: totalDuration,
      price: booking.final_price,
      extensionCount: booking.extension_count || 0
    }
  }, [booking])

  // Get selected option details with promo discount
  const selectedOption = useMemo(() => {
    const option = extensionOptions.find(option => option.duration === selectedDuration)
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
  }, [extensionOptions, selectedDuration, appliedPromo])

  const handleConfirm = async () => {
    if (!selectedDuration) {
      alert('กรุณาเลือกเวลาที่ต้องการเพิ่ม')
      return
    }

    if (!acceptTerms) {
      alert('กรุณายอมรับเงื่อนไขการชำระเงินเพิ่มเติม')
      return
    }

    try {
      const result = await extendBooking({
        bookingId: booking.id,
        additionalDuration: selectedDuration,
        notes: notes.trim() || undefined,
        requestedBy: 'customer',
        paymentMethod: booking.payment_method,
        promotionId: appliedPromo?.valid ? appliedPromo.promotion?.id : undefined,
        discountAmount: appliedPromo?.valid ? appliedPromo.discountAmount : 0
      })

      if (result) {
        // Handle payment if required
        if (result.paymentStatus.requiresPayment && result.paymentStatus.paymentUrl) {
          // Redirect to payment page
          window.location.href = result.paymentStatus.paymentUrl
        } else {
          onConfirm()
        }
      }
    } catch (error) {
      // Error is already handled in the hook
      console.error('Extension failed:', error)
    }
  }

  const handleCancel = () => {
    clearError()
    onCancel()
  }

  // Show loading state while loading options
  if (loading && extensionOptions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            <span className="ml-3 text-stone-600">กำลังโหลดตัวเลือกเวลา...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <h3 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-600" />
            เพิ่มเวลาบริการ
          </h3>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current booking info */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
            <h4 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              การจองปัจจุบัน
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-600">
                  <User className="w-4 h-4" />
                  บริการ
                </span>
                <span className="font-medium">{booking.service.name_th}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-600">
                  <Clock className="w-4 h-4" />
                  เวลา
                </span>
                <span className="font-medium">{currentTotals.duration} นาที</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-600">
                  <CreditCard className="w-4 h-4" />
                  ราคา
                </span>
                <span className="font-medium">฿{currentTotals.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-600">
                  <Calendar className="w-4 h-4" />
                  เลขที่การจอง
                </span>
                <span className="font-medium text-amber-700">{booking.booking_number}</span>
              </div>
            </div>

            {currentTotals.extensionCount > 0 && (
              <div className="mt-3 p-2 bg-amber-100 border border-amber-300 rounded-lg">
                <span className="text-xs text-amber-800 font-medium">
                  📈 ขยายเวลาแล้ว {currentTotals.extensionCount} ครั้ง
                </span>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">ไม่สามารถเพิ่มเวลาได้</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Extension options */}
          <div className="space-y-4">
            <h4 className="font-medium text-stone-700">เลือกเวลาที่ต้องการเพิ่ม:</h4>

            {extensionOptions.length === 0 ? (
              <div className="text-center py-8 text-stone-500 bg-stone-50 rounded-xl">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <p className="font-medium">ไม่สามารถเพิ่มเวลาได้</p>
                <p className="text-sm mt-1">
                  อาจเนื่องจากเพิ่มเวลาครบจำนวนสูงสุดแล้ว หรือการจองไม่อยู่ในสถานะที่เหมาะสม
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {extensionOptions.map((option) => (
                  <label
                    key={option.duration}
                    className={`
                      flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all
                      ${selectedDuration === option.duration
                        ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/20'
                        : 'border-stone-200 hover:bg-stone-50 hover:border-stone-300'
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
                      className="w-5 h-5 text-amber-600 focus:ring-amber-500"
                    />

                    <div className="flex-1">
                      <div className="font-semibold text-stone-900">
                        + {option.duration} นาที
                      </div>
                      <div className="text-amber-600 font-medium">
                        ฿{option.price.toLocaleString()}
                      </div>
                      <div className="text-sm text-stone-600 mt-1">
                        รวมทั้งสิ้น: {option.totalNewDuration} นาที • ฿{option.totalNewPrice.toLocaleString()}
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

          {/* Promo Code */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 font-medium text-stone-700">
              <Tag className="w-4 h-4" />
              โค้ดส่วนลด (ถ้ามี):
            </h4>
            <VoucherCodeInput
              onPromoApplied={setAppliedPromo}
              bookingType="extension"
              extensionPrice={selectedOption?.price || 0}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              หมายเหตุเพิ่มเติม (ถ้ามี):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ต้องการเพิ่มเวลาเนื่องจาก..."
              rows={3}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Payment terms */}
          {selectedOption && (selectedOption.discountedPrice || selectedOption.price) > 0 && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h5 className="font-medium text-blue-800 mb-2">การชำระเงินเพิ่มเติม:</h5>
                <div className="text-sm text-blue-700 space-y-1">
                  {selectedOption.discount > 0 && (
                    <>
                      <div className="line-through text-blue-500">💳 ราคาเต็ม: ฿{selectedOption.price.toLocaleString()}</div>
                      <div className="text-green-600 font-medium">🎟️ ส่วนลด: -฿{selectedOption.discount.toLocaleString()}</div>
                      <div className="font-bold">💰 จำนวนเงิน: ฿{(selectedOption.discountedPrice || 0).toLocaleString()}</div>
                    </>
                  )}
                  {(!selectedOption.discount || selectedOption.discount === 0) && (
                    <div>💳 จำนวนเงิน: ฿{selectedOption.price.toLocaleString()}</div>
                  )}
                  <div>📱 วิธีชำระ: {booking.payment_method === 'credit_card' ? 'บัตรเครดิต' : booking.payment_method === 'bank_transfer' ? 'โอนเงิน' : 'เงินสด'}</div>
                  <div>⚡ ชำระทันทีหลังยืนยัน</div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-stone-700">
                  ฉันยอมรับการชำระเงินเพิ่มเติม ฿{(selectedOption.discountedPrice || selectedOption.price).toLocaleString()}
                  สำหรับการเพิ่มเวลาบริการ และเข้าใจว่าการชำระเงินจะดำเนินการทันทีหลังจากยืนยัน
                </span>
              </label>
            </div>
          )}

          {/* Summary */}
          {selectedOption && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h5 className="font-medium text-green-800 mb-2">สรุปการเพิ่มเวลา:</h5>
              <div className="text-sm text-green-700 space-y-1">
                <div>⏱️ เวลาเดิม: {currentTotals.duration} นาที → เวลาใหม่: {selectedOption.totalNewDuration} นาที</div>
                <div>💰 ราคาเดิม: ฿{currentTotals.price.toLocaleString()} → ราคาใหม่: ฿{(selectedOption.discountedTotalPrice || selectedOption.totalNewPrice).toLocaleString()}</div>
                <div>➕ ค่าเพิ่มเติม: ฿{(selectedOption.discountedPrice || selectedOption.price).toLocaleString()}</div>
                {selectedOption.discount > 0 && (
                  <div className="text-green-600 font-medium">🎟️ ประหยัด: ฿{selectedOption.discount.toLocaleString()}</div>
                )}
                {(selectedOption.discountedPrice || selectedOption.price) === 0 && (
                  <div className="text-green-600 font-medium">🎉 ไม่มีค่าใช้จ่ายเพิ่มเติม</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 border border-stone-300 rounded-xl text-stone-700 font-medium hover:bg-white transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              !selectedDuration ||
              loading ||
              extensionOptions.length === 0 ||
              (selectedOption && (selectedOption.discountedPrice || selectedOption.price) > 0 && !acceptTerms)
            }
            className={`
              flex-1 px-4 py-3 rounded-xl font-medium transition-colors
              ${(!selectedDuration || loading || extensionOptions.length === 0 || (selectedOption && (selectedOption.discountedPrice || selectedOption.price) > 0 && !acceptTerms))
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20'
              }
            `}
          >
            {loading ? 'กำลังดำเนินการ...' : selectedOption && (selectedOption.discountedPrice || selectedOption.price) > 0 ? `ยืนยันและชำระ ฿${(selectedOption.discountedPrice || selectedOption.price).toLocaleString()}` : 'ยืนยันเพิ่มเวลา'}
          </button>
        </div>
      </div>
    </div>
  )
}