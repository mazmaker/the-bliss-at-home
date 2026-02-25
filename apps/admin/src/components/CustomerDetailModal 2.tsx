import { X, Mail, Phone, Calendar, TrendingUp, DollarSign, ShoppingBag, Home, FileText, User, Cake } from 'lucide-react'
import { useCustomerWithStats, useCustomerBookings, useCustomerAddresses, useCustomerTaxInfo } from '../hooks/useCustomers'
import { Customer } from '../lib/customerQueries'

interface CustomerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  customer: Customer
}

function CustomerDetailModal({ isOpen, onClose, customer }: CustomerDetailModalProps) {
  const { customer: customerStats, loading: statsLoading } = useCustomerWithStats(customer.id)
  const { bookings, loading: bookingsLoading } = useCustomerBookings(customer.id)
  const { addresses, loading: addressesLoading } = useCustomerAddresses(customer.id)
  const { taxInfo, loading: taxInfoLoading } = useCustomerTaxInfo(customer.id)

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
            {/* Profile Info - matching customer profile tab */}
            <div className="bg-stone-50 rounded-xl p-4">
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                ข้อมูลส่วนตัว (Profile)
              </h3>
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-lg font-semibold text-stone-900">{customer.full_name}</p>
                  {getStatusBadge(customer.status)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-stone-400" />
                    <div>
                      <p className="text-xs text-stone-500">อีเมล</p>
                      <p className="text-sm text-stone-900">{customer.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-stone-400" />
                    <div>
                      <p className="text-xs text-stone-500">เบอร์โทร</p>
                      <p className="text-sm text-stone-900">{customer.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-stone-400" />
                    <div>
                      <p className="text-xs text-stone-500">วันเกิด</p>
                      <p className="text-sm text-stone-900">
                        {customer.date_of_birth
                          ? new Date(customer.date_of_birth).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    <div>
                      <p className="text-xs text-stone-500">วันที่สมัคร</p>
                      <p className="text-sm text-stone-900">
                        {new Date(customer.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="bg-stone-50 rounded-xl p-4">
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-600" />
                ที่อยู่ (Addresses)
              </h3>
              {addressesLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-700 mx-auto mb-2" />
                  <p className="text-sm text-stone-600">กำลังโหลด...</p>
                </div>
              ) : addresses.length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-4">ยังไม่มีที่อยู่</p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          {addr.label}
                        </span>
                        {addr.is_default && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            ค่าเริ่มต้น
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-stone-900">{addr.recipient_name}</p>
                      <p className="text-xs text-stone-500">{addr.phone}</p>
                      <p className="text-sm text-stone-700 mt-1">
                        {addr.address_line}
                        {addr.subdistrict && ` ${addr.subdistrict}`}
                        {addr.district && ` ${addr.district}`}
                        {addr.province && ` ${addr.province}`}
                        {addr.zipcode && ` ${addr.zipcode}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tax Invoice */}
            <div className="bg-stone-50 rounded-xl p-4">
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                ข้อมูลใบกำกับภาษี (Tax Invoice)
              </h3>
              {taxInfoLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-700 mx-auto mb-2" />
                  <p className="text-sm text-stone-600">กำลังโหลด...</p>
                </div>
              ) : !taxInfo ? (
                <p className="text-stone-500 text-sm text-center py-4">ยังไม่มีข้อมูลใบกำกับภาษี</p>
              ) : (
                <div className="bg-white rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-stone-500">ประเภท</p>
                      <p className="text-sm font-medium text-stone-900">
                        {taxInfo.tax_type === 'individual' ? 'บุคคลธรรมดา' : 'นิติบุคคล'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">เลขประจำตัวผู้เสียภาษี</p>
                      <p className="text-sm font-medium text-stone-900">{taxInfo.tax_id}</p>
                    </div>
                    {taxInfo.tax_type === 'company' && taxInfo.company_name && (
                      <div>
                        <p className="text-xs text-stone-500">ชื่อบริษัท</p>
                        <p className="text-sm font-medium text-stone-900">{taxInfo.company_name}</p>
                      </div>
                    )}
                    {taxInfo.tax_type === 'company' && taxInfo.branch_code && (
                      <div>
                        <p className="text-xs text-stone-500">รหัสสาขา</p>
                        <p className="text-sm font-medium text-stone-900">{taxInfo.branch_code}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">ที่อยู่ออกใบกำกับภาษี</p>
                    <p className="text-sm text-stone-700">
                      {taxInfo.address_line}
                      {taxInfo.subdistrict && ` ${taxInfo.subdistrict}`}
                      {taxInfo.district && ` ${taxInfo.district}`}
                      {taxInfo.province && ` ${taxInfo.province}`}
                      {taxInfo.zipcode && ` ${taxInfo.zipcode}`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Statistics */}
            {!statsLoading && customerStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <ShoppingBag className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-stone-900">{customerStats.total_bookings}</p>
                  <p className="text-xs text-stone-500">การจองทั้งหมด</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-stone-900">
                    ฿{Number(customerStats.total_spent).toLocaleString()}
                  </p>
                  <p className="text-xs text-stone-500">ยอดใช้จ่ายรวม</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-stone-900">
                    {customerStats.repeat_booking_rate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-stone-500">อัตราการจองซ้ำ</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <DollarSign className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-stone-900">
                    ฿{customerStats.average_booking_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-stone-500">ค่าเฉลี่ย/ครั้ง</p>
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
