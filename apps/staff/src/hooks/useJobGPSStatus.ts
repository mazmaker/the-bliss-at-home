import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@bliss/supabase'

interface GPSStatus {
  isTracking: boolean
  journeyId: string | null
}

export function useJobGPSStatus(jobId: string): GPSStatus {
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>({
    isTracking: false,
    journeyId: null
  })

  const checkGPSStatus = useCallback(async () => {
    if (!jobId) return

    try {
      const { data: existingJourneys, error } = await supabase
        .from('staff_journeys')
        .select('id, status')
        .eq('booking_id', jobId)
        .in('status', ['traveling', 'arrived'])
        .order('started_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Failed to check GPS status for job:', jobId, error)
        return
      }

      if (existingJourneys && existingJourneys.length > 0) {
        const journey = existingJourneys[0]
        setGpsStatus({
          isTracking: journey.status === 'traveling',
          journeyId: journey.id
        })
      } else {
        setGpsStatus({
          isTracking: false,
          journeyId: null
        })
      }
    } catch (err) {
      console.error('Error checking GPS status:', err)
    }
  }, [jobId])

  useEffect(() => {
    checkGPSStatus()

    // Set up real-time subscription for this job's journeys
    const channel = supabase
      .channel(`gps-status-${jobId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'staff_journeys',
        filter: `booking_id=eq.${jobId}`
      }, () => {
        checkGPSStatus()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [checkGPSStatus, jobId])

  return gpsStatus
}