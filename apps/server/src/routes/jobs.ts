/**
 * P16 — Admin add/change staff on a job (+ QuickBooking staff-picker backend).
 *
 * jobs has NO admin UPDATE RLS policy (only "Staff can update jobs" for role=STAFF), so an admin
 * cannot write jobs.staff_id from the browser — it MUST go through this service-role server route.
 * Guarded by requireAdmin (the always-on P6 admin gate; NOT the flag-gated payment guard).
 *
 *   GET  /api/jobs/eligible-staff-preview  → pool scored for a job that does not exist yet (QuickBooking).
 *   GET  /api/jobs/:jobId/eligible-staff   → the pool scored for an existing job (detail-modal picker).
 *   POST /api/jobs/:jobId/assign-staff     → assign/reassign a chosen staff (writes jobs.staff_id).
 */

import { Router, Response } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js'
import {
  listEligibleStaffForJob,
  listEligibleStaffForBookingParams,
  isJobStatusAssignable,
  JobNotFoundError,
} from '../services/staffEligibilityCheck.js'
import { assignStaffToJob } from '../services/jobAssignService.js'

const router = Router()

/**
 * GET /api/jobs/eligible-staff-preview?date=&time=&duration=&pref=
 * Score the pool for a not-yet-created job (QuickBooking picker). The couple-same-booking guard cannot
 * apply here (no booking yet) — it is re-checked when the job is actually assigned.
 * NOTE: declared BEFORE '/:jobId/eligible-staff' so 'eligible-staff-preview' is never read as a jobId.
 */
router.get('/eligible-staff-preview', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const date = String(req.query.date || '')
    const time = String(req.query.time || '')
    const duration = req.query.duration ? Number(req.query.duration) : null
    const pref = req.query.pref ? String(req.query.pref) : null

    if (!date || !time) {
      return res.status(400).json({ success: false, error: 'date and time are required', code: 'MISSING_PARAMS' })
    }

    const supabase = getSupabaseClient()
    const { staff } = await listEligibleStaffForBookingParams(supabase, {
      scheduledDate: date,
      scheduledTime: time,
      durationMinutes: duration,
      providerPreference: pref,
    })
    return res.json({ success: true, staff })
  } catch (e: any) {
    console.error('[P16] GET eligible-staff-preview error:', e)
    return res.status(500).json({ success: false, error: 'ไม่สามารถโหลดรายชื่อพนักงานได้', details: e?.message })
  }
})

/**
 * GET /api/jobs/:jobId/eligible-staff
 * Every staff scored against an existing job (D-P16 #7 — show everyone with reasons).
 */
router.get('/:jobId/eligible-staff', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params
    const supabase = getSupabaseClient()
    const { job, staff } = await listEligibleStaffForJob(supabase, jobId)

    return res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        booking_id: job.booking_id,
        staff_id: job.staff_id,
        total_jobs: job.total_jobs,
        provider_preference: job.provider_preference,
        assignable: isJobStatusAssignable(job.status),
      },
      staff,
    })
  } catch (e: any) {
    if (e instanceof JobNotFoundError) {
      return res.status(404).json({ success: false, error: 'ไม่พบงานนี้ในระบบ', code: 'JOB_NOT_FOUND' })
    }
    console.error('[P16] GET eligible-staff error:', e)
    return res.status(500).json({ success: false, error: 'ไม่สามารถโหลดรายชื่อพนักงานได้', details: e?.message })
  }
})

/**
 * POST /api/jobs/:jobId/assign-staff  body: { staffProfileId, override? }
 * Assign (pending) or reassign (confirmed, before travel). All rules are re-checked in assignStaffToJob.
 */
router.post('/:jobId/assign-staff', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params
    const { staffProfileId, override } = (req.body || {}) as { staffProfileId?: string; override?: boolean }

    if (!staffProfileId) {
      return res.status(400).json({ success: false, error: 'staffProfileId is required', code: 'MISSING_STAFF' })
    }

    const supabase = getSupabaseClient()
    const result = await assignStaffToJob(supabase, jobId, staffProfileId, { override })

    if (!result.ok) {
      return res.status(result.status).json({ success: false, error: result.error, code: result.code, reasons: result.reasons })
    }
    return res.json({
      success: true,
      job: result.job,
      assignedTo: staffProfileId,
      reassignedFrom: result.oldStaffId,
      overridden: result.overridden,
    })
  } catch (e: any) {
    if (e instanceof JobNotFoundError) {
      return res.status(404).json({ success: false, error: 'ไม่พบงานนี้ในระบบ', code: 'JOB_NOT_FOUND' })
    }
    console.error('[P16] POST assign-staff error:', e)
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการมอบหมายพนักงาน', details: e?.message })
  }
})

export default router
