import { useState, useMemo } from 'react'
import {
  Search, Calendar, Download, Eye, Loader2, AlertCircle, RefreshCw,
  Filter, MapPin, Clock, User, CheckCircle, XCircle, List, Grid3X3, X,
  Phone, FileText, Edit, Image, History, RotateCcw, Save,
  Briefcase, DollarSign, CreditCard, Check, ArrowRight
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useHotelContext } from '../hooks/useHotelContext'
import { showLoading, updateToast } from '../utils/notifications'

// Provider preference type
type ProviderPreference = 'female-only' | 'male-only' | 'prefer-female' | 'prefer-male' | 'no-preference'

// Simple booking interface with recipient count support
interface SimpleBooking {
  id: string
  booking_number: string
  guest_name: string
  room_number: string
  booking_date: string
  booking_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  final_price: number
  customer_notes: string | null
  staff_name: string | null
  service_name: string | null
  duration: number
  recipient_count: number // จำนวนผู้รับบริการ (1 คน / 2 คน)
  provider_preference: ProviderPreference | null // ความต้องการผู้ให้บริการ
  created_at: string

  // Hotel info for detailed view
  hotel?: {
    id: string
    name_th: string
    address: string
    phone: string
    email: string
    rating: number
  } | null
}

// Helper function to parse customer data from customer_notes
function parseCustomerFromNotes(customerNotes?: string | null): string {
  if (!customerNotes) return 'ไม่ระบุชื่อ'

  const guestMatch = customerNotes.match(/Guest:\s*([^,\n]+)/)
  return guestMatch?.[1]?.trim() || 'ไม่ระบุชื่อ'
}

// Helper function to get provider preference label in Thai
function getProviderPreferenceLabel(preference: ProviderPreference | null): string {
  if (!preference || preference === 'no-preference') return 'ไม่ระบุ'

  switch (preference) {
    case 'female-only': return 'ผู้หญิงเท่านั้น'
    case 'male-only': return 'ผู้ชายเท่านั้น'
    case 'prefer-female': return 'ต้องการผู้หญิง'
    case 'prefer-male': return 'ต้องการผู้ชาย'
    default: return 'ไม่ระบุ'
  }
}

// Helper function to get provider preference badge color
function getProviderPreferenceBadgeStyle(preference: ProviderPreference | null): string {
  if (!preference || preference === 'no-preference') return 'bg-gray-100 text-gray-700'

  switch (preference) {
    case 'female-only': return 'bg-pink-100 text-pink-700'
    case 'male-only': return 'bg-blue-100 text-blue-700'
    case 'prefer-female': return 'bg-pink-50 text-pink-600'
    case 'prefer-male': return 'bg-blue-50 text-blue-600'
    default: return 'bg-gray-100 text-gray-700'
  }
}

// Fetch all services to get available service names for filtering
const fetchAllServices = async (): Promise<{ id: string; name_th: string; name_en?: string }[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('id, name_th, name_en')
    .eq('is_active', true)
    .order('name_th', { ascending: true })

  if (error) {
    console.error('Failed to fetch services:', error)
    return []
  }

  return data || []
}

