import { X, Mail, Phone, MapPin, Calendar, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react'
import { useCustomerWithStats, useCustomerBookings } from '../hooks/useCustomers'
import { Customer } from '../lib/customerQueries'

interface CustomerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  customer: Customer
}

function CustomerDetailModal({ isOpen, onClose, customer }: CustomerDetailModalProps) {
  const { customer: customerStats, loading: statsLoading } = useCustomerWithStats(customer.id)
  const { bookings, loading: bookingsLoading } = useCustomerBookings(customer.id)

  if (!isOpen) return null

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-yellow-100 text-yellow-700',
      banned: 'bg-red-100 text-red-700',
    } as const
    const labels = {
      active: 'ใช้งานอยู่',
      suspended: 'ระงับชั่วคราว',
      banned: 'ระงับถาวร',
    } as const
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getBookingStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      no_show: 'bg-gray-100 text-gray-700',
    } as const
    const labels = {
      pending: 'รอยืนยัน',
      confirmed: 'ยืนยันแล้ว',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
      no_show: 'ไม่มาใช้บริการ',
    } as const
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      refunded: 'bg-red-100 text-red-700',
    } as const
    const labels = {
      paid: 'ชำระแล้ว',
      pending: 'รอชำระ',
      refunded: 'คืนเงินแล้ว',
    } as const
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">รายละเอียดลูกค้า</h2>
            <p className="text-sm text-stone-500">Customer Details</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-stone-500">ชื่อลูกค้า</label>
                  <p className="text-lg font-semibold text-stone-900">{customer.full_name}</p>
                </div>
                <div>
                  <label className="text-xs text-stone-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    อีเมล
                  </label>
                  <p className="text-stone-900">{customer.email || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-stone-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    เบอร์โทร
                  </label>
                  <p className="text-stone-900">{customer.phone}</p>
                </div>
                <div>
                  <label className="text-xs text-stone-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    ที่อยู่
                  </label>
                  <p className="text-stone-900">{customer.address || '-'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-stone-500">สถานะ</label>
                  <div className="mt-1">{getStatusBadge(customer.status)}</div>
                </div>
                <div>
                  <label className="text-xs text-stone-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    วันที่สมัคร
                  </label>
                  <p className="text-stone-900">
                    {new Date(customer.created_at).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-stone-500">วันเกิด</label>
                  <p className="text-stone-900">
                    {customer.date_of_birth
                      ? new Date(customer.date_of_birth).toLocaleDateString('th-TH')
                      : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {!statsLoading && customerStats && (
              <div className="bg-stone-50 rounded-xl p-4">
                <h3 className="font-semibold text-stone-900 mb-4">สถิติและข้อมูลเชิงลึก</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingBag className="w-4 h-4 text-amber-600" />
                      <p className="text-xs text-stone-500">การจองทั้งหมด</p>
                    </div>
                    <p className="text-2xl font-bold text-stone-900">{customerStats.total_bookings}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <p className="text-xs text-stone-500">ยอดใช้จ่ายรวม</p>
                    </div>
                    <p className="text-2xl font-bold text-stone-900">
                      ฿{Number(customerStats.total_spent).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <p className="text-xs text-stone-500">อัตราการจองซ้ำ</p>
                    </div>
                    <p className="text-2xl font-bold text-stone-900">
                      {customerStats.repeat_booking_rate.toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                      <p className="text-xs text-stone-500">ค่าเฉลี่ย/ครั้ง</p>
                    </div>
                    <p className="text-2xl font-bold text-stone-900">
                      ฿{customerStats.average_booking_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Booking History */}
            <div>
              <h3 className="font-semibold text-stone-900 mb-4">ประวัติการจอง</h3>
              {bookingsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mx-auto mb-2" />
                  <p className="text-sm text-stone-600">กำลังโหลดประวัติการจอง...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8 bg-stone-50 rounded-xl">
                  <p className="text-stone-600">ยังไม่มีประวัติการจอง</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="bg-stone-50 rounded-xl p-4 hover:bg-stone-100 transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-stone-900">{booking.service_name}</p>
                          <p className="text-xs text-stone-500">{booking.booking_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-amber-700">
                            ฿{Number(booking.final_price).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-stone-500">วันที่:</span>{' '}
                          <span className="text-stone-900">
                            {new Date(booking.booking_date).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500">เวลา:</span>{' '}
                          <span className="text-stone-900">{booking.booking_time}</span>
                        </div>
                        {booking.staff_name && (
                          <div className="col-span-2">
                            <span className="text-stone-500">ผู้ให้บริการ:</span>{' '}
                            <span className="text-stone-900">{booking.staff_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {getBookingStatusBadge(booking.status)}
                        {getPaymentStatusBadge(booking.payment_status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerDetailModal
