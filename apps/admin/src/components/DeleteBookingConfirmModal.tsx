/**
 * DeleteBookingConfirmModal — PART47-P7
 * Confirm gate before HARD-deleting a booking + every related row via the
 * admin_delete_booking RPC. Shows the booking number + an irreversible-delete
 * warning (D-P7: 1C hard-delete, 3A all statuses except in_progress).
 */

import { X, AlertTriangle, Trash2, Loader2, User, Calendar, Clock, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDeleteBooking } from '../hooks/useBookings'
import type { Booking } from '../hooks/useBookings'

interface DeleteBookingConfirmModalProps {
  booking: Booking
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteBookingConfirmModal({
  booking,
  isOpen,
  onClose,
  onDeleted,
}: DeleteBookingConfirmModalProps) {
  const deleteBooking = useDeleteBooking()

  // 3A: a booking cannot be deleted while the service is in progress (mirrors the cancel route).
  const isInProgress = booking.status === 'in_progress'
  // Extra caution: deleting a paid/completed booking also removes the customer's transaction/receipt
  // and recomputes any staff payout it was part of.
  const isPaidOrCompleted = booking.payment_status === 'paid' || booking.status === 'completed'

  const handleDelete = async () => {
    if (isInProgress) return
    try {
      await deleteBooking.mutateAsync(booking.id)
      toast.success(`ลบการจอง ${booking.booking_number} สำเร็จ`)
      onDeleted()
      onClose()
    } catch (error: any) {
      const raw = String(error?.message || '')
      let msg = 'เกิดข้อผิดพลาดในการลบการจอง'
      if (raw.includes('BLOCKED_IN_PROGRESS')) msg = 'ไม่สามารถลบได้ขณะพนักงานกำลังให้บริการ (in_progress)'
      else if (raw.includes('FORBIDDEN')) msg = 'สิทธิ์ไม่พอ: ต้องเป็นผู้ดูแลระบบ (Admin) เท่านั้น'
      else if (raw.includes('NOT_FOUND')) msg = 'ไม่พบการจองนี้ (อาจถูกลบไปแล้ว)'
      else if (raw) msg = raw
      toast.error(msg)
    }
  }

  if (!isOpen) return null

  const isProcessing = deleteBooking.isPending

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-bliss-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div>
            <h2 className="text-xl font-semibold text-bliss-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              ลบการจอง
            </h2>
            <p className="text-sm text-bliss-600 mt-1">Booking #{booking.booking_number}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-white/50 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5 text-bliss-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Booking summary */}
          <div className="bg-bliss-50 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-bliss-400 mt-0.5" />
              <div>
                <p className="text-bliss-500">ลูกค้า</p>
                {/* Prefer the real customers-table name (regular bookings), fall back to the parsed
                    guest name from customer_notes (hotel bookings) — else "ไม่ระบุ". Using only
                    `booking.customer` (singular, parsed) showed "ไม่ระบุ" for every regular booking. */}
                <p className="font-medium text-bliss-900">{booking.customers?.full_name || booking.customer?.full_name || 'ไม่ระบุ'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-bliss-400 mt-0.5" />
              <div>
                <p className="text-bliss-500">วันที่</p>
                <p className="font-medium text-bliss-900">{booking.booking_date}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-bliss-400 mt-0.5" />
              <div>
                <p className="text-bliss-500">เวลา</p>
                <p className="font-medium text-bliss-900">{booking.booking_time}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-bliss-400 mt-0.5" />
              <div>
                <p className="text-bliss-500">ยอดเงิน</p>
                <p className="font-medium text-bliss-900">฿{Number(booking.final_price).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {isInProgress ? (
            /* in_progress → block delete entirely */
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                การจองนี้กำลังอยู่ระหว่างให้บริการ (in_progress) — <span className="font-semibold">ไม่สามารถลบได้</span>{' '}
                กรุณารอให้บริการเสร็จสิ้นหรือยกเลิกก่อน
              </p>
            </div>
          ) : (
            <>
              {/* Irreversible warning */}
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 space-y-1">
                  <p className="font-semibold">การลบนี้ถาวรและกู้คืนไม่ได้</p>
                  <p>ระบบจะลบการจองนี้พร้อมข้อมูลที่เกี่ยวข้องทั้งหมด: งานของพนักงาน (jobs), รายการบริการ, การแจ้งเตือน, ประวัติสถานะ และปรับยอดรายได้พนักงานให้ตรงกับความจริง</p>
                </div>
              </div>

              {isPaidOrCompleted && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-700">
                    การจองนี้ชำระเงิน/เสร็จสิ้นแล้ว — การลบจะลบรายการชำระเงิน (ใบเสร็จลูกค้า) และคำนวณยอดโอน payout ของพนักงานใหม่ด้วย
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-bliss-200 bg-bliss-50">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-white text-bliss-700 border border-bliss-300 rounded-lg font-medium hover:bg-bliss-50 transition disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleDelete}
            disabled={isProcessing || isInProgress}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                ยืนยันการลบ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
