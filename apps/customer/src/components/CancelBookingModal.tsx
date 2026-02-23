/**
 * Customer Cancel Booking Modal
 * Allows customers to cancel their bookings with policy-based rules
 */

import { useState, useEffect } from 'react'
import { Modal } from '@bliss/ui'
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
}

// Pre-defined cancellation reasons in Thai
const CANCELLATION_REASONS = [
  'ติดธุระกะทันหัน',
  'เปลี่ยนแผนการเดินทาง',
  'ไม่สะดวกในวันที่เลือก',
  'มีปัญหาสุขภาพ',
  'อื่นๆ',
]

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
}: CancelBookingModalProps) {
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
      const policyRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/cancellation-policy`)
      if (policyRes.ok) {
        const policyData = await policyRes.json()
        setPolicy(policyData.data)
      }

      // Check booking eligibility
      const checkRes = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/cancellation-policy/check/${bookingId}`
      )

      if (!checkRes.ok) {
        throw new Error('ไม่สามารถตรวจสอบสถานะการยกเลิกได้')
      }

      const checkData = await checkRes.json()
      setEligibility(checkData.data)

      // Calculate refund amount
      if (paymentStatus === 'paid' && checkData.data.refundPercentage > 0) {
        setRefundAmount(Math.round(totalPrice * checkData.data.refundPercentage / 100))
      }

      // Auto move to reason step if eligible
      if (checkData.data.canCancel) {
        setStep('reason')
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCancel = async () => {
    const reason = selectedReason === 'อื่นๆ' ? customReason : selectedReason

    if (!reason.trim()) {
      setError('กรุณาระบุเหตุผลในการยกเลิก')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onConfirm(reason)
      setSuccess(true)
      setStep('result')
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการยกเลิก')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ยกเลิกการจอง" size="md">
      <div className="py-4">
        {/* Loading State */}
        {loading && step === 'check' && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-4" />
            <p className="text-stone-600">กำลังตรวจสอบเงื่อนไขการยกเลิก...</p>
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
            <h3 className="text-xl font-bold text-stone-900 mb-2">ไม่สามารถยกเลิกได้</h3>
            <p className="text-stone-600 mb-4">
              {eligibility.reason || 'การจองนี้ไม่สามารถยกเลิกได้ในขณะนี้'}
            </p>

            {eligibility.hoursUntilBooking > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">เหลือเวลา {eligibility.hoursUntilBooking.toFixed(1)} ชั่วโมงก่อนนัด</span>
                </div>
                <p className="text-sm text-amber-700">
                  ตามนโยบาย ต้องยกเลิกล่วงหน้าอย่างน้อย 3 ชั่วโมงก่อนเวลานัด
                </p>
              </div>
            )}

            {eligibility.canReschedule && (
              <p className="text-sm text-stone-500 mb-4">
                หากต้องการเปลี่ยนเวลา สามารถเลื่อนนัดแทนการยกเลิกได้
              </p>
            )}

            <button
              onClick={onClose}
              className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition"
            >
              ปิด
            </button>
          </div>
        )}

        {/* Reason Selection */}
        {step === 'reason' && eligibility?.canCancel && (
          <div className="space-y-6">
            {/* Booking Summary */}
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="text-sm text-stone-500 mb-1">การจองที่จะยกเลิก</p>
              <p className="font-medium text-stone-900">{serviceName}</p>
              <p className="text-sm text-stone-600">{formatDate(bookingDate)} เวลา {bookingTime}</p>
              <p className="text-sm text-stone-500">หมายเลข: {bookingNumber}</p>
            </div>

            {/* Refund Info */}
            {paymentStatus === 'paid' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-800">จำนวนเงินที่จะได้รับคืน</p>
                    <p className="text-sm text-green-700">
                      {eligibility.refundPercentage}% ของยอดชำระ
                      {policy?.settings?.refund_processing_days && (
                        <span> (ภายใน {policy.settings.refund_processing_days} วันทำการ)</span>
                      )}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">฿{refundAmount.toLocaleString()}</p>
                </div>
              </div>
            )}

            {paymentStatus === 'paid' && eligibility.refundPercentage === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">ไม่มีการคืนเงิน</p>
                    <p className="text-sm text-amber-700">
                      ตามเงื่อนไข การยกเลิกในช่วงเวลานี้จะไม่ได้รับเงินคืน
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">
                เหตุผลในการยกเลิก <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {CANCELLATION_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      selectedReason === reason
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-stone-700">{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReason === 'อื่นๆ' && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="ระบุเหตุผล..."
                  rows={3}
                  className="w-full mt-3 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedReason || (selectedReason === 'อื่นๆ' && !customReason.trim())}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ดำเนินการต่อ
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
            <h3 className="text-xl font-bold text-stone-900 mb-2">ยืนยันการยกเลิกการจอง</h3>
            <p className="text-stone-600 mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="bg-stone-50 rounded-xl p-4 text-left mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-600">บริการ:</span>
                  <span className="font-medium text-stone-900">{serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">วันที่:</span>
                  <span className="font-medium text-stone-900">{formatDate(bookingDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">เวลา:</span>
                  <span className="font-medium text-stone-900">{bookingTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">เหตุผล:</span>
                  <span className="font-medium text-stone-900">
                    {selectedReason === 'อื่นๆ' ? customReason : selectedReason}
                  </span>
                </div>
                {paymentStatus === 'paid' && refundAmount > 0 && (
                  <div className="flex justify-between pt-2 border-t border-stone-200">
                    <span className="text-stone-600">เงินคืน:</span>
                    <span className="font-bold text-green-600">฿{refundAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('reason')}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition disabled:opacity-50"
              >
                กลับ
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    กำลังดำเนินการ...
                  </>
                ) : (
                  'ยืนยันยกเลิกการจอง'
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
            <h3 className="text-xl font-bold text-stone-900 mb-2">ยกเลิกการจองเรียบร้อยแล้ว</h3>
            <p className="text-stone-600 mb-4">
              การจองหมายเลข {bookingNumber} ถูกยกเลิกเรียบร้อยแล้ว
            </p>

            {paymentStatus === 'paid' && refundAmount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left mb-6">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">การคืนเงินอยู่ระหว่างดำเนินการ</p>
                    <p className="text-sm text-green-700">
                      คุณจะได้รับเงินคืน ฿{refundAmount.toLocaleString()} ภายใน {policy?.settings?.refund_processing_days || 14} วันทำการ
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-8 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition"
            >
              ปิด
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
