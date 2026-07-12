/**
 * Job Service for Staff App
 * Handles all job-related database operations
 */

import { supabase } from '../auth/supabaseClient'
import type { Job, JobStatus, JobFilter, StaffStats, JobPaymentStatus } from './types'
import { isJobMatchingStaffGender } from '../utils/providerPreference'
import { canStaffStartWork } from '../staff/staffService'

// ============================================================================
// Schedule-overlap helpers (B7): a staff must NOT hold two jobs whose service
// time windows overlap. A job's window = [scheduled_date+scheduled_time,
// +COALESCE(total_duration_minutes, duration_minutes) minutes). total_duration_minutes
// is used so a customer/hotel "extend" (which bumps the existing job's total via the
// trigger_job_totals_on_extension trigger — NOT a new accept) is reflected in the
// staff's busy window. Extend never re-accepts, so it never hits this guard.
// Pure functions are exported so the staff UI can pre-disable overlapping accept buttons.
// ============================================================================
export interface JobWindowInput {
  id?: string
  scheduled_date: string
  scheduled_time: string
  duration_minutes?: number | null
  total_duration_minutes?: number | null
  status?: string | null
}

export function jobDurationMinutes(j: JobWindowInput): number {
  return j.total_duration_minutes ?? j.duration_minutes ?? 60
}

export function jobWindowMs(j: JobWindowInput): { start: number; end: number } {
  // scheduled_time may be 'HH:MM' or 'HH:MM:SS'
  const time = (j.scheduled_time || '00:00:00').slice(0, 8)
  const start = new Date(`${j.scheduled_date}T${time}`).getTime()
  return { start, end: start + jobDurationMinutes(j) * 60_000 }
}

export function jobsOverlap(a: JobWindowInput, b: JobWindowInput): boolean {
  const wa = jobWindowMs(a)
  const wb = jobWindowMs(b)
  if (Number.isNaN(wa.start) || Number.isNaN(wb.start)) return false
  // Back-to-back (a.end === b.start) does NOT overlap.
  return wa.start < wb.end && wb.start < wa.end
}

