/**
 * P16 — the single authority for writing a chosen staff onto a job.
 *
 * Used by BOTH the admin assign route (routes/jobs.ts, existing bookings) AND the QuickBooking preassign
 * path (notificationService.processBookingConfirmed). Re-checks eligibility + the assign window server-side
 * every time, optimistic-locks the jobs UPDATE, and fires the P16 staff notifications. Never writes
 * bookings.staff_id — the sync_job_status_to_booking trigger cascades that.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { checkStaffEligibleForJob, isJobStatusAssignable } from './staffEligibilityCheck.js'
import { notifyStaffJobAssignedByAdmin, notifyStaffJobReassignedAway } from './jobAssignmentNotifications.js'

export type AssignResult =
  | { ok: true; job: any; oldStaffId: string | null; overridden: boolean }
  | { ok: false; status: number; code: string; error: string; reasons?: string[] }

export async function assignStaffToJob(
  supabase: SupabaseClient,
  jobId: string,
  staffProfileId: string,
  opts: { override?: boolean; notify?: boolean } = {}
): Promise<AssignResult> {
  const { job, result } = await checkStaffEligibleForJob(supabase, jobId, staffProfileId)

  // WINDOW gate (D-P16 #3/#4): only pending/confirmed jobs may be (re)assigned.
  if (!isJobStatusAssignable(job.status)) {
    return { ok: false, status: 409, code: 'JOB_LOCKED', error: 'งานนี้เริ่มดำเนินการ/เสร็จสิ้นแล้ว ไม่สามารถเปลี่ยนพนักงานได้' }
  }
  if (!result) {
    return { ok: false, status: 404, code: 'STAFF_NOT_FOUND', error: 'ไม่พบพนักงานที่เลือก' }
  }
  if (job.staff_id && job.staff_id === staffProfileId) {
    return { ok: false, status: 400, code: 'ALREADY_ASSIGNED', error: 'พนักงานคนนี้รับงานนี้อยู่แล้ว' }
  }
  // HARD blocks — never overridable (time / serving / gender / couple). D-P16 #2.
  if (result.hardBlocks.length > 0) {
    return {
      ok: false,
      status: 400,
      code: 'HARD_BLOCK',
      error: `ไม่สามารถมอบหมายพนักงานคนนี้ได้: ${result.hardBlocks.join(' · ')}`,
      reasons: result.hardBlocks,
    }
  }
  // SOFT blocks (KYC / not-available) — allowed only with an explicit override. D-P16 #2.
  if (result.requiresOverride && opts.override !== true) {
    return {
      ok: false,
      status: 400,
      code: 'OVERRIDE_REQUIRED',
      error: 'พนักงานคนนี้ติดเงื่อนไขที่ต้องยืนยันก่อนมอบหมาย',
      reasons: result.softBlocks,
    }
  }

  const oldStaffId = job.staff_id // null = fresh assign; a profile_id = reassign
  const now = new Date().toISOString()

  // Optimistic lock on the (status, staff_id) we validated.
  let update = supabase
    .from('jobs')
    .update({ staff_id: staffProfileId, status: 'confirmed', accepted_at: now, updated_at: now })
    .eq('id', jobId)
    .eq('status', job.status)
  update = oldStaffId === null ? update.is('staff_id', null) : update.eq('staff_id', oldStaffId)

  const { data: updated, error: updateError } = await update.select().single()

  if (updateError || !updated) {
    if (updateError?.code === 'PGRST116') {
      return { ok: false, status: 409, code: 'CONCURRENT_CHANGE', error: 'งานนี้เพิ่งถูกเปลี่ยนสถานะ/รับไปแล้ว กรุณารีเฟรชแล้วลองใหม่' }
    }
    console.error('[P16] assignStaffToJob update error:', updateError)
    return { ok: false, status: 500, code: 'UPDATE_FAILED', error: 'ไม่สามารถมอบหมายพนักงานได้' }
  }

  // The DB triggers notify the customer + the other staff. P16 adds: the newly assigned staff, and on a
  // reassign the removed staff. Non-blocking (default on; QuickBooking can also opt in).
  if (opts.notify !== false) {
    try {
      await notifyStaffJobAssignedByAdmin(supabase, jobId, staffProfileId)
      if (oldStaffId && oldStaffId !== staffProfileId) {
        await notifyStaffJobReassignedAway(supabase, jobId, oldStaffId)
      }
    } catch (e) {
      console.error('[P16] assignStaffToJob notification error (assignment still succeeded):', e)
    }
  }

  return { ok: true, job: updated, oldStaffId, overridden: result.requiresOverride === true }
}
