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

      // Get initial position for journey start
      const initialPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge
        })
      })

      // Create journey manually to avoid triggering billing timer
      console.log('🚗 Creating GPS journey manually:', { bookingId, staffId })

      // 1. Create journey record without updating booking
      const { data: journeyData, error: insertError } = await supabase
        .from('staff_journeys')
        .insert({
          booking_id: bookingId,
          staff_id: staffId,
          status: 'traveling',
          current_latitude: initialPosition.coords.latitude,
          current_longitude: initialPosition.coords.longitude,
          started_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('❌ Journey creation failed:', insertError)
        throw new Error(insertError.message)
      }

      const newJourneyId = journeyData.id
      const journeyError = null

      console.log('📊 Journey creation result:', { newJourneyId, journeyError })

      if (journeyError) {
        console.error('❌ Journey creation failed:', journeyError)
        throw new Error(journeyError.message)
      }

      setJourneyId(newJourneyId)

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
        data: { journeyId: newJourneyId },
        message: '🚗 เริ่มเดินทาง - ยังไม่เริ่มนับเวลาบริการ'
      }

    } catch (err) {
      console.error('Failed to start journey:', err)
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถเริ่มเดินทางได้'
      setError(errorMessage)
      return { success: false, message: errorMessage }
    }
  }, [isSupported, updateLocation, handleError, highAccuracy, timeout, maximumAge])

  // ✅ NEW: Confirm arrival with proximity check
  const confirmArrival = useCallback(async (bookingId: string) => {
    if (!currentPosition) {
      setError('ไม่พบตำแหน่งปัจจุบัน')
      return { success: false, message: 'ไม่พบตำแหน่งปัจจุบัน' }
    }

    try {
      setError(null)

      console.log('📍 Confirming arrival:', { bookingId, currentPosition })
      const { data: isNearby, error: arrivalError } = await supabase.rpc('confirm_staff_arrival', {
        p_booking_id: bookingId,
        p_location: {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          accuracy: currentPosition.accuracy
        }
      })

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
      const { data: billingInfo, error: billingError } = await supabase.rpc('start_service_billing', {
        p_booking_id: bookingId
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
    // Legacy compatibility
    startTracking,
    stopTracking
  }
}