// Return the first of the staff's already-held jobs whose window overlaps `target`,
// or null if none. Held jobs that are completed/cancelled (or the target itself) are ignored.
export function findScheduleConflict(
  target: JobWindowInput,
  heldJobs: JobWindowInput[]
): JobWindowInput | null {
  for (const j of heldJobs) {
    if (target.id && j.id === target.id) continue
    if (j.status === 'completed' || j.status === 'cancelled') continue
    if (jobsOverlap(target, j)) return j
  }
  return null
}

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
      total_staff_earnings,
      total_duration_minutes,
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
      total_staff_earnings,
      total_duration_minutes,
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
      total_staff_earnings,
      total_duration_minutes,
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
    .select('id, status, staff_id, booking_id, total_jobs, scheduled_date, scheduled_time, duration_minutes, total_duration_minutes')
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

  // Eligibility gate (App-enforced): a staff must have status='active', gender, emergency
  // contact, and id_card + house_registration + bank_statement + license + criminal_record
  // ALL admin-verified before they can accept a job. staffId here is the profile_id.
  // Mirrors the staff-app UI gate and the server dispatch filter so all paths agree.
  const eligibility = await canStaffStartWork(staffId)
  if (!eligibility.canWork) {
    const detail = eligibility.reasons[0] || 'ข้อมูล/เอกสารยังไม่ครบหรือยังไม่ได้รับการอนุมัติ'
    throw new Error(`ยังรับงานไม่ได้: ${detail} (ตรวจสอบที่หน้าโปรไฟล์)`)
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

  // Time-overlap guard (B7): a staff cannot accept a job whose service time window
  // overlaps a job they already hold (any other booking, or one accepted earlier).
  // Fetches the staff's active (not completed/cancelled) jobs and checks in JS so a
  // window crossing midnight is handled. Uses total_duration_minutes so extensions count.
  {
    const { data: heldJobs, error: heldError } = await supabase
      .from('jobs')
      .select('id, scheduled_date, scheduled_time, duration_minutes, total_duration_minutes, status, service_name')
      .eq('staff_id', staffId)
      .not('status', 'in', '(completed,cancelled)')
      .neq('id', jobId)

    if (heldError) {
      console.error('Error checking schedule overlap:', heldError)
      throw new Error('ไม่สามารถตรวจสอบตารางงานได้ กรุณาลองใหม่อีกครั้ง')
    }

    const conflict = findScheduleConflict(
      {
        id: jobId,
        scheduled_date: currentJob.scheduled_date,
        scheduled_time: currentJob.scheduled_time,
        duration_minutes: currentJob.duration_minutes,
        total_duration_minutes: currentJob.total_duration_minutes,
      },
      (heldJobs || []) as JobWindowInput[]
    )

    if (conflict) {
      throw new Error('ไม่สามารถรับงานนี้ได้ เนื่องจากเวลาทับซ้อนกับงานที่คุณรับไว้แล้ว กรุณาตรวจสอบตารางงานของคุณ')
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

  // Booking sync is handled by DB trigger sync_job_status_to_booking()
  // which fires automatically when job status/staff_id changes

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

    // Safety net: calculate staff_earnings if still 0
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('staff_earnings, booking_id, duration_minutes, job_index')
        .eq('id', jobId)
        .single()

      if (job && (!job.staff_earnings || Number(job.staff_earnings) === 0) && job.booking_id) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('final_price, service_id, recipient_count, duration')
          .eq('id', job.booking_id)
          .single()

        if (booking?.service_id) {
          const { data: service } = await supabase
            .from('services')
            .select('use_fixed_rate, staff_earning_60, staff_earning_90, staff_earning_120, staff_commission_rate')
            .eq('id', booking.service_id)
            .single()

          // Honor use_fixed_rate (mirror the sync_booking_to_job trigger + server computeStaffEarning):
          // fixed-rate = flat per-session amount by THIS recipient's duration (NOT ÷ recipient_count —
          // each staff serves a full session); commission = whole-booking final_price × rate split per
          // recipient (final_price is already ×N for couples). Per-recipient duration = the job's own.
          const jobDuration = Number((job as any).duration_minutes) || Number((booking as any).duration) || 90
          const recipientCount = Number((booking as any).recipient_count) || 1
          let earnings = 0
          if ((service as any)?.use_fixed_rate) {
            const fixed = jobDuration === 60 ? (service as any).staff_earning_60
              : jobDuration === 120 ? (service as any).staff_earning_120
              : (service as any).staff_earning_90
            earnings = Math.round(Number(fixed) || 0)
          } else if (booking.final_price) {
            const commissionRate = Number((service as any)?.staff_commission_rate) || 0.30
            // P5 Stage 1: PER-RECIPIENT commission = THIS recipient's FULL (pre-discount) SERVICE
            // price × rate (mirror the sync_booking_to_job trigger). Two platform rules:
            //   (1) add-ons are NOT commissionable — booking_services.price is service-only, so
            //       add-ons are excluded automatically (never in the base).
            //   (2) the customer discount is NOT deducted from staff pay — the platform absorbs any
            //       promo/points discount; staff earn on the FULL service price (we use
            //       booking_services.price, which is pre-discount, NOT final_price).
            // recipient_index = job_index − 1.
            const recipientIndex = (Number((job as any).job_index) || 1) - 1
            const { data: svcRows } = await supabase
              .from('booking_services')
              .select('price, recipient_index')
              .eq('booking_id', job.booking_id)
            const svcI = (svcRows || [])
              .filter((r) => Number((r as any).recipient_index) === recipientIndex)
              .reduce((s, r) => s + (Number((r as any).price) || 0), 0)
            if (svcI > 0) {
              earnings = Math.round(svcI * commissionRate)
            } else {
              // Fallback (legacy booking without booking_services rows — rare; new bookings always
              // have them): booking-level service portion (final_price minus add-ons), even split.
              const { data: addonRows } = await supabase
                .from('booking_addons')
                .select('total_price')
                .eq('booking_id', job.booking_id)
              const addonTotal = (addonRows || []).reduce(
                (s, r) => s + (Number((r as any).total_price) || 0),
                0
              )
              const commissionBase = Math.max(0, Number(booking.final_price) - addonTotal)
              earnings = Math.round((commissionBase * commissionRate) / recipientCount)
            }
          }
          if (earnings > 0) {
            updateData.staff_earnings = earnings
            updateData.total_staff_earnings = earnings
          }
        }
      }
    } catch (e) {
      console.error('Failed to calculate staff_earnings on complete:', e)
    }
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
    .select('amount, staff_earnings, total_staff_earnings, status')
    .eq('staff_id', staffId)
    .eq('scheduled_date', today)

  if (todayError) {
    console.error('Error fetching today stats:', todayError)
  }

  // Get total stats
  const { data: totalJobs, error: totalError } = await supabase
    .from('jobs')
    .select('amount, staff_earnings, total_staff_earnings, status')
    .eq('staff_id', staffId)
    .eq('status', 'completed')

  if (totalError) {
    console.error('Error fetching total stats:', totalError)
  }

  // Get canonical rating from the staff table (maintained by the reviews trigger
  // update_staff_review_stats). NOTE: job_ratings is dead/empty — do NOT read it.
  // staffId here is a profiles.id (jobs.staff_id -> profiles.id), so match staff.profile_id.
  const { data: staffRow, error: ratingError } = await supabase
    .from('staff')
    .select('rating, total_reviews')
    .eq('profile_id', staffId)
    .maybeSingle()

  if (ratingError) {
    console.error('Error fetching staff rating:', ratingError)
  }

  const todayJobsList = todayJobs || []
  const totalJobsList = totalJobs || []

  const todayCompleted = todayJobsList.filter((j: any) => j.status === 'completed')

  return {
    today_jobs_count: todayJobsList.length,
    today_earnings: todayCompleted.reduce((sum: number, j: any) => sum + (j.total_staff_earnings || j.staff_earnings || 0), 0),
    today_completed: todayCompleted.length,
    total_jobs: totalJobsList.length,
    total_earnings: totalJobsList.reduce((sum: number, j: any) => sum + (j.total_staff_earnings || j.staff_earnings || 0), 0),
    average_rating: Number(staffRow?.rating) || 0,
    rating_count: staffRow?.total_reviews || 0,
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
  profileId: string,
  jobId: string | null,
  location: { latitude: number; longitude: number } | null,
  message?: string
): Promise<string | null> {
  // sos_alerts.staff_id FK references staff(id), not profiles(id)
  const { data: staffRecord } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  // .select('id').single() so the caller can POST /api/sos/notify with the new id
  const { data, error } = await supabase
    .from('sos_alerts')
    .insert({
      staff_id: staffRecord?.id || null,
      booking_id: jobId,
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
      message: message || 'SOS Emergency from Staff',
      status: 'pending',
      priority: 'high',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error reporting SOS:', error)
    throw error
  }

  return data?.id ?? null
}
