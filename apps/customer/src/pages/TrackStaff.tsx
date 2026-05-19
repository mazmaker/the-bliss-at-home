import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@bliss/supabase'
import { ArrowLeft, Share2, Phone } from 'lucide-react'
import StaffTrackingMap from '../components/StaffTrackingMap'

interface JourneyDetails {
  id: string
  status: string
  started_at: string
  staff_name: string
  customer_name: string
  customer_phone?: string
  destination_name: string
  service_name: string
  estimated_duration?: number
}

export default function TrackStaff() {
  const { journeyId } = useParams<{ journeyId: string }>()
  const navigate = useNavigate()
  const [journey, setJourney] = useState<JourneyDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!journeyId) {
      setError('ไม่พบข้อมูลการเดินทาง')
      setIsLoading(false)
      return
    }

    fetchJourneyDetails()
  }, [journeyId])

  const fetchJourneyDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: journeyData, error: journeyError } = await supabase
        .from('staff_journeys')
        .select(`
          id,
          status,
          started_at,
          bookings!inner (
            id,
            customer_name,
            customer_phone,
            address,
            hotel_name,
            room_number,
            service_name,
            duration_minutes
          ),
          profiles!inner (
            full_name
          )
        `)
        .eq('id', journeyId)
        .single()

      if (journeyError) throw journeyError

      if (!journeyData) {
        throw new Error('ไม่พบข้อมูลการเดินทาง')
      }

      const booking = journeyData.bookings
      const profile = journeyData.profiles

      setJourney({
        id: journeyData.id,
        status: journeyData.status,
        started_at: journeyData.started_at,
        staff_name: profile.full_name,
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        destination_name: booking.hotel_name
          ? `${booking.hotel_name}${booking.room_number ? ` ห้อง ${booking.room_number}` : ''}`
          : booking.address,
        service_name: booking.service_name,
        estimated_duration: booking.duration_minutes
      })

    } catch (err: any) {
      console.error('Error fetching journey details:', err)
      setError(err.message || 'ไม่สามารถโหลดข้อมูลการเดินทางได้')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      traveling: 'กำลังเดินทาง',
      arrived: 'มาถึงแล้ว',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      traveling: 'text-blue-600 bg-blue-100 border-blue-200',
      arrived: 'text-purple-600 bg-purple-100 border-purple-200',
      completed: 'text-green-600 bg-green-100 border-green-200',
      cancelled: 'text-red-600 bg-red-100 border-red-200'
    }
    return colorMap[status] || 'text-gray-600 bg-gray-100 border-gray-200'
  }

  const getStatusEmoji = (status: string) => {
    const emojiMap: Record<string, string> = {
      traveling: '🚗',
      arrived: '📍',
      completed: '✅',
      cancelled: '❌'
    }
    return emojiMap[status] || '📍'
  }

  const shareLink = async () => {
    if (!navigator.share) {
      // Fallback to copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('ลิงก์ถูกคัดลอกแล้ว')
      } catch {
        alert('ไม่สามารถคัดลอกลิงก์ได้')
      }
      return
    }

    try {
      await navigator.share({
        title: 'ติดตามการเดินทางพนักงาน - The Bliss at Home',
        text: journey ? `ติดตามการเดินทางของ ${journey.staff_name} มาให้บริการ ${journey.service_name}` : 'ติดตามการเดินทางพนักงาน',
        url: window.location.href
      })
    } catch {
      // User cancelled sharing
    }
  }

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูลการเดินทาง...</p>
        </div>
      </div>
    )
  }

  if (error || !journey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">ไม่พบข้อมูล</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับ
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">ติดตามการเดินทาง</h1>
              <p className="text-sm text-gray-600">The Bliss at Home</p>
            </div>
            <button
              onClick={shareLink}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="แชร์ลิงก์"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Journey Info Card */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{journey.service_name}</h2>
              <p className="text-gray-600 text-sm">ลูกค้า: {journey.customer_name}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(journey.status)}`}>
              {getStatusEmoji(journey.status)} {getStatusText(journey.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">พนักงานผู้ให้บริการ</p>
              <p className="font-medium">{journey.staff_name}</p>
            </div>
            <div>
              <p className="text-gray-500">ปลายทาง</p>
              <p className="font-medium">{journey.destination_name}</p>
            </div>
            <div>
              <p className="text-gray-500">เริ่มเดินทาง</p>
              <p className="font-medium">{new Date(journey.started_at).toLocaleString('th-TH')}</p>
            </div>
            {journey.estimated_duration && (
              <div>
                <p className="text-gray-500">ระยะเวลาบริการ</p>
                <p className="font-medium">{journey.estimated_duration} นาที</p>
              </div>
            )}
          </div>

          {journey.customer_phone && (
            <div className="mt-4 pt-4 border-t">
              <a
                href={`tel:${journey.customer_phone}`}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
              >
                <Phone className="w-4 h-4" />
                โทรหาพนักงาน: {journey.customer_phone}
              </a>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {journey.status === 'traveling' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚗</span>
              <div>
                <p className="font-medium text-blue-800">พนักงานกำลังเดินทางมาหาคุณ</p>
                <p className="text-blue-600 text-sm">แผนที่จะอัพเดทตำแหน่งอัตโนมัติ</p>
              </div>
            </div>
          </div>
        )}

        {journey.status === 'arrived' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-medium text-purple-800">พนักงานมาถึงแล้ว!</p>
                <p className="text-purple-600 text-sm">กรุณาเตรียมตัวรับบริการ</p>
              </div>
            </div>
          </div>
        )}

        {journey.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-green-800">บริการเสร็จสิ้นแล้ว</p>
                <p className="text-green-600 text-sm">ขอบคุณที่ใช้บริการ The Bliss at Home</p>
              </div>
            </div>
          </div>
        )}

        {journey.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <div>
                <p className="font-medium text-red-800">การเดินทางถูกยกเลิก</p>
                <p className="text-red-600 text-sm">หากมีข้อสงสัยกรุณาติดต่อเรา</p>
              </div>
            </div>
          </div>
        )}

        {/* Map Component */}
        <StaffTrackingMap journeyId={journeyId!} height="500px" />

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm py-4">
          <p>© 2026 The Bliss at Home - Premium Spa & Massage Service</p>
        </div>
      </div>
    </div>
  )
}