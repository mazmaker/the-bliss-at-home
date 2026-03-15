/**
 * Hotel Cancel Booking Modal
 * Uses server API for proper cancellation with policy check, job updates, and notifications
 */

import { useState, useEffect } from 'react'
import { Modal } from '@bliss/ui'
import { AlertTriangle, Clock, Ban, CheckCircle, RefreshCw, Info } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app/api' : 'http://localhost:3000/api')

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

interface HotelCancelBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  bookingId: string
  bookingNumber: string
  guestName: string
  serviceName: string
  roomNumber: string
  bookingDate: string
  bookingTime: string
}

const CANCELLATION_REASONS = [
  'แขกยกเลิกด้วยตนเอง',
  'แขกเปลี่ยนแผน',
  'แขก Check-out แล้ว',
  'ไม่สะดวกในเวลาที่จอง',
  'อื่นๆ',
]

export function HotelCancelBookingModal({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
  bookingNumber,
  guestName,
  serviceName,
  roomNumber,
  bookingDate,
  bookingTime,
}: HotelCancelBookingModalProps) {
  const [step, setStep] = useState<'check' | 'reason' | 'confirm' | 'result'>('check')
  const [eligibility, setEligibility] = useState<CancellationEligibility | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && bookingId) {
      checkEligibility()
    }
  }, [isOpen, bookingId])

  useEffect(() => {
    if (!isOpen) {
      setStep('check')
      setSelectedReason('')
      setCustomReason('')
      setError('')
      setSuccess(false)
      setEligibility(null)
    }
  }, [isOpen])

  const checkEligibility = async () => {
    setLoading(true)
    setError('')

    try {
      const checkRes = await fetch(
        `${API_BASE_URL}/cancellation-policy/check/${bookingId}`
      )

      if (!checkRes.ok) {
        throw new Error('ไม่สามารถตรวจสอบสถานะการยกเลิกได้')
      }

      const checkData = await checkRes.json()
      setEligibility(checkData.data)

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
      const response = await fetch(
        `${API_BASE_URL}/bookings/${bookingId}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason,
            refund_option: 'none',
            notify_customer: false,
            notify_staff: true,
            notify_hotel: false,
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการยกเลิก')
      }

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

  const handleClose = () => {
    if (success) {
      onSuccess()
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="ยกเลิกการจอง" size="md">
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
              onClick={handleClose}
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
              <p className="font-medium text-stone-900">{guestName} - ห้อง {roomNumber}</p>
              <p className="text-sm text-stone-600">{serviceName}</p>
              <p className="text-sm text-stone-600">{formatDate(bookingDate)} เวลา {bookingTime}</p>
              <p className="text-sm text-stone-500">หมายเลข: {bookingNumber}</p>
            </div>

            {/* Info for hotel */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">การยกเลิกจากโรงแรม</p>
                  <p className="text-sm text-blue-700">
                    ระบบจะอัพเดทสถานะงานและแจ้งเตือนพนักงานที่ได้รับมอบหมายโดยอัตโนมัติ
                  </p>
                </div>
              </div>
            </div>

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
                onClick={handleClose}
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
                  <span className="text-stone-600">แขก:</span>
                  <span className="font-medium text-stone-900">{guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">ห้อง:</span>
                  <span className="font-medium text-stone-900">{roomNumber}</span>
                </div>
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
                <div className="flex justify-between pt-2 border-t border-stone-200">
                  <span className="text-stone-600">เหตุผล:</span>
                  <span className="font-medium text-stone-900">
                    {selectedReason === 'อื่นๆ' ? customReason : selectedReason}
                  </span>
                </div>
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

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left mb-6">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">สถานะงานอัพเดทแล้ว</p>
                  <p className="text-sm text-green-700">
                    ระบบได้แจ้งเตือนพนักงานที่เกี่ยวข้องเรียบร้อยแล้ว
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
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
