/**
 * Job Service for Staff App
 * Handles all job-related database operations
 */

import { supabase } from '../auth/supabaseClient'
import type { Job, JobStatus, JobFilter, StaffStats, JobPaymentStatus } from './types'
import { isJobMatchingStaffGender } from '../utils/providerPreference'

// Helper: batch-fetch provider_preference from bookings and attach to jobs
async function attachProviderPreference(jobs: Job[]): Promise<Job[]> {
  if (jobs.length === 0) return jobs
  const bookingIds = [...new Set(jobs.map(j => j.booking_id).filter(Boolean))]
  if (bookingIds.length === 0) return jobs

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, provider_preference')
    .in('id', bookingIds)

  const prefMap = new Map((bookings || []).map(b => [b.id, b.provider_preference]))
  return jobs.map(j => ({ ...j, provider_preference: prefMap.get(j.booking_id) || null }))
}

// Get jobs for current staff member with hotel information
export async function getStaffJobs(
  staffId: string,
  filter?: JobFilter
): Promise<Job[]> {
  let query = supabase
    .from('jobs')
    .select(`
      *,
      bookings (
        hotel_id,
        provider_preference,
        hotels (
          id,
          name_th,
          name_en,
          phone,
          address,
          latitude,
          longitude
        )
      )
    `)
    .eq('staff_id', staffId)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })

  if (filter?.status) {
    if (Array.isArray(filter.status)) {
      query = query.in('status', filter.status)
    } else {
      query = query.eq('status', filter.status)
    }
  }

  if (filter?.date) {
    query = query.eq('scheduled_date', filter.date)
  }

  if (filter?.date_from) {
    query = query.gte('scheduled_date', filter.date_from)
  }

  if (filter?.date_to) {
    query = query.lte('scheduled_date', filter.date_to)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching staff jobs:', error)
    throw error
  }

  return attachProviderPreference((data || []) as Job[])
}

// Get pending jobs available for staff to accept (from today onwards)
// Filters out jobs with hard gender requirements (female-only, male-only) that don't match staff gender
export async function getPendingJobs(staffGender?: string | null): Promise<Job[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      bookings (
        hotel_id,
        provider_preference,
        hotels (
          id,
          name_th,
          name_en,
          phone,
          address,
          latitude,
          longitude
        )
      )
    `)
    .eq('status', 'pending')
    .is('staff_id', null)
    .gte('scheduled_date', today) // Only show jobs from today onwards
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })

  if (error) {
    console.error('Error fetching pending jobs:', error)
    throw error
  }

  const jobsWithPref = await attachProviderPreference((data || []) as Job[])

  // Filter by staff gender if provided
  if (staffGender !== undefined) {
    return jobsWithPref.filter(j => isJobMatchingStaffGender(j.provider_preference, staffGender))
  }

  return jobsWithPref
}

// Get a single job by ID with hotel information
export async function getJob(jobId: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      bookings (
        hotel_id,
        provider_preference,
        hotels (
          id,
          name_th,
          name_en,
          phone,
          address,
          latitude,
          longitude
        )
      )
    `)
    .eq('id', jobId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching job:', error)
    throw error
  }

  const [enriched] = await attachProviderPreference([data as Job])
  return enriched || data as Job
}

