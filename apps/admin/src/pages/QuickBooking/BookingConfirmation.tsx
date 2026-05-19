import { useState } from 'react'
import { ArrowLeft, Check, User, Calendar, Users, CreditCard, AlertCircle, CheckCircle } from 'lucide-react'

interface BookingData {
  customer?: any
  service?: any
  staff?: any
  bookingDate?: string
  bookingTime?: string
  basePricing?: {
    base_price: number
    discount_amount: number
    final_price: number
  }
  paymentMethod?: string
  paymentNotes?: string
  adminNotes?: string
  discountCode?: string
}

interface Props {
  bookingData: BookingData
  onConfirm: () => void
  onBack: () => void
  isLoading: boolean
}

export default function BookingConfirmation({
  bookingData,
  onConfirm,
  onBack,
  isLoading
}: Props) {
  const [isCreating, setIsCreating] = useState(false)
  const [createdBooking, setCreatedBooking] = useState<any>(null)
  const [error, setError] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5) + ' น.'
  }

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      'cash': 'เงินสด',
      'bank_transfer': 'โอนเงิน',
      'credit_card': 'บัตรเครดิต',
      'promptpay': 'PromptPay',
      'voucher': 'คูปอง/เครดิต',
      'other': 'อื่นๆ'
    }
    return methods[method] || method
  }

  const handleCreateBooking = async () => {
    setIsCreating(true)
    setError('')

    try {
      // TODO: Integrate with actual adminBookingService
      // const booking = await adminBookingService.createAdminBooking(supabase, bookingInput)

      // Mock success for now
      await new Promise(resolve => setTimeout(resolve, 2000))

      const mockBooking = {
        id: 'mock-booking-123',
        booking_number: 'BK20240519-001',
        status: 'pending',
        created_at: new Date().toISOString()
      }

      setCreatedBooking(mockBooking)
      onConfirm()

    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้างการจอง')
    } finally {
      setIsCreating(false)
    }
  }

  if (createdBooking) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">สร้างการจองสำเร็จ!</h2>
          <p className="text-green-600">
            หมายเลขการจอง: <span className="font-medium">{createdBooking.booking_number}</span>
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-800 mb-2">ขั้นตอนต่อไป:</h3>
          <ul className="text-green-700 space-y-1 text-sm">
            <li>• การจองเข้าสู่ระบบคิวงานเรียบร้อย</li>
            <li>• ระบบกำลังจัดหาพนักงานที่เหมาะสม</li>
            <li>• พนักงานจะได้รับการแจ้งเตือนใน Staff App</li>
            <li>• สถานะจะอัพเดตแบบเรียลไทม์</li>
          </ul>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-amber-600 text-white px-6 py-3 rounded-xl hover:bg-amber-700"
          >
            สร้างการจองใหม่
          </button>
          <button
            onClick={() => window.location.href = '/admin/bookings'}
            className="border border-stone-300 text-stone-700 px-6 py-3 rounded-xl hover:bg-stone-50"
          >
            ดูรายการจอง
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900 mb-2">ยืนยันการจอง</h2>
        <p className="text-stone-600">ตรวจสอบข้อมูลและส่งให้พนักงานดำเนินการ</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Customer Info */}
        <div className="bg-stone-50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <User className="w-5 h-5 text-amber-600" />
            <h3 className="font-medium text-stone-900">ข้อมูลลูกค้า</h3>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-stone-500">ชื่อ:</span> {bookingData.customer?.full_name}</p>
            <p><span className="text-stone-500">เบอร์โทร:</span> {bookingData.customer?.phone}</p>
            {bookingData.customer?.address && (
              <p><span className="text-stone-500">ที่อยู่:</span> {bookingData.customer.address}</p>
            )}
          </div>
        </div>

        {/* Service Info */}
        <div className="bg-stone-50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-stone-900">ข้อมูลบริการ</h3>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-stone-500">บริการ:</span> {bookingData.service?.name_th}</p>
            <p><span className="text-stone-500">ระยะเวลา:</span> {bookingData.service?.duration} นาที</p>
            {bookingData.bookingDate && (
              <p><span className="text-stone-500">วันที่:</span> {formatDate(bookingData.bookingDate)}</p>
            )}
            {bookingData.bookingTime && (
              <p><span className="text-stone-500">เวลา:</span> {formatTime(bookingData.bookingTime)}</p>
            )}
          </div>
        </div>


        {/* Pricing Info */}
        {bookingData.basePricing && (
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <h3 className="font-medium text-stone-900">สรุปราคา</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">ราคาฐาน:</span>
                <span>{formatCurrency(bookingData.basePricing.base_price)}</span>
              </div>
              {bookingData.basePricing.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>ส่วนลด:</span>
                  <span>-{formatCurrency(bookingData.basePricing.discount_amount)}</span>
                </div>
              )}
              {bookingData.discountCode && (
                <div className="flex justify-between text-green-600">
                  <span>โค้ด:</span>
                  <span>{bookingData.discountCode}</span>
                </div>
              )}
              <div className="border-t border-amber-200 pt-1 flex justify-between font-medium">
                <span>ยอดรวม:</span>
                <span className="text-amber-700 text-lg">
                  {formatCurrency(bookingData.basePricing.final_price)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        {bookingData.paymentMethod && (
          <div className="bg-stone-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="w-5 h-5 text-orange-600" />
              <h3 className="font-medium text-stone-900">ช่องทางการชำระเงิน</h3>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-stone-500">วิธีการจ่าย:</span> {getPaymentMethodLabel(bookingData.paymentMethod)}</p>
              {bookingData.paymentNotes && (
                <p><span className="text-stone-500">หมายเหตุ:</span> {bookingData.paymentNotes}</p>
              )}
            </div>
          </div>
        )}

        {/* Admin Notes */}
        {bookingData.adminNotes && (
          <div className="bg-yellow-50 rounded-xl p-4">
            <h3 className="font-medium text-yellow-800 mb-2">หมายเหตุ Admin</h3>
            <p className="text-yellow-700 text-sm">{bookingData.adminNotes}</p>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <h3 className="font-medium text-orange-800 mb-2">⚠️ หมายเหตุสำคัญ</h3>
        <ul className="text-orange-700 text-sm space-y-1">
          <li>• การจองจะถูกสร้างและเข้าสู่ระบบคิวงาน</li>
          <li>• ระบบจะจัดหาพนักงานที่เหมาะสมโดยอัตโนมัติ</li>
          <li>• สถานะจะอัพเดตแบบเรียลไทม์</li>
          <li>• ระบบไม่ประมวลผลการชำระเงินจริง</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isCreating}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 border border-stone-300 rounded-xl hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับแก้ไข
        </button>

        <button
          onClick={handleCreateBooking}
          disabled={isCreating}
          className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              กำลังสร้างการจอง...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              ยืนยันและส่งให้พนักงาน
            </>
          )}
        </button>
      </div>
    </div>
  )
}