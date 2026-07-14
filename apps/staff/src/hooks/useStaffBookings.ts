import { useState, useEffect } from 'react'
import { supabase, getStaffId } from '@bliss/supabase'
import { useAuth } from '@bliss/supabase/auth'
import { queryWithTimeout } from '../utils/withTimeout'

interface StaffBooking {
  id: string
  booking_id?: string
  customer_id: string
  customer_name?: string
  customer_phone?: string
  customer_address?: string
  service_name?: string
  scheduled_date: string
  scheduled_time: string
  duration_minutes: number
  total_duration_minutes?: number
  status: string
  is_hotel_booking: boolean
  hotel_name?: string
  room_number?: string
  amount: number
  staff_earnings: number
  total_staff_earnings?: number
  customer_notes?: string
  distance_km?: number
  created_at: string

  // Journey tracking info
  journey_id?: string
  journey_status?: string
  journey_started_at?: string
  journey_current_lat?: number
  journey_current_lng?: number
}

export function useStaffBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<StaffBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Cached staff.id — lets the realtime subscription filter to this staff only,
  // and skips the extra staff lookup on refetches
  const [staffId, setStaffId] = useState<string | null>(null)

  // silent=true (realtime refetch): update data in the background WITHOUT flipping
  // isLoading — previously every fleet-wide jobs/journeys change blanked the whole
  // list back to a full-screen spinner
  const fetchBookings = async (silent = false) => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      if (!silent) {
        setIsLoading(true)
        setError(null)
      }

      // Get jobs assigned to this staff
      // [FIX] jobs.staff_id holds the PROFILE id (FK jobs_staff_id_fkey → profiles.id),
      // NOT staff.id — querying with staff.id (as before) matched zero rows.
      // [FIX] time-boxed: a stalled query used to leave the spinner up forever
      const { data: bookingsData, error: bookingsError } = await queryWithTimeout(
        supabase
        .from('jobs')
        .select(`
          id,
          booking_id,
          customer_id,
          customer_name,
          customer_phone,
          service_name,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          total_duration_minutes,
          status,
          staff_id,
          hotel_id,
          hotel_name,
          room_number,
          address,
          amount,
          staff_earnings,
          total_staff_earnings,
          customer_notes,
          distance_km,
          created_at,
          staff_journeys(
            id,
            status,
            started_at,
            current_latitude,
            current_longitude
          )
        `)
        .eq('staff_id', user.id)
        // Temporarily remove status and date filtering to see all jobs
        // .in('status', ['confirmed', 'assigned', 'traveling', 'in_progress'])
        // .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(20),
        15000,
        'staff jobs fetch'
      )

      if (bookingsError) {
        console.error('❌ Jobs fetch error:', bookingsError)
        throw new Error(bookingsError.message)
      }

      // Transform data
      const transformedBookings: StaffBooking[] = (bookingsData || []).map(booking => ({
        id: booking.id,
        booking_id: booking.booking_id,
        customer_id: booking.customer_id,
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        customer_address: booking.address,
        service_name: booking.service_name,
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        duration_minutes: booking.duration_minutes,
        total_duration_minutes: booking.total_duration_minutes,
        status: booking.status,
        is_hotel_booking: !!booking.hotel_id, // true if hotel_id exists
        hotel_name: booking.hotel_name,
        room_number: booking.room_number,
        amount: booking.amount,
        staff_earnings: booking.staff_earnings,
        total_staff_earnings: booking.total_staff_earnings,
        customer_notes: booking.customer_notes,
        distance_km: booking.distance_km,
        created_at: booking.created_at,

        // Journey info (if exists)
        journey_id: booking.staff_journeys?.[0]?.id,
        journey_status: booking.staff_journeys?.[0]?.status,
        journey_started_at: booking.staff_journeys?.[0]?.started_at,
        journey_current_lat: booking.staff_journeys?.[0]?.current_latitude,
        journey_current_lng: booking.staff_journeys?.[0]?.current_longitude
      }))

      setBookings(transformedBookings)

    } catch (err) {
      console.error('Failed to fetch bookings:', err)
      // Silent (realtime) refetch failures keep showing the last good data
      if (!silent) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดรายการจองได้')
      }
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  // Fetch bookings on mount and when the signed-in user changes
  useEffect(() => {
    fetchBookings()
  }, [user?.id])

  // Resolve staff.id for the journeys realtime filter (staff_journeys.staff_id → staff.id,
  // a DIFFERENT id space from jobs.staff_id which holds the profile id).
  // [FIX] reset on user change — a cached id from a previous login must never leak
  // into the next user's subscription.
  useEffect(() => {
    setStaffId(null)
    if (!user?.id) return
    let cancelled = false
    getStaffId(user.id)
      .then((id) => {
        if (!cancelled && id) setStaffId(id)
      })
      .catch((err) => console.error('staff id lookup failed:', err))
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Set up real-time subscription for booking changes.
  // [FIX] Filters BOTH tables to this staff only — previously this listened to
  // fleet-wide changes and refetched (with a full spinner) every time ANY staff's
  // job/GPS position changed. Note the id spaces: jobs.staff_id = profile id,
  // staff_journeys.staff_id = staff.id.
  useEffect(() => {
    if (!user?.id || !staffId) return

    // Coalesce event bursts (own GPS heartbeat updates every ~10s) into one refetch
    let refetchTimer: ReturnType<typeof setTimeout> | null = null
    const debouncedRefetch = () => {
      if (refetchTimer) clearTimeout(refetchTimer)
      refetchTimer = setTimeout(() => fetchBookings(true), 500)
    }

    const channel = supabase
      .channel(`staff-bookings-${staffId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `staff_id=eq.${user.id}`
      }, debouncedRefetch)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'staff_journeys',
        filter: `staff_id=eq.${staffId}`
      }, debouncedRefetch)
      .subscribe()

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer)
      supabase.removeChannel(channel)
    }
  }, [user?.id, staffId])

  const refreshBookings = () => {
    fetchBookings()
  }

  return {
    bookings,
    isLoading,
    error,
    refreshBookings
  }
}