// Accept a job
export async function acceptJob(jobId: string, staffId: string): Promise<Job> {
  // First, check current job status and booking info
  const { data: currentJob, error: checkError } = await supabase
    .from('jobs')
    .select('id, status, staff_id, booking_id, total_jobs')
    .eq('id', jobId)
    .single()

  if (checkError) {
    console.error('Error checking job status:', checkError)
    throw new Error('ไม่พบงานนี้ในระบบ')
  }

  // Check if job is still available
  if (currentJob.status !== 'pending' || currentJob.staff_id !== null) {
    if (currentJob.status === 'cancelled') {
      throw new Error('งานนี้ถูกยกเลิกแล้ว')
    }
    throw new Error('งานนี้ถูกรับไปแล้ว กรุณาเลือกงานอื่น')
  }

  // Check provider_preference vs staff gender (hard requirements only)
  if (currentJob.booking_id) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('provider_preference')
      .eq('id', currentJob.booking_id)
      .single()

    if (booking?.provider_preference === 'female-only' || booking?.provider_preference === 'male-only') {
      // staffId is profile_id, get staff gender
      const { data: staffData } = await supabase
        .from('staff')
        .select('gender')
        .eq('profile_id', staffId)
        .single()

      if (!isJobMatchingStaffGender(booking.provider_preference, staffData?.gender)) {
        const label = booking.provider_preference === 'female-only' ? 'ผู้หญิงเท่านั้น' : 'ผู้ชายเท่านั้น'
        throw new Error(`ไม่สามารถรับงานนี้ได้ ลูกค้าระบุความต้องการ "${label}"`)
      }
    }
  }

  // For couple bookings (total_jobs > 1), check if this staff already has another job from same booking
  if (currentJob.total_jobs && currentJob.total_jobs > 1 && currentJob.booking_id) {
    const { data: existingJobs, error: existingError } = await supabase
      .from('jobs')
      .select('id')
      .eq('booking_id', currentJob.booking_id)
      .eq('staff_id', staffId)
      .neq('id', jobId)

    if (!existingError && existingJobs && existingJobs.length > 0) {
      throw new Error('คุณรับงานจากการจองนี้ไปแล้ว ไม่สามารถรับงานซ้ำได้ (งาน couple ต้องใช้หมอนวด 2 คน)')
    }
  }

  // Try to accept the job
  const { data, error } = await supabase
    .from('jobs')
    .update({
      staff_id: staffId,
      status: 'confirmed',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'pending') // Only accept if still pending
    .is('staff_id', null) // Extra safety: ensure no one else took it
    .select()
    .single()

  if (error) {
    // Handle race condition - job changed between our check and update
    if (error.code === 'PGRST116') {
      // Re-fetch to determine actual reason
      const { data: refetchedJob } = await supabase
        .from('jobs')
        .select('status, staff_id')
        .eq('id', jobId)
        .single()

      if (refetchedJob?.status === 'cancelled') {
        throw new Error('งานนี้ถูกยกเลิกแล้ว')
      }
      throw new Error('งานนี้ถูกรับไปแล้ว กรุณาเลือกงานอื่น')
    }
    console.error('Error accepting job:', error)
    throw new Error('ไม่สามารถรับงานได้ กรุณาลองใหม่อีกครั้ง')
  }

  // ✅ NEW: Also update the corresponding booking status to 'confirmed'
  // When staff accepts a job, the booking should also be confirmed
  if (data && data.booking_id) {
    try {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          staff_id: staffId,
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.booking_id)

      if (bookingError) {
        console.error('Error updating booking after job acceptance:', bookingError)
        // Don't throw error - job acceptance was successful, booking update is secondary
      } else {
        console.log('✅ Booking status updated to confirmed after staff accepted job')
      }
    } catch (bookingUpdateError) {
      console.error('Exception updating booking:', bookingUpdateError)
    }
  }

  return data as Job
}

// Decline a job (just removes staff assignment)
export async function declineJob(jobId: string, staffId: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({
      staff_id: null,
      status: 'pending',
      accepted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('staff_id', staffId)

  if (error) {
    console.error('Error declining job:', error)
    throw error
  }
}

// Update job status
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  additionalData?: Partial<Job>
): Promise<Job> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
    ...additionalData,
  }

  // Set timestamps based on status
  if (status === 'in_progress') {
    updateData.started_at = new Date().toISOString()
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  } else if (status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', jobId)
    .select()
    .single()

  if (error) {
    console.error('Error updating job status:', error)
    throw error
  }

  return data as Job
}

