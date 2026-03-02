import { useState, useMemo, useEffect } from 'react'
import { Download, CreditCard, FileText, Check, Loader2, AlertCircle, RefreshCw, Phone, Mail, Clock, Building2, MapPin, CheckCircle, TrendingUp, AlertTriangle, Calculator, Banknote, Receipt, MessageCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useHotelContext } from '../hooks/useHotelContext'
import { useOverdueAlert } from '../hooks/useBillingSettings'
import { getFormattedPaymentMethods } from '../services/billingSettingsService'
import { getMonthlyBillStatus, calculateLateFee } from '../utils/overdueCalculatorV2'

// Monthly bill interfaces
interface MonthlyBooking {
  id: string
  booking_date: string
  guest_name: string
  room_number: string
  service_name: string
  final_price: number
  payment_status: string
  status: string
  hotel_discount_rate?: number
  created_at: string
}

interface MonthlyBillData {
  month: string
  monthLabel: string
  bookings: MonthlyBooking[]
  totalBookings: number
  totalRevenue: number
  platformFee: number
  hotelRevenue: number
  pendingPayments: number
  commissionRate: number // Add commission rate to track
  lateFee: number // Late fee for overdue payments
  currentMonthPaid: boolean // Whether current month's bill has been paid
}

// Fetch monthly bill data from database with proper error handling
const fetchMonthlyBill = async (hotelId: string, selectedMonth: string): Promise<MonthlyBillData> => {
  const monthStart = `${selectedMonth}-01`
  const nextMonth = new Date(selectedMonth + '-01')
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const monthEnd = nextMonth.toISOString().slice(0, 7) + '-01'

  console.log('Fetching monthly bill for:', { hotelId, monthStart, monthEnd })

  // Get hotel commission rate first
  const { data: hotelData, error: hotelError } = await supabase
    .from('hotels')
    .select('commission_rate')
    .eq('id', hotelId)
    .single()

  if (hotelError) {
    console.error('Hotel query error:', hotelError)
    throw new Error(`Failed to fetch hotel data: ${hotelError.message}`)
  }

  // Get completed booking data for revenue calculation
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      hotel_room_number,
      final_price,
      payment_status,
      status,
      created_at,
      customer_notes,
      service_id,
      services:service_id(name_th)
    `)
    .eq('hotel_id', hotelId)
    .gte('booking_date', monthStart)
    .lt('booking_date', monthEnd)
    .eq('status', 'completed') // Only completed bookings for monthly billing
    .order('booking_date', { ascending: true })

  // Query for unpaid monthly bills from PREVIOUS months only (not current month)
  const [currentYear, currentMonth] = selectedMonth.split('-').map(Number)

  const { data: previousUnpaidBillsData, error: billsError } = await supabase
    .from('monthly_bills')
    .select(`
      id,
      month,
      year,
      total_amount,
      status,
      paid_at
    `)
    .eq('hotel_id', hotelId)
    .is('paid_at', null) // Bills that haven't been paid yet
    .neq('status', 'paid') // Exclude paid bills
    .or(`year.lt.${currentYear},and(year.eq.${currentYear},month.lt.${currentMonth})`) // Only previous months

  if (error) {
    console.error('Monthly bill query error:', error)
    throw new Error(`Failed to fetch monthly bill: ${error.message}`)
  }

  if (billsError) {
    console.error('Monthly bills query error:', billsError)
    // Continue without bills data, will default to 0
  }

  // Query for CURRENT month's bill status to check if it's been paid
  const { data: currentMonthBillData, error: currentBillError } = await supabase
    .from('monthly_bills')
    .select(`
      id,
      paid_at,
      status
    `)
    .eq('hotel_id', hotelId)
    .eq('year', currentYear)
    .eq('month', currentMonth)
    .single()

  if (currentBillError && currentBillError.code !== 'PGRST116') {
    console.error('Current month bill query error:', currentBillError)
    // Continue without current bill data
  }

  console.log('Raw booking data:', data)
  console.log('Previous unpaid bills data:', previousUnpaidBillsData)
  console.log('Current month bill data:', currentMonthBillData)
  console.log('Hotel commission rate:', hotelData.commission_rate)

  // Helper function to extract guest name from customer_notes
  const parseGuestName = (customerNotes?: string | null): string => {
    if (!customerNotes) return 'ไม่ระบุชื่อ'

    // Try to extract guest name from customer notes
    const guestMatch = customerNotes.match(/Guest:\s*([^,\n]+)/)
    return guestMatch?.[1]?.trim() || 'ไม่ระบุชื่อ'
  }

  // Transform data to match interface with fallback data
  const transformedData = (data || []).map((booking: any) => ({
    id: booking.id,
    booking_date: booking.booking_date,
    guest_name: parseGuestName(booking.customer_notes),
    room_number: booking.hotel_room_number || 'ไม่ระบุห้อง',
    service_name: booking.services?.name_th || 'บริการนวดแผนไทย', // Use actual service name if available
    final_price: booking.final_price || 0,
    payment_status: booking.payment_status || 'pending',
    status: booking.status || 'completed',
    hotel_discount_rate: 0, // Default value since this column doesn't exist
    created_at: booking.created_at
  }))

  const bookingData = transformedData
  const totalRevenue = bookingData.reduce((sum, booking) => sum + (booking.final_price || 0), 0)

  // No platform fee for hotels - they keep 100% of revenue
  const hotelCommissionRate = 0
  const platformFee = 0 // No platform fee
  const hotelRevenue = totalRevenue // Hotels keep 100%

  // Calculate pending payments from previous months only
  const pendingPayments = (previousUnpaidBillsData || [])
    .reduce((sum: number, bill: any) => sum + (bill.total_amount || 0), 0)

  // Calculate late fee for this month
  let lateFee = 0
  try {
    const overdueStatus = await getMonthlyBillStatus(selectedMonth)
    if (pendingPayments > 0 && overdueStatus.days > 0) {
      lateFee = await calculateLateFee(pendingPayments, overdueStatus.days)
    }
  } catch (error) {
    console.error('Error calculating late fee:', error)
    lateFee = 0 // Fallback to 0 if calculation fails
  }

  console.log('💰 Bill calculations:', {
    totalBookings: bookingData.length,
    totalRevenue,
    pendingPayments, // ← ยอดบิลเดือนก่อนหน้าที่ค้างชำระ
    previousUnpaidBillsCount: (previousUnpaidBillsData || []).length,
    lateFee,
    netRevenue: totalRevenue - lateFee
  })

  // Create month label
  const monthDate = new Date(selectedMonth + '-01')
  const monthLabel = monthDate.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long'
  })

  // Determine if current month's bill has been paid
  const currentMonthPaid = currentMonthBillData
    ? (currentMonthBillData.paid_at !== null || currentMonthBillData.status === 'paid')
    : false // No bill record means not paid

  return {
    month: selectedMonth,
    monthLabel,
    bookings: bookingData,
    totalBookings: bookingData.length,
    totalRevenue,
    platformFee,
    hotelRevenue,
    pendingPayments,
    commissionRate: hotelCommissionRate,
    lateFee,
    currentMonthPaid
  }
}

// Payment Methods Section Component
function PaymentMethodsSection({ adminContact }: { adminContact: any }) {
  const [paymentMethods, setPaymentMethods] = useState<any>(null)

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const methods = await getFormattedPaymentMethods()
        setPaymentMethods(methods)
      } catch (error) {
        console.error('Error loading payment methods:', error)
      }
    }
    loadPaymentMethods()
  }, [])

  if (!paymentMethods) {
    return (
      <div className="mt-4 p-3 bg-white bg-opacity-70 rounded-lg">
        <p className="text-xs text-stone-600 mb-2 font-medium">วิธีการชำระเงิน:</p>
        <div className="text-xs text-stone-600 space-y-1">
          <p>• กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 p-4 bg-white bg-opacity-70 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-4 h-4 text-stone-700" />
        <p className="text-sm text-stone-700 font-medium">ช่องทางการชำระเงิน:</p>
      </div>

      <div className="space-y-3 text-sm">
        {/* Bank Transfer */}
        {paymentMethods.bankTransfer?.enabled && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <Banknote className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-blue-800 mb-1">โอนเงินผ่านธนาคาร</div>
              {paymentMethods.bankTransfer.bankName && (
                <div className="text-blue-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {paymentMethods.bankTransfer.bankName}
                </div>
              )}
              {paymentMethods.bankTransfer.accountNumber && (
                <div className="text-blue-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {paymentMethods.bankTransfer.accountNumber}
                </div>
              )}
              {paymentMethods.bankTransfer.accountName && (
                <div className="text-blue-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {paymentMethods.bankTransfer.accountName}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cash Payment */}
        {paymentMethods.cashPayment?.enabled && (
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <Banknote className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-green-800 mb-1">ชำระด้วยเงินสด</div>
              {paymentMethods.cashPayment.address && (
                <div className="text-green-700 flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{paymentMethods.cashPayment.address}</span>
                </div>
              )}
              {paymentMethods.cashPayment.hours && (
                <div className="text-green-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {paymentMethods.cashPayment.hours}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Check Payment */}
        {paymentMethods.checkPayment?.enabled && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
            <Receipt className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-amber-800 mb-1">ชำระด้วยเช็ค</div>
              {paymentMethods.checkPayment.payableTo && (
                <div className="text-amber-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  สั่งจ่าย: {paymentMethods.checkPayment.payableTo}
                </div>
              )}
              {paymentMethods.checkPayment.mailingAddress && (
                <div className="text-amber-700 flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>ส่งไปรษณีย์: {paymentMethods.checkPayment.mailingAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Contact Info */}
        {adminContact && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            <div className="text-xs text-stone-600 font-medium mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              สอบถามเพิ่มเติม:
            </div>
            <div className="text-xs text-stone-600 space-y-2">
              {adminContact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {adminContact.phone}
                </div>
              )}
              {adminContact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {adminContact.email}
                </div>
              )}
              {adminContact.lineId && (
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  LINE: {adminContact.lineId}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MonthlyBill() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const { hotelId, hotelData, getHotelName, getHotelNameEn, isValidHotel, isLoading: hotelLoading } = useHotelContext()

  // Generate month options for the last 12 months
  const monthOptions = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
      months.push({ value, label })
    }
    return months
  }, [])

  // Fetch monthly bill data
  const {
    data: billData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['monthly-bill', hotelId, selectedMonth],
    queryFn: () => fetchMonthlyBill(hotelId!, selectedMonth),
    enabled: !hotelLoading && isValidHotel && !!hotelId,
    retry: 1, // Reduce retries
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Use advanced overdue alert system with billing settings
  const { alertData, adminContact, showAlert } = useOverdueAlert(selectedMonth, billData?.pendingPayments)

  const generateBillNumber = (month: string, hotelId: string) => {
    const monthCode = month.replace('-', '')
    const hotelCode = hotelId.slice(-6).toUpperCase()
    return `BL-${hotelCode}-${monthCode}`
  }

  const getDueDate = (month: string) => {
    const billMonth = new Date(month + '-01')
    const dueDate = new Date(billMonth)
    dueDate.setMonth(dueDate.getMonth() + 1)
    dueDate.setDate(15) // Due on 15th of next month
    return dueDate.toLocaleDateString('th-TH')
  }

  const handleDownloadPDF = () => {
    if (!billData || !billData.bookings) return

    // Generate PDF Monthly Bill using the simplified PDF generator
    import('../utils/simplePdfGenerator').then(({ generateSimpleMonthlyBillPDF }) => {
      const bookingData = billData.bookings.map((booking: any) => ({
        id: booking.id || `temp-${Date.now()}`,
        booking_number: booking.booking_number || `BK${booking.id?.slice(-6) || Math.random().toString().slice(-6)}`,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time || '00:00',
        service: {
          name_th: booking.service_name || 'Unknown Service',
          price: booking.base_price || booking.final_price
        },
        customer_notes: `Guest: ${booking.guest_name}, Room: ${booking.room_number}`,
        base_price: booking.base_price || 0,
        final_price: booking.final_price || 0,
        status: booking.status || 'completed',
        created_at: booking.created_at || new Date().toISOString(),
        provider_preference: booking.provider_preference
      }))

      const hotelName = getHotelName()
      const period = billData.monthLabel

      generateSimpleMonthlyBillPDF(bookingData, hotelName, period)
    }).catch(error => {
      console.error('Error generating PDF:', error)
      // Fallback to text file if PDF generation fails
      const billContent = [
        '='.repeat(60),
        'ใบเรียกเก็บเงินรายเดือน - The Bliss at Home',
        '='.repeat(60),
        `โรงแรม: ${getHotelName()}`,
        `เดือน: ${billData?.monthLabel}`,
        `เลขที่บิล: ${generateBillNumber(selectedMonth, hotelId!)}`,
        '',
        `จำนวนการจอง: ${billData?.totalBookings || 0} รายการ`,
        `รายได้รวม: ฿${billData?.totalRevenue?.toLocaleString() || 0}`,
        `รายได้สุทธิ: ฿${billData?.hotelRevenue?.toLocaleString() || 0}`,
        '='.repeat(60),
      ]

      const content = billContent.join('\n')
      const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' })
      const link = document.createElement('a')
      link.setAttribute('href', URL.createObjectURL(blob))
      link.setAttribute('download', `monthly-bill-${selectedMonth}.txt`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    })
  }

  // Loading state
  if (hotelLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-2" />
          <p className="text-stone-600">กำลังโหลดข้อมูลบิลรายเดือน...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-600 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
          <p className="text-sm text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              ลองใหม่
            </button>
            <p className="text-xs text-gray-500">
              หากยังมีปัญหาให้ลองเลือกเดือนอื่นดู
            </p>
          </div>
        </div>
      </div>
    )
  }

  // FIXED: Use currentMonthPaid to determine current month's bill status
  // pendingPayments is for previous months, not current month
  const billStatus = billData?.currentMonthPaid ? 'paid' : 'pending'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">บิลรายเดือน</h1>
          <p className="text-stone-500">Monthly Bill</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleDownloadPDF}
            disabled={!billData || billData.totalBookings === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            ดาวน์โหลดบิล
          </button>
        </div>
      </div>

      {/* Bill Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">{getHotelName()}</h2>
            <p className="text-stone-600">{getHotelNameEn()}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-stone-500 mb-1">เลขที่บิล</div>
            <div className="font-mono text-stone-900">{generateBillNumber(selectedMonth, hotelId!)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-stone-500 mb-1">ประจำเดือน</div>
            <div className="font-medium">{billData?.monthLabel}</div>
          </div>
          <div>
            <div className="text-stone-500 mb-1">กำหนดชำระ</div>
            <div className="font-medium">{getDueDate(selectedMonth)}</div>
          </div>
          <div>
            <div className="text-stone-500 mb-1">สถานะ</div>
            <div className="flex items-center gap-2">
              {billStatus === 'paid' ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">ชำระแล้ว</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-600 font-medium">รอชำระ</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bill Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* การจองที่เสร็จสิ้น */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{billData?.totalBookings || 0}</p>
              <p className="text-sm text-stone-500">การจองเสร็จสิ้น</p>
            </div>
          </div>
        </div>

        {/* รายได้รวม */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">฿{billData?.totalRevenue.toLocaleString() || 0}</p>
              <p className="text-sm text-stone-500">รายได้รวม</p>
            </div>
          </div>
        </div>

        {/* บิลค้างชำระ */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">฿{billData?.pendingPayments?.toLocaleString() || 0}</p>
              <p className="text-sm text-stone-500">บิลค้างชำระ</p>
            </div>
          </div>
        </div>

        {/* ค่าปรับล่าช้า */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">฿{billData?.lateFee?.toLocaleString() || 0}</p>
              <p className="text-sm text-stone-500">ค่าปรับล่าช้า</p>
            </div>
          </div>
        </div>

        {/* รายได้สุทธิ */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">
                ฿{((billData?.hotelRevenue || 0) - (billData?.lateFee || 0)).toLocaleString()}
              </p>
              <p className="text-sm text-stone-500">รายได้สุทธิ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Detail */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100">
        <div className="p-6 border-b border-stone-100">
          <h3 className="text-lg font-semibold text-stone-900">รายละเอียดการจอง</h3>
        </div>

        {!billData || billData.bookings.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">ไม่มีการจองในเดือนนี้</p>
            <p className="text-sm">เลือกเดือนอื่นหรือรอการจองใหม่</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    แขก
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    บริการ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    ยอดเงิน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    การชำระ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {billData.bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-stone-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                      {new Date(booking.booking_date).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-stone-900">{booking.guest_name}</div>
                        <div className="text-stone-500">ห้อง {booking.room_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-900">
                      {booking.service_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : booking.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : booking.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {booking.status === 'completed'
                          ? 'เสร็จสิ้น'
                          : booking.status === 'in_progress'
                          ? 'กำลังดำเนินการ'
                          : booking.status === 'pending'
                          ? 'รอดำเนินการ'
                          : booking.status === 'cancelled'
                          ? 'ยกเลิก'
                          : booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-amber-700">฿{booking.final_price.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.payment_status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {booking.payment_status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enhanced Payment Summary with Overdue Status */}
      {showAlert && alertData && (
        <div className={`${alertData.styling.bgClass} rounded-2xl shadow-lg p-6 ${alertData.styling.borderClass} ${alertData.styling.animation}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 ${alertData.styling.iconBg} rounded-xl`}>
              <AlertCircle className={`w-8 h-8 ${alertData.styling.iconColor}`} />
            </div>
            <div className="flex-1">
              {/* Title with overdue status */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`font-bold text-lg ${alertData.styling.titleColor}`}>
                  {alertData.message.title}
                </h3>
                {alertData.status.actionRequired && (
                  <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                    ต้องชำระ
                  </span>
                )}
              </div>

              {/* Amount and details with Late Fee */}
              <div className="bg-white rounded-lg p-4 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className={`text-xs ${alertData.styling.textColor} mb-1`}>ยอดเดิม:</p>
                    <p className={`text-xl font-bold ${alertData.styling.titleColor}`}>
                      ฿{billData?.pendingPayments?.toLocaleString() || 0}
                    </p>
                  </div>
                  {alertData.lateFee > 0 && (
                    <div>
                      <p className={`text-xs ${alertData.styling.textColor} mb-1`}>ค่าปรับล่าช้า:</p>
                      <p className="text-xl font-bold text-red-600">
                        ฿{alertData.lateFee.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className={`text-xs ${alertData.styling.textColor} mb-1`}>
                      {alertData.status.days > 0 ? 'เลยกำหนดมาแล้ว:' :
                       alertData.status.days === 0 ? 'กำหนดชำระ:' : 'กำหนดชำระ:'}
                    </p>
                    <p className={`text-lg font-semibold ${alertData.styling.titleColor}`}>
                      {alertData.status.days > 0 ? `${alertData.status.days} วัน` :
                       alertData.status.days === 0 ? 'วันนี้' :
                       getDueDate(selectedMonth)}
                    </p>
                  </div>
                </div>

                {alertData.lateFee > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${alertData.styling.textColor}`}>ยอดรวมทั้งหมด:</span>
                      <span className={`text-2xl font-bold ${alertData.styling.titleColor}`}>
                        ฿{alertData.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className={`text-sm ${alertData.styling.textColor} mb-3`}>
                {alertData.message.description}
              </p>

              {/* Action buttons with admin contact */}
              {alertData.status.actionRequired && adminContact && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {adminContact.phone && (
                    <a
                      href={`tel:${adminContact.phone}`}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                    >
                      <Phone className="w-4 h-4" />
                      โทร {adminContact.phone}
                    </a>
                  )}
                  {adminContact.email && (
                    <a
                      href={`mailto:${adminContact.email}`}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                    >
                      <Mail className="w-4 h-4" />
                      อีเมล
                    </a>
                  )}
                </div>
              )}

              {/* Due date info */}
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <Clock className="w-3 h-3" />
                <span>
                  กำหนดชำระเดิม: {getDueDate(selectedMonth)}
                  {alertData.status.days > 0 && (
                    <span className={`ml-2 font-medium ${alertData.styling.textColor}`}>
                      (เลยมาแล้ว {alertData.status.days} วัน)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Payment Methods from Database */}
          <PaymentMethodsSection adminContact={adminContact} />
        </div>
      )}
    </div>
  )
}

export default MonthlyBill