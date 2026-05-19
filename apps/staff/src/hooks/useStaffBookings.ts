import { useState, useEffect } from 'react'
import { supabase } from '@bliss/supabase'
import { useAuth } from '@bliss/supabase/auth'

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

  const fetchBookings = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Get staff ID from profile
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (staffError || !staff) {
        throw new Error('ไม่พบข้อมูลพนักงาน')
      }

      console.log('🔍 Fetching jobs for staff_id:', staff.id)
      console.log('🔍 Staff ID type:', typeof staff.id, 'Length:', staff.id.length)

      // First, let's see what jobs exist with any staff_id to debug the issue
      const { data: debugJobs, error: debugError } = await supabase
        .from('jobs')
        .select('id, staff_id, customer_name, status')
        .not('staff_id', 'is', null)
        .limit(5)

      console.log('🔍 DEBUG: Sample jobs with staff_id:', debugJobs)
      if (debugJobs && debugJobs.length > 0) {
        console.log('🔍 DEBUG: First job staff_id type:', typeof debugJobs[0].staff_id, 'Value:', debugJobs[0].staff_id, 'Length:', debugJobs[0].staff_id?.length)
        console.log('🔍 DEBUG: Staff ID match:', debugJobs[0].staff_id === staff.id)
      }

      // Get jobs assigned to this staff (with broader filtering for debugging)
      const { data: bookingsData, error: bookingsError } = await supabase
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
        .eq('staff_id', staff.id)
        // Temporarily remove status and date filtering to see all jobs
        // .in('status', ['confirmed', 'assigned', 'traveling', 'in_progress'])
        // .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(20)

      if (bookingsError) {
        console.error('❌ Jobs fetch error:', bookingsError)
        throw new Error(bookingsError.message)
      }

      console.log('📋 Raw jobs data from DB:', bookingsData)
      console.log('📊 Jobs count:', bookingsData?.length || 0)
      console.log('🏠 Current user info:', { userId: user.id, staffId: staff.id })

      if (bookingsData && bookingsData.length > 0) {
        console.log('📝 Sample job data:', bookingsData[0])
        console.log('📅 All job statuses:', bookingsData.map(j => ({ id: j.id, status: j.status, date: j.scheduled_date })))
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

      console.log('✅ Transformed bookings:', transformedBookings)
      setBookings(transformedBookings)

    } catch (err) {
      console.error('Failed to fetch bookings:', err)
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดรายการจองได้')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch bookings on mount and when user changes
  useEffect(() => {
    fetchBookings()
  }, [user])

  // Set up real-time subscription for booking changes
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('staff-jobs')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs'
      }, () => {
        // Refetch jobs when changes occur
        fetchBookings()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'staff_journeys'
      }, () => {
        // Refetch when journeys change
        fetchBookings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

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