// Cancel a job with reason
export async function cancelJob(
  jobId: string,
  staffId: string,
  reason: string,
  notes?: string
): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'STAFF',
      cancellation_reason: reason,
      staff_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('staff_id', staffId)
    .select()
    .single()

  if (error) {
    console.error('Error cancelling job:', error)
    throw error
  }

  return data as Job
}

// Get staff statistics
export async function getStaffStats(staffId: string): Promise<StaffStats> {
  const today = new Date().toISOString().split('T')[0]

  // Get today's jobs
  const { data: todayJobs, error: todayError } = await supabase
    .from('jobs')
    .select('amount, staff_earnings, status')
    .eq('staff_id', staffId)
    .eq('scheduled_date', today)

  if (todayError) {
    console.error('Error fetching today stats:', todayError)
  }

  // Get total stats
  const { data: totalJobs, error: totalError } = await supabase
    .from('jobs')
    .select('amount, staff_earnings, status')
    .eq('staff_id', staffId)
    .eq('status', 'completed')

  if (totalError) {
    console.error('Error fetching total stats:', totalError)
  }

  // Get ratings
  const { data: ratings, error: ratingError } = await supabase
    .from('job_ratings')
    .select('rating')
    .eq('staff_id', staffId)

  if (ratingError) {
    console.error('Error fetching ratings:', ratingError)
  }

  const todayJobsList = todayJobs || []
  const totalJobsList = totalJobs || []
  const ratingsList = ratings || []

  const todayCompleted = todayJobsList.filter((j: any) => j.status === 'completed')

  return {
    today_jobs_count: todayJobsList.length,
    today_earnings: todayCompleted.reduce((sum: number, j: any) => sum + (j.staff_earnings || 0), 0),
    today_completed: todayCompleted.length,
    total_jobs: totalJobsList.length,
    total_earnings: totalJobsList.reduce((sum: number, j: any) => sum + (j.staff_earnings || 0), 0),
    average_rating: ratingsList.length > 0
      ? ratingsList.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingsList.length
      : 0,
    rating_count: ratingsList.length,
  }
}

// Subscribe to real-time job updates
export function subscribeToJobs(
  staffId: string,
  onJobUpdate: (job: Job) => void,
  onNewJob?: (job: Job) => void,
  onPendingJobRemoved?: (job: Job) => void
) {
  // Subscribe to staff's assigned jobs
  const assignedChannel = supabase
    .channel(`staff-jobs-${staffId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `staff_id=eq.${staffId}`,
      },
      (payload) => {
        if (payload.new) {
          onJobUpdate(payload.new as Job)
        }
      }
    )
    .subscribe()

  // Subscribe to new pending jobs
  const pendingChannel = supabase
    .channel('pending-jobs')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'jobs',
        filter: 'status=eq.pending',
      },
      (payload) => {
        if (payload.new && onNewJob) {
          onNewJob(payload.new as Job)
        }
      }
    )
    .subscribe()

  // Subscribe to job status changes (for removing jobs from pending list)
  const jobStatusChannel = supabase
    .channel('job-status-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
      },
      (payload) => {
        const newJob = payload.new as Job
        // If job is no longer pending (accepted, cancelled, etc.), notify removal
        if (newJob && newJob.status !== 'pending' && onPendingJobRemoved) {
          onPendingJobRemoved(newJob)
        }
      }
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(assignedChannel)
    supabase.removeChannel(pendingChannel)
    supabase.removeChannel(jobStatusChannel)
  }
}

// Report SOS emergency
export async function reportSOS(
  staffId: string,
  jobId: string | null,
  location: { latitude: number; longitude: number } | null,
  message?: string
): Promise<void> {
  const { error } = await supabase.from('sos_reports').insert({
    staff_id: staffId,
    job_id: jobId,
    latitude: location?.latitude || null,
    longitude: location?.longitude || null,
    message: message || 'SOS Emergency',
    status: 'active',
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Error reporting SOS:', error)
    throw error
  }
}
