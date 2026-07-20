/**
 * P16 job-assignment notifications (admin add/change staff on a job).
 *
 * Fired by the assign route AFTER jobs.staff_id is written. Note the DB triggers already cover two
 * audiences automatically, so we must NOT duplicate them here:
 *   - the CUSTOMER gets "มอบหมายพนักงานแล้ว" via handle_staff_assignment (bookings.staff_id change), and
 *   - the OTHER available staff get the in-app "งานถูกรับแล้ว" via notify_other_staff_on_job_accepted
 *     (jobs pending→confirmed).
 * What is NOT covered — and is P16's job — is telling (a) the newly ASSIGNED staff that a job landed
 * on their board, and (b) on a reassign, the REMOVED staff that the job was transferred away.
 *
 * This module writes the in-app notification for both. The LINE Flex push is added in a follow-up
 * (lineService.sendJobAssignedToStaff / sendJobTransferredAway) and called from here once available.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { lineService } from './lineService.js'

interface JobNotifyInfo {
  id: string
  booking_id: string | null
  service_name: string | null
  scheduled_date: string | null
  scheduled_time: string | null
}

async function loadJobNotifyInfo(
  supabase: SupabaseClient,
  jobId: string
): Promise<JobNotifyInfo | null> {
  const { data } = await supabase
    .from('jobs')
    .select('id, booking_id, service_name, scheduled_date, scheduled_time')
    .eq('id', jobId)
    .single()
  return (data as JobNotifyInfo) || null
}

function hhmm(time: string | null): string {
  return (time || '').slice(0, 5)
}

/** The staff's LINE user id (profiles.line_user_id), or null if they have none. */
async function staffLineUserId(supabase: SupabaseClient, staffProfileId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('line_user_id').eq('id', staffProfileId).single()
  return (data?.line_user_id as string) || null
}

/** In-app: tell the newly assigned staff the admin handed them this job. */
export async function notifyStaffJobAssignedByAdmin(
  supabase: SupabaseClient,
  jobId: string,
  staffProfileId: string
): Promise<void> {
  const job = await loadJobNotifyInfo(supabase, jobId)
  if (!job) return

  const { error } = await supabase.from('notifications').insert({
    user_id: staffProfileId,
    type: 'new_job',
    title: 'คุณได้รับมอบหมายงานใหม่',
    message: `แอดมินมอบหมายงาน "${job.service_name || 'บริการ'}" ให้คุณ วันที่ ${job.scheduled_date} เวลา ${hhmm(job.scheduled_time)}`,
    data: { job_id: job.id, booking_id: job.booking_id, assigned_by: 'admin' },
    is_read: false,
  })
  if (error) console.error('[P16] notifyStaffJobAssignedByAdmin insert error:', error)

  const lineId = await staffLineUserId(supabase, staffProfileId)
  if (lineId) {
    await lineService.sendJobAssignedToStaff(lineId, {
      serviceName: job.service_name || 'บริการ',
      scheduledDate: job.scheduled_date || '',
      scheduledTime: hhmm(job.scheduled_time),
      jobId: job.id,
    })
  }
}

/** In-app: tell the previously-assigned staff their job was transferred to someone else (reassign). */
export async function notifyStaffJobReassignedAway(
  supabase: SupabaseClient,
  jobId: string,
  oldStaffProfileId: string
): Promise<void> {
  const job = await loadJobNotifyInfo(supabase, jobId)
  if (!job) return

  const { error } = await supabase.from('notifications').insert({
    user_id: oldStaffProfileId,
    type: 'job_reassigned',
    title: 'งานถูกโอนให้พนักงานท่านอื่น',
    message: `งาน "${job.service_name || 'บริการ'}" วันที่ ${job.scheduled_date} เวลา ${hhmm(job.scheduled_time)} ถูกมอบหมายให้พนักงานท่านอื่นแล้ว`,
    data: { job_id: job.id, booking_id: job.booking_id },
    is_read: false,
  })
  if (error) console.error('[P16] notifyStaffJobReassignedAway insert error:', error)

  const lineId = await staffLineUserId(supabase, oldStaffProfileId)
  if (lineId) {
    await lineService.sendJobTransferredAway(lineId, {
      serviceName: job.service_name || 'บริการ',
      scheduledDate: job.scheduled_date || '',
      scheduledTime: hhmm(job.scheduled_time),
    })
  }
}
