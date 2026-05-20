import { useState, useEffect } from 'react'
import { Clock, User, MapPin, Car, Sparkles, CheckCircle, Phone, RefreshCw } from 'lucide-react'

type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'ASSIGNED'
  | 'STAFF_EN_ROUTE'
  | 'STAFF_ARRIVED'
  | 'SERVICE_IN_PROGRESS'
  | 'COMPLETED'
  | 'cancelled'

interface BookingStatusCardEnhancedProps {
  booking: {
    status: string
    status_v2?: BookingStatus
    travel_started_at?: string
    service_started_at?: string
    actual_arrival?: string
    provider: {
      name: string
      phone?: string
      avatar?: string
      rating?: number
    }
  } | null
  bookingData?: any
  onRefresh?: () => void
}

const BookingStatusCardEnhanced = ({ booking, bookingData, onRefresh }: BookingStatusCardEnhancedProps) => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!booking) return null

  // Use status_v2 if available, fallback to legacy status
  const currentStatus = booking.status_v2 || booking.status?.toUpperCase() || 'PENDING'

  const getStatusConfig = (status: BookingStatus) => {
    const configs = {
      'pending': {
        title: 'รอการยืนยัน',
        description: 'เรากำลังตรวจสอบการจองของคุณ',
        icon: '⏳',
        color: 'gray',
        showProgress: true,
        currentStep: 0,
        billing: 'รอการชำระเงิน'
      },
      'confirmed': {
        title: 'รอการมอบหมายพนักงาน',
        description: 'เรากำลังหาพนักงานที่เหมาะสมให้คุณ',
        icon: '🔍',
        color: 'amber',
        showProgress: true,
        currentStep: 1,
        billing: 'ชำระเงินเสร็จแล้ว'
      },
      'assigned': {
        title: 'พนักงานรับงานแล้ว',
        description: 'พนักงานกำลังเตรียมตัวเดินทาง',
        icon: '👨‍💼',
        color: 'blue',
        showStaff: true,
        showProgress: true,
        currentStep: 2,
        billing: 'ชำระเงินเสร็จแล้ว'
      },
      'ASSIGNED': {
        title: 'พนักงานรับงานแล้ว',
        description: 'พนักงานกำลังเตรียมตัวเดินทาง',
        icon: '👨‍💼',
        color: 'blue',
        showStaff: true,
        showProgress: true,
        currentStep: 2,
        billing: 'ชำระเงินเสร็จแล้ว'
      },
      'STAFF_EN_ROUTE': {
        title: 'พนักงานกำลังเดินทาง',
        description: 'ติดตามการเดินทางได้ในแผนที่ด้านล่าง',
        icon: '🚗',
        color: 'purple',
        showStaff: true,
        showETA: true,
        showProgress: true,
        currentStep: 3,
        billing: 'ชำระเงินเสร็จแล้ว - รอเริ่มบริการ'
      },
      'STAFF_ARRIVED': {
        title: 'พนักงานมาถึงแล้ว',
        description: 'พนักงานมาถึงจุดหมายแล้ว กำลังเตรียมเริ่มบริการ',
        icon: '📍',
        color: 'green',
        showStaff: true,
        showContact: true,
        showProgress: true,
        currentStep: 3.5,
        billing: 'ชำระเงินเสร็จแล้ว - รอเริ่มบริการ'
      },
      'SERVICE_IN_PROGRESS': {
        title: 'กำลังให้บริการ',
        description: 'บริการกำลังดำเนินอยู่ โปรดผ่อนคลายและเพลิดเพลิน',
        icon: '💆‍♀️',
        color: 'emerald',
        showStaff: true,
        showTimer: true,
        showProgress: true,
        currentStep: 4,
        billing: '🟢 เริ่มคิดค่าบริการแล้ว'
      },
      'COMPLETED': {
        title: 'บริการเสร็จสิ้น',
        description: 'ขอบคุณที่ใช้บริการ หวังว่าคุณจะพอใจ',
        icon: '✨',
        color: 'violet',
        showReview: true,
        billing: 'คิดค่าบริการเสร็จแล้ว'
      },
      'cancelled': {
        title: 'การจองถูกยกเลิก',
        description: 'การจองของคุณถูกยกเลิกแล้ว',
        icon: '❌',
        color: 'red',
        billing: 'ไม่มีค่าใช้จ่าย'
      }
    }

    return configs[status] || configs.pending
  }

  const config = getStatusConfig(currentStatus as BookingStatus)
  const progressSteps = ['การจอง', 'หาพนักงาน', 'เดินทาง', 'บริการ']

  // Calculate durations
  const calculateDuration = (startTime: string, endTime?: Date) => {
    const start = new Date(startTime)
    const end = endTime || currentTime
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60)) // minutes
  }

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hrs > 0 ? `${hrs} ชม. ${mins} นาที` : `${mins} นาที`
  }

  const travelDuration = booking.travel_started_at && booking.service_started_at ?
    calculateDuration(booking.travel_started_at, new Date(booking.service_started_at)) :
    booking.travel_started_at && currentStatus === 'STAFF_EN_ROUTE' ?
    calculateDuration(booking.travel_started_at) : 0

  const serviceDuration = booking.service_started_at ?
    calculateDuration(booking.service_started_at) : 0

  return (
    <div className={`bg-${config.color}-50 border border-${config.color}-200 rounded-2xl p-6 mb-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <h2 className={`text-xl font-bold text-${config.color}-900`}>
              {config.title}
            </h2>
            <p className={`text-${config.color}-700 text-sm`}>
              {config.description}
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className={`p-2 rounded-lg bg-${config.color}-100 hover:bg-${config.color}-200 transition-colors`}
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      {config.showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {progressSteps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                  index < (config.currentStep || 0) ? `bg-${config.color}-600 text-white` :
                  index === Math.floor(config.currentStep || 0) ? `bg-${config.color}-600 text-white` :
                  `bg-gray-200 text-gray-500`
                }`}>
                  {index < (config.currentStep || 0) ? '✓' : index + 1}
                </div>
                <span className={`ml-2 text-xs ${
                  index <= (config.currentStep || 0) ? `text-${config.color}-700` : 'text-gray-500'
                }`}>
                  {step}
                </span>
                {index < progressSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${
                    index < (config.currentStep || 0) - 1 ? `bg-${config.color}-600` : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Info */}
      {config.showStaff && booking.provider.name !== 'ยังไม่ได้มอบหมายพนักงาน' && (
        <div className="bg-white rounded-xl p-4 mb-4">
          <h3 className="font-medium text-gray-900 mb-3">พนักงานของคุณ</h3>
          <div className="flex items-center gap-3">
            {booking.provider.avatar ? (
              <img
                src={booking.provider.avatar}
                alt={booking.provider.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{booking.provider.name}</p>
              {booking.provider.rating && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span>⭐ {booking.provider.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            {config.showContact && booking.provider.phone && (
              <a
                href={`tel:${booking.provider.phone}`}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-colors"
              >
                <Phone className="w-4 h-4" />
                โทร
              </a>
            )}
          </div>
        </div>
      )}

      {/* Travel Duration Display */}
      {booking.travel_started_at && currentStatus === 'STAFF_EN_ROUTE' && (
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">เวลาเดินทาง</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-purple-600">
                {formatDuration(travelDuration)}
              </div>
              <div className="text-sm text-gray-600">
                เริ่มเดินทาง: {new Date(booking.travel_started_at).toLocaleTimeString('th-TH')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-purple-600">เวลาเดินทาง</div>
              <div className="text-xs text-purple-500">ไม่นับเป็นเวลาบริการ</div>
            </div>
          </div>
        </div>
      )}

      {/* Service Timer */}
      {config.showTimer && booking.service_started_at && (
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-gray-900">เวลาบริการ</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-emerald-600">
                {formatDuration(serviceDuration)}
              </div>
              <div className="text-sm text-gray-600">
                เริ่มบริการ: {new Date(booking.service_started_at).toLocaleTimeString('th-TH')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-emerald-600">กำลังคิดค่าบริการ</div>
              <div className="text-xs text-emerald-500">
                ~{(serviceDuration * 30).toLocaleString()} บาท
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Status */}
      <div className={`bg-${config.color}-100 border border-${config.color}-200 rounded-xl p-4`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <div>
            <p className={`font-medium text-${config.color}-900`}>
              {config.billing}
            </p>
            {currentStatus === 'SERVICE_IN_PROGRESS' && (
              <p className={`text-sm text-${config.color}-600`}>
                เวลาจะหยุดนับเมื่อบริการเสร็จสิ้น
              </p>
            )}
            {currentStatus === 'STAFF_EN_ROUTE' && (
              <p className={`text-sm text-${config.color}-600`}>
                เวลาบริการจะเริ่มนับเมื่อพนักงานเริ่มให้บริการ
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info based on status */}
      {currentStatus === 'STAFF_ARRIVED' && (
        <div className="mt-4 bg-green-100 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">พนักงานพร้อมให้บริการแล้ว</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            กำลังเตรียมอุปกรณ์และเริ่มบริการ รอสักครู่นะคะ
          </p>
        </div>
      )}
    </div>
  )
}

// Helper function to add to BookingDetails.tsx imports
const BookingStatusCardEnhancedWrapper = ({ booking, bookingData, onRefresh }: BookingStatusCardEnhancedProps) => {
  return <BookingStatusCardEnhanced booking={booking} bookingData={bookingData} onRefresh={onRefresh} />
}

export default BookingStatusCardEnhancedWrapper