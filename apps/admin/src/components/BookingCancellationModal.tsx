/**
 * BookingCancellationModal Component
 * Modal for admin to cancel bookings with refund options
 */

import { useState, useEffect } from 'react'
import {
  X,
  AlertTriangle,
  DollarSign,
  Clock,
  Calendar,
  User,
  CreditCard,
  Loader2,
  CheckCircle,
  XCircle,
  Bell,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Booking } from '../hooks/useBookings'

// ============================================
// Types
// ============================================

interface BookingCancellationModalProps {
  booking: Booking
  isOpen: boolean
  onClose: () => void
  onCancelled: () => void
}

type RefundOption = 'full' | 'partial' | 'none'

interface RefundCalculation {
  eligible: boolean
  originalAmount: number
  refundAmount: number
  refundPercentage: number
  reason?: string
  hoursUntilBooking?: number
}

interface CancellationPolicy {
  FULL_REFUND_HOURS: number
  PARTIAL_REFUND_HOURS: number
  PARTIAL_REFUND_PERCENTAGE: number
}

// ============================================
// API Functions
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3009'

async function getRefundPreview(bookingId: string): Promise<{
  success: boolean
  data?: RefundCalculation
  policy?: CancellationPolicy
  error?: string
}> {
  const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/refund-preview`)
  return response.json()
}

async function cancelBooking(
  bookingId: string,
  data: {
    reason: string
    refund_option: RefundOption
    refund_percentage?: number
    notify_customer: boolean
    notify_staff: boolean
    notify_hotel: boolean
    admin_id?: string
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return response.json()
}

// ============================================
// Cancellation Reasons
// ============================================

const CANCELLATION_REASONS = [
  { value: 'customer_request', label: 'ลูกค้าขอยกเลิก', labelEn: 'Customer Request' },
  { value: 'staff_unavailable', label: 'พนักงานไม่ว่าง', labelEn: 'Staff Unavailable' },
  { value: 'customer_no_show', label: 'ลูกค้าไม่มา', labelEn: 'Customer No-Show' },
  { value: 'payment_issue', label: 'ปัญหาการชำระเงิน', labelEn: 'Payment Issue' },
  { value: 'emergency', label: 'เหตุฉุกเฉิน', labelEn: 'Emergency' },
  { value: 'duplicate_booking', label: 'การจองซ้ำ', labelEn: 'Duplicate Booking' },
  { value: 'service_unavailable', label: 'บริการไม่พร้อมให้บริการ', labelEn: 'Service Unavailable' },
  { value: 'other', label: 'อื่นๆ', labelEn: 'Other' },
]

// ============================================
// Component
// ============================================

export default function BookingCancellationModal({
  booking,
  isOpen,
  onClose,
  onCancelled,
}: BookingCancellationModalProps) {
  // Check if booking has been paid
  const isPaid = booking.payment_status === 'paid'

  // Form state
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  // If not paid, default to 'none' since there's nothing to refund
  const [refundOption, setRefundOption] = useState<RefundOption>(isPaid ? 'full' : 'none')
  const [partialPercentage, setPartialPercentage] = useState(50)
  const [notifyCustomer, setNotifyCustomer] = useState(true)
  const [notifyStaff, setNotifyStaff] = useState(true)
  const [notifyHotel, setNotifyHotel] = useState(true)

  // Loading states
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Refund preview data
  const [refundPreview, setRefundPreview] = useState<RefundCalculation | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | null>(null)

  // Load refund preview when modal opens
  useEffect(() => {
    if (isOpen && booking.payment_status === 'paid') {
      loadRefundPreview()
    }
  }, [isOpen, booking.id])

  const loadRefundPreview = async () => {
    setIsLoadingPreview(true)
    try {
      const result = await getRefundPreview(booking.id)
      if (result.success && result.data) {
        setRefundPreview(result.data)
        setCancellationPolicy(result.policy || null)

        // Auto-select refund option based on eligibility
        if (result.data.refundPercentage === 100) {
          setRefundOption('full')
        } else if (result.data.refundPercentage > 0) {
          setRefundOption('partial')
          setPartialPercentage(result.data.refundPercentage)
        } else {
          setRefundOption('none')
        }
      }
    } catch (error) {
      console.error('Failed to load refund preview:', error)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleCancel = async () => {
    // Validate form
    if (!selectedReason) {
      toast.error('กรุณาเลือกเหตุผลการยกเลิก')
      return
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      toast.error('กรุณาระบุเหตุผลการยกเลิก')
      return
    }

    if (refundOption === 'partial' && (partialPercentage <= 0 || partialPercentage > 100)) {
      toast.error('กรุณาระบุเปอร์เซ็นต์คืนเงินที่ถูกต้อง (1-100)')
      return
    }

    setIsProcessing(true)

    try {
      const reason =
        selectedReason === 'other'
          ? customReason
          : CANCELLATION_REASONS.find((r) => r.value === selectedReason)?.label || selectedReason

      const result = await cancelBooking(booking.id, {
        reason,
        refund_option: refundOption,
        refund_percentage: refundOption === 'partial' ? partialPercentage : undefined,
        notify_customer: notifyCustomer,
        notify_staff: notifyStaff,
        notify_hotel: notifyHotel,
      })

      if (result.success) {
        toast.success('ยกเลิกการจองสำเร็จ')
        onCancelled()
        onClose()
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการยกเลิก')
      }
    } catch (error: any) {
      console.error('Cancel booking error:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการยกเลิก')
    } finally {
      setIsProcessing(false)
    }
  }

  const calculateRefundAmount = (): number => {
    const amount = Number(booking.final_price)
    if (refundOption === 'full') return amount
    if (refundOption === 'partial') return Math.round((amount * partialPercentage) / 100 * 100) / 100
    return 0
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div>
            <h2 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              ยกเลิกการจอง
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Booking #{booking.booking_number}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-white/50 rounded-lg transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          {/* Booking Summary */}
          <div className="bg-stone-50 rounded-xl p-4 space-y-3">
            <h3 className="font-medium text-stone-900 mb-2">รายละเอียดการจอง</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-stone-400 mt-0.5" />
                <div>
                  <p className="text-stone-500">ลูกค้า</p>
                  <p className="font-medium text-stone-900">
                    {booking.customer?.full_name || 'ไม่ระบุ'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-stone-400 mt-0.5" />
                <div>
                  <p className="text-stone-500">วันที่</p>
                  <p className="font-medium text-stone-900">{booking.booking_date}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-stone-400 mt-0.5" />
                <div>
                  <p className="text-stone-500">เวลา</p>
                  <p className="font-medium text-stone-900">{booking.booking_time}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-stone-400 mt-0.5" />
                <div>
                  <p className="text-stone-500">ยอดเงิน</p>
                  <p className="font-medium text-stone-900">
                    ฿{Number(booking.final_price).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              เหตุผลการยกเลิก <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">-- เลือกเหตุผล --</option>
              {CANCELLATION_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>

            {selectedReason === 'other' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="ระบุเหตุผลการยกเลิก..."
                className="mt-2 w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                rows={3}
              />
            )}
          </div>

          {/* Refund Options - Only show if paid */}
          {/* No payment message */}
          {!isPaid && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-stone-600">
                <CreditCard className="w-4 h-4" />
                <p className="text-sm">
                  การจองนี้ยังไม่ได้ชำระเงิน จึงไม่มีการคืนเงิน
                </p>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-medium text-stone-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                ตัวเลือกการคืนเงิน
              </h3>

              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                  <span className="ml-2 text-stone-600">กำลังคำนวณ...</span>
                </div>
              ) : (
                <>
                  {/* Policy Info */}
                  {refundPreview && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-green-100">
                      <p className="text-sm text-stone-600">
                        <span className="font-medium">ตามนโยบาย:</span> {refundPreview.reason}
                      </p>
                      {refundPreview.hoursUntilBooking !== undefined && (
                        <p className="text-xs text-stone-500 mt-1">
                          เวลาก่อนถึงกำหนดนัด: {refundPreview.hoursUntilBooking} ชั่วโมง
                        </p>
                      )}
                    </div>
                  )}

                  {/* Refund Options */}
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-100 cursor-pointer hover:border-green-300 transition">
                      <input
                        type="radio"
                        name="refund"
                        value="full"
                        checked={refundOption === 'full'}
                        onChange={(e) => setRefundOption(e.target.value as RefundOption)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-stone-900">คืนเงินเต็มจำนวน (100%)</p>
                        <p className="text-sm text-stone-600">
                          คืนเงิน ฿{Number(booking.final_price).toLocaleString()}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-100 cursor-pointer hover:border-green-300 transition">
                      <input
                        type="radio"
                        name="refund"
                        value="partial"
                        checked={refundOption === 'partial'}
                        onChange={(e) => setRefundOption(e.target.value as RefundOption)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-stone-900">คืนเงินบางส่วน</p>
                        {refundOption === 'partial' && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="number"
                              value={partialPercentage}
                              onChange={(e) => setPartialPercentage(Number(e.target.value))}
                              min={1}
                              max={100}
                              className="w-20 px-3 py-1 border border-stone-300 rounded-lg text-center"
                            />
                            <span className="text-stone-600">%</span>
                            <span className="text-sm text-stone-500">
                              = ฿{calculateRefundAmount().toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-100 cursor-pointer hover:border-red-300 transition">
                      <input
                        type="radio"
                        name="refund"
                        value="none"
                        checked={refundOption === 'none'}
                        onChange={(e) => setRefundOption(e.target.value as RefundOption)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-stone-900">ไม่คืนเงิน</p>
                        <p className="text-sm text-stone-600">ยกเลิกโดยไม่คืนเงิน</p>
                      </div>
                      <XCircle className="w-5 h-5 text-red-500" />
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notification Options */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-medium text-stone-900 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              การแจ้งเตือน
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-stone-700">แจ้งลูกค้าทางอีเมล</span>
              </label>
              {booking.staff_id && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyStaff}
                    onChange={(e) => setNotifyStaff(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-stone-700">แจ้งพนักงาน</span>
                </label>
              )}
              {booking.is_hotel_booking && booking.hotel_id && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyHotel}
                    onChange={(e) => setNotifyHotel(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-stone-700">แจ้งโรงแรม</span>
                </label>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="font-medium text-stone-900 mb-2">สรุปการยกเลิก</h3>
            <div className="space-y-1 text-sm">
              <p className="flex justify-between">
                <span className="text-stone-600">สถานะการจอง:</span>
                <span className="font-medium text-red-600">ยกเลิก</span>
              </p>
              {isPaid && (
                <>
                  <p className="flex justify-between">
                    <span className="text-stone-600">ยอดชำระเดิม:</span>
                    <span className="font-medium">฿{Number(booking.final_price).toLocaleString()}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-stone-600">ยอดคืนเงิน:</span>
                    <span className="font-medium text-green-600">
                      ฿{calculateRefundAmount().toLocaleString()}
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              การยกเลิกการจองไม่สามารถย้อนกลับได้ กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-white text-stone-700 border border-stone-300 rounded-lg font-medium hover:bg-stone-50 transition disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleCancel}
            disabled={isProcessing || !selectedReason}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังดำเนินการ...
              </>
            ) : (
              'ยืนยันการยกเลิก'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
