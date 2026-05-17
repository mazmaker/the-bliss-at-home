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

export function useGPSTracking(options: UseGPSTrackingOptions = {}) {
  const {
    updateInterval = 10000,
    highAccuracy = true,
    timeout = 15000,
    maximumAge = 10000
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

  const startTracking = useCallback(async (bookingId: string, staffId: string) => {
    if (!isSupported) {
      setError('อุปกรณ์ไม่รองรับ GPS')
      return null
    }

    try {
      setError(null)

      // Start journey in database
      const { data: newJourneyId, error: journeyError } = await supabase.rpc('start_staff_journey', {
        p_booking_id: bookingId,
        p_staff_id: staffId
      })

      if (journeyError) {
        throw new Error(journeyError.message)
      }

      setJourneyId(newJourneyId)

      // Request initial position
      navigator.geolocation.getCurrentPosition(
        updateLocation,
        handleError,
        {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge
        }
      )

      // Start continuous tracking
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

      return newJourneyId

    } catch (err) {
      console.error('Failed to start tracking:', err)
      setError(err instanceof Error ? err.message : 'ไม่สามารถเริ่มติดตามได้')
      return null
    }
  }, [isSupported, updateLocation, handleError, highAccuracy, timeout, maximumAge])

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
    startTracking,
    stopTracking
  }
}