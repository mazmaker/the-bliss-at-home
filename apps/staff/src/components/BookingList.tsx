import { useEffect, useState } from 'react'
import { RefreshCw, Calendar, Clock, AlertCircle } from 'lucide-react'
import { useStaffBookings } from '../hooks/useStaffBookings'
import BookingTrackingCard from './BookingTrackingCard'

export default function BookingList() {
  const { bookings, isLoading, error, refreshBookings } = useStaffBookings()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshBookings()
    setTimeout(() => setRefreshing(false), 500)
  }

  // Group bookings by date
  const groupedBookings = bookings.reduce((groups, booking) => {
    const date = booking.scheduled_date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(booking)
    return groups
  }, {} as Record<string, typeof bookings>)

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    if (dateString === today.toISOString().split('T')[0]) {
      return 'วันนี้'
    } else if (dateString === tomorrow.toISOString().split('T')[0]) {
      return 'พรุ่งนี้'
    } else {
      return date.toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  const getBookingStats = () => {
    const totalBookings = bookings.length
    const activeJourneys = bookings.filter(b => b.journey_status === 'traveling').length
    const todayBookings = bookings.filter(b => {
      const today = new Date().toISOString().split('T')[0]
      return b.scheduled_date === today
    }).length

    return { totalBookings, activeJourneys, todayBookings }
  }

  const { totalBookings, activeJourneys, todayBookings } = getBookingStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดรายการจอง...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">เกิดข้อผิดพลาด</h3>
        <p className="text-gray-600 text-center mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">งานของคุณ</h1>
              <p className="text-gray-600">
                {totalBookings > 0 ? `${totalBookings} งานรอดำเนินการ` : 'ไม่มีงานในขณะนี้'}
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stats */}
          {totalBookings > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-blue-600">{todayBookings}</div>
                <div className="text-xs text-blue-600">งานวันนี้</div>
              </div>

              <div className="bg-green-50 rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-green-600">{activeJourneys}</div>
                <div className="text-xs text-green-600">กำลังเดินทาง</div>
              </div>

              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <RefreshCw className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-purple-600">{totalBookings}</div>
                <div className="text-xs text-purple-600">ทั้งหมด</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking List */}
      <div className="p-4">
        {totalBookings === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่มีงานในขณะนี้</h3>
            <p className="text-gray-600 mb-6">
              คุณไม่มีงานที่ต้องดำเนินการในขณะนี้
            </p>
            <button
              onClick={handleRefresh}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              ตรวจสอบงานใหม่
            </button>
          </div>
        ) : (
          /* Bookings grouped by date */
          <div className="space-y-6">
            {Object.entries(groupedBookings).map(([date, dateBookings]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px bg-gray-300 flex-1"></div>
                  <h2 className="text-lg font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-full">
                    {formatDateHeader(date)}
                  </h2>
                  <div className="h-px bg-gray-300 flex-1"></div>
                </div>

                {/* Bookings for this date */}
                <div className="space-y-4">
                  {dateBookings.map((booking) => (
                    <BookingTrackingCard
                      key={booking.id}
                      booking={booking}
                      onRefresh={refreshBookings}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Tracking Notice */}
      {activeJourneys > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium">
              กำลังติดตาม GPS {activeJourneys} งาน
            </span>
          </div>
          <p className="text-sm mt-1 opacity-90">
            กรุณาห้ามปิดแอปเพื่อให้การติดตามทำงานต่อไป
          </p>
        </div>
      )}
    </div>
  )
}