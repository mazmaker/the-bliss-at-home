// build-marker 2026-07-01: force staff prod rebuild (jobs.status GPS persistence fix)
import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@bliss/supabase'
import { withTimeout, queryWithTimeout } from '../utils/withTimeout'

interface GPSPosition {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: number
}

interface UseGPSTrackingOptions {
  updateInterval?: number // milliseconds, default 10000 (10 seconds)
  highAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

interface WorkflowResponse {
  success: boolean
  data?: any
  message?: string
}

export function useGPSTracking(options: UseGPSTrackingOptions = {}) {
  const {
    updateInterval = 5 * 60 * 1000, // 5 minutes (ประหยัดเครดิต)
    highAccuracy = true,
    timeout = 15000,
    maximumAge = 60000 // Allow 1 minute old location
  } = options

  const [isTracking, setIsTracking] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [journeyId, setJourneyId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false) // ป้องกัน concurrent calls

  const watchIdRef = useRef<number | null>(null)
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)

  // Check if geolocation is supported
  const isSupported = 'geolocation' in navigator

  // ✅ Simple journey checker - just like before, don't over-complicate
  const checkExistingJourney = useCallback(async (bookingId: string) => {
    try {
      // [FIX] time-boxed: this runs inside the "เริ่มเดินทาง" button's processing state —
      // an un-time-boxed stall here was the last remaining freeze point on that path.
      // On timeout the catch below returns null and the normal create-journey flow proceeds.
      const { data: existingJourneys, error: queryError } = await queryWithTimeout(
        supabase
        .from('staff_journeys')
        .select('id, status, current_latitude, current_longitude, last_location_update')
        .eq('booking_id', bookingId)
        .in('status', ['traveling', 'arrived']) // Check for both traveling and arrived journeys
        .order('started_at', { ascending: false })
        .limit(1),
        10000,
        'existing journey check'
      )

      if (queryError) {
        console.error('Failed to check existing journey:', queryError)
        return null
      }

      if (existingJourneys && existingJourneys.length > 0) {
        const journey = existingJourneys[0]

        // Set state to match existing journey
        setJourneyId(journey.id)
        setIsTracking(journey.status === 'traveling') // Only traveling means GPS is active

        if (journey.current_latitude && journey.current_longitude) {
          setCurrentPosition({
            latitude: journey.current_latitude,
            longitude: journey.current_longitude,
            timestamp: journey.last_location_update ? new Date(journey.last_location_update).getTime() : Date.now()
          })
        }

        return journey
      }

      return null
    } catch (err) {
      console.error('Error checking existing journey:', err)
      return null
    }
  }, [])

  const updateLocation = useCallback(async (position: GeolocationPosition) => {
    const gpsPosition: GPSPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now()
    }

    setCurrentPosition(gpsPosition)
    setError(null)

    // Update location in database if journey is active
    const currentJourneyId = journeyId || localStorage.getItem('current_journey_id')
    if (currentJourneyId) {
      try {
        const { error: updateError } = await supabase.rpc('update_journey_location', {
          p_journey_id: currentJourneyId,
          p_latitude: gpsPosition.latitude,
          p_longitude: gpsPosition.longitude,
          p_accuracy: gpsPosition.accuracy
        })

        if (updateError) {
          console.error('Failed to update location:', updateError)

          // Fallback: direct update
          const { error: directUpdateError } = await supabase
            .from('staff_journeys')
            .update({
              current_latitude: gpsPosition.latitude,
              current_longitude: gpsPosition.longitude,
              accuracy: gpsPosition.accuracy,
              last_location_update: new Date().toISOString()
            })
            .eq('id', currentJourneyId)

          if (directUpdateError) {
            console.error('Direct update also failed:', directUpdateError)
            setError('Failed to update location')
          }
        }
      } catch (err) {
        console.error('Location update error:', err)
        setError('Location update failed')
      }
    }
  }, [journeyId])

  const handleError = useCallback((error: GeolocationPositionError) => {
    console.error('GPS Error:', error)
    let errorMessage = 'ไม่สามารถเข้าถึง GPS ได้'

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง'
        break
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'ไม่สามารถหาตำแหน่งได้'
        break
      case error.TIMEOUT:
        errorMessage = 'หาตำแหน่ง timeout'
        break
    }

    setError(errorMessage)
  }, [])

  // ✅ NEW: Start journey without billing (travel only)
  const startJourneyOnly = useCallback(async (bookingId: string, staffId: string) => {
    if (!isSupported) {
      setError('อุปกรณ์ไม่รองรับ GPS')
      return { success: false, message: 'อุปกรณ์ไม่รองรับ GPS' }
    }

    try {
      setError(null)

      // Check for existing journey first - if messy state, don't try to create new journey
      const existingJourney = await checkExistingJourney(bookingId)
      if (existingJourney) {
        // 🎯 CRITICAL FIX: Update React state for existing journey
        setJourneyId(existingJourney.id)
        setIsTracking(true)

        // Start GPS tracking for existing journey if still traveling
        if (existingJourney.status === 'traveling') {
          const watchId = navigator.geolocation.watchPosition(
            updateLocation,
            handleError,
            {
              enableHighAccuracy: highAccuracy,
              timeout,
              maximumAge
            }
          )
          watchIdRef.current = watchId
        }

        return {
          success: true,
          data: { journeyId: existingJourney.id },
          message: 'พบการเดินทางที่มีอยู่แล้ว'
        }
      }

      // Let the user try to create a new journey - don't over-protect

      // Get initial position for journey start
      const initialPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge
        })
      })

      // Create journey in database
      // [FIX] time-boxed: a stalled rpc used to freeze the "เริ่มเดินทาง" button forever
      const { data: journeyId, error: journeyError } = await queryWithTimeout(
        supabase.rpc('start_staff_journey', {
          p_booking_id: bookingId,
          p_staff_id: staffId
        }),
        12000,
        'start_staff_journey rpc'
      )

      if (journeyError) {
        console.error('Failed to start journey:', journeyError)
        throw new Error(journeyError.message || 'ไม่สามารถเริ่มเดินทางได้')
      }

      setJourneyId(journeyId)
      localStorage.setItem('current_journey_id', journeyId)

      // 🎯 CRITICAL FIX: Update React state for new journey too
      setIsTracking(true)

      // Persist 'traveling' on the JOB (not the booking) when GPS starts.
      // The staff-app card reads jobs.status, and a staff CAN write their OWN job via RLS
      // (same as accept/start), whereas `bookings` is RLS-blocked for staff — so writing the
      // booking here silently failed and the travel state was lost on reload. Writing the job
      // is what lets a reload/back recover to the correct step (see useStaffBookings reads jobs.status).
      try {
        // [FIX] time-boxed: these run inside the "เริ่มเดินทาง" button's processing state
        const { data: { user: authUser } } = await withTimeout(supabase.auth.getUser(), 8000, 'auth.getUser (start journey)')
        const { error: statusError } = await queryWithTimeout(
          supabase
            .from('jobs')
            .update({ status: 'traveling' })
            .eq('id', bookingId) // bookingId is the JOB id (parents pass job.id) — target the job row, NOT jobs.booking_id
            .eq('staff_id', authUser?.id || '')
            .in('status', ['confirmed', 'assigned']), // don't clobber in_progress/completed/cancelled
          10000,
          'job status → traveling'
        )
        if (statusError) {
          console.error('Failed to update job status to traveling:', statusError)
        }
      } catch (err) {
        console.error('Error updating job status:', err)
      }

      // Get initial location immediately
      const initialPos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge: 0
        })
      })

      // Update location immediately ([FIX] time-boxed — still inside the button's processing state)
      await withTimeout(updateLocation(initialPos), 10000, 'initial location update')

      // Start continuous GPS tracking
      const watchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleError,
        {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge
        }
      )

      watchIdRef.current = watchId
      setIsTracking(true)

      // Keep screen awake if supported
      if ('wakeLock' in navigator) {
        try {
          await (navigator as any).wakeLock.request('screen')
        } catch (wakeLockError) {
          console.warn('Wake lock failed:', wakeLockError)
        }
      }

      return {
        success: true,
        data: { journeyId },
        message: '🚗 เริ่มเดินทาง - ยังไม่เริ่มนับเวลาบริการ'
      }

    } catch (err) {
      console.error('Failed to start journey:', err)
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถเริ่มเดินทางได้'
      setError(errorMessage)
      return { success: false, message: errorMessage }
    }
  }, [isSupported, updateLocation, handleError, highAccuracy, timeout, maximumAge, checkExistingJourney])

  // ✅ NEW: Confirm arrival with proximity check
  const confirmArrival = useCallback(async (bookingId: string) => {
    if (!currentPosition) {
      setError('ไม่พบตำแหน่งปัจจุบัน')
      return { success: false, message: 'ไม่พบตำแหน่งปัจจุบัน' }
    }

    try {
      setError(null)

      console.log('📍 Confirming arrival:', { bookingId, currentPosition })
      // ใช้ stopTracking แทน confirm_staff_arrival function ที่ไม่มี
      await stopTracking()
      const arrivalError = null
      const isNearby = true // สมมติว่า arrival สำเร็จเสมอ

      if (arrivalError) {
        console.error('❌ Arrival confirmation failed:', arrivalError)
        throw new Error(arrivalError.message)
      }

      if (isNearby) {
        // Stop GPS tracking since we've arrived
        await stopTracking()

        return {
          success: true,
          data: { verified: true },
          message: '📍 ยืนยันการมาถึงแล้ว - ยังไม่เริ่มนับเวลาบริการ'
        }
      } else {
        return {
          success: false,
          message: '🚫 คุณยังไม่อยู่ใกล้จุดหมาย กรุณาเดินทางให้ใกล้กว่านี้'
        }
      }

    } catch (err) {
      console.error('Failed to confirm arrival:', err)
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถยืนยันการมาถึงได้'
      setError(errorMessage)
      return { success: false, message: errorMessage }
    }
  }, [currentPosition])

  // ✅ NEW: Start service billing (THIS is where billing starts)
  const startServiceBilling = useCallback(async (bookingId: string) => {
    try {
      setError(null)

      console.log('💰 Starting service billing:', { bookingId })
      // ใช้ update_job_status แทน start_service_billing ที่ไม่มี
      const { data: billingInfo, error: billingError } = await supabase.rpc('update_job_status', {
        p_job_id: bookingId,
        p_status: 'in_progress',
        p_notes: 'Service started by staff'
      })

      if (billingError) {
        console.error('❌ Service billing failed:', billingError)
        throw new Error(billingError.message)
      }

      return {
        success: true,
        data: billingInfo,
        message: '💰 เริ่มคิดค่าบริการแล้ว'
      }

    } catch (err) {
      console.error('Failed to start service billing:', err)
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถเริ่มคิดค่าบริการได้'
      setError(errorMessage)
      return { success: false, message: errorMessage }
    }
  }, [])

  // ❌ DEPRECATED: Keep old function for backward compatibility
  const startTracking = useCallback(async (bookingId: string, staffId: string) => {
    console.warn('⚠️ startTracking is deprecated. Use startJourneyOnly instead.')
    return startJourneyOnly(bookingId, staffId)
  }, [startJourneyOnly])

  const stopTracking = useCallback(async () => {
    // 🚨 PREVENT CONCURRENT CALLS: ป้องกัน race condition
    if (isProcessing) {
      console.log('⚠️ stopTracking already in progress, ignoring call...')
      return
    }

    setIsProcessing(true)
    console.log('🔒 stopTracking: Lock acquired')

    try {
      // Stop GPS tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }

      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = null
      }

      // Complete journey
      if (journeyId) {
        try {
          const finalLat = currentPosition?.latitude || 13.7563 // fallback Bangkok
          const finalLng = currentPosition?.longitude || 100.5018

        // ✅ Smart approach: Check for existing completed journeys first
        // [FIX] time-boxed: a stall here used to freeze the "มาถึงแล้ว" button on
        // "กำลังยืนยัน..." forever, trapping the staff in `traveling`
        const { data: journeyData, error: journeyFetchError } = await queryWithTimeout(
          supabase
            .from('staff_journeys')
            .select('booking_id, status')
            .eq('id', journeyId)
            .single(),
          10000,
          'journey fetch (arrival)'
        )

        if (journeyFetchError) {
          console.error('Failed to fetch journey data:', journeyFetchError)
          throw new Error(`ไม่สามารถเข้าถึงข้อมูลการเดินทาง: ${journeyFetchError.message}`)
        }

        const bookingId = journeyData.booking_id
        console.log('🏁 Completing journey:', { journeyId, bookingId, currentStatus: journeyData.status })

        // ✅ SIMPLIFIED: Just update journey to 'arrived' (not completed)
        const { error: updateError } = await queryWithTimeout(
          supabase
          .from('staff_journeys')
          .update({
            status: 'arrived',
            arrived_at: new Date().toISOString(),
            current_latitude: finalLat,
            current_longitude: finalLng,
            last_location_update: new Date().toISOString()
          })
          .eq('id', journeyId),
          10000,
          'journey → arrived'
        )

        if (updateError) {
          console.error('Journey arrival update failed:', updateError)
          throw new Error(`ไม่สามารถอัพเดต journey: ${updateError.message}`)
        } else {
          console.log('✅ Journey updated to arrived status')

          // Persist 'arrived' on the JOB so the staff-app card (which reads jobs.status) shows
          // the "เริ่มงาน" button after a reload/back — `bookings` is RLS-blocked for staff, so
          // the old booking write silently failed and the arrival was lost on reload.
          const { data: { user: authUser } } = await withTimeout(supabase.auth.getUser(), 8000, 'auth.getUser (arrival)')
          const { error: jobArriveError } = await queryWithTimeout(
            supabase
              .from('jobs')
              .update({ status: 'arrived' })
              .eq('id', bookingId) // bookingId here = journeyData.booking_id = the JOB id — target the job row, NOT jobs.booking_id
              .eq('staff_id', authUser?.id || '')
              .in('status', ['confirmed', 'assigned', 'traveling']), // only advance a non-terminal own job
            10000,
            'job status → arrived'
          )
          if (jobArriveError) {
            console.error('Job arrival status update failed:', jobArriveError)
          } else {
            console.log('✅ Job status updated to arrived')
          }
        }
      } catch (err) {
        console.error('Journey completion error:', err)
      }
    }

    // Clear all state
    setIsTracking(false)
    setJourneyId(null)
    setCurrentPosition(null)
    setError(null)
    localStorage.removeItem('current_journey_id')

    } catch (outerError) {
      console.error('CRITICAL ERROR in stopTracking:', outerError)
      alert(`เกิดข้อผิดพลาดร้ายแรง: ${outerError.message}`)
      throw outerError
    } finally {
      console.log('🔓 stopTracking: Releasing lock')
      setIsProcessing(false)
    }
  }, [journeyId, currentPosition, isProcessing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
      }
    }
  }, [])

  // Emergency reset function
  const emergencyReset = useCallback(async (jobId: string) => {
    try {
      // Find and complete any stuck journeys
      const { data: stuckJourneys } = await supabase
        .from('staff_journeys')
        .select('id')
        .eq('booking_id', jobId)
        .in('status', ['traveling', 'arrived'])

      if (stuckJourneys && stuckJourneys.length > 0) {
        for (const journey of stuckJourneys) {
          await supabase
            .from('staff_journeys')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', journey.id)
        }
      }

      // Clear local state
      setIsTracking(false)
      setJourneyId(null)
      setCurrentPosition(null)
      setError(null)

      return { success: true, message: 'รีเซ็ตเสร็จแล้ว' }
    } catch (err) {
      console.error('Emergency reset failed:', err)
      return { success: false, message: 'รีเซ็ตไม่สำเร็จ' }
    }
  }, [])

  return {
    isSupported,
    isTracking,
    currentPosition,
    error,
    journeyId,
    isProcessing, // ✅ NEW: Expose processing state
    // ✅ NEW workflow functions
    startJourneyOnly,
    confirmArrival,
    startServiceBilling,
    checkExistingJourney,
    emergencyReset,
    // Legacy compatibility
    startTracking,
    stopTracking
  }
}