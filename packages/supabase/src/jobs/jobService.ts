/**
 * Job Service for Staff App
 * Handles all job-related database operations
 */

import { supabase } from '../auth/supabaseClient'
import type { Job, JobStatus, JobFilter, StaffStats, JobPaymentStatus } from './types'

// Get jobs for current staff member
export async function getStaffJobs(
  staffId: string,
  filter?: JobFilter
): Promise<Job[]> {
  let query = supabase
    .from('jobs')
    .select('*')
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

  return (data || []) as Job[]
}

// Get pending jobs available for staff to accept
export async function getPendingJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'pending')
    .is('staff_id', null)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })

  if (error) {
    console.error('Error fetching pending jobs:', error)
    throw error
  }

  return (data || []) as Job[]
}

// Get a single job by ID
export async function getJob(jobId: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching job:', error)
    throw error
  }

  return data as Job
}

// Accept a job
export async function acceptJob(jobId: string, staffId: string): Promise<Job> {
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
    .select()
    .single()

  if (error) {
    console.error('Error accepting job:', error)
    throw error
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
  onNewJob?: (job: Job) => void
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

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(assignedChannel)
    supabase.removeChannel(pendingChannel)
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
