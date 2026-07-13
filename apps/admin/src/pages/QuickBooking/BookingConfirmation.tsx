import { useState } from 'react'
import { ArrowLeft, Check, User, Calendar, Users, CreditCard, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { createCustomerAddress } from '../../lib/customerQueries'

interface BookingData {
  customer?: any
  service?: any
  selectedDuration?: number // admin-picked duration; service.duration is only the DB default (P15)
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
  providerPreference?: string
  // Couple / simultaneous booking (P8)
  recipientCount?: number
  serviceFormat?: string
  recipients?: Array<{
    service_id: string
    service?: any
    duration: number
    price: number
    recipient_index: number
    recipient_name?: string | null
    sort_order: number
  }>
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

  // The admin picks a duration (60/90/120) in ServiceSelection, but bookingData.service is the raw
  // Service row whose .duration is only the DB default. The chosen duration lives in selectedDuration
  // (threaded from ServiceSelection) with recipients[0] as a fallback. Use it for the single-booking
  // DISPLAY, the DB `duration` write, and the staff-earnings calc so all three agree — otherwise a
  // non-default pick shows/charges/pays for the default duration (P15). Couple has its own
  // per-recipient recipients[] and is unaffected.
  const singleDuration =
    bookingData.selectedDuration ??
    bookingData.recipients?.[0]?.duration ??
    bookingData.service?.duration ??
    60

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

  const getProviderLabel = (pref?: string) => {
    switch (pref) {
      case 'female-only': return 'ผู้หญิงเท่านั้น'
      case 'male-only': return 'ผู้ชายเท่านั้น'
      case 'prefer-female': return 'ต้องการผู้หญิง'
      case 'prefer-male': return 'ต้องการผู้ชาย'
      default: return 'ไม่ระบุ'
    }
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

      // Calculate staff earnings (per-recipient for couples, mirroring the server job fan-out:
      // fixed-rate = FULL rate per person NOT divided by N; commission = per-recipient price × rate)
      const finalPrice = bookingData.basePricing?.final_price || 0
      const svc = bookingData.service as any
      const recips = bookingData.recipients || []
      const isCouple = (bookingData.recipientCount || 1) > 1 && recips.length > 1

      const earningFor = (s: any, dur: number, commissionBase: number): number => {
        if (s?.use_fixed_rate) {
          const d = dur || s?.duration || 90
          const fixed = d === 60 ? s.staff_earning_60
            : d === 120 ? s.staff_earning_120
            : s.staff_earning_90
          return Math.round(Number(fixed) || 0)
        }
        const rate = Number(s?.staff_commission_rate) || 0
        return Math.round((Number(commissionBase) || 0) * rate)
      }

      // §1: commission is computed on the PRE-DISCOUNT service price (base_price), never final_price
      // (which already nets the discount). The platform absorbs the discount; staff earn on retail.
      const singleServiceBasePrice = bookingData.basePricing?.base_price || 0
      let staffEarnings: number
      if (isCouple) {
        // Sum each recipient's earning (commission uses that recipient's own pre-discount price).
        staffEarnings = recips.reduce((sum, r) => sum + earningFor(r.service || svc, r.duration, r.price), 0)
      } else {
        // Single — fixed-rate by the ADMIN-PICKED duration (not the service's DB default), else
        // §1 commission on base_price (pre-discount), NOT final_price. singleDuration falls back to
        // service.duration when unset (P15). The server's createJobsFromBooking re-derives the
        // authoritative per-job earning from the retail price, so this is the booking-level mirror.
        staffEarnings = earningFor(svc, singleDuration, singleServiceBasePrice)
      }

      // Create booking directly in database
      console.log('💾 Creating booking in database...')
      console.log('💰 Staff earnings calculation:', {
        finalPrice,
        useFixedRate: svc?.use_fixed_rate,
        staffEarnings
      })

      const bookingData_ = {
        // Required NOT NULL fields
        customer_id: bookingData.customer.id,
        service_id: bookingData.service.id, // recipient-0 service (couple: person 1)
        booking_date: bookingData.bookingDate,
        booking_time: bookingData.bookingTime,
        // Couple: use recipient-0's selected duration/price. base_price is recipient-0 per-person
        // (canonical, D-P8-1); final_price is the whole-booking total (Σ − discount).
        duration: isCouple ? (recips[0]?.duration || bookingData.service.duration || 60) : singleDuration, // Required NOT NULL (single: admin-picked duration, P15)
        base_price: isCouple ? (recips[0]?.price ?? 0) : (bookingData.basePricing?.base_price || bookingData.basePricing?.final_price || 0),
        final_price: bookingData.basePricing?.final_price || 0,

        // Status fields
        status: 'confirmed',
        payment_status: 'paid', // Admin booking = customer already paid

        // Pricing fields
        discount_amount: bookingData.basePricing?.discount_amount || 0,
        staff_earnings: staffEarnings, // Calculated from service commission rate

        // Couple / simultaneous booking (P8): recipient_count>1 => server createJobsFromBooking
        // reads the booking_services rows (inserted below) and fans out one job per recipient.
        recipient_count: isCouple ? 2 : 1,
        service_format: isCouple ? 'simultaneous' : 'single',
        is_multi_service: isCouple,

        // Note: Customer contact info is stored in customers table via customer_id
        // No need for separate customer_name/customer_phone fields

        // Location fields
        is_hotel_booking: bookingData.isHotelBooking || false,
        hotel_id: bookingData.hotelId || null,
        hotel_room_number: bookingData.hotelRoomNumber || null,
        address: bookingData.addressDetails?.formattedAddress || null,
        latitude: bookingData.addressDetails?.mapLocation?.lat || null,
        longitude: bookingData.addressDetails?.mapLocation?.lng || null,

        // Payment method (from admin selection)
        payment_method: bookingData.paymentMethod || null,

        // Provider gender preference — drives staff dispatch filtering on the server
        provider_preference: bookingData.providerPreference || 'no-preference',

        // Booking source identifier
        booking_source: 'admin_app',

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

      // Couple: persist one booking_services row PER RECIPIENT BEFORE dispatch, so the server's
      // couple-aware createJobsFromBooking reads them and creates one job per recipient with the
      // correct per-person service/duration/price/earnings. Single bookings keep the legacy path
      // (no booking_services row — the server single branch uses booking.final_price directly).
      if (isCouple) {
        const bsRows = recips.map((r) => ({
          booking_id: booking.id,
          service_id: r.service_id,
          duration: r.duration,
          price: r.price,
          recipient_index: r.recipient_index,
          recipient_name: r.recipient_name || null,
          sort_order: r.sort_order ?? r.recipient_index,
        }))
        const { error: bsError } = await supabase.from('booking_services').insert(bsRows)
        if (bsError) {
          console.error('❌ booking_services error:', bsError)
          throw new Error(`Database error (booking_services): ${bsError.message}`)
        }
        console.log(`✅ Inserted ${bsRows.length} booking_services rows (couple)`)
      }

      // Dispatch to staff: create job(s) + send LINE/in-app notifications.
      // Admin quick-booking inserts the booking directly (no payment webhook), so it must
      // trigger the same server path the customer/hotel confirmation flow uses — otherwise
      // no job is ever created and the booking never reaches the Staff App. Mirrors
      // adminBookingService.updateBookingStatus's confirmed-branch dispatch. Non-blocking.
      try {
        const serverUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')
        const dispatchRes = await fetch(`${serverUrl}/api/notifications/booking-confirmed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: booking.id }),
        })
        const dispatchResult = await dispatchRes.json()
        if (dispatchResult.success) {
          console.log(`📋 Quick booking ${booking.id} dispatched to staff:`, dispatchResult)
        } else {
          console.warn(`⚠️ Quick booking ${booking.id} dispatch partial:`, dispatchResult)
        }
      } catch (dispatchError) {
        // Non-blocking: a dispatch failure must not break the booking creation result.
        console.error('⚠️ Failed to dispatch quick booking to staff:', dispatchError)
      }

      // Save the admin-typed address as the customer's DEFAULT — ONLY for a home booking whose
      // address was TYPED (not picked from a saved card) AND when the customer has ZERO saved
      // addresses yet, so a returning customer's real default is never demoted. Non-blocking:
      // a save failure must not break the booking result (mirrors the dispatch block). (PART42 #2)
      try {
        const ad = bookingData.addressDetails
        if (
          !bookingData.isHotelBooking &&
          ad &&
          !ad.isFromSavedAddress &&
          ad.address && ad.contactName && ad.contactPhone && ad.province && ad.postalCode
        ) {
          const { count } = await supabase
            .from('addresses')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', bookingData.customer.id)
          if ((count ?? 0) === 0) {
            await createCustomerAddress(bookingData.customer.id, {
              label: 'Home',
              recipient_name: ad.contactName,
              phone: ad.contactPhone,
              address_line: ad.address,
              subdistrict: ad.subdistrict || null,
              district: ad.district || null,
              province: ad.province,
              zipcode: ad.postalCode,
              latitude: ad.mapLocation?.lat ?? null,
              longitude: ad.mapLocation?.lng ?? null,
              is_default: true,
            })
            console.log('📍 Saved admin-entered address as the customer default')
          }
        }
      } catch (addrErr) {
        console.error('⚠️ Failed to save customer default address (non-blocking):', addrErr)
      }

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
            className="bg-bliss-600 text-white px-6 py-3 rounded-xl hover:bg-bliss-700"
          >
            สร้างการจองใหม่
          </button>
          <button
            onClick={() => window.location.href = '/admin/bookings'}
            className="border border-bliss-300 text-bliss-700 px-6 py-3 rounded-xl hover:bg-bliss-50"
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
        <h2 className="text-xl font-semibold text-bliss-900 mb-2">ยืนยันการจอง</h2>
        <p className="text-bliss-600">ตรวจสอบข้อมูลและส่งให้พนักงานดำเนินการ</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Customer Info */}
        <div className="bg-bliss-50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <User className="w-5 h-5 text-bliss-600" />
            <h3 className="font-medium text-bliss-900">ข้อมูลลูกค้า</h3>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-bliss-500">ชื่อ:</span> {bookingData.customer?.full_name}</p>
            <p><span className="text-bliss-500">เบอร์โทร:</span> {bookingData.customer?.phone}</p>
            {bookingData.customer?.address && (
              <p><span className="text-bliss-500">ที่อยู่:</span> {bookingData.customer.address}</p>
            )}
          </div>
        </div>

        {/* Service Info */}
        <div className="bg-bliss-50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-bliss-900">ข้อมูลบริการ</h3>
          </div>
          <div className="space-y-1 text-sm">
            {(bookingData.recipientCount || 1) > 1 && bookingData.recipients ? (
              <>
                <p className="font-medium text-bliss-700">การจองแบบคู่ (2 ท่าน · พร้อมกัน)</p>
                {bookingData.recipients.map((r, i) => (
                  <p key={i} className="ml-2">
                    <span className="text-bliss-500">คนที่ {i + 1}:</span> {r.service?.name_th} • {r.duration} นาที • {formatCurrency(r.price)}
                  </p>
                ))}
              </>
            ) : (
              <>
                <p><span className="text-bliss-500">บริการ:</span> {bookingData.service?.name_th}</p>
                <p><span className="text-bliss-500">ระยะเวลา:</span> {singleDuration} นาที</p>
              </>
            )}
            {bookingData.bookingDate && (
              <p><span className="text-bliss-500">วันที่:</span> {formatDate(bookingData.bookingDate)}</p>
            )}
            {bookingData.bookingTime && (
              <p><span className="text-bliss-500">เวลา:</span> {formatTime(bookingData.bookingTime)}</p>
            )}
            <p><span className="text-bliss-500">เพศผู้ให้บริการ:</span> {getProviderLabel(bookingData.providerPreference)}</p>
          </div>
        </div>

        {/* Service Location */}
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-bliss-900">สถานที่ให้บริการ</h3>
          </div>
          <div className="space-y-1 text-sm">
            {bookingData.isHotelBooking && bookingData.hotelId ? (
              <>
                <p><span className="text-bliss-500">ประเภท:</span> ที่โรงแรม</p>
                {bookingData.hotelRoomNumber && (
                  <p><span className="text-bliss-500">ห้อง:</span> {bookingData.hotelRoomNumber}</p>
                )}
              </>
            ) : (
              <>
                <p><span className="text-bliss-500">ประเภท:</span> ที่บ้าน/ออฟฟิศ</p>

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
                          <span className="inline-block px-2 py-1 bg-bliss-100 text-bliss-700 text-xs rounded">
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

                    <p><span className="text-bliss-500">ที่อยู่:</span> {bookingData.addressDetails.formattedAddress}</p>
                    {bookingData.addressDetails.contactName && (
                      <p><span className="text-bliss-500">ผู้ติดต่อ:</span> {bookingData.addressDetails.contactName}</p>
                    )}
                    {bookingData.addressDetails.contactPhone && (
                      <p><span className="text-bliss-500">เบอร์ติดต่อ:</span> {bookingData.addressDetails.contactPhone}</p>
                    )}
                  </>
                ) : bookingData.customer?.address ? (
                  <>
                    <div className="mb-2">
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        👤 ที่อยู่จากโปรไฟล์ลูกค้า
                      </span>
                    </div>
                    <p><span className="text-bliss-500">ที่อยู่:</span> {bookingData.customer.address}</p>
                  </>
                ) : (
                  <p><span className="text-bliss-500 text-red-600">⚠️ ที่อยู่:</span> <span className="text-red-600">ไม่พบข้อมูลที่อยู่</span></p>
                )}
              </>
            )}
          </div>
        </div>


        {/* Pricing Info */}
        {bookingData.basePricing && (
          <div className="bg-bliss-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="w-5 h-5 text-bliss-600" />
              <h3 className="font-medium text-bliss-900">สรุปราคา</h3>
            </div>
            <div className="space-y-1 text-sm">
              {(bookingData.recipientCount || 1) > 1 && bookingData.recipients && bookingData.recipients.length > 1 ? (
                // Couple: base_price only holds recipient-0's per-person value (canonical D-P8-1),
                // so show a per-recipient base-price breakdown that reconciles to the total instead
                // of a single misleading "ราคาฐาน" line. Mirrors the per-recipient "ข้อมูลบริการ" block above.
                bookingData.recipients.map((r, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-bliss-500">ราคาฐาน (คนที่ {i + 1}):</span>
                    <span>{formatCurrency(r.price)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span className="text-bliss-500">ราคาฐาน:</span>
                  <span>{formatCurrency(bookingData.basePricing.base_price)}</span>
                </div>
              )}
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
              <div className="border-t border-bliss-200 pt-1 flex justify-between font-medium">
                <span>ยอดรวม:</span>
                <span className="text-bliss-700 text-lg">
                  {formatCurrency(bookingData.basePricing.final_price)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        {bookingData.paymentMethod && (
          <div className="bg-bliss-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="w-5 h-5 text-orange-600" />
              <h3 className="font-medium text-bliss-900">ช่องทางการชำระเงิน</h3>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-bliss-500">วิธีการจ่าย:</span> {getPaymentMethodLabel(bookingData.paymentMethod)}</p>
              {bookingData.paymentNotes && (
                <p><span className="text-bliss-500">หมายเหตุ:</span> {bookingData.paymentNotes}</p>
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
          className="flex items-center gap-2 px-4 py-2 text-bliss-600 border border-bliss-300 rounded-xl hover:bg-bliss-50 disabled:opacity-50 disabled:cursor-not-allowed"
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