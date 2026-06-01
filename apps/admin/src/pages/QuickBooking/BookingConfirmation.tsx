import { useState } from 'react'
import { ArrowLeft, Check, User, Calendar, Users, CreditCard, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface BookingData {
  customer?: any
  service?: any
  staff?: any
  bookingDate?: string
  bookingTime?: string
  isHotelBooking?: boolean
  hotelId?: string
  hotelRoomNumber?: string
  addressDetails?: {
    contactName: string
    contactPhone: string
    address: string
    province: string
    district: string
    subdistrict: string
    postalCode: string
    mapLocation?: { lat: number, lng: number } | null
    formattedAddress: string
    isFromSavedAddress?: boolean
    savedAddressId?: string | null
    savedAddressLabel?: string
    savedAddressIsDefault?: boolean
  }
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
      console.log('🚀 Starting booking creation...')

      // Simple auth check - just use Supabase directly since we know it works
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('🔐 Auth Check:', { user: !!user, authError, userId: user?.id })

      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`)
      }
      if (!user) {
        throw new Error('กรุณา Login ใหม่ - session หมดอายุแล้ว')
      }

      // Validate required data
      console.log('📋 Validating booking data...')
      if (!bookingData.customer?.id) throw new Error('Customer information missing')
      if (!bookingData.service?.id) throw new Error('Service information missing')
      if (!bookingData.bookingDate) throw new Error('Booking date missing')
      if (!bookingData.bookingTime) throw new Error('Booking time missing')
      if (!bookingData.basePricing) throw new Error('Pricing information missing')

      // Create booking directly in database
      console.log('💾 Creating booking in database...')
      const bookingData_ = {
        // Required NOT NULL fields
        customer_id: bookingData.customer.id,
        service_id: bookingData.service.id,
        booking_date: bookingData.bookingDate,
        booking_time: bookingData.bookingTime,
        duration: bookingData.service.duration || 60, // Required NOT NULL
        base_price: bookingData.basePricing?.base_price || bookingData.basePricing?.final_price || 0,
        final_price: bookingData.basePricing?.final_price || 0,

        // Status fields
        status: 'confirmed',
        payment_status: 'paid', // Admin booking = customer already paid

        // Pricing fields
        discount_amount: bookingData.basePricing?.discount_amount || 0,

        // Location fields
        is_hotel_booking: bookingData.isHotelBooking || false,
        hotel_id: bookingData.hotelId || null,
        hotel_room_number: bookingData.hotelRoomNumber || null,
        address: bookingData.addressDetails?.formattedAddress || null,
        latitude: bookingData.addressDetails?.mapLocation?.lat || null,
        longitude: bookingData.addressDetails?.mapLocation?.lng || null,

        // Payment method (from admin selection)
        payment_method: bookingData.paymentMethod || null,

        // Notes (only admin_notes is essential)
        admin_notes: bookingData.adminNotes || null
      }


      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData_)
        .select('*, booking_number')
        .single()

      if (bookingError) {
        console.error('❌ Database error:', bookingError)
        throw new Error(`Database error: ${bookingError.message}`)
      }

      console.log('✅ Booking created:', booking)

      setCreatedBooking({
        id: booking.id,
        booking_number: booking.booking_number || `BK${booking.id.slice(0, 8)}`,
        status: booking.status,
        created_at: booking.created_at
      })

      onConfirm()

    } catch (err: any) {
      console.error('❌ Booking creation error:', err)
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

        {/* Service Location */}
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-stone-900">สถานที่ให้บริการ</h3>
          </div>
          <div className="space-y-1 text-sm">
            {bookingData.isHotelBooking && bookingData.hotelId ? (
              <>
                <p><span className="text-stone-500">ประเภท:</span> ที่โรงแรม</p>
                {bookingData.hotelRoomNumber && (
                  <p><span className="text-stone-500">ห้อง:</span> {bookingData.hotelRoomNumber}</p>
                )}
              </>
            ) : (
              <>
                <p><span className="text-stone-500">ประเภท:</span> ที่บ้าน/ออฟฟิศ</p>

                {/* Enhanced address display with source information */}
                {bookingData.addressDetails ? (
                  <>
                    {/* Address source indicator */}
                    {bookingData.addressDetails.isFromSavedAddress ? (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          📍 ใช้ที่อยู่ที่บันทึกไว้
                        </span>
                        {bookingData.addressDetails.savedAddressLabel && (
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {bookingData.addressDetails.savedAddressLabel}
                          </span>
                        )}
                        {bookingData.addressDetails.savedAddressIsDefault && (
                          <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                            ค่าเริ่มต้น
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                          ✏️ ที่อยู่ใหม่ที่กรอกเอง
                        </span>
                      </div>
                    )}

                    <p><span className="text-stone-500">ที่อยู่:</span> {bookingData.addressDetails.formattedAddress}</p>
                    {bookingData.addressDetails.contactName && (
                      <p><span className="text-stone-500">ผู้ติดต่อ:</span> {bookingData.addressDetails.contactName}</p>
                    )}
                    {bookingData.addressDetails.contactPhone && (
                      <p><span className="text-stone-500">เบอร์ติดต่อ:</span> {bookingData.addressDetails.contactPhone}</p>
                    )}
                  </>
                ) : bookingData.customer?.address ? (
                  <>
                    <div className="mb-2">
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        👤 ที่อยู่จากโปรไฟล์ลูกค้า
                      </span>
                    </div>
                    <p><span className="text-stone-500">ที่อยู่:</span> {bookingData.customer.address}</p>
                  </>
                ) : (
                  <p><span className="text-stone-500 text-red-600">⚠️ ที่อยู่:</span> <span className="text-red-600">ไม่พบข้อมูลที่อยู่</span></p>
                )}
              </>
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