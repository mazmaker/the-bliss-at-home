import { useState, useEffect } from 'react'
import { Navigation, MapPin, AlertTriangle, CheckCircle, Loader2, Play, Phone, Car, Share2, Clock } from 'lucide-react'
import { useGPSTracking } from '../hooks/useGPSTracking'
import { useBookingStateMachine, type BookingStatus, getStateDisplayName, getStateColor } from '../hooks/useBookingStateMachine'
import { useAuth } from '@bliss/supabase/auth'
import { supabase } from '@bliss/supabase'

interface JobGPSControlsEnhancedProps {
  job: {
    id: string
    booking_id: string
    status: string
    customer_name?: string
    customer_address?: string
    customer_phone?: string
  }
  onRefresh?: () => void
  onStartJob?: (jobId: string) => void
  compact?: boolean
  isProcessing?: boolean
  canStartWork?: boolean
}

export default function JobGPSControlsEnhanced({
  job,
  onRefresh,
  onStartJob,
  compact = false,
  isProcessing: externalProcessing = false,
  canStartWork = true
}: JobGPSControlsEnhancedProps) {
  const { user } = useAuth()
  const [staffId, setStaffId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const {
    isTracking,
    currentPosition,
    error: gpsError,
    journeyId,
    startJourneyOnly,
    confirmArrival,
    startServiceBilling,
    stopTracking
  } = useGPSTracking({
    updateInterval: 5 * 60 * 1000, // 5 minutes
    highAccuracy: true
  })

  const {
    currentState,
    isLoading: stateLoading,
    error: stateError,
    canTransitionTo,
    transitionTo
  } = useBookingStateMachine(job.booking_id, user?.id)

  // Get staff ID from staff table
  useEffect(() => {
    if (!staffId && user?.id) {
      const getStaffId = async () => {
        try {
          const { data: staff, error } = await supabase
            .from('staff')
            .select('id')
            .eq('profile_id', user.id)
            .single()

          if (error || !staff) {
            throw new Error('ไม่พบข้อมูลพนักงาน')
          }

          setStaffId(staff.id)
        } catch (error) {
          console.error('Error getting staff ID:', error)
          setFeedback({ type: 'error', message: 'ไม่พบข้อมูลพนักงาน' })
        }
      }

      getStaffId()
    }
  }, [user?.id, staffId])

  // Clear feedback after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // 🚗 Step 1: Start Journey (GPS only, no billing)
  const handleStartJourney = async () => {
    if (!staffId || !user?.id) {
      setFeedback({ type: 'error', message: 'กรุณาเข้าสู่ระบบใหม่' })
      return
    }

    setIsProcessing(true)
    setFeedback(null)

    try {
      console.log('🚗 Starting journey for booking:', job.booking_id)

      // Start GPS journey (travel only, no billing)
      const result = await startJourneyOnly(job.booking_id, staffId)

      if (result.success) {
        setFeedback({ type: 'success', message: result.message || 'เริ่มเดินทางแล้ว' })
        onRefresh?.()
      } else {
        setFeedback({ type: 'error', message: result.message || 'ไม่สามารถเริ่มเดินทางได้' })
      }

    } catch (error) {
      console.error('Failed to start journey:', error)
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 📍 Step 2: Confirm Arrival (with proximity check)
  const handleArrival = async () => {
    setIsProcessing(true)
    setFeedback(null)

    try {
      console.log('📍 Confirming arrival for booking:', job.booking_id)

      // Confirm arrival with proximity check
      const result = await confirmArrival(job.booking_id)

      if (result.success) {
        setFeedback({ type: 'success', message: result.message || 'ยืนยันการมาถึงแล้ว' })
        onRefresh?.()
      } else {
        setFeedback({ type: 'error', message: result.message || 'ไม่สามารถยืนยันการมาถึงได้' })
      }

    } catch (error) {
      console.error('Failed to confirm arrival:', error)
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // ▶️ Step 3: Start Service (billing starts here)
  const handleStartService = async () => {
    setIsProcessing(true)
    setFeedback(null)

    try {
      console.log('💰 Starting service billing for booking:', job.booking_id)

      // Start service billing (THIS is where billing timer starts)
      const result = await startServiceBilling(job.booking_id)

      if (result.success) {
        setFeedback({ type: 'success', message: result.message || 'เริ่มให้บริการแล้ว' })

        // Call the original onStartJob for legacy compatibility
        onStartJob?.(job.id)
        onRefresh?.()
      } else {
        setFeedback({ type: 'error', message: result.message || 'ไม่สามารถเริ่มบริการได้' })
      }

    } catch (error) {
      console.error('Failed to start service:', error)
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const shareTrackingLink = async () => {
    if (!journeyId) return

    const trackingUrl = `${window.location.origin}/track/${journeyId}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ติดตามการเดินทางพนักงาน - The Bliss at Home',
          text: `ติดตามการเดินทางของพนักงานมาให้บริการ ${job.customer_name}`,
          url: trackingUrl
        })
      } else {
        await navigator.clipboard.writeText(trackingUrl)
        setFeedback({ type: 'info', message: 'ลิงก์ติดตามถูกคัดลอกแล้ว' })
      }
    } catch (error) {
      console.error('Share failed:', error)
      setFeedback({ type: 'error', message: 'ไม่สามารถแชร์ลิงก์ได้' })
    }
  }

  // Get current workflow step
  const getWorkflowStep = () => {
    switch (currentState) {
      case 'ASSIGNED':
      case 'STAFF_PREPARING':
        return { step: 1, title: 'พร้อมเดินทาง', action: 'START_JOURNEY' }
      case 'STAFF_EN_ROUTE':
      case 'STAFF_NEARBY':
        return { step: 2, title: 'กำลังเดินทาง', action: 'CONFIRM_ARRIVAL' }
      case 'STAFF_ARRIVED':
        return { step: 3, title: 'มาถึงแล้ว', action: 'START_SERVICE' }
      case 'SERVICE_IN_PROGRESS':
        return { step: 4, title: 'กำลังให้บริการ', action: 'IN_PROGRESS' }
      default:
        return { step: 0, title: 'ไม่ทราบสถานะ', action: 'UNKNOWN' }
    }
  }

  const workflow = getWorkflowStep()
  const color = getStateColor(currentState || 'PENDING')

  // Don't show controls for completed/cancelled jobs
  if (!currentState || ['COMPLETED', 'CANCELLED'].includes(currentState)) {
    return null
  }

  // Compact mode for dashboard
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {workflow.action === 'START_JOURNEY' && (
          <button
            onClick={handleStartJourney}
            disabled={isProcessing || externalProcessing}
            className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
            เริ่มเดินทาง
          </button>
        )}

        {workflow.action === 'CONFIRM_ARRIVAL' && (
          <button
            onClick={handleArrival}
            disabled={isProcessing || externalProcessing}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            มาถึงแล้ว
          </button>
        )}

        {workflow.action === 'START_SERVICE' && canStartWork && (
          <button
            onClick={handleStartService}
            disabled={isProcessing || externalProcessing}
            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            เริ่มงาน
          </button>
        )}

        {workflow.action === 'IN_PROGRESS' && (
          <div className="flex items-center gap-1 text-emerald-600 text-sm">
            <Clock className="w-4 h-4" />
            กำลังให้บริการ
          </div>
        )}
      </div>
    )
  }

  // Full mode for job detail page
  return (
    <div className="space-y-4">
      {/* Current State Display */}
      <div className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className={`font-bold text-${color}-900`}>
              ขั้นตอน {workflow.step}: {workflow.title}
            </h3>
            <p className={`text-sm text-${color}-600`}>
              {getStateDisplayName(currentState || 'PENDING')}
            </p>
          </div>
          {stateLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>

        {/* Billing Status */}
        <div className={`bg-${color}-100 rounded-lg p-3 mb-3`}>
          <p className={`text-sm font-medium text-${color}-800`}>
            💰 {currentState === 'SERVICE_IN_PROGRESS' ?
              '🟢 เริ่มคิดค่าบริการแล้ว' :
              '⏳ ยังไม่เริ่มคิดค่าบริการ'
            }
          </p>
        </div>
      </div>

      {/* GPS Tracking Status */}
      {isTracking && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 font-medium text-sm">กำลังติดตาม GPS</span>
          </div>

          {currentPosition && (
            <div className="text-xs text-green-600 mb-2">
              อัพเดทล่าสุด: {new Date(currentPosition.timestamp).toLocaleTimeString('th-TH')}
            </div>
          )}

          {gpsError && (
            <div className="flex items-center gap-1 text-red-600 text-xs mb-2">
              <AlertTriangle className="w-3 h-3" />
              {gpsError}
            </div>
          )}

          {/* Share tracking link */}
          {journeyId && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-700 flex-1">
                  📱 ส่งลิงก์ให้ลูกค้าดูตำแหน่ง
                </p>
                <button
                  onClick={shareTrackingLink}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
                >
                  <Share2 className="w-3 h-3" />
                  แชร์
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {workflow.action === 'START_JOURNEY' && (
          <button
            onClick={handleStartJourney}
            disabled={isProcessing || externalProcessing || !staffId}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
            🚗 เริ่มเดินทาง (ติดตาม GPS)
          </button>
        )}

        {workflow.action === 'CONFIRM_ARRIVAL' && (
          <button
            onClick={handleArrival}
            disabled={isProcessing || externalProcessing || !currentPosition}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            📍 มาถึงแล้ว
          </button>
        )}

        {workflow.action === 'START_SERVICE' && (
          <button
            onClick={handleStartService}
            disabled={isProcessing || externalProcessing || !canStartWork}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            title={!canStartWork ? 'คุณยังไม่สามารถเริ่มงานได้ในขณะนี้' : undefined}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            ▶️ เริ่มงาน (เริ่มคิดค่าบริการ)
          </button>
        )}

        {workflow.action === 'IN_PROGRESS' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-emerald-600 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-medium">กำลังให้บริการ</span>
            </div>
            <p className="text-sm text-emerald-600">
              🟢 เริ่มคิดค่าบริการแล้ว
            </p>
          </div>
        )}
      </div>

      {/* Contact Customer */}
      {job.customer_phone && (
        <div className="flex gap-2">
          <a
            href={`tel:${job.customer_phone}`}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1"
          >
            <Phone className="w-4 h-4" />
            โทรหาลูกค้า
          </a>

          {job.customer_address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.customer_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1"
            >
              <MapPin className="w-4 h-4" />
              เปิดแผนที่
            </a>
          )}
        </div>
      )}

      {/* Feedback Messages */}
      {feedback && (
        <div className={`rounded-lg p-3 ${
          feedback.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
          feedback.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
          'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          <p className="text-sm">{feedback.message}</p>
        </div>
      )}

      {/* Error Messages */}
      {stateError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">⚠️ {stateError}</p>
        </div>
      )}
    </div>
  )
}