import { useState, useMemo } from 'react'
import { Download, Calendar, CreditCard, FileText, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useHotelContext } from '../hooks/useHotelContext'

// Monthly bill interfaces
interface MonthlyBooking {
  id: string
  booking_date: string
  guest_name: string
  room_number: string
  service_name: string
  final_price: number
  payment_status: string
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
}

// Fetch monthly bill data from database
const fetchMonthlyBill = async (hotelId: string, selectedMonth: string): Promise<MonthlyBillData> => {
  const monthStart = `${selectedMonth}-01`
  const nextMonth = new Date(selectedMonth + '-01')
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const monthEnd = nextMonth.toISOString().slice(0, 7) + '-01'

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      hotel_room_number,
      final_price,
      payment_status,
      hotel_discount_rate,
      created_at,
      customers:customer_id(full_name),
      services:service_id(name_th)
    `)
    .eq('hotel_id', hotelId)
    .gte('booking_date', monthStart)
    .lt('booking_date', monthEnd)
    .in('status', ['completed', 'confirmed']) // Only billable bookings
    .order('booking_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch monthly bill: ${error.message}`)
  }

  // Transform data to match interface
  const transformedData = (data || []).map((booking: any) => ({
    id: booking.id,
    booking_date: booking.booking_date,
    guest_name: booking.customers?.full_name || 'ไม่ระบุชื่อ',
    room_number: booking.hotel_room_number || 'ไม่ระบุห้อง',
    service_name: booking.services?.name_th || 'ไม่ระบุบริการ',
    final_price: booking.final_price,
    payment_status: booking.payment_status,
    hotel_discount_rate: booking.hotel_discount_rate,
    created_at: booking.created_at
  }))

  const bookingData = transformedData
  const totalRevenue = bookingData.reduce((sum, booking) => sum + (booking.final_price || 0), 0)

  // Calculate platform fee (assume 15% platform fee, but hotel might have discount)
  const defaultPlatformFee = 0.15 // 15%
  const avgDiscountRate = bookingData.length > 0
    ? bookingData.reduce((sum, b) => sum + (b.hotel_discount_rate || 0), 0) / bookingData.length / 100
    : 0
  const effectivePlatformFee = Math.max(defaultPlatformFee - avgDiscountRate, 0.05) // Minimum 5%

  const platformFee = totalRevenue * effectivePlatformFee
  const hotelRevenue = totalRevenue - platformFee

  const pendingPayments = bookingData
    .filter(booking => booking.payment_status === 'pending')
    .reduce((sum, booking) => sum + (booking.final_price || 0), 0)

  // Create month label
  const monthDate = new Date(selectedMonth + '-01')
  const monthLabel = monthDate.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long'
  })

  return {
    month: selectedMonth,
    monthLabel,
    bookings: bookingData,
    totalBookings: bookingData.length,
    totalRevenue,
    platformFee,
    hotelRevenue,
    pendingPayments
  }
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
  })

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
    // Create a simple text-based bill content
    const billContent = [
      '='.repeat(60),
      'ใบเรียกเก็บเงินรายเดือน - The Bliss at Home',
      '='.repeat(60),
      `โรงแรม: ${getHotelName()}`,
      `ชื่อภาษาอังกฤษ: ${getHotelNameEn()}`,
      `เดือน: ${billData?.monthLabel}`,
      `เลขที่บิล: ${generateBillNumber(selectedMonth, hotelId!)}`,
      `กำหนดชำระ: ${getDueDate(selectedMonth)}`,
      '',
      'สรุปการจอง:',
      '-'.repeat(40),
      `จำนวนการจอง: ${billData?.totalBookings || 0} รายการ`,
      `รายได้รวม: ฿${billData?.totalRevenue.toLocaleString() || 0}`,
      `ค่าแพลตฟอร์ม: ฿${billData?.platformFee.toLocaleString() || 0}`,
      `รายได้สุทธิ: ฿${billData?.hotelRevenue.toLocaleString() || 0}`,
      `ยอดค้างชำระ: ฿${billData?.pendingPayments.toLocaleString() || 0}`,
      '',
      'รายละเอียดการจอง:',
      '-'.repeat(40),
    ]

    if (billData?.bookings) {
      billData.bookings.forEach((booking, index) => {
        billContent.push(
          `${index + 1}. ${new Date(booking.booking_date).toLocaleDateString('th-TH')} - ${booking.guest_name}`,
          `   ห้อง: ${booking.room_number} | บริการ: ${booking.service_name}`,
          `   ยอดเงิน: ฿${booking.final_price.toLocaleString()} | สถานะการชำระ: ${booking.payment_status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}`,
          ''
        )
      })
    }

    billContent.push(
      '='.repeat(60),
      'สร้างโดย The Bliss at Home System',
      `วันที่สร้าง: ${new Date().toLocaleDateString('th-TH')}`
    )

    // Create and download text file
    const content = billContent.join('\n')
    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `monthly-bill-${selectedMonth}.txt`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-600 mb-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            ลองใหม่
          </button>
        </div>
      </div>
    )
  }

  const billStatus = billData?.pendingPayments ? billData.pendingPayments > 0 ? 'pending' : 'paid' : 'paid'

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{billData?.totalBookings || 0}</p>
              <p className="text-sm text-stone-500">การจองทั้งหมด</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">฿{billData?.totalRevenue.toLocaleString() || 0}</p>
              <p className="text-sm text-stone-500">รายได้รวม</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">฿{billData?.platformFee.toLocaleString() || 0}</p>
              <p className="text-sm text-stone-500">ค่าแพลตฟอร์ม</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">฿{billData?.hotelRevenue.toLocaleString() || 0}</p>
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

      {/* Payment Summary */}
      {billData && billData.pendingPayments > 0 && (
        <div className="bg-amber-50 rounded-2xl shadow-lg p-6 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 mb-2">ยอดค้างชำระ</h3>
              <p className="text-sm text-amber-700 mb-3">
                มียอดเงินค้างชำระ ฿{billData.pendingPayments.toLocaleString()}
                กรุณาติดตามการชำระเงินจากลูกค้า
              </p>
              <p className="text-xs text-amber-600">
                กำหนดชำระ: {getDueDate(selectedMonth)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MonthlyBill