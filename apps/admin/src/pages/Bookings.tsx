import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Eye, Download, Calendar, Clock, X, User, Phone, MapPin, Briefcase, CreditCard, FileText, DollarSign, Ban, RefreshCw, Users, TrendingUp, Trash2 } from 'lucide-react'
import { isSpecificPreference, getProviderPreferenceLabel, getProviderPreferenceBadgeStyle } from '@bliss/supabase'
import { useBookings, useBookingStats, useUpdateBookingStatus, usePendingExtensions, type Booking, type BookingStatus } from '../hooks/useBookings'
import { useQueryClient } from '@tanstack/react-query'
import type { ServiceCategory } from '../services/bookingService'
import BookingCancellationModal from '../components/BookingCancellationModal'
import AdminRescheduleModal from '../components/AdminRescheduleModal'
import DeleteBookingConfirmModal from '../components/DeleteBookingConfirmModal'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Server API base — strip a trailing /api (prod VITE_API_URL includes it) to avoid /api/api → 404.
const EXT_API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')).replace(/\/api\/?$/, '')

// [manual-QR] single source of truth for "is this a manual-QR booking" — marker prefix-match
// (matches BOTH '[MANUAL_QR]' stamped at create AND '[MANUAL_QR PAID] …' appended after admin
// mark-paid — G24/G27). Read from admin_notes only (never payment_status/payment_method).
const isManualQrBooking = (b?: { admin_notes?: string | null }) => !!b?.admin_notes?.includes('[MANUAL_QR')