// Fetch simple booking data with recipient count
const fetchSimpleBookings = async (hotelId: string): Promise<SimpleBooking[]> => {
  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      booking_date,
      booking_time,
      hotel_room_number,
      duration,
      status,
      payment_status,
      final_price,
      customer_notes,
      recipient_count,
      provider_preference,
      created_at,
      hotels:hotel_id(id, name_th, address, phone, email, rating),
      staff:staff_id(name_th),
      services:service_id(name_th)
    `)
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: false })

  if (bookingsError) {
    throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
  }

  // Transform the data
  const transformedData: SimpleBooking[] = bookingsData.map((booking: any) => ({
    id: booking.id,
    booking_number: booking.booking_number,
    guest_name: parseCustomerFromNotes(booking.customer_notes),
    room_number: booking.hotel_room_number || 'ไม่ระบุห้อง',
    booking_date: booking.booking_date,
    booking_time: booking.booking_time,
    duration: booking.duration,
    status: booking.status,
    payment_status: booking.payment_status,
    final_price: booking.final_price,
    customer_notes: booking.customer_notes,
    staff_name: booking.staff?.name_th || null,
    service_name: booking.services?.name_th || 'ไม่ระบุบริการ',
    recipient_count: booking.recipient_count || 1, // Default เป็น 1 คน
    provider_preference: booking.provider_preference || 'no-preference', // Default เป็น no-preference
    created_at: booking.created_at,
    hotel: booking.hotels
  }))

  return transformedData
}

type StatusFilter = 'all' | 'active' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
type TimeFilter = 'all' | 'today' | 'week' | 'month'
type ViewMode = 'table' | 'grouped'

function BookingHistory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedBooking, setSelectedBooking] = useState<SimpleBooking | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isDateRangeMode, setIsDateRangeMode] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hasSelectedDate, setHasSelectedDate] = useState(false) // Track if user has actually selected a date

  // Cancel state
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; booking: SimpleBooking | null }>({
    isOpen: false,
    booking: null
  })

  // Additional feature states
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; booking: SimpleBooking | null }>({
    isOpen: false,
    booking: null
  })
  const [imageModal, setImageModal] = useState<{ isOpen: boolean; booking: SimpleBooking | null }>({
    isOpen: false,
    booking: null
  })
  const [auditModal, setAuditModal] = useState<{ isOpen: boolean; booking: SimpleBooking | null }>({
    isOpen: false,
    booking: null
  })

  // Status change state management
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    bookingId: string;
    originalStatus: string;
    newStatus: string;
  } | null>(null)
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)


  const { hotelId, isValidHotel, isLoading: hotelLoading } = useHotelContext()

  // Cancel/Reschedule functions
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      // Refresh data
      refetch()
      setCancelModal({ isOpen: false, booking: null })
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('เกิดข้อผิดพลาดในการยกเลิกการจอง')
    }
  }



  // Check if booking is couple booking (needs 2 staff)
  // Currently disabled until couple booking database structure is implemented
  // const isCoupleBooking = (booking: any): boolean => {
  //   // Check for couple booking indicators
  //   return booking.is_couple ||
  //          booking.staff_count === 2 ||
  //          (booking.service_mode && booking.service_mode.includes('couple')) ||
  //          false
  // }


  // Additional functions
  const handleStatusUpdate = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) throw error

      refetch()
    } catch (error) {
      console.error('Error updating status:', error)
      throw error // Re-throw for calling function to handle
    }
  }

  const handleNotesUpdate = async (bookingId: string, newNotes: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ customer_notes: newNotes })
        .eq('id', bookingId)

      if (error) throw error

      refetch()
      setNotesModal({ isOpen: false, booking: null })
    } catch (error) {
      console.error('Error updating notes:', error)
      alert('เกิดข้อผิดพลาดในการแก้ไขหมายเหตุ')
    }
  }

  const handlePhoneCall = (phoneNumber: string) => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`, '_self')
    } else {
      alert('ไม่พบหมายเลขโทรศัพท์')
    }
  }

  // New status change handlers
  const handleStatusSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    if (newStatus !== selectedBooking?.status) {
      setPendingStatusChange({
        bookingId: selectedBooking!.id,
        originalStatus: selectedBooking!.status,
        newStatus: newStatus
      })
    } else {
      setPendingStatusChange(null)
    }
  }

  const handleCancelStatusChange = () => {
    setPendingStatusChange(null)
  }

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusChange) return

    setStatusUpdateLoading(true)
    const loadingToast = showLoading('กำลังอัปเดตสถานะ...')

    try {
      await handleStatusUpdate(pendingStatusChange.bookingId, pendingStatusChange.newStatus as any)
      updateToast(loadingToast, 'success', 'อัปเดตสถานะเรียบร้อยแล้ว ✅')
      setPendingStatusChange(null)
    } catch (error) {
      updateToast(loadingToast, 'error', 'ไม่สามารถอัปเดตสถานะได้ ❌')
    } finally {
      setStatusUpdateLoading(false)
    }
  }



  const handleExportPDF = (booking: SimpleBooking) => {
    // เตรียม HTML สำหรับ PDF
    const receiptHTML = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>ใบเสร็จการจอง</title>
          <style>
            body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 20px; }
            .details { margin-bottom: 15px; }
            .total { font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>ใบเสร็จการจอง</h2>
            <p>เลขที่จอง: #${booking.booking_number}</p>
          </div>
          <div class="details">
            <p><strong>ชื่อแขก:</strong> ${booking.guest_name}</p>
            <p><strong>ห้อง:</strong> ${booking.room_number}</p>
            <p><strong>วันที่:</strong> ${new Date(booking.booking_date).toLocaleDateString('th-TH')}</p>
            <p><strong>เวลา:</strong> ${new Date(booking.booking_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>บริการ:</strong> ${booking.service_name}</p>
            <p><strong>จำนวน:</strong> ${booking.recipient_count} คน</p>
            <p><strong>ระยะเวลา:</strong> ${booking.duration} นาที</p>
            <p><strong>สถานะ:</strong> ${booking.status}</p>
          </div>
          <div class="total">
            <p>ยอดรวม: ฿${booking.final_price.toLocaleString()}</p>
          </div>
        </body>
      </html>
    `

    // สร้าง window ใหม่สำหรับพิมพ์
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(receiptHTML)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Fetch simple bookings
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['simple-booking-history', hotelId],
    queryFn: () => fetchSimpleBookings(hotelId!),
    enabled: !hotelLoading && isValidHotel && !!hotelId,
  })

  // Fetch available services for filtering
  const { data: availableServices = [] } = useQuery({
    queryKey: ['available-services'],
    queryFn: fetchAllServices,
  })


  // Filter bookings
  const filteredBookings = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    return bookings.filter((booking) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        booking.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.room_number.includes(searchQuery) ||
        (booking.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        booking.booking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      let matchesStatus = true
      if (statusFilter === 'active') {
        matchesStatus = ['pending', 'confirmed', 'in_progress'].includes(booking.status)
      } else if (statusFilter === 'all') {
        matchesStatus = true
      } else {
        matchesStatus = booking.status === statusFilter
      }

      // Time filter
      let matchesTime = true
      switch (timeFilter) {
        case 'today':
          matchesTime = booking.booking_date === today
          break
        case 'week':
          matchesTime = booking.booking_date >= today && booking.booking_date <= oneWeekFromNow
          break
        case 'month':
          matchesTime = booking.booking_date >= today && booking.booking_date <= oneMonthFromNow
          break
        case 'all':
        default:
          matchesTime = true
      }


      // Service filter
      const matchesService = serviceFilter === 'all' || booking.service_name === serviceFilter

      // Date filter (only apply if user has actually selected a date)
      let matchesDate = true
      if (isDateRangeMode) {
        // Use date range when checkbox is checked
        if (dateFrom && dateTo) {
          matchesDate = booking.booking_date >= dateFrom && booking.booking_date <= dateTo
        } else if (dateFrom) {
          matchesDate = booking.booking_date >= dateFrom
        } else if (dateTo) {
          matchesDate = booking.booking_date <= dateTo
        }
      } else if (hasSelectedDate) {
        // Use single date only if user has actually selected a date
        matchesDate = booking.booking_date === selectedDate
      }

      return matchesSearch && matchesStatus && matchesTime && matchesService && matchesDate
    })
  }, [bookings, searchQuery, statusFilter, timeFilter, serviceFilter, selectedDate, isDateRangeMode, dateFrom, dateTo, hasSelectedDate])

  // Group bookings by date for grouped view
  const groupedBookings = useMemo(() => {
    if (viewMode !== 'grouped') return {}

    const groups: { [key: string]: SimpleBooking[] } = {}
    filteredBookings.forEach((booking) => {
      const date = booking.booking_date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(booking)
    })

    // เรียงลำดับภายในแต่ละกลุ่ม (แต่ละวัน) ให้ล่าสุดไว้บนสุด
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => {
        // เรียงตาม created_at ก่อน (ล่าสุดบนสุด)
        if (a.created_at !== b.created_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        // ถ้า created_at เหมือนกัน เรียงตาม booking_time (ล่าสุดบนสุด)
        return b.booking_time.localeCompare(a.booking_time)
      })
    })

    return groups
  }, [filteredBookings, viewMode])

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-gradient-to-r from-amber-100 to-yellow-100 border-amber-200 text-amber-800',
      confirmed: 'bg-gradient-to-r from-blue-100 to-sky-100 border-blue-200 text-blue-800',
      'in_progress': 'bg-gradient-to-r from-purple-100 to-violet-100 border-purple-200 text-purple-800',
      completed: 'bg-gradient-to-r from-emerald-100 to-green-100 border-emerald-200 text-emerald-800',
      cancelled: 'bg-gradient-to-r from-rose-100 to-red-100 border-rose-200 text-rose-800',
    }
    const labels = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      'in_progress': 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    }
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      'in_progress': Loader2,
      completed: CheckCircle,
      cancelled: XCircle,
    }
    const IconComponent = icons[status as keyof typeof icons] || Clock
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
        <IconComponent className={`w-4 h-4 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        <span>{labels[status as keyof typeof labels] || status}</span>
      </div>
    )
  }

  const getPaymentBadge = (paymentStatus: string) => {
    const badges = {
      pending: 'bg-gradient-to-r from-amber-100 to-orange-100 border-amber-200 text-amber-800',
      processing: 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-200 text-blue-800',
      paid: 'bg-gradient-to-r from-emerald-100 to-green-100 border-emerald-200 text-emerald-800',
      failed: 'bg-gradient-to-r from-rose-100 to-red-100 border-rose-200 text-rose-800',
      refunded: 'bg-gradient-to-r from-slate-100 to-gray-100 border-slate-200 text-slate-800',
    }
    const labels = {
      pending: 'รอชำระ',
      processing: 'กำลังประมวลผล',
      paid: 'ชำระแล้ว',
      failed: 'ชำระล้มเหลว',
      refunded: 'คืนเงินแล้ว',
    }
    const icons = {
      pending: Clock,
      processing: Loader2,
      paid: CheckCircle,
      failed: XCircle,
      refunded: RefreshCw,
    }
    const IconComponent = icons[paymentStatus as keyof typeof icons] || Clock
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${badges[paymentStatus as keyof typeof badges] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
        <IconComponent className={`w-4 h-4 ${paymentStatus === 'processing' ? 'animate-spin' : ''}`} />
        <span>{labels[paymentStatus as keyof typeof labels] || paymentStatus}</span>
      </div>
    )
  }

  const handleExport = () => {
    // Generate PDF Invoice using the new PDF generator
    import('../utils/pdfInvoiceGenerator').then(({ generateBookingInvoicePDF }) => {
      const bookingData = filteredBookings.map(booking => ({
        id: booking.id,
        booking_number: booking.booking_number,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        service: {
          name_th: booking.service_name || 'ไม่ระบุบริการ',
          price: booking.base_price
        },
        customer_notes: `Guest: ${booking.guest_name}, Room: ${booking.room_number}`,
        base_price: booking.base_price,
        final_price: booking.final_price,
        status: booking.status,
        created_at: booking.created_at,
        provider_preference: booking.provider_preference
      }))

      const hotelName = hotel?.name || 'Hotel Partner'
      generateBookingInvoicePDF(bookingData, hotelName)
    }).catch(error => {
      console.error('Error generating PDF:', error)
      // Fallback to CSV if PDF generation fails
      const csvHeaders = ['วันที่', 'เวลา', 'เลขที่จอง', 'ชื่อแขก', 'ห้อง', 'บริการ', 'ยอดเงิน', 'สถานะ']
      const csvData = filteredBookings.map(booking => [
        new Date(booking.booking_date).toLocaleDateString('th-TH'),
        new Date(booking.booking_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        booking.booking_number,
        booking.guest_name,
        booking.room_number,
        booking.service_name || 'ไม่ระบุบริการ',
        booking.final_price,
        booking.status === 'completed' ? 'เสร็จสิ้น' : booking.status === 'cancelled' ? 'ยกเลิก' : 'อื่นๆ'
      ])
      const csvContent = [csvHeaders, ...csvData].map(row => row.join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
      const link = document.createElement('a')
      link.setAttribute('href', URL.createObjectURL(blob))
      link.setAttribute('download', `booking-history-${new Date().toISOString().slice(0, 10)}.csv`)
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
          <p className="text-stone-600">กำลังโหลดข้อมูลการจอง...</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ประวัติการจอง</h1>
          <p className="text-stone-500">Booking History</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-700">{filteredBookings.length}</p>
            <p className="text-sm text-stone-500">รายการทั้งหมด</p>
          </div>
          <button
            onClick={handleExport}
            disabled={filteredBookings.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-700">ตัวกรอง & มุมมอง</span>
          </div>
          <div className="flex items-center bg-stone-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition ${
                viewMode === 'table'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List className="w-3 h-3" />
              ตาราง
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition ${
                viewMode === 'grouped'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Grid3X3 className="w-3 h-3" />
              จัดกลุ่ม
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              ค้นหา
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="ชื่อแขก, ห้อง, บริการ, เลขที่จอง"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              สถานะ
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="active">กำลังดำเนินการทั้งหมด</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              ช่วงเวลา
            </label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="today">วันนี้</option>
              <option value="week">สัปดาห์นี้</option>
              <option value="month">เดือนนี้</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              บริการ
            </label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
            >
              <option value="all">ทั้งหมด</option>
              {availableServices.map((service) => (
                <option key={service.id} value={service.name_th}>
                  {service.name_th}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              วันที่
            </label>
            <div className="space-y-2">
              {/* Single Date Input (Only shown when not in range mode) */}
              {!isDateRangeMode && (
                <input
                  type="date"
                  value={hasSelectedDate ? selectedDate : ''}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setHasSelectedDate(true)
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                  placeholder="เลือกวันที่"
                />
              )}

              {/* Checkbox for Range Mode */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDateRangeMode}
                  onChange={(e) => setIsDateRangeMode(e.target.checked)}
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs text-stone-600">ดูแบบลากวัน</span>
              </label>

              {/* Date Range Inputs (Only shown when checkbox is checked) */}
              {isDateRangeMode && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      จากวันที่
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      ถึงวันที่
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                      placeholder=""
                    />
                  </div>
                </div>
              )}

              {/* Clear Date Filter Button */}
              {(hasSelectedDate || isDateRangeMode || dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setSelectedDate(new Date().toISOString().split('T')[0])
                    setIsDateRangeMode(false)
                    setDateFrom('')
                    setDateTo('')
                    setHasSelectedDate(false)
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded transition"
                  title="รีเซ็ตตัวกรองวันที่"
                >
                  <X className="w-3 h-3" />
                  รีเซ็ต
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Results count */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-stone-600">
            พบ {filteredBookings.length} รายการ จากทั้งหมด {bookings.length} รายการ
          </p>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        // Table View
        <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">ไม่พบประวัติการจอง</p>
              <p className="text-sm">ลองเปลี่ยนเงื่อนไขการค้นหาหรือเพิ่มข้อมูลการจอง</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      เลขที่จอง & วันที่
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      แขก
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      บริการ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      ความต้องการ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      ยอดเงิน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      การชำระ
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">
                      รายละเอียด
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-stone-900">
                            #{booking.booking_number}
                          </div>
                          <div className="text-stone-500">
                            {new Date(booking.booking_date).toLocaleDateString('th-TH')}
                          </div>
                          <div className="text-xs text-stone-400">
                            {new Date(booking.booking_time).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-stone-900">{booking.guest_name}</div>
                          <div className="text-stone-500">ห้อง {booking.room_number}</div>
                          {booking.staff_name && (
                            <div className="text-xs text-stone-400">เจ้าหน้าที่: {booking.staff_name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-stone-900">
                          <div className="font-medium">
                            {booking.service_name || 'ไม่ระบุบริการ'}
                            {booking.recipient_count > 1 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded ml-1">
                                {booking.recipient_count} คน
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-stone-500">ระยะเวลา: {booking.duration} นาที</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full ${getProviderPreferenceBadgeStyle(booking.provider_preference)}`}>
                          {getProviderPreferenceLabel(booking.provider_preference)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-amber-700">฿{booking.final_price.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentBadge(booking.payment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="text-amber-600 hover:text-amber-700 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Grouped View
        <div className="space-y-6">
          {Object.keys(groupedBookings).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-stone-100">
              <div className="text-center py-12 text-stone-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">ไม่มีการจองในขณะนี้</p>
                <p className="text-sm">การจองใหม่จะแสดงที่นี่</p>
              </div>
            </div>
          ) : (
            Object.keys(groupedBookings)
              .sort((a, b) => b.localeCompare(a)) // ล่าสุดไว้บนสุด
              .map((date) => (
                <div key={date} className="bg-white rounded-2xl shadow-lg border border-stone-100">
                  {/* Date Header */}
                  <div className="p-4 border-b border-stone-100 bg-stone-50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-600" />
                      <h3 className="text-lg font-semibold text-stone-900">
                        {new Date(date).toLocaleDateString('th-TH', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h3>
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                        {groupedBookings[date].length} รายการ
                      </span>
                    </div>
                  </div>

                  {/* Bookings for this date */}
                  <div className="p-4 space-y-4">
                    {groupedBookings[date].map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition cursor-pointer"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-amber-700" />
                            </div>
                            <div>
                              <p className="font-medium text-stone-900">
                                {booking.guest_name}
                                <span className="text-xs text-stone-500 ml-2">#{booking.booking_number}</span>
                              </p>
                              <p className="text-sm text-stone-500">ห้อง {booking.room_number}</p>
                            </div>
                          </div>

                          <div className="ml-11">
                            <p className="text-sm font-medium text-stone-800 mb-1">
                              {booking.service_name || 'ไม่ระบุบริการ'}
                              {booking.recipient_count > 1 && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded ml-1">
                                  {booking.recipient_count} คน
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-stone-600 mb-1">
                              ระยะเวลา: {booking.duration} นาที
                            </p>
                            <p className="text-xs text-stone-600 mb-2">
                              ความต้องการ: <span className={`px-2 py-1 rounded ${getProviderPreferenceBadgeStyle(booking.provider_preference)}`}>
                                {getProviderPreferenceLabel(booking.provider_preference)}
                              </span>
                            </p>

                            <div className="flex items-center gap-4 text-xs text-stone-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(booking.booking_time).toLocaleTimeString('th-TH', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              {booking.staff_name && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {booking.staff_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {getStatusBadge(booking.status)}
                            <div className="mt-1">
                              {getPaymentBadge(booking.payment_status)}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-amber-700">฿{booking.final_price.toLocaleString()}</p>
                            <button className="text-xs text-amber-600 hover:text-amber-700">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Clean White Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl max-h-[95vh] overflow-hidden">

            {/* Clean Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">รายละเอียดการจอง</h2>
                <p className="text-sm text-gray-500">Booking Details</p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2 hover:bg-gray-50 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(95vh-150px)] overflow-y-auto space-y-6">

              {/* Booking ID & Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">รหัสการจอง</p>
                  <p className="text-xl font-bold text-gray-900">#{selectedBooking.booking_number}</p>
                </div>
                {getStatusBadge(selectedBooking.status)}
              </div>

              {/* Guest Information */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">ข้อมูลแขก</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">ชื่อแขก</p>
                    <p className="font-medium text-gray-900">{selectedBooking.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ห้องพัก</p>
                    <p className="font-medium text-gray-900">{selectedBooking.room_number}</p>
                  </div>
                  {selectedBooking.staff_name && (
                    <div>
                      <p className="text-sm text-gray-500">เจ้าหน้าที่</p>
                      <p className="font-medium text-gray-900">{selectedBooking.staff_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">รายละเอียดบริการ</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      ฿{selectedBooking.final_price.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">บริการ</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {selectedBooking.service_name || 'ไม่ระบุบริการ'}
                        </p>
                        {selectedBooking.recipient_count > 1 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {selectedBooking.recipient_count} คน
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        ระยะเวลา: {selectedBooking.duration} นาที
                      </p>
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getProviderPreferenceBadgeStyle(selectedBooking.provider_preference)}`}>
                          ความต้องการ: {getProviderPreferenceLabel(selectedBooking.provider_preference)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">วันที่</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedBooking.booking_date).toLocaleDateString('th-TH', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">เวลา</p>
                      <p className="font-medium text-gray-900">
                        {selectedBooking.booking_time ?
                          new Date(`1970-01-01T${selectedBooking.booking_time}`).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'ไม่ระบุเวลา'
                        } น.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-gray-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">ข้อมูลการชำระเงิน</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">สถานะการชำระ</p>
                      {getPaymentBadge(selectedBooking.payment_status)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Notes */}
              {selectedBooking.customer_notes && (
                <div className="bg-blue-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">หมายเหตุ</h3>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedBooking.customer_notes}
                  </p>
                </div>
              )}

              {/* Hotel Information */}
              {selectedBooking.hotel && (
                <div className="bg-amber-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">ข้อมูลโรงแรม</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">ชื่อโรงแรม</p>
                      <p className="font-medium text-gray-900">{selectedBooking.hotel.name_th}</p>
                    </div>
                    {selectedBooking.hotel.address && (
                      <div>
                        <p className="text-sm text-gray-500">ที่อยู่</p>
                        <p className="text-gray-700">{selectedBooking.hotel.address}</p>
                      </div>
                    )}
                    <div className="flex gap-6">
                      {selectedBooking.hotel.phone && (
                        <div>
                          <p className="text-sm text-gray-500">เบอร์โทร</p>
                          <p className="font-medium text-gray-900">{selectedBooking.hotel.phone}</p>
                        </div>
                      )}
                      {selectedBooking.hotel.rating > 0 && (
                        <div>
                          <p className="text-sm text-gray-500">คะแนน</p>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500">⭐</span>
                            <span className="font-medium text-gray-900">{selectedBooking.hotel.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status Change Section */}
              <div className="bg-purple-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">เปลี่ยนสถานะการจอง</h3>
                </div>
                <div className="space-y-4">
                  {!pendingStatusChange ? (
                    // Default state - no changes pending
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <select
                          value={selectedBooking.status}
                          onChange={handleStatusSelect}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white font-medium"
                        >
                          <option value="pending">รอดำเนินการ</option>
                          <option value="confirmed">ยืนยันแล้ว</option>
                          <option value="in_progress">กำลังดำเนินการ</option>
                          <option value="completed">เสร็จสิ้น</option>
                          <option value="cancelled">ยกเลิก</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>สถานะปัจจุบัน:</span>
                        {getStatusBadge(selectedBooking.status)}
                      </div>
                    </div>
                  ) : (
                    // Pending change state - show confirmation
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <select
                            value={pendingStatusChange.newStatus}
                            onChange={handleStatusSelect}
                            disabled={statusUpdateLoading}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="pending">รอดำเนินการ</option>
                            <option value="confirmed">ยืนยันแล้ว</option>
                            <option value="in_progress">กำลังดำเนินการ</option>
                            <option value="completed">เสร็จสิ้น</option>
                            <option value="cancelled">ยกเลิก</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {getStatusBadge(pendingStatusChange.originalStatus)}
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          {getStatusBadge(pendingStatusChange.newStatus)}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={handleCancelStatusChange}
                          disabled={statusUpdateLoading}
                          className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ยกเลิก
                        </button>
                        <button
                          onClick={handleConfirmStatusChange}
                          disabled={statusUpdateLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {statusUpdateLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              กำลังบันทึก...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              บันทึกการเปลี่ยนแปลง
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-purple-100/50 rounded-lg p-3">
                    <p className="text-xs text-purple-700">
                      💡 เลือกสถานะใหม่แล้วกดปุ่ม "บันทึกการเปลี่ยนแปลง" เพื่อยืนยัน
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">การจัดการ</h3>
                <div className="flex flex-wrap gap-3">

                  <button
                    onClick={() => setNotesModal({ isOpen: true, booking: selectedBooking })}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    แก้ไขหมายเหตุ
                  </button>

                  {selectedBooking.customer_notes?.includes('Phone:') && (
                    <button
                      onClick={() => {
                        const phoneMatch = selectedBooking.customer_notes?.match(/Phone:\s*([^\n,]+)/)
                        const phone = phoneMatch?.[1]?.trim()
                        if (phone) handlePhoneCall(phone)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      โทรหาแขก
                    </button>
                  )}

                  <button
                    onClick={() => handleExportPDF(selectedBooking)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    ออกใบเสร็จ
                  </button>

                  {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
                    <>
                      <button
                        onClick={() => setCancelModal({ isOpen: true, booking: selectedBooking })}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition text-sm"
                      >
                        <X className="w-4 h-4" />
                        ยกเลิก
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white transition"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900">ยกเลิกการจอง</h3>
            </div>

            <div className="mb-6">
              <p className="text-stone-600 mb-2">คุณต้องการยกเลิกการจองนี้หรือไม่?</p>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-stone-900">{cancelModal.booking?.guest_name}</p>
                <p className="text-sm text-stone-600">{cancelModal.booking?.service_name}</p>
                <p className="text-sm text-stone-600">ห้อง {cancelModal.booking?.room_number}</p>
                <p className="text-sm text-stone-600">
                  {cancelModal.booking && new Date(cancelModal.booking.booking_date).toLocaleDateString('th-TH')}
                  {' '}
                  {cancelModal.booking && new Date(cancelModal.booking.booking_time).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal({ isOpen: false, booking: null })}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (cancelModal.booking) {
                    handleCancelBooking(cancelModal.booking.id)
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                ยืนยันการยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Notes Edit Modal */}
      {notesModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <Edit className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900">แก้ไขหมายเหตุ</h3>
            </div>

            <div className="mb-6">
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <p className="font-medium text-stone-900">{notesModal.booking?.guest_name}</p>
                <p className="text-sm text-stone-600">{notesModal.booking?.service_name}</p>
                <p className="text-sm text-stone-600">ห้อง {notesModal.booking?.room_number}</p>
              </div>

              <label className="block text-sm font-medium text-stone-700 mb-2">
                หมายเหตุ
              </label>
              <textarea
                id="newNotes"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder="เพิ่มหมายเหตุสำหรับการจองนี้..."
                defaultValue={notesModal.booking?.customer_notes || ''}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setNotesModal({ isOpen: false, booking: null })}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  const newNotes = (document.getElementById('newNotes') as HTMLTextAreaElement)?.value
                  if (notesModal.booking) {
                    handleNotesUpdate(notesModal.booking.id, newNotes || '')
                  }
                }}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-full">
                <Image className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900">เพิ่มรูปภาพ</h3>
            </div>

            <div className="mb-6">
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <p className="font-medium text-stone-900">{imageModal.booking?.guest_name}</p>
                <p className="text-sm text-stone-600">{imageModal.booking?.service_name}</p>
                <p className="text-sm text-stone-600">ห้อง {imageModal.booking?.room_number}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    รูปภาพก่อนให้บริการ
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="เลือกรูปภาพ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    รูปภาพหลังให้บริการ
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="เลือกรูปภาพ"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                * รูปภาพจะถูกบันทึกเป็นหลักฐานการให้บริการ
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setImageModal({ isOpen: false, booking: null })}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  // TODO: Implement image upload functionality
                  alert('ฟีเจอร์นี้จะพัฒนาในเร็วๆ นี้')
                  setImageModal({ isOpen: false, booking: null })
                }}
                className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
              >
                อัปโหลด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {auditModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-full">
                <History className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900">ประวัติการเปลี่ยนแปลง</h3>
            </div>

            <div className="mb-6">
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <p className="font-medium text-stone-900">{auditModal.booking?.guest_name}</p>
                <p className="text-sm text-stone-600">{auditModal.booking?.service_name}</p>
                <p className="text-sm text-stone-600">ห้อง {auditModal.booking?.room_number}</p>
              </div>

              {/* Mock audit trail data */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900">สร้างการจอง</p>
                    <p className="text-xs text-stone-600">
                      {auditModal.booking && new Date(auditModal.booking.created_at).toLocaleString('th-TH')}
                    </p>
                    <p className="text-xs text-stone-500">ผู้ใช้: {auditModal.booking?.guest_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900">ยืนยันการจอง</p>
                    <p className="text-xs text-stone-600">เมื่อสักครู่นี้</p>
                    <p className="text-xs text-stone-500">ผู้ใช้: เจ้าหน้าที่โรงแรม</p>
                  </div>
                </div>

                {auditModal.booking?.status === 'completed' && (
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900">เสร็จสิ้นการให้บริการ</p>
                      <p className="text-xs text-stone-600">เมื่อไม่นานมานี้</p>
                      <p className="text-xs text-stone-500">ผู้ใช้: {auditModal.booking?.staff_name || 'เจ้าหน้าที่'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  * ประวัติการเปลี่ยนแปลงแบบจริงจะถูกพัฒนาในเร็วๆ นี้
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAuditModal({ isOpen: false, booking: null })}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingHistory