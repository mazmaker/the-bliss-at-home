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
  const journeyCheckedRef = useRef<Set<string>>(new Set()) // Track which jobs we've checked
  const syncedJobsRef = useRef<Set<string>>(new Set()) // Track which jobs we've already synced

  const {
    isTracking,
    currentPosition,
    error: gpsError,
    journeyId,
    startTracking,
    stopTracking,
    checkExistingJourney,
    emergencyReset
  } = useGPSTracking({
    updateInterval: 5 * 60 * 1000, // 5 minutes
    highAccuracy: true
  })

  // Expose emergency reset globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__emergencyGPSReset = () => emergencyReset(job.booking_id)
    }
  }, [job.booking_id, emergencyReset])

  // ✅ Check for existing journey on mount
  useEffect(() => {
    if (!checkExistingJourney || !job.booking_id) return

    // Prevent infinite loops by tracking checked bookings
    if (journeyCheckedRef.current.has(job.booking_id)) {
      console.log('🔄 Already checked journey for booking:', job.booking_id)
      return
    }

    const checkForExistingJourney = async () => {
      try {
        console.log('🔍 Checking for existing journey for booking:', job.booking_id)
        journeyCheckedRef.current.add(job.booking_id) // Mark as checked

        const existingJourney = await checkExistingJourney(job.booking_id)
        if (existingJourney) {
          console.log('✅ Found existing journey, hook state should update automatically')

          // ℹ️ Booking status sync removed due to RLS policies
          // GPS tracking works independently and doesn't require booking status updates
          console.log('ℹ️ GPS tracking active - booking status sync skipped (RLS policies)')
          console.log('ℹ️ All GPS functionality works correctly without booking status updates')

          // 🔄 Refresh job data after booking status might have been synced
          console.log('🔄 Refreshing job data after existing journey found...')
          setTimeout(() => {
            onRefresh?.()
          }, 500) // Small delay to ensure database sync completes
        }
      } catch (error) {
        console.error('Failed to check existing journey:', error)
        // Remove from checked set on error so we can retry
        journeyCheckedRef.current.delete(job.booking_id)
      }
    }

    checkForExistingJourney()
  }, [job.booking_id, checkExistingJourney]) // Only depend on job.booking_id and checkExistingJourney

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
    setIsProcessing(true)
    try {
      const currentStaffId = await getStaffId()

      // ✅ Check for existing journey first
      if (checkExistingJourney) {
        console.log('🔍 Checking for existing journey before starting new one...')
        const existingJourney = await checkExistingJourney(job.booking_id)
        if (existingJourney) {
          console.log('✅ Found existing journey:', existingJourney.id)
          // Wait for state to update then refresh
          setTimeout(() => {
            console.log('🔄 Calling onRefresh after state update...')
            onRefresh?.()
          }, 100)
          return
        }
      }

      console.log('🚗 GPS Debug Info:', {
        jobId: job.id,
        bookingId: job.booking_id,
        usingBookingId: job.booking_id, // ✅ ใช้ job.booking_id สำหรับ journey
        profileId: user?.id,
        staffTableId: currentStaffId,
        jobStatus: job.status
      })

      if (!user?.id) {
        alert('กรุณาเข้าสู่ระบบใหม่อีกครั้ง')
        return
      }

      console.log('🎯 Staff App: Starting GPS tracking for booking:', job.booking_id)
      console.log('🎯 Staff App: Job details:', {
        jobId: job.id,
        bookingId: job.booking_id,
        jobStatus: job.status,
        customerName: job.customer_name
      })

      const result = await startTracking(job.booking_id, currentStaffId) // ✅ ใช้ booking_id ไม่ใช่ job.id
      if (result) {
        console.log('🔄 GPS started successfully, calling onRefresh...', { result, hasRefresh: !!onRefresh })

        // ✅ Force refresh หลังจาก GPS start สำเร็จ
        setTimeout(() => {
          console.log('🔄 Force refreshing UI after GPS start...')
          onRefresh?.()
        }, 1000) // รอ 1 วิ่าที่ให้ database commit
      }
    } catch (error) {
      console.error('Failed to start GPS:', error)
      alert('ไม่สามารถเริ่มติดตาม GPS ได้: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStopGPS = async () => {
    setIsProcessing(true)
    try {
      console.log('🛑 Stopping GPS tracking...', { journeyId })
      await stopTracking()
      setHasArrived(true) // เซ็ตสถานะมาถึงแล้ว

      console.log('✅ GPS stopped successfully')
      onRefresh?.()

      // รีโหลดหน้าหลัง 1 วินาที เพื่อให้แน่ใจ UI reset
      setTimeout(() => {
        console.log('🔄 Force refreshing page to reset UI...')
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Failed to stop GPS:', error)
    } finally {
      setIsProcessing(false)
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
  const jobHasArrived = job.status === 'in_progress' // พนักงานมาถึงแล้ว (จาก database)

  console.log('📱 GPS Controls Debug:', JSON.stringify({
    jobId: job.id,
    bookingId: job.booking_id,
    jobStatus: job.status,
    isTracking,
    journeyId,
    isTrackingThis,
    shouldShowTracking,
    canStartGPS
  }, null, 2))

  if (compact && !shouldShowTracking) {
    // Compact mode
    if (hasArrived || jobHasArrived) {  // แสดงปุ่มเริ่มงานเมื่อมาถึงแล้ว (GPS เสร็จ หรือ database = in_progress)
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
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              มาถึงแล้ว
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
      ) : hasArrived || jobHasArrived ? (
        // Start Work Button (หลังจาก GPS เสร็จแล้ว หรือ database = in_progress)
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
      ) : null}
    </div>
  )
}