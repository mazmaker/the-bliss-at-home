import { useState } from 'react'
import { MapPin, Phone, Clock, User, Navigation, AlertTriangle, CheckCircle, Car } from 'lucide-react'
import { useGPSTracking } from '../hooks/useGPSTracking'
import { useAuth } from '@bliss/supabase/auth'
import { supabase } from '@bliss/supabase'
import { queryWithTimeout } from '../utils/withTimeout'

interface BookingTrackingCardProps {
  booking: {
    id: string
    booking_id?: string
    customer_name?: string
    customer_phone?: string
    customer_address?: string
    service_name?: string
    scheduled_date: string
    scheduled_time: string
    duration_minutes: number
    status: string
    is_hotel_booking: boolean
    hotel_name?: string
    room_number?: string
    staff_earnings: number
    total_staff_earnings?: number
    customer_notes?: string

    // Journey tracking
    journey_id?: string
    journey_status?: string
    journey_started_at?: string
    journey_current_lat?: number
    journey_current_lng?: number
  }
  onRefresh?: () => void
}

export default function BookingTrackingCard({ booking, onRefresh }: BookingTrackingCardProps) {
  const { user } = useAuth()
  const [staffId, setStaffId] = useState<string | null>(null)
  const {
    isTracking,
    currentPosition,
    error: gpsError,
    journeyId,
    startTracking,
    stopTracking
  } = useGPSTracking({
    updateInterval: 10000, // Update every 10 seconds
    highAccuracy: true
  })

  // Resolve the real staff.id (staff_journeys.staff_id / bookings.staff_id → staff.id).
  // [FIX] Previously this set a literal 'staff-id-placeholder' string → the
  // start_staff_journey rpc rejected it with "invalid input syntax for type uuid".
  // Mirrors JobGPSControls.getStaffId; returns the resolved value directly (setState
  // is async and would return stale null on the same call).
  const getStaffId = async (): Promise<string | null> => {
    if (staffId) return staffId
    if (!user?.id) return null
    const { data: staff, error } = await queryWithTimeout(
      supabase.from('staff').select('id').eq('profile_id', user.id).single(),
      10000,
      'staff id lookup (tracking card)'
    )
    if (error || !staff) return null
    setStaffId(staff.id)
    return staff.id
  }

  const handleStartJourney = async () => {
    const currentStaffId = await getStaffId()
    if (!currentStaffId) {
      alert('ไม่พบข้อมูลพนักงาน')
      return
    }
    // [FIX] start_staff_journey expects a BOOKING id (checks bookings.id + inserts
    // staff_journeys.booking_id). booking.id here is the JOB id — use booking_id.
    const bookingId = booking.booking_id || booking.id
    const result = await startTracking(bookingId, currentStaffId)
    if (result?.success) {
      onRefresh?.()
    } else if (result && !result.success) {
      alert(`ไม่สามารถเริ่มเดินทางได้\n\n${result.message || 'เกิดข้อผิดพลาด'}`)
    }
  }

  const handleArriveAtCustomer = async () => {
    await stopTracking()
    onRefresh?.()
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01 ${timeString}`).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'assigned':
        return 'bg-bliss-100 text-bliss-700'
      case 'traveling':
        return 'bg-green-100 text-green-700'
      case 'arrived':
        return 'bg-purple-100 text-purple-700'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-bliss-100 text-bliss-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'assigned':
        return 'พร้อมเริ่มงาน'
      case 'traveling':
        return 'กำลังเดินทาง'
      case 'arrived':
        return 'มาถึงแล้ว'
      case 'in_progress':
        return 'กำลังดำเนินการ'
      default:
        return status
    }
  }

  // Check if currently tracking this booking
  const isTrackingThisBooking = isTracking && (journeyId === booking.journey_id)
  const hasActiveJourney = booking.journey_status === 'traveling'

  return (
    <div className="bg-white rounded-lg shadow-lg border border-bliss-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-bliss-50 to-bliss-50 border-b border-bliss-200">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-bold text-bliss-900">{booking.service_name}</h3>
            <p className="text-sm text-bliss-600">{formatDate(booking.scheduled_date)} • {formatTime(booking.scheduled_time)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
              {getStatusText(booking.status)}
            </span>
            <span className="text-lg font-bold text-bliss-600">
              ฿{(booking.total_staff_earnings || booking.staff_earnings).toLocaleString()}
            </span>
          </div>
        </div>

        {booking.booking_id && (
          <div className="text-xs text-bliss-500">
            รหัสการจอง: {booking.booking_id}
          </div>
        )}
      </div>

      {/* Customer Info */}
      <div className="p-4 border-b border-bliss-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-bliss-500" />
            <span className="font-medium text-bliss-900">{booking.customer_name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-bliss-500" />
            <a href={`tel:${booking.customer_phone}`} className="text-bliss-600 underline">
              {booking.customer_phone}
            </a>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-bliss-500 mt-0.5" />
            <div>
              {booking.is_hotel_booking && booking.hotel_name ? (
                <>
                  <p className="text-bliss-700 text-sm">{booking.hotel_name}</p>
                  {booking.room_number && (
                    <p className="text-bliss-600 text-sm font-medium">
                      ห้อง: {booking.room_number}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-bliss-700 text-sm">{booking.customer_address}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-bliss-500" />
            <span className="text-sm text-bliss-600">ระยะเวลา: {booking.duration_minutes} นาที</span>
          </div>

          {booking.customer_notes && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>หมายเหตุ:</strong> {booking.customer_notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* GPS Tracking Controls */}
      <div className="p-4">
        {hasActiveJourney || isTrackingThisBooking ? (
          <div className="space-y-4">
            {/* Active Tracking Status */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-semibold">กำลังติดตาม GPS</span>
              </div>

              <p className="text-sm text-green-600 mb-2">ลูกค้าเห็นตำแหน่งของคุณแล้ว</p>

              {currentPosition && (
                <div className="text-xs text-green-600">
                  อัพเดทล่าสุด: {new Date(currentPosition.timestamp).toLocaleTimeString('th-TH')}
                  {currentPosition.accuracy && (
                    <span className="ml-2">ความแม่นยำ: {Math.round(currentPosition.accuracy)}m</span>
                  )}
                </div>
              )}

              {gpsError && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{gpsError}</span>
                </div>
              )}

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                  <div className="text-xs text-red-700">
                    <p className="font-semibold mb-1">ข้อควรระวัง:</p>
                    <ul className="space-y-0.5 text-xs">
                      <li>• ห้ามปิดแอป หรือเปลี่ยนหน้า</li>
                      <li>• ห้ามกดล็อคหน้าจอ</li>
                      <li>• เสียบชาร์จเพื่อป้องกันแบตหมด</li>
                      <li>• เปิดแอปอื่น = หยุดติดตาม</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrive Button */}
            <button
              onClick={handleArriveAtCustomer}
              className="w-full bg-bliss-500 hover:bg-bliss-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              มาถึงลูกค้าแล้ว
            </button>
          </div>
        ) : (
          /* Start Journey Button */
          <button
            onClick={handleStartJourney}
            disabled={booking.status !== 'confirmed' && booking.status !== 'assigned'}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-bliss-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Navigation className="w-5 h-5" />
            เริ่มเดินทาง
          </button>
        )}

        {/* Additional Info */}
        {booking.status === 'confirmed' || booking.status === 'assigned' ? (
          <p className="text-xs text-bliss-500 text-center mt-2">
            กดเริ่มเดินทางเพื่อให้ลูกค้าติดตามตำแหน่งของคุณ
          </p>
        ) : null}
      </div>
    </div>
  )
}