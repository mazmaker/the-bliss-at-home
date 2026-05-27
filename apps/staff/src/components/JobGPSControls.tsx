import { useState, useEffect, useRef } from 'react'
import { Navigation, MapPin, AlertTriangle, CheckCircle, Loader2, Play, Phone, Car, Share2, Copy } from 'lucide-react'
import { useGPSTracking } from '../hooks/useGPSTracking'
import { useAuth } from '@bliss/supabase/auth'
import { supabase } from '@bliss/supabase'

interface JobGPSControlsProps {
  job: {
    id: string
    status: string
    customer_name?: string
    customer_address?: string
    customer_phone?: string
    booking_id?: string
  }
  onRefresh?: () => void
  onStartJob?: (jobId: string) => void // เพิ่ม callback สำหรับเริ่มงาน
  compact?: boolean // แสดงแบบกะทัดรัด
  isProcessing?: boolean // สถานะการประมวลผล
  canStartWork?: boolean // สามารถเริ่มงานได้หรือไม่
}

export default function JobGPSControls({
  job,
  onRefresh,
  onStartJob,
  compact = false,
  isProcessing: externalProcessing = false,
  canStartWork = true
}: JobGPSControlsProps) {
  const { user } = useAuth()
  const [staffId, setStaffId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasArrived, setHasArrived] = useState(false) // ติดตามสถานะการมาถึง
  const [isStoppingGPS, setIsStoppingGPS] = useState(false) // ป้องกัน double-click
  const journeyCheckedRef = useRef<Set<string>>(new Set()) // Track which jobs we've checked
  const syncedJobsRef = useRef<Set<string>>(new Set()) // Track which jobs we've already synced
  const refreshedJobsRef = useRef<Set<string>>(new Set()) // Track which jobs we've already refreshed

  const {
    isTracking,
    currentPosition,
    error: gpsError,
    journeyId,
    isProcessing: gpsProcessing, // ✅ Get processing state from GPS hook
    startTracking,
    stopTracking,
    checkExistingJourney,
    emergencyReset
  } = useGPSTracking({
    updateInterval: 5 * 60 * 1000, // 5 minutes
    highAccuracy: true
  })

  // Expose debug functions globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__emergencyGPSReset = () => emergencyReset(job.booking_id)
      window.__debugJobStatus = () => {
        console.log('🔍 DEBUG JOB STATUS:', {
          'job.id': job.id,
          'job.status': job.status,
          'job.booking_id': job.booking_id,
          hasArrived,
          jobHasArrived: job.status === 'arrived',
          jobInProgress: job.status === 'in_progress',
          'component state': { hasArrived, isTracking, journeyId },
          'button logic': {
            canStartGPS: job.status === 'confirmed' || job.status === 'assigned',
            shouldShowTracking: job.status === 'traveling' || (isTracking && journeyId),
            jobHasArrived: job.status === 'arrived',
          jobInProgress: job.status === 'in_progress',
          }
        })
      }
      // 🛠️ EMERGENCY: Reset stuck job to test flow
      window.__resetStuckJob = async () => {
        try {
          console.log('🔧 Resetting stuck job status...')
          const { data, error } = await supabase
            .from('jobs')
            .update({
              status: 'confirmed',
              started_at: null,
              completed_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)
            .select()

          if (error) {
            console.error('❌ Failed to reset job:', error)
          } else {
            console.log('✅ Job reset successful:', data)
            alert('✅ Job รีเซ็ตแล้ว! รีเฟรชหน้าเพื่อทดสอบ flow ใหม่')
            window.location.reload()
          }
        } catch (err) {
          console.error('❌ Reset error:', err)
          alert('❌ Reset ไม่สำเร็จ: ' + err.message)
        }
      }
    }
  }, [job, hasArrived, isTracking, journeyId, emergencyReset])

  // Check for existing journey on mount
  useEffect(() => {
    if (!checkExistingJourney || !job.booking_id) return

    // Prevent infinite loops by tracking checked bookings
    if (journeyCheckedRef.current.has(job.booking_id)) {
      return
    }

    const checkForExistingJourney = async () => {
      try {
        journeyCheckedRef.current.add(job.booking_id) // Mark as checked

        const existingJourney = await checkExistingJourney(job.booking_id)
        if (existingJourney) {
          // 🎯 CRITICAL FIX: Update React state when existing journey is found in useEffect
          console.log('GPS tracking resumed for existing journey - updating React state')

          // Force state update - this might be after GPS start completed
          if (!isTracking || !journeyId) {
            console.log('🔄 GPS state needs update:', { isTracking, journeyId, existingJourneyId: existingJourney.id })
            // ❌ DISABLED: onRefresh?.() - causing reload loop
          }
        }
      } catch (error) {
        console.error('Failed to check existing journey:', error)
        // Remove from checked set on error so we can retry
        journeyCheckedRef.current.delete(job.booking_id)
      }
    }

    checkForExistingJourney()
  }, [job.booking_id, checkExistingJourney])

  // Get staff ID from staff table
  const getStaffId = async () => {
    if (!staffId && user?.id) {
      try {
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('profile_id', user.id)
          .single()

        if (staffError || !staff) {
          throw new Error('ไม่พบข้อมูลพนักงาน')
        }

        setStaffId(staff.id)
        return staff.id
      } catch (error) {
        console.error('Error getting staff ID:', error)
        throw error
      }
    }
    return staffId
  }

  const handleStartGPS = async () => {
    console.log('🚀 handleStartGPS: START - Button clicked!')
    console.log('🚀 Debug state:', {
      'job.booking_id': job.booking_id,
      'job.status': job.status,
      'user?.id': user?.id,
      isProcessing
    })

    setIsProcessing(true)

    try {
      console.log('🚀 Step 1: Getting staff ID...')
      const currentStaffId = await getStaffId()
      console.log('🚀 Step 1 result: Staff ID =', currentStaffId)

      // Check for existing journey first
      console.log('🚀 Step 2: Checking for existing journey...')
      if (checkExistingJourney) {
        const existingJourney = await checkExistingJourney(job.booking_id)
        console.log('🚀 Step 2 result: Existing journey =', existingJourney)

        if (existingJourney) {
          console.log('🚀 Found existing journey, no refresh needed...')
          // ❌ DISABLED: onRefresh?.() - causing reload loop
          return
        }
      }

      console.log('🚀 Step 3: Validating user...')
      if (!user?.id) {
        console.error('🚀 ERROR: No user ID!')
        alert('กรุณาเข้าสู่ระบบใหม่อีกครั้ง')
        return
      }

      console.log('🚀 Step 4: Starting GPS tracking...')
      console.log('🚀 Calling startTracking with:', { booking_id: job.booking_id, staff_id: currentStaffId })

      const result = await startTracking(job.booking_id, currentStaffId)
      console.log('🚀 Step 4 result: GPS Start Result =', result)

      if (result && result.success) {
        console.log('🚀 SUCCESS: GPS started successfully!')
        // ❌ DISABLED: onRefresh?.() - causing reload loop
        console.log('🚀 GPS started, waiting for state sync...')
      } else if (result && !result.success) {
        console.error('🚀 GPS Start Failed:', result.message)
        // ✅ Show error message from GPS system
        alert(`❌ ไม่สามารถเริ่ม GPS ได้\n\n${result.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`)
      } else {
        console.error('🚀 GPS Start - Unexpected result:', result)
        alert('❌ GPS ไม่ตอบสนอง กรุณาลองใหม่')
      }
    } catch (error) {
      console.error('🚀 GPS Start Exception:', error)
      console.error('🚀 Exception details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      alert(`❌ เกิดข้อผิดพลาดในระบบ GPS\n\n${error.message || error}\n\nกรุณาลองใหม่อีกครั้ง`)
    } finally {
      console.log('🚀 handleStartGPS: COMPLETE - Setting isProcessing to false')
      setIsProcessing(false)
    }
  }

  const handleStopGPS = async () => {
    // 🚨 PREVENT DOUBLE-CLICKS: ป้องกันการกดหลายครั้ง
    if (isStoppingGPS || gpsProcessing) {
      console.log('⚠️ GPS stop already in progress, ignoring click...')
      return
    }

    setIsStoppingGPS(true)

    try {
      console.log('🛑 Starting GPS stop process...')
      console.log('🔒 UI Lock acquired - preventing double clicks')

      await stopTracking()
      setHasArrived(true)

      console.log('✅ GPS stopped successfully - booking status should be updated to "arrived" by GPS hook')

      // ❌ REMOVED: setTimeout refresh to prevent subscription conflicts
      // Let real-time subscriptions handle the state update instead
      console.log('🔄 Waiting for real-time subscription to sync job status...')

    } catch (error) {
      console.error('❌ GPS Stop Error:', error)
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      alert(`❌ เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      console.log('🔓 Releasing UI lock - GPS stop process complete')
      setIsStoppingGPS(false)
    }
  }

  const handleStartJobClick = () => {
    if (onStartJob) {
      onStartJob(job.id)
    }
  }

  const shareTrackingLink = async () => {
    if (!journeyId) return

    // Create customer tracking URL - ชี้ไปที่ customer app (port 3008)
    const customerAppUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3008'  // Development
      : 'https://customer.theblissmassageathome.com' // Production (actual domain)
    const trackingUrl = `${customerAppUrl}/track/${journeyId}`

    try {
      if (navigator.share) {
        // Use native share API on mobile
        await navigator.share({
          title: 'ติดตามการเดินทางพนักงาน - The Bliss at Home',
          text: `ติดตามการเดินทางของพนักงานมาให้บริการ ${job.customer_name}`,
          url: trackingUrl
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(trackingUrl)
        alert('ลิงก์ติดตามถูกคัดลอกแล้ว!\nส่งให้ลูกค้าเพื่อดูตำแหน่งปัจจุบันของคุณ')
      }
    } catch (error) {
      console.error('Share failed:', error)
      // Manual fallback
      const shareText = `ลิงก์ติดตามการเดินทาง: ${trackingUrl}`
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareText)
          alert('ลิงก์ถูกคัดลอกแล้ว!')
        } catch {
          alert(`กรุณาคัดลอกลิงก์ด้วยตัวเอง:\n\n${shareText}`)
        }
      } else {
        alert(`กรุณาคัดลอกลิงก์ด้วยตัวเอง:\n\n${shareText}`)
      }
    }
  }

  // Don't show GPS controls for completed/cancelled jobs
  if (!['confirmed', 'assigned', 'traveling', 'in_progress'].includes(job.status)) {
    return null
  }

  const isTrackingThis = isTracking && journeyId
  const canStartGPS = job.status === 'confirmed' || job.status === 'assigned'
  const shouldShowTracking = job.status === 'traveling' || isTrackingThis
  const jobHasArrived = job.status === 'arrived'
  const jobInProgress = job.status === 'in_progress'

  // ✅ DEBUG: เช็คสถานะปุ่มที่แสดง
  console.log('🎯 GPS Button Logic Debug:', {
    'job.status': job.status,
    'booking_id': job.booking_id,
    hasArrived,
    jobHasArrived,
    canStartGPS,
    shouldShowTracking,
    '🔍 Hook State': { isTracking, journeyId, isTrackingThis },
    'will show':
      jobInProgress ? 'งานกำลังดำเนินการ' :
      (hasArrived || jobHasArrived) ? 'เริ่มงาน' :
      canStartGPS ? 'เริ่มเดินทาง' :
      shouldShowTracking ? 'มาถึงแล้ว' : 'none'
  })

  if (compact && !shouldShowTracking) {
    // Compact mode
    if ((hasArrived || jobHasArrived) && !jobInProgress) {  // แสดงปุ่มเริ่มงานเมื่อมาถึงแล้ว แต่ยังไม่เริ่มงาน
      return (
        <button
          onClick={handleStartJobClick}
          disabled={externalProcessing || !canStartWork}
          className="flex items-center gap-1 text-amber-700 hover:text-amber-800 text-sm disabled:opacity-50"
        >
          {externalProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          เริ่มงาน
        </button>
      )
    } else if (canStartGPS) {
      // แสดงปุ่มเริ่มติดตาม GPS
      return (
        <button
          onClick={handleStartGPS}
          disabled={isProcessing}
          className="flex items-center gap-1 text-amber-700 hover:text-amber-800 text-sm disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          เริ่มเดินทาง
        </button>
      )
    }

    if (jobInProgress) {
      return (
        <div className="text-green-700 text-sm flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          งานกำลังดำเนินการ
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-3">
      {shouldShowTracking ? (
        // GPS Active Status - The Bliss Brand Colors
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-amber-800 font-medium text-sm">กำลังติดตาม GPS</span>
          </div>

          <p className="text-xs text-amber-700 mb-2">ลูกค้าเห็นตำแหน่งของคุณแล้ว</p>

          {currentPosition && (
            <div className="text-xs text-amber-700 mb-2">
              อัพเดทล่าสุด: {new Date(currentPosition.timestamp).toLocaleTimeString('th-TH')}
            </div>
          )}

          {gpsError && (
            <div className="flex items-center gap-1 text-red-600 text-xs mb-2">
              <AlertTriangle className="w-3 h-3" />
              {gpsError}
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
            <p className="text-xs text-red-700">
              ห้ามปิดแอป • ห้ามล็อคหน้าจอ • เสียบชาร์จ
            </p>
          </div>

          {/* Share tracking link */}
          {journeyId && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-700 flex-1">
                  📱 ส่งลิงก์ให้ลูกค้าดูตำแหน่งของคุณ
                </p>
                <button
                  onClick={shareTrackingLink}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
                  title="แชร์ลิงก์ติดตาม"
                >
                  <Share2 className="w-3 h-3" />
                  แชร์
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleStopGPS}
              disabled={gpsProcessing || isStoppingGPS}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
              title={(gpsProcessing || isStoppingGPS) ? 'กำลังประมวลผล กรุณารอ...' : undefined}
            >
              {(gpsProcessing || isStoppingGPS) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {(gpsProcessing || isStoppingGPS) ? 'กำลังยืนยัน...' : 'มาถึงแล้ว'}
            </button>

            {job.customer_phone && (
              <a
                href={`tel:${job.customer_phone}`}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm flex items-center gap-1"
              >
                โทร
              </a>
            )}

            {job.customer_address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.customer_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      ) : (hasArrived || jobHasArrived) && !jobInProgress ? (
        // Start Work Button (หลังจาก GPS เสร็จแล้ว แต่ยังไม่เริ่มงาน)
        <button
          onClick={handleStartJobClick}
          disabled={externalProcessing || !canStartWork}
          className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          title={!canStartWork ? 'คุณยังไม่สามารถเริ่มงานได้ในขณะนี้' : undefined}
        >
          {externalProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          เริ่มงาน
        </button>
      ) : canStartGPS ? (
        // Start GPS Button
        <button
          onClick={handleStartGPS}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          เริ่มเดินทาง (ติดตาม GPS)
        </button>
      ) : jobInProgress ? (
        // Job in progress - show status instead of button
        <div className="w-full bg-green-50 border border-green-200 py-3 rounded-lg flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-700 font-medium">งานกำลังดำเนินการ</span>
        </div>
      ) : null}
    </div>
  )
}