// Staff job-progress badge (from jobs.status) — the staff's live progression
// (รอรับงาน → รับงานแล้ว → กำลังเดินทาง → ถึงแล้ว → เริ่มงาน → เสร็จสิ้น), a SEPARATE axis from the
// booking status badge. Module-scope so BOTH the list (Bookings) AND the detail modal
// (BookingDetailModal) can use it — they are separate components in this file.
const JOB_PROGRESS_ORDER = ['pending', 'confirmed', 'traveling', 'arrived', 'in_progress', 'completed']
function getJobProgressBadge(status?: string) {
  const cfg: Record<string, { label: string; className: string }> = {
    pending: { label: 'รอรับงาน', className: 'bg-yellow-100 text-yellow-700' },
    confirmed: { label: 'รับงานแล้ว', className: 'bg-blue-100 text-blue-700' },
    traveling: { label: 'กำลังเดินทาง', className: 'bg-bliss-100 text-bliss-700' },
    arrived: { label: 'ถึงแล้ว', className: 'bg-purple-100 text-purple-700' },
    in_progress: { label: 'เริ่มงาน', className: 'bg-indigo-100 text-indigo-700' },
    completed: { label: 'เสร็จสิ้น', className: 'bg-green-100 text-green-700' },
    cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-700' },
  }
  const c = status ? cfg[status] : undefined
  if (!c) return null
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.className}`}>
      {c.label}
    </span>
  )
}
// For a COUPLE booking (multiple jobs) the list shows the LEAST-advanced non-cancelled job status
// (the booking's overall staff progress); the detail modal shows each staff separately.
function overallJobStatus(jobs?: Array<{ status: string }>): string | undefined {
  if (!jobs || jobs.length === 0) return undefined
  const active = jobs.filter(j => j.status !== 'cancelled')
  if (active.length === 0) return 'cancelled'
  let best = active[0].status
  let bestIdx = JOB_PROGRESS_ORDER.indexOf(best)
  for (const j of active) {
    const idx = JOB_PROGRESS_ORDER.indexOf(j.status)
    if (idx >= 0 && (bestIdx < 0 || idx < bestIdx)) { best = j.status; bestIdx = idx }
  }
  return best
}

// Emergency-oversight "at-risk" flag (#4): the appointment is within AT_RISK_WINDOW_MIN minutes
// (or up to 2h past-due) but the staff has NOT departed — overall job progress is still anything
// NOT already traveling/arrived/in_progress/completed (DENYLIST form, so an un-accepted
// 'assigned'/'pending' near-time job is caught too), and the booking itself is still active.
const AT_RISK_WINDOW_MIN = 30
const DEPARTED_OR_LATER = new Set(['traveling', 'arrived', 'in_progress', 'completed'])
function isBookingAtRisk(booking: { booking_date?: string | null; booking_time?: string | null; status?: string; jobs?: Array<{ status: string }> }): boolean {
  if (!booking.booking_date || !booking.booking_time) return false
  if (booking.status === 'completed' || booking.status === 'cancelled') return false
  const prog = overallJobStatus(booking.jobs)
  if (prog && DEPARTED_OR_LATER.has(prog)) return false
  // +07:00: booking_date+booking_time is Bangkok wall-clock; parsing device-local mis-computes
  // minsUntil (below, vs Date.now()) on any admin device not set to Asia/Bangkok. TH = fixed UTC+7.
  const t = (booking.booking_time || '00:00:00').slice(0, 8)
  const start = new Date(`${booking.booking_date}T${t}+07:00`).getTime()
  if (Number.isNaN(start)) return false
  const minsUntil = (start - Date.now()) / 60_000
  return minsUntil <= AT_RISK_WINDOW_MIN && minsUntil >= -120 // near appointment .. up to 2h overdue
}

function Bookings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') as BookingStatus | null
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>(initialStatus || 'all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all')
  const [bookingTypeFilter, setBookingTypeFilter] = useState<'all' | 'customer' | 'hotel'>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false) // PART47-P6: admin-only reschedule
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const queryClient = useQueryClient()

  // Sync statusFilter with URL search params (e.g. when navigating from different links)
  useEffect(() => {
    const urlStatus = searchParams.get('status') as BookingStatus | null
    setStatusFilter(urlStatus || 'all')
  }, [searchParams])

  // Fetch bookings with filters
  const { data: bookingsData = [], isLoading: bookingsLoading } = useBookings({
    status: statusFilter,
    category: categoryFilter,
    booking_type: bookingTypeFilter,
    date_filter: dateFilter,
  })

  // Fetch stats
  const { data: stats } = useBookingStats()

  // PART47 P3: bookings with a pending (manual_qr) extension awaiting admin confirmation
  // → per-row badge + a header count so admin doesn't rely only on the notification bell.
  const { data: pendingExtBookingIds = [] } = usePendingExtensions()
  const pendingExtSet = useMemo(() => new Set(pendingExtBookingIds), [pendingExtBookingIds])

  // Keep the OPEN detail modal in sync with the (re)fetched list. `selectedBooking` is a snapshot
  // captured at open; confirming an extension invalidates + refetches ['bookings'], but without this
  // the modal keeps the stale snapshot — so a just-applied extension (esp. a couple "ต่อทั้งคู่" that
  // adds rows for BOTH recipients) wouldn't appear in the price/earnings/service breakdowns until the
  // modal is closed and reopened. Re-sync to the fresh row (same list query → carries booking_services + jobs).
  useEffect(() => {
    if (!selectedBooking) return
    const fresh = bookingsData.find((b) => b.id === selectedBooking.id)
    if (fresh && fresh !== selectedBooking) setSelectedBooking(fresh)
  }, [bookingsData])

  // Status update mutation
  const updateStatus = useUpdateBookingStatus()

  const handleOpenDetail = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false)
    setSelectedBooking(null)
  }

  const handleOpenCancellation = () => {
    setIsDetailModalOpen(false)
    setIsCancellationModalOpen(true)
  }

  const handleCloseCancellation = () => {
    setIsCancellationModalOpen(false)
    setSelectedBooking(null)
  }

  const handleCancellationComplete = () => {
    // Refresh bookings data
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  // PART47-P6 — admin-only reschedule. Mirrors the cancellation flow: the detail modal's
  // "เลื่อนนัด" button closes detail then opens AdminRescheduleModal (keeps selectedBooking).
  const handleOpenReschedule = () => {
    setIsDetailModalOpen(false)
    setIsRescheduleModalOpen(true)
  }

  const handleCloseReschedule = () => {
    setIsRescheduleModalOpen(false)
    setSelectedBooking(null)
  }

  const handleRescheduleComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  // PART47-P7 — delete flow. From the list a Trash icon opens the confirm directly; from the
  // detail modal the red "ลบการจอง" button closes detail then opens the confirm (keeps selectedBooking).
  const handleOpenDeleteFromList = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDeleteModalOpen(true)
  }

  const handleOpenDeleteFromDetail = () => {
    setIsDetailModalOpen(false)
    setIsDeleteModalOpen(true)
  }

  const handleCloseDelete = () => {
    setIsDeleteModalOpen(false)
    setSelectedBooking(null)
  }

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus, autoMarkPaid?: boolean) => {
    try {
      await updateStatus.mutateAsync({ id: bookingId, status: newStatus, autoMarkPaid })
    } catch (error) {
      console.error('Error updating booking status:', error)
      alert('เกิดข้อผิดพลาดในการอัพเดทสถานะ: ' + (error as Error).message)
      throw error
    }
  }

  // Client-side search filter
  const filteredBookings = useMemo(() => {
    if (!searchQuery) return bookingsData

    const query = searchQuery.toLowerCase()
    return bookingsData.filter((booking) =>
      booking.booking_number.toLowerCase().includes(query) ||
      booking.customers?.full_name?.toLowerCase().includes(query) ||
      booking.service?.name_th.toLowerCase().includes(query) ||
      booking.service?.name_en.toLowerCase().includes(query) ||
      booking.hotel?.name_th.toLowerCase().includes(query) ||
      booking.staff?.name_th.toLowerCase().includes(query)
    )
  }, [bookingsData, searchQuery])

  const handleExportReport = () => {
    if (!filteredBookings.length) {
      alert('ไม่มีข้อมูลสำหรับส่งออก')
      return
    }

    // Prepare CSV data
    const headers = ['รหัสจอง', 'ประเภท', 'บริการ', 'ระยะเวลา', 'โรงแรม', 'พนักงาน', 'วันที่', 'เวลา', 'จำนวน', 'สถานะ', 'การชำระ']
    const rows = filteredBookings.map(booking => [
      booking.booking_number,
      booking.is_hotel_booking ? 'โรงแรม' : (() => {
        const customerBookingsCount = filteredBookings.filter(b =>
          !b.is_hotel_booking && b.customer_id === booking.customer_id
        ).length
        return customerBookingsCount > 1 ? 'รายเก่า' : 'รายใหม่'
      })(),
      booking.service?.name_th || booking.service?.name_en || '-',
      `${booking.duration} นาที`,
      booking.hotel?.name_th || '-',
      booking.staff?.name_th || 'รอมอบหมาย',
      booking.booking_date,
      booking.booking_time,
      `฿${Number(booking.final_price).toLocaleString()}`,
      booking.status,
      booking.payment_status,
    ])

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // Download file
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `bookings_report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-bliss-100 text-bliss-700',
      in_progress: 'bg-bliss-200 text-bliss-800',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    const labels = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    }
    return (
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getPaymentBadge = (status: string, booking?: Booking) => {
    // Check if this is an admin booking (created by admin)
    const isAdminBooking = booking?.created_by_admin_id ||
                          booking?.booking_source === 'admin_app' ||
                          booking?.admin_notes?.includes('Admin Quick Booking')

    const badges = {
      pending: isAdminBooking ? 'bg-bliss-100 text-bliss-700' : 'bg-orange-100 text-orange-700',
      paid: 'bg-green-100 text-green-700',
      refunded: 'bg-bliss-100 text-bliss-600',
    }
    const labels = {
      pending: isAdminBooking ? 'ชำระแล้ว (Admin)' : 'รอชำระ',
      paid: 'ชำระแล้ว',
      refunded: 'คืนเงิน',
    }
    // [manual-QR] G31: flag manual-QR bookings so admin can tell off-platform settlement (QR + LINE slip)
    // apart from an Omise-paid booking, which otherwise both just read "ชำระแล้ว".
    const isManual = isManualQrBooking(booking)
    return (
      <span className="inline-flex items-center gap-1">
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badges[status as keyof typeof badges]}`}>
          {labels[status as keyof typeof labels]}
        </span>
        {isManual && (
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-bliss-100 text-bliss-700"
            title="ชำระผ่าน QR + ส่งสลิปทาง LINE (นอกแพลตฟอร์ม)"
          >
            ชำระภายนอก
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bliss-900">การจองทั้งหมด</h1>
          <p className="text-bliss-500">All Bookings</p>
        </div>
        <button
          onClick={handleExportReport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-bliss-100 text-bliss-700 rounded-xl font-medium hover:bg-bliss-200 transition"
        >
          <Download className="w-5 h-5" />
          ส่งออกรายงาน
        </button>
      </div>

      {/* PART47 P3: prominent alert that manual_qr extensions are awaiting admin confirmation
          (more visible than the notification bell). Open each flagged row to confirm. */}
      {pendingExtBookingIds.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            มีคำขอต่อเวลา {pendingExtBookingIds.length} รายการรอยืนยัน — เปิดการจองที่มีป้าย
            <span className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">⏳ รอยืนยันต่อเวลา</span>
            เพื่อกดยืนยัน
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <p className="text-2xl font-bold text-bliss-900">{stats?.total || 0}</p>
          <p className="text-xs text-bliss-500">ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
          <p className="text-xs text-bliss-500">รอดำเนินการ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <p className="text-2xl font-bold text-bliss-700">{stats?.confirmed || 0}</p>
          <p className="text-xs text-bliss-500">ยืนยันแล้ว</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <p className="text-2xl font-bold text-bliss-500">{stats?.in_progress || 0}</p>
          <p className="text-xs text-bliss-500">กำลังดำเนินการ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <p className="text-2xl font-bold text-green-600">{stats?.completed || 0}</p>
          <p className="text-xs text-bliss-500">เสร็จสิ้น</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-bliss-100">
          <p className="text-2xl font-bold text-bliss-700">
            ฿{(stats?.total_revenue || 0).toLocaleString()}
          </p>
          <p className="text-xs text-bliss-500">ยอดรวม</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-bliss-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bliss-400" />
            <input
              type="text"
              placeholder="ค้นหารหัส, ชื่อลูกค้า, บริการ, โรงแรม, พนักงาน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bliss-100 border-0 rounded-xl focus:ring-2 focus:ring-bliss-500 focus:bg-white transition"
            />
          </div>

          {/* Filters Row */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-bliss-100 border-0 rounded-xl focus:ring-2 focus:ring-bliss-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="confirmed">ยืนยันแล้ว</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-4 py-2 bg-bliss-100 border-0 rounded-xl focus:ring-2 focus:ring-bliss-500"
          >
            <option value="all">ประเภทบริการทั้งหมด</option>
            <option value="massage">นวด</option>
            <option value="nail">ทำเล็บ</option>
            <option value="spa">สปา</option>
          </select>
          <select
            value={bookingTypeFilter}
            onChange={(e) => setBookingTypeFilter(e.target.value as any)}
            className="px-4 py-2 bg-bliss-100 border-0 rounded-xl focus:ring-2 focus:ring-bliss-500"
          >
            <option value="all">ประเภทผู้จองทั้งหมด</option>
            <option value="customer">ลูกค้าทั่วไป</option>
            <option value="hotel">โรงแรม</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-4 py-2 bg-bliss-100 border-0 rounded-xl focus:ring-2 focus:ring-bliss-500"
          >
            <option value="all">วันที่ทั้งหมด</option>
            <option value="today">วันนี้</option>
            <option value="week">สัปดาห์นี้</option>
            <option value="month">เดือนนี้</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-bliss-100">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-bliss-50 border-b border-bliss-200">
                <th className="text-left py-2 px-2 text-xs font-semibold text-bliss-700 w-[12%]">รหัส</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-bliss-700 w-[8%]">ประเภท</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-bliss-700 w-[15%]">บริการ</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-bliss-700 w-[12%]">โรงแรม</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-bliss-700 w-[10%]">พนักงาน</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-bliss-700 w-[13%]">วันที่/เวลา</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-bliss-700 w-[10%]">จำนวน</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-bliss-700 w-[8%]">สถานะ</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-bliss-700 w-[8%]">การชำระ</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-bliss-700 w-[4%]">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {bookingsLoading ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-bliss-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-bliss-500">
                    ไม่พบข้อมูลการจอง
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-bliss-100 hover:bg-bliss-50">
                    <td className="py-2 px-2 text-xs font-medium text-bliss-900 truncate">{booking.booking_number}</td>
                    <td className="py-2 px-2">
                      {booking.is_hotel_booking ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-bliss-100 text-bliss-800">
                          โรงแรม
                        </span>
                      ) : (() => {
                        // นับจำนวน booking ของลูกค้าคนนี้ใน filteredBookings
                        const customerBookingsCount = filteredBookings.filter(b =>
                          !b.is_hotel_booking && b.customer_id === booking.customer_id
                        ).length

                        return customerBookingsCount > 1 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            รายเก่า
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            รายใหม่
                          </span>
                        )
                      })()}
                    </td>
                    <td className="py-2 px-2 text-xs text-bliss-600">
                      <div className="truncate">
                        {booking.booking_services && booking.booking_services.length > 1 ? (
                          `${booking.booking_services.length} บริการ`
                        ) : (
                          booking.service?.name_th || booking.service?.name_en || 'ไม่ระบุ'
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-xs text-bliss-700 truncate">{booking.hotel?.name_th || '-'}</td>
                    <td className="py-2 px-2 text-xs text-bliss-600 truncate">
                      {booking.jobs && booking.jobs.length > 1 ? (
                        `${booking.jobs.length} คน`
                      ) : (
                        booking.staff?.name_th || 'รอมอบหมาย'
                      )}
                      {overallJobStatus(booking.jobs) && (
                        <div className="mt-0.5">{getJobProgressBadge(overallJobStatus(booking.jobs))}</div>
                      )}
                      {isBookingAtRisk(booking) && (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 animate-pulse">
                            ⚠️ ใกล้เวลา · ยังไม่เดินทาง
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-bliss-600">
                      <div className="whitespace-nowrap">{booking.booking_date}</div>
                      <div className="whitespace-nowrap text-bliss-500">{booking.booking_time}</div>
                    </td>
                    <td className="py-2 px-2 text-xs font-medium text-bliss-900 whitespace-nowrap">฿{Number(booking.final_price).toLocaleString()}</td>
                    <td className="py-2 px-2">
                      {getStatusBadge(booking.status)}
                      {pendingExtSet.has(booking.id) && (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 animate-pulse">
                            ⏳ รอยืนยันต่อเวลา
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2">{getPaymentBadge(booking.payment_status, booking)}</td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenDetail(booking)}
                          className="p-1 hover:bg-bliss-100 rounded transition"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-3 h-3 text-bliss-600" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenDeleteFromList(booking) }}
                          className="p-1 hover:bg-red-50 rounded transition"
                          title="ลบการจอง"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {isDetailModalOpen && selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetail}
          onStatusChange={handleStatusChange}
          onOpenCancellation={handleOpenCancellation}
          onOpenReschedule={handleOpenReschedule}
          onDelete={handleOpenDeleteFromDetail}
        />
      )}

      {/* Booking Cancellation Modal */}
      {isCancellationModalOpen && selectedBooking && (
        <BookingCancellationModal
          booking={selectedBooking}
          isOpen={isCancellationModalOpen}
          onClose={handleCloseCancellation}
          onCancelled={handleCancellationComplete}
        />
      )}

      {/* Booking Reschedule Modal (PART47-P6 — admin-only reschedule) */}
      {isRescheduleModalOpen && selectedBooking && (
        <AdminRescheduleModal
          booking={selectedBooking}
          isOpen={isRescheduleModalOpen}
          onClose={handleCloseReschedule}
          onRescheduled={handleRescheduleComplete}
        />
      )}

      {/* Booking Delete Confirm Modal (PART47-P7) */}
      {isDeleteModalOpen && selectedBooking && (
        <DeleteBookingConfirmModal
          booking={selectedBooking}
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDelete}
          onDeleted={handleCloseDelete}
        />
      )}
    </div>
  )
}

// Booking Detail Modal Component
interface BookingDetailModalProps {
  booking: Booking
  isOpen: boolean
  onClose: () => void
  onStatusChange: (bookingId: string, newStatus: BookingStatus, autoMarkPaid?: boolean) => void
  onOpenCancellation: () => void
  onOpenReschedule: () => void
  onDelete: () => void
}

function BookingDetailModal({ booking, isOpen, onClose, onStatusChange, onOpenCancellation, onOpenReschedule, onDelete }: BookingDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(booking.status)
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  // PART47 P3: pending (manual_qr) extensions awaiting admin confirmation for THIS booking.
  const queryClient = useQueryClient()
  const [pendingExtensions, setPendingExtensions] = useState<any[]>([])
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const loadPendingExtensions = async () => {
    const { data } = await supabase
      .from('pending_extensions')
      .select('*')
      .eq('booking_id', booking.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
    setPendingExtensions(data || [])
  }

  useEffect(() => {
    if (!isOpen) return
    loadPendingExtensions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking.id])

  const postPendingAction = async (pendingId: string, action: 'confirm' | 'cancel') => {
    setPendingActionId(pendingId)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      // Confirm/cancel PER pending request — each row is a separate paid slip the admin verifies
      // individually (couple "ต่อทั้งคู่" = 2 rows the admin confirms one at a time; confirming one must
      // NOT auto-apply another whose slip wasn't seen). The server applies only this pending's recipient.
      const res = await fetch(`${EXT_API_BASE_URL}/api/bookings/${booking.id}/extend/${pendingId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const result = await res.json()
      if (result.success) {
        toast.success(action === 'confirm' ? 'ยืนยันการต่อเวลาแล้ว — ส่งงานให้พนักงานทำต่อ' : 'ยกเลิกคำขอต่อเวลาแล้ว')
        await loadPendingExtensions()
        // Both confirm & cancel remove the pending row → refresh the list's pending-extension badge/count.
        queryClient.invalidateQueries({ queryKey: ['pending-extensions'] })
        if (action === 'confirm') queryClient.invalidateQueries({ queryKey: ['bookings'] })
      } else {
        toast.error(result.message || (action === 'confirm' ? 'ยืนยันไม่สำเร็จ' : 'ยกเลิกไม่สำเร็จ'))
      }
    } catch (e: any) {
      toast.error(e?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setPendingActionId(null)
    }
  }

  if (!isOpen) return null

  const handleStatusChange = async () => {
    // If selecting "cancelled", open cancellation modal instead
    if (selectedStatus === 'cancelled') {
      onOpenCancellation()
      return
    }

    setIsChangingStatus(true)
    try {
      // [manual-QR] ส่วน B: confirming a manual-QR customer booking that is still pending → auto mark-paid
      // (opt-in flag). Eligibility computed HERE where the full booking object is available; the service
      // re-verifies it against the persisted row before actually flipping.
      const autoMarkPaid =
        selectedStatus === 'confirmed' &&
        isManualQrBooking(booking) &&
        !booking.is_hotel_booking &&
        booking.payment_status === 'pending'
      await onStatusChange(booking.id, selectedStatus, autoMarkPaid)
      onClose()
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsChangingStatus(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-bliss-100 text-bliss-700',
      in_progress: 'bg-bliss-200 text-bliss-800',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return colors[status as keyof typeof colors] || 'bg-bliss-100 text-bliss-700'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    }
    return labels[status as keyof typeof labels] || status
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      massage: 'นวด',
      nail: 'ทำเล็บ',
      spa: 'สปา',
    }
    return labels[category as keyof typeof labels] || category
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-bliss-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-bliss-900">รายละเอียดการจอง</h2>
            <p className="text-sm text-bliss-500">Booking Details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bliss-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-bliss-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Booking ID & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-bliss-500">รหัสการจอง</p>
              <p className="text-xl font-bold text-bliss-900">{booking.booking_number}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              {getStatusLabel(booking.status)}
            </span>
          </div>

          {/* Customer Info */}
          <div className="bg-bliss-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-bliss-900 mb-3">ข้อมูลลูกค้า</h3>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-bliss-400 mt-0.5" />
              <div>
                <p className="text-sm text-bliss-500">ชื่อลูกค้า</p>
                {/* Regular bookings → customers-table name; HOTEL bookings (customer_id null) →
                    parsed guest name from customer_notes (booking.customer). See skill
                    bliss-admin-booking-customer-name-field. */}
                <p className="font-medium text-bliss-900">{booking.customers?.full_name || booking.customer?.full_name || 'ไม่ระบุ'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-bliss-400 mt-0.5" />
              <div>
                <p className="text-sm text-bliss-500">เบอร์ติดต่อ</p>
                <p className="font-medium text-bliss-900">{booking.customers?.phone || booking.customer?.phone || 'ไม่ระบุ'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-bliss-400 mt-0.5" />
              <div>
                <p className="text-sm text-bliss-500">ที่อยู่</p>
                {booking.hotel && booking.is_hotel_booking ? (
                  <div>
                    <p className="font-medium text-bliss-900">{booking.hotel.name_th}</p>
                    <p className="text-sm text-bliss-600">{booking.hotel.address}</p>
                    {booking.hotel.phone && (
                      <p className="text-xs text-bliss-500">📞 {booking.hotel.phone}</p>
                    )}
                    {booking.hotel.email && (
                      <p className="text-xs text-bliss-500">✉️ {booking.hotel.email}</p>
                    )}
                    {booking.hotel.rating > 0 && (
                      <p className="text-xs text-bliss-600">⭐ {booking.hotel.rating.toFixed(1)}</p>
                    )}
                    {booking.hotel_room_number && (
                      <p className="text-xs text-bliss-600">🏠 ห้อง: {booking.hotel_room_number}</p>
                    )}
                  </div>
                ) : (
                  <p className="font-medium text-bliss-900">{booking.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Service Info */}
          <div className="bg-bliss-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-bliss-900 mb-3">รายละเอียดบริการ</h3>

            <div className="flex items-start gap-3">
              <Briefcase className="w-5 h-5 text-bliss-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-bliss-500">บริการ</p>
                {booking.booking_services && booking.booking_services.length > 1 ? (
                  <div className="space-y-2 mt-1">
                    {booking.booking_services
                      .slice()
                      // recipient_index first, base row before its is_extension row(s) — so an
                      // extension (same recipient_index) never renders as a phantom extra person.
                      .sort((a, b) => (a.recipient_index - b.recipient_index) || ((a.is_extension ? 1 : 0) - (b.is_extension ? 1 : 0)))
                      .map((bs) => (
                        <div key={bs.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-bliss-200">
                          <div>
                            <span className="text-xs text-bliss-600 font-medium">
                              {bs.is_extension ? `เพิ่มเวลา · คนที่ ${bs.recipient_index + 1}` : `คนที่ ${bs.recipient_index + 1}`}
                            </span>
                            <p className="font-medium text-bliss-900">{bs.service?.name_th || 'ไม่ระบุ'}</p>
                            <p className="text-xs text-bliss-500">{bs.is_extension ? '+' : ''}{bs.duration} นาที • {getCategoryLabel(bs.service?.category as string)}</p>
                          </div>
                          <span className="text-sm font-semibold text-bliss-700">฿{Number(bs.price).toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-bliss-900">{booking.service?.name_th || booking.service?.name_en || 'ไม่ระบุ'}</p>
                    <p className="text-xs text-bliss-500 mt-1">
                      ประเภท: {getCategoryLabel(booking.service?.category as string)}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-bliss-600 mt-0.5" />
              <div>
                <p className="text-sm text-bliss-500">วันที่</p>
                <p className="font-medium text-bliss-900">{booking.booking_date}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-bliss-600 mt-0.5" />
              <div>
                <p className="text-sm text-bliss-500">เวลา</p>
                <p className="font-medium text-bliss-900">{booking.booking_time}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-bliss-600 mt-0.5" />
              <div>
                <p className="text-sm text-bliss-500">ระยะเวลา</p>
                {(() => {
                  // COUPLE: recipients run in parallel and can have DIFFERENT durations (each may extend
                  // independently), so show per-recipient totals (base + that recipient's extensions),
                  // not the single booking.duration (person 1 only).
                  const bs = (booking.booking_services || []) as any[]
                  const indices = Array.from(new Set(bs.map((s) => s.recipient_index ?? 0))).sort((a, b) => a - b)
                  if ((booking.recipient_count || 1) > 1 && indices.length > 1) {
                    return (
                      <div className="font-medium text-bliss-900 space-y-0.5">
                        {indices.map((idx) => {
                          const total = bs.filter((s) => (s.recipient_index ?? 0) === idx).reduce((sum, s) => sum + (s.duration || 0), 0)
                          return <p key={idx}>คนที่ {idx + 1}: {total} นาที</p>
                        })}
                      </div>
                    )
                  }
                  return (
                    <p className="font-medium text-bliss-900">
                      {booking.duration} นาที
                      {booking.duration >= 60 && (
                        <span className="text-bliss-500 text-sm ml-1">
                          ({Math.floor(booking.duration / 60)}{booking.duration % 60 > 0 ? `.${booking.duration % 60}` : ''} ชั่วโมง)
                        </span>
                      )}
                    </p>
                  )
                })()}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-bliss-600 mt-0.5" />
              <div>
                <p className="text-sm text-bliss-500">จำนวนลูกค้า</p>
                <p className="font-medium text-bliss-900">
                  {(booking.recipient_count || 1) === 1 ? 'คนเดียว (1 คน)' : `คู่ (${booking.recipient_count} คน)`}
                </p>
              </div>
            </div>

            {isSpecificPreference(booking.provider_preference) && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-bliss-600 mt-0.5" />
                <div>
                  <p className="text-sm text-bliss-500">ความต้องการผู้ให้บริการ</p>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${getProviderPreferenceBadgeStyle(booking.provider_preference)}`}>
                    {getProviderPreferenceLabel(booking.provider_preference)}
                  </span>
                </div>
              </div>
            )}

            {booking.service_format && booking.service_format !== 'single' && (
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-bliss-600 mt-0.5" />
                <div>
                  <p className="text-sm text-bliss-500">รูปแบบบริการ</p>
                  <p className="font-medium text-bliss-900">
                    {booking.service_format === 'simultaneous' && 'พร้อมกัน (ผู้ให้บริการ 2 คน)'}
                    {booking.service_format === 'sequential' && 'สลับกัน (ผู้ให้บริการ 1 คน)'}
                  </p>
                </div>
              </div>
            )}

            {booking.hotel && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-bliss-600 mt-0.5" />
                <div>
                  <p className="text-sm text-bliss-500">โรงแรม</p>
                  <p className="font-medium text-bliss-700">{booking.hotel.name_th}</p>
                  {booking.hotel_room_number && (
                    <p className="text-xs text-bliss-500 mt-1">ห้อง: {booking.hotel_room_number}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-bliss-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-bliss-500">พนักงาน</p>
                {booking.jobs && booking.jobs.length > 1 ? (
                  <div className="space-y-2 mt-1">
                    {booking.jobs
                      .sort((a, b) => a.job_index - b.job_index)
                      .map((job) => (
                        <div key={job.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-bliss-200">
                          <div>
                            <span className="text-xs text-bliss-600 font-medium">คนที่ {job.job_index}</span>
                            <p className="font-medium text-bliss-900">{job.staff_name || 'รอมอบหมาย'}</p>
                          </div>
                          <div className="text-right">
                            {getJobProgressBadge(job.status)}
                            <span className="block text-xs text-bliss-500 mt-1">
                              {/* Prefer the per-recipient service from booking_services (job.job_index-1 ===
                                  recipient_index) — the stored jobs.service_name can be mis-mapped for
                                  couple recipient 2 (a known job-creation bug); the booking_services join is
                                  authoritative per recipient. */}
                              {(() => {
                                const idx = (job.job_index ?? 1) - 1
                                const baseRow = (booking.booking_services || []).find((s: any) => !s.is_extension && (s.recipient_index ?? 0) === idx)
                                return baseRow?.service?.name_th || job.service_name
                              })()}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-bliss-900">{booking.staff?.name_th || 'รอมอบหมาย'}</p>
                    {booking.jobs?.[0]?.status && (
                      <div className="mt-1">{getJobProgressBadge(booking.jobs[0].status)}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-green-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-bliss-900 mb-3">ข้อมูลการชำระเงิน</h3>

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-bliss-500 mb-2">รายละเอียดราคา</p>
                <div className="space-y-1.5">
                  {booking.booking_services && booking.booking_services.length > 1 ? (
                    // Couple/multi-recipient: each recipient can have a different service,
                    // duration and price, so list per-recipient prices (these sum to final_price
                    // before discount) instead of the single base_price (which is only person 1).
                    booking.booking_services
                      .slice()
                      // recipient_index first, base before its is_extension row — an extension is
                      // labelled "เพิ่มเวลา (คนที่ N)" for its recipient, never a phantom คนที่ 3.
                      .sort((a, b) => (a.recipient_index - b.recipient_index) || ((a.is_extension ? 1 : 0) - (b.is_extension ? 1 : 0)))
                      .map((bs) => (
                        <div key={bs.id} className="flex justify-between text-sm gap-3">
                          <span className="text-bliss-600">
                            {bs.is_extension
                              ? `เพิ่มเวลา (คนที่ ${bs.recipient_index + 1})`
                              : `คนที่ ${bs.recipient_index + 1} · ${bs.service?.name_th || 'บริการ'}`}
                            <span className="text-bliss-400"> ({bs.is_extension ? '+' : ''}{bs.duration} นาที)</span>
                          </span>
                          <span className="text-bliss-900 whitespace-nowrap">฿{Number(bs.price).toLocaleString()}</span>
                        </div>
                      ))
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-bliss-600">ราคาบริการ</span>
                      <span className="text-bliss-900">฿{Number(booking.base_price).toLocaleString()}</span>
                    </div>
                  )}
                  {booking.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">ส่วนลด</span>
                      <span className="text-red-600">-฿{Number(booking.discount_amount).toLocaleString()}</span>
                    </div>
                  )}
                  {/* P5 STEP C: add-on line items (0% commission pass-through). Rendering these makes
                      the breakdown reconcile: services − discount + add-ons = final_price. */}
                  {booking.booking_addons && booking.booking_addons.length > 0 &&
                    booking.booking_addons.map((addon) => (
                      <div key={addon.id} className="flex justify-between text-sm gap-3">
                        <span className="text-bliss-600">
                          บริการเสริม · {addon.name_th || 'บริการเสริม'}
                          {(booking.recipient_count || 1) > 1 && (
                            <span className="text-bliss-400"> (คนที่ {addon.recipient_index + 1})</span>
                          )}
                          {addon.quantity > 1 && <span className="text-bliss-400"> ×{addon.quantity}</span>}
                        </span>
                        <span className="text-bliss-900 whitespace-nowrap">฿{Number(addon.total_price).toLocaleString()}</span>
                      </div>
                    ))}
                  {booking.promotion && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-bliss-100 text-bliss-800 border border-bliss-200">
                        {booking.promotion.code}
                      </span>
                      <span className="text-xs text-bliss-500">{booking.promotion.name_th}</span>
                    </div>
                  )}
                  <div className="border-t border-green-200 pt-2 mt-2 flex justify-between">
                    <span className="font-semibold text-bliss-900">ราคาสุทธิ</span>
                    <span className="text-xl font-bold text-green-600">฿{Number(booking.final_price).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-bliss-500">สถานะการชำระ</p>
                <p className="font-medium text-bliss-900">
                  {(() => {
                    // Check if this is an admin booking
                    const isAdminBooking = booking.created_by_admin_id ||
                                          booking.booking_source === 'admin_app' ||
                                          booking.admin_notes?.toLowerCase().includes('admin')

                    if (booking.payment_status === 'paid') return '✅ ชำระแล้ว'
                    if (booking.payment_status === 'pending' && isAdminBooking) return '✅ ชำระแล้ว (Admin จองแทน)'
                    if (booking.payment_status === 'pending') return '⏳ รอชำระ'
                    if (booking.payment_status === 'processing') return '🔄 กำลังดำเนินการ'
                    if (booking.payment_status === 'refunded') return '↩️ คืนเงินแล้ว'
                    if (booking.payment_status === 'failed') return '❌ ล้มเหลว'
                    return booking.payment_status
                  })()}
                </p>
              </div>
            </div>

            {/* Only show payment method if explicitly recorded (not default cash) */}
            {booking.payment_method && booking.payment_method !== 'cash' && (
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm text-bliss-500">ช่องทางการชำระเงิน</p>
                  <p className="font-medium text-bliss-900">
                    {booking.payment_method === 'credit_card' && '💳 บัตรเครดิท'}
                    {booking.payment_method === 'promptpay' && '📱 พร้อมเพย์'}
                    {booking.payment_method === 'bank_transfer' && '🏦 โอนเงิน'}
                    {booking.payment_method === 'voucher' && '🎟️ คูปอง/เครดิต'}
                    {booking.payment_method === 'other' && '📋 อื่นๆ'}
                  </p>
                </div>
              </div>
            )}

            {/* Show cash only when explicitly selected by admin */}
            {booking.payment_method === 'cash' && (booking.created_by_admin_id || booking.admin_notes?.toLowerCase().includes('admin')) && (
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm text-bliss-500">ช่องทางการชำระเงิน</p>
                  <p className="font-medium text-bliss-900">💵 เงินสด</p>
                </div>
              </div>
            )}
          </div>

          {/* Revenue Info */}
          {(() => {
            const totalStaffEarnings = booking.jobs && booking.jobs.length > 0
              ? booking.jobs.reduce((sum, j) => sum + Number(j.total_staff_earnings ?? j.staff_earnings ?? 0), 0)
              : Number(booking.staff_earnings)
            const revenue = Number(booking.final_price)
            const netRevenue = revenue - totalStaffEarnings
            return (
              <div className="bg-bliss-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-bliss-900 mb-3">ข้อมูลรายได้</h3>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-bliss-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-bliss-600">รายได้</span>
                        <span className="text-bliss-900">฿{revenue.toLocaleString()}</span>
                      </div>
                      {booking.jobs && booking.jobs.length > 1 ? (
                        <>
                          <p className="text-xs text-bliss-500 mt-1">หักค่าคอมพนักงาน</p>
                          {booking.jobs
                            .sort((a, b) => a.job_index - b.job_index)
                            .map((job) => (
                              <div key={job.id} className="flex justify-between text-sm pl-2">
                                <span className="text-red-600">คนที่ {job.job_index}: {job.staff_name || 'รอมอบหมาย'}</span>
                                <span className="text-green-600">฿{Number(job.total_staff_earnings ?? job.staff_earnings ?? 0).toLocaleString()}</span>
                              </div>
                            ))}
                        </>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">หักค่าคอมพนักงาน</span>
                          <span className="text-red-600">-฿{totalStaffEarnings.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t border-bliss-200 pt-2 mt-2 flex justify-between">
                        <span className="font-semibold text-bliss-900">รายได้สุทธิ</span>
                        <span className="text-xl font-bold text-bliss-600">฿{netRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Location Map */}
          <div className="bg-bliss-50 rounded-xl p-4">
            <h3 className="font-semibold text-bliss-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-bliss-600" />
              ตำแหน่งให้บริการ
            </h3>

            {booking.latitude && booking.longitude ? (
              <>
                <div className="rounded-lg overflow-hidden border border-bliss-200 mb-2">
                  <iframe
                    width="100%"
                    height="300"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${booking.latitude},${booking.longitude}&output=embed`}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="text-sm text-bliss-600">
                  <p className="font-medium">ที่อยู่: {booking.address}</p>
                  <p className="text-xs text-bliss-500 mt-1">
                    พิกัด: {booking.latitude}, {booking.longitude}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg border border-bliss-200 p-4">
                <p className="text-sm text-bliss-600">
                  📍 {booking.address}
                </p>
                <p className="text-xs text-bliss-400 mt-2">
                  ⚠️ ยังไม่มีพิกัดที่อยู่ในระบบ
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {(booking.customer_notes || booking.admin_notes) && (
            <div className="bg-bliss-50 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-bliss-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-bliss-600" />
                หมายเหตุ
              </h3>
              {booking.customer_notes && (
                <div>
                  <p className="text-xs text-bliss-500">จากลูกค้า:</p>
                  <p className="text-bliss-700">{booking.customer_notes}</p>
                </div>
              )}
              {booking.admin_notes && (
                <div className="mt-2">
                  <p className="text-xs text-bliss-500">จาก Admin:</p>
                  <p className="text-bliss-700">{booking.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Cancellation Details Section - Only show for cancelled bookings */}
          {booking.status === 'cancelled' && (
            <div className="bg-red-50 rounded-xl p-4 space-y-3 border border-red-200">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                รายละเอียดการยกเลิก
              </h3>

              {/* Cancellation Time */}
              {booking.cancelled_at && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-bliss-500">ยกเลิกเมื่อ</p>
                    <p className="font-medium text-bliss-900">
                      {new Date(booking.cancelled_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Cancellation Reason */}
              {booking.cancellation_reason && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-bliss-500">เหตุผลการยกเลิก</p>
                    <p className="font-medium text-bliss-900">{booking.cancellation_reason}</p>
                  </div>
                </div>
              )}

              {/* Refund Information */}
              {booking.refund_status && booking.refund_status !== 'none' && (
                <div className="mt-4 pt-4 border-t border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">ข้อมูลการคืนเงิน</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Refund Status */}
                    <div>
                      <p className="text-sm text-bliss-500">สถานะการคืนเงิน</p>
                      <p className="font-medium">
                        {booking.refund_status === 'pending' && (
                          <span className="text-yellow-600">⏳ รอดำเนินการ</span>
                        )}
                        {booking.refund_status === 'processing' && (
                          <span className="text-bliss-600">🔄 กำลังดำเนินการ</span>
                        )}
                        {booking.refund_status === 'completed' && (
                          <span className="text-green-600">✅ คืนเงินแล้ว</span>
                        )}
                        {booking.refund_status === 'failed' && (
                          <span className="text-red-600">❌ ล้มเหลว</span>
                        )}
                      </p>
                    </div>

                    {/* Refund Percentage */}
                    {booking.refund_percentage !== null && booking.refund_percentage !== undefined && (
                      <div>
                        <p className="text-sm text-bliss-500">รูปแบบการคืนเงิน</p>
                        <p className="font-medium text-bliss-900">
                          {booking.refund_percentage === 100 ? 'คืนเต็มจำนวน (100%)' : `คืนบางส่วน (${booking.refund_percentage}%)`}
                        </p>
                      </div>
                    )}

                    {/* Refund Amount */}
                    {booking.refund_amount !== null && booking.refund_amount !== undefined && booking.refund_amount > 0 && (
                      <div>
                        <p className="text-sm text-bliss-500">จำนวนเงินคืน</p>
                        <p className="text-xl font-bold text-green-600">
                          ฿{Number(booking.refund_amount).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No Refund Case */}
              {(!booking.refund_status || booking.refund_status === 'none') && (
                <div className="flex items-start gap-3 mt-2">
                  <DollarSign className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-bliss-500">การคืนเงิน</p>
                    <p className="font-medium text-bliss-600">ไม่มีการคืนเงิน</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending extension confirmation (manual_qr) — PART47 P3 */}
          {pendingExtensions.length > 0 && (
            <div className="border-t border-bliss-200 pt-6">
              <h3 className="font-semibold text-bliss-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                คำขอต่อเวลาที่รอยืนยัน ({pendingExtensions.length})
              </h3>
              <div className="space-y-3">
                {pendingExtensions.map((pe) => (
                  <div key={pe.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-bliss-900">
                          +{pe.additional_duration} นาที
                          {(booking.recipient_count || 1) > 1 && (
                            <span className="text-sm text-bliss-600"> · {pe.recipient_name || `คนที่ ${(pe.recipient_index ?? 0) + 1}`}</span>
                          )}
                        </p>
                        <p className="text-sm text-bliss-600">
                          ยอดชำระ ฿{Number(pe.final_extension_price).toLocaleString()}
                          {pe.customer_name ? ` · ${pe.customer_name}` : ''}
                        </p>
                      </div>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full whitespace-nowrap">รอยืนยัน</span>
                    </div>
                    <p className="text-xs text-bliss-500 mb-3">ยืนยันเมื่อได้รับสลิปการชำระเงินจากลูกค้า — ระบบจะเพิ่มเวลาและแจ้งพนักงานคนเดิมให้ทำต่อ</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => postPendingAction(pe.id, 'confirm')}
                        disabled={pendingActionId !== null}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        {pendingActionId === pe.id ? 'กำลังยืนยัน...' : 'ยืนยันการต่อเวลา'}
                      </button>
                      <button
                        onClick={() => postPendingAction(pe.id, 'cancel')}
                        disabled={pendingActionId !== null}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Change Section */}
          <div className="border-t border-bliss-200 pt-6">
            <h3 className="font-semibold text-bliss-900 mb-4">เปลี่ยนสถานะการจอง</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as BookingStatus)}
                className="flex-1 px-4 py-2 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
              >
                <option value="pending">รอดำเนินการ</option>
                <option value="confirmed">ยืนยันแล้ว</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
              <button
                onClick={handleStatusChange}
                disabled={isChangingStatus || selectedStatus === booking.status}
                className={`px-6 py-2 rounded-xl font-medium transition ${
                  selectedStatus === booking.status
                    ? 'bg-bliss-200 text-bliss-500 cursor-not-allowed'
                    : 'bg-bliss-600 text-white hover:bg-bliss-700'
                }`}
              >
                {isChangingStatus ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
            {selectedStatus === booking.status && (
              <p className="text-xs text-bliss-500 mt-2">
                {booking.status === 'cancelled'
                  ? 'การจองนี้ถูกยกเลิกแล้ว จึงเปลี่ยนสถานะไม่ได้'
                  : booking.status === 'completed'
                  ? 'การจองนี้เสร็จสิ้นแล้ว จึงเปลี่ยนสถานะไม่ได้'
                  : 'เลือกสถานะใหม่ในช่องด้านซ้ายก่อน ปุ่ม "บันทึกการเปลี่ยนแปลง" จึงจะกดได้ (หากต้องการยกเลิกการจอง ให้เลือก "ยกเลิก")'}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-bliss-50 border-t border-bliss-200 px-6 py-4 flex justify-between gap-3">
          <button
            onClick={onDelete}
            className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            ลบการจอง
          </button>
          <div className="flex gap-3">
            {/* PART47-P6: admin-only reschedule — only for a reschedulable booking
                (not cancelled/completed/in_progress, matching the server status guard). */}
            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <button
                onClick={onOpenReschedule}
                className="px-6 py-2 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                เลื่อนนัด
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 border border-bliss-300 text-bliss-700 rounded-xl font-medium hover:bg-white transition"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Bookings
