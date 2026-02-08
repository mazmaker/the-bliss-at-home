import { X, Calendar, User, Phone, Clock, DollarSign, MapPin, FileText, Mail } from 'lucide-react'
import type { HotelBooking } from '../lib/hotelQueries'

interface BookingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  booking: HotelBooking | null
}

export function BookingDetailModal({ isOpen, onClose, booking }: BookingDetailModalProps) {
  if (!isOpen || !booking) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: HotelBooking['status']) => {
    const badges = {
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'ยืนยันแล้ว' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอยืนยัน' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'เสร็จสิ้น' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'ยกเลิก' },
      no_show: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'ไม่มาใช้บริการ' },
    }
    const badge = badges[status]
    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getPaymentStatusBadge = (status: HotelBooking['payment_status']) => {
    const badges = {
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'ชำระแล้ว' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอชำระ' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'คืนเงินแล้ว' },
    }
    const badge = badges[status]
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">รายละเอียดการจอง</h2>
              <p className="text-sm text-gray-500">{booking.booking_number}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Status */}
            <div className="mb-6 flex items-center gap-4">
              <div>
                <p className="text-sm text-gray-500">สถานะการจอง</p>
                {getStatusBadge(booking.status)}
              </div>
              <div>
                <p className="text-sm text-gray-500">สถานะการชำระเงิน</p>
                {getPaymentStatusBadge(booking.payment_status)}
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">ข้อมูลผู้เข้าพัก</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    <span>ชื่อ</span>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">{booking.customer_name}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="h-4 w-4" />
                    <span>เบอร์โทร</span>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">{booking.customer_phone}</p>
                </div>
                {booking.customer_email && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-4 w-4" />
                      <span>อีเมล</span>
                    </div>
                    <p className="mt-1 font-medium text-gray-900">{booking.customer_email}</p>
                  </div>
                )}
                {booking.room_number && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>ห้องพัก</span>
                    </div>
                    <p className="mt-1 font-medium text-gray-900">{booking.room_number}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Service Info */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">ข้อมูลบริการ</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">บริการ</p>
                  <p className="mt-1 font-medium text-gray-900">{booking.service_name}</p>
                  <p className="text-xs text-gray-500">{booking.service_category}</p>
                </div>
                {booking.staff_name && (
                  <div>
                    <p className="text-sm text-gray-600">ช่าง/พนักงาน</p>
                    <p className="mt-1 font-medium text-gray-900">{booking.staff_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">ระยะเวลา</p>
                  <p className="mt-1 font-medium text-gray-900">{booking.duration} นาที</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ราคา</p>
                  <p className="mt-1 text-xl font-bold text-blue-700">
                    ฿{Number(booking.total_price).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Dates */}
            <div className="mb-6 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">วันที่และเวลา</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>วันที่จอง</span>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">{formatDate(booking.booking_date)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>วันที่ใช้บริการ</span>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">{formatDate(booking.service_date)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>เวลา</span>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">{booking.service_time}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="h-4 w-4" />
                  <span>หมายเหตุ</span>
                </div>
                <p className="mt-2 text-gray-900">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
