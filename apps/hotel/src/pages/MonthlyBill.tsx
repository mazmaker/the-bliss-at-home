import { useState, useMemo } from 'react'
import { Download, Calendar, CreditCard, FileText, Check, Loader2, AlertCircle, RefreshCw, Phone, Mail, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useHotelContext } from '../hooks/useHotelContext'
import { getMonthlyBillStatus, formatOverdueMessage } from '../utils/overdueCalculator'

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

// Fetch monthly bill data from database with proper error handling
const fetchMonthlyBill = async (hotelId: string, selectedMonth: string): Promise<MonthlyBillData> => {
  const monthStart = `${selectedMonth}-01`
  const nextMonth = new Date(selectedMonth + '-01')
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const monthEnd = nextMonth.toISOString().slice(0, 7) + '-01'

  console.log('Fetching monthly bill for:', { hotelId, monthStart, monthEnd })

  // Try to get service name using service_id (removed hotel_discount_rate as it doesn't exist)
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      hotel_room_number,
      final_price,
      payment_status,
      created_at,
      customer_notes,
      service_id,
      services:service_id(name_th)
    `)
    .eq('hotel_id', hotelId)
    .gte('booking_date', monthStart)
    .lt('booking_date', monthEnd)
    .in('status', ['completed', 'confirmed', 'pending']) // Include more statuses
    .order('booking_date', { ascending: true })

  if (error) {
    console.error('Monthly bill query error:', error)
    throw new Error(`Failed to fetch monthly bill: ${error.message}`)
  }

  console.log('Raw booking data:', data)

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
    hotel_discount_rate: 0, // Default value since this column doesn't exist
    created_at: booking.created_at
  }))

  const bookingData = transformedData
  const totalRevenue = bookingData.reduce((sum, booking) => sum + (booking.final_price || 0), 0)

  // No platform fee for hotels
  const platformFee = 0 // 0% - hotels keep all revenue
  const hotelRevenue = totalRevenue // Hotels keep 100%

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
    retry: 1, // Reduce retries
    staleTime: 1000 * 60 * 5, // 5 minutes
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Enhanced Payment Summary with Overdue Status */}
      {billData && billData.pendingPayments > 0 && (() => {
        // Calculate overdue status for current selected month
        const overdueStatus = getMonthlyBillStatus(selectedMonth)
        const overdueMessage = formatOverdueMessage(overdueStatus, billData.pendingPayments)

        // Determine styling based on overdue level
        const getAlertStyling = () => {
          switch (overdueStatus.level) {
            case 'URGENT':
              return {
                bgClass: 'bg-gradient-to-r from-red-50 to-red-100',
                borderClass: 'border-2 border-red-300 ring-2 ring-red-100',
                iconBg: 'bg-red-200',
                iconColor: 'text-red-700',
                titleColor: 'text-red-800',
                textColor: 'text-red-700',
                animation: 'animate-pulse'
              }
            case 'WARNING':
              return {
                bgClass: 'bg-gradient-to-r from-orange-50 to-orange-100',
                borderClass: 'border-2 border-orange-300',
                iconBg: 'bg-orange-200',
                iconColor: 'text-orange-700',
                titleColor: 'text-orange-800',
                textColor: 'text-orange-700',
                animation: ''
              }
            case 'OVERDUE':
              return {
                bgClass: 'bg-gradient-to-r from-amber-50 to-amber-100',
                borderClass: 'border border-amber-300',
                iconBg: 'bg-amber-200',
                iconColor: 'text-amber-700',
                titleColor: 'text-amber-800',
                textColor: 'text-amber-700',
                animation: ''
              }
            case 'DUE_SOON':
              return {
                bgClass: 'bg-gradient-to-r from-blue-50 to-blue-100',
                borderClass: 'border border-blue-300',
                iconBg: 'bg-blue-200',
                iconColor: 'text-blue-700',
                titleColor: 'text-blue-800',
                textColor: 'text-blue-700',
                animation: ''
              }
            default:
              return {
                bgClass: 'bg-amber-50',
                borderClass: 'border border-amber-200',
                iconBg: 'bg-amber-200',
                iconColor: 'text-amber-600',
                titleColor: 'text-amber-800',
                textColor: 'text-amber-700',
                animation: ''
              }
          }
        }

        const styling = getAlertStyling()

        return (
          <div className={`${styling.bgClass} rounded-2xl shadow-lg p-6 ${styling.borderClass} ${styling.animation}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 ${styling.iconBg} rounded-xl`}>
                <AlertCircle className={`w-8 h-8 ${styling.iconColor}`} />
              </div>
              <div className="flex-1">
                {/* Title with overdue status */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`font-bold text-lg ${styling.titleColor}`}>
                    {overdueMessage.title}
                  </h3>
                  {overdueStatus.actionRequired && (
                    <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                      {overdueStatus.level === 'URGENT' ? 'ด่วนมาก' : 'ต้องติดตาม'}
                    </span>
                  )}
                </div>

                {/* Amount and details */}
                <div className="bg-white rounded-lg p-4 mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className={`text-xs ${styling.textColor} mb-1`}>ยอดค้างชำระ:</p>
                      <p className={`text-2xl font-bold ${styling.titleColor}`}>
                        ฿{billData.pendingPayments.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${styling.textColor} mb-1`}>
                        {overdueStatus.days > 0 ? 'เลยกำหนดมาแล้ว:' :
                         overdueStatus.days === 0 ? 'กำหนดชำระ:' : 'กำหนดชำระ:'}
                      </p>
                      <p className={`text-lg font-semibold ${styling.titleColor}`}>
                        {overdueStatus.days > 0 ? `${overdueStatus.days} วัน` :
                         overdueStatus.days === 0 ? 'วันนี้' :
                         getDueDate(selectedMonth)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className={`text-sm ${styling.textColor} mb-3`}>
                  {overdueMessage.description}
                </p>

                {/* Action buttons for overdue cases */}
                {overdueStatus.actionRequired && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button className={`flex items-center gap-2 px-4 py-2 ${
                      overdueStatus.level === 'URGENT' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                    } text-white rounded-lg text-sm font-medium transition`}>
                      <Phone className="w-4 h-4" />
                      {overdueStatus.level === 'URGENT' ? 'โทรหาทันที' : 'ติดต่อโรงแรม'}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-orange-300 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50 transition">
                      <Mail className="w-4 h-4" />
                      ส่งจดหมายเตือน
                    </button>
                  </div>
                )}

                {/* Due date info */}
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <Clock className="w-3 h-3" />
                  <span>
                    กำหนดชำระเดิม: {getDueDate(selectedMonth)}
                    {overdueStatus.days > 0 && (
                      <span className={`ml-2 font-medium ${styling.textColor}`}>
                        (เลยมาแล้ว {overdueStatus.days} วัน)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment methods note */}
            <div className="mt-4 p-3 bg-white bg-opacity-70 rounded-lg">
              <p className="text-xs text-stone-600 mb-2 font-medium">วิธีการชำระเงิน:</p>
              <div className="text-xs text-stone-600 space-y-1">
                <p>• โอนเงินผ่านธนาคาร</p>
                <p>• เช็คส่งทางไปรษณีย์</p>
                <p>• ชำระด้วยเงินสด ณ สำนักงาน</p>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default MonthlyBill