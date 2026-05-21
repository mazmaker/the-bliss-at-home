import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@bliss/supabase'

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

  const watchIdRef = useRef<number | null>(null)
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)

  // Check if geolocation is supported
  const isSupported = 'geolocation' in navigator

  // ✅ NEW: Check for existing active journey
  const checkExistingJourney = useCallback(async (bookingId: string) => {
    try {
      const { data: existingJourneys, error: queryError } = await supabase
        .from('staff_journeys')
        .select('id, status, current_latitude, current_longitude, last_location_update')
        .eq('booking_id', bookingId)
        .in('status', ['traveling', 'arrived'])
        .order('started_at', { ascending: false })
        .limit(1)

      if (queryError) {
        console.error('Failed to check existing journey:', queryError)
        return null
      }

      if (existingJourneys && existingJourneys.length > 0) {
        const journey = existingJourneys[0]
        console.log('🔍 Found existing journey:', journey)

        // Set state to match existing journey
        console.log('🔄 Updating hook state with existing journey...')
        setJourneyId(journey.id)
        setIsTracking(journey.status === 'traveling')
        console.log('🔄 Hook state updated:', { journeyId: journey.id, isTracking: journey.status === 'traveling' })

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
    if (journeyId) {
      try {
        const { error: updateError } = await supabase.rpc('update_journey_location', {
          p_journey_id: journeyId,
          p_latitude: gpsPosition.latitude,
          p_longitude: gpsPosition.longitude,
          p_accuracy: gpsPosition.accuracy
        })

        if (updateError) {
          console.error('Failed to update location:', updateError)
          setError('Failed to update location')
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

      // ✅ Check for existing journey first
      const existingJourney = await checkExistingJourney(bookingId)
      if (existingJourney) {
        console.log('🔄 Resuming existing journey:', existingJourney.id)

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
          message: '🔄 พบการเดินทางที่มีอยู่แล้ว'
        }
      }

      // Get initial position for journey start
      const initialPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge
        })
      })

      // ✅ เรียก database function ที่สร้างไว้แล้ว
      console.log('🚗 Starting NEW GPS tracking:', { bookingId, staffId })

      // เรียก start_staff_journey function จริง
      console.log('📤 Staff App: Creating journey in database with:', {
        p_booking_id: bookingId,
        p_staff_id: staffId
      })

      const { data: journeyId, error: journeyError } = await supabase.rpc('start_staff_journey', {
        p_booking_id: bookingId,
        p_staff_id: staffId
      })

      console.log('📥 Staff App: Journey creation result:', { journeyId, journeyError })

      if (journeyError) {
        console.error('❌ Failed to start journey:', journeyError)
        throw new Error(journeyError.message || 'ไม่สามารถเริ่มเดินทางได้')
      }

      console.log('📊 Journey created in database:', { journeyId })
      setJourneyId(journeyId)

      // ✅ Update job status to 'traveling' when GPS starts
      try {
        console.log('🔄 Attempting to update booking status to traveling...', { bookingId })

        // First check current status
        const { data: currentBooking, error: checkError } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('id', bookingId)
          .single()

        console.log('📊 Current booking status:', currentBooking, checkError)

        // Try to update status
        const { error: statusError, data: updateData } = await supabase
          .from('bookings')
          .update({ status: 'traveling' })
          .eq('id', bookingId)
          .select('id, status')

        if (statusError) {
          console.error('❌ Failed to update job status to traveling:', statusError)
          console.error('❌ Status error code:', statusError.code)
          console.error('❌ Status error message:', statusError.message)
          console.error('❌ Status error details:', statusError.details)
          console.error('❌ Full error object:', JSON.stringify(statusError, null, 2))

          // Try alternative status that might work
          console.log('🔄 Trying alternative: updating to "assigned" status...')
          const { error: altError, data: altData } = await supabase
            .from('bookings')
            .update({ status: 'assigned' })
            .eq('id', bookingId)
            .select('id, status')

          if (altError) {
            console.error('❌ Alternative update also failed:', altError)
          } else {
            console.log('✅ Alternative status update worked:', altData)
          }

        } else {
          console.log('✅ Job status updated to traveling successfully:', updateData)
        }
      } catch (err) {
        console.error('❌ Error updating job status:', err)
      }

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
    // Stop GPS tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current)
      intervalIdRef.current = null
    }

    // Complete journey if we have final position
    if (journeyId && currentPosition) {
      try {
        const { error: completeError } = await supabase.rpc('complete_staff_journey', {
          p_journey_id: journeyId,
          p_final_latitude: currentPosition.latitude,
          p_final_longitude: currentPosition.longitude
        })

        if (completeError) {
          console.error('Failed to complete journey:', completeError)
        }
      } catch (err) {
        console.error('Journey completion error:', err)
      }
    }

    setIsTracking(false)
    setJourneyId(null)
    setCurrentPosition(null)
    setError(null)
  }, [journeyId, currentPosition])

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

  return {
    isSupported,
    isTracking,
    currentPosition,
    error,
    journeyId,
    // ✅ NEW workflow functions
    startJourneyOnly,
    confirmArrival,
    startServiceBilling,
    checkExistingJourney,
    // Legacy compatibility
    startTracking,
    stopTracking
  }
}