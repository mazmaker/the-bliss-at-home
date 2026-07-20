/**
 * Staff Eligibility Check (P16 — admin add/change staff on a job + QuickBooking staff picker)
 *
 * The server is the SINGLE authority for "which staff may take this job". The admin picker calls
 * GET /eligible-staff (never computes eligibility itself) and the assign route re-checks here before
 * writing jobs.staff_id — so hiding a button in the UI can never be the only thing stopping an
 * ineligible assignment ("hiding the button ≠ closing the capability", T4).
 *
 * Why re-implemented here instead of imported: the server cannot import @bliss/* (packages/supabase
 * is a client-only workspace). So the accept-time rules (jobService.acceptJob A2–A6) and the dispatch
 * rules (notificationService D1–D2) are re-expressed below against the service-role client, keyed by
 * staff_profile_id instead of auth.uid(). This is a deliberate, documented copy — keep it in sync with
 * packages/supabase/src/jobs/jobService.ts + utils/providerPreference.ts + staff/staffService.ts.
 *
 * Block categories (locked by owner decision D-P16 #2, 2026-07-20):
 *   HARD  (can NEVER be overridden): time overlap · currently serving another job · hard gender
 *                                    mismatch (female-only/male-only) · already on the other half of
 *                                    this couple booking.
 *   SOFT  (admin may override with a typed confirmation): KYC / identity not complete (docs, account
 *                                    not active, gender unspecified, emergency contact) · staff has
 *                                    toggled themselves not-available.
 * The picker shows EVERYONE with reasons (D-P16 #7); a hard-blocked staff is not assignable at all,
 * a soft-blocked staff is assignable only when the assign call carries override=true.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Ported pure helpers (mirror packages/supabase — keep in sync)
// ---------------------------------------------------------------------------

export interface JobWindowInput {
  id?: string
  scheduled_date: string
  scheduled_time: string
  duration_minutes?: number | null
  total_duration_minutes?: number | null
  status?: string | null
}

function jobDurationMinutes(j: JobWindowInput): number {
  return j.total_duration_minutes ?? j.duration_minutes ?? 60
}

function jobWindowMs(j: JobWindowInput): { start: number; end: number } {
  // scheduled_time may be 'HH:MM' or 'HH:MM:SS'. Parse as Asia/Bangkok (+07:00) so the window is
  // identical to the client (jobService.jobWindowMs) and the start/complete gates. TH = fixed UTC+7.
  const time = (j.scheduled_time || '00:00:00').slice(0, 8)
  const start = new Date(`${j.scheduled_date}T${time}+07:00`).getTime()
  return { start, end: start + jobDurationMinutes(j) * 60_000 }
}

function jobsOverlap(a: JobWindowInput, b: JobWindowInput): boolean {
  const wa = jobWindowMs(a)
  const wb = jobWindowMs(b)
  if (Number.isNaN(wa.start) || Number.isNaN(wb.start)) return false
  // Back-to-back (a.end === b.start) does NOT overlap.
  return wa.start < wb.end && wb.start < wa.end
}

/** First held job whose window overlaps `target`, or null. Ignores the target itself + terminal jobs. */
function findScheduleConflict(target: JobWindowInput, heldJobs: JobWindowInput[]): JobWindowInput | null {
  for (const j of heldJobs) {
    if (target.id && j.id === target.id) continue
    if (j.status === 'completed' || j.status === 'cancelled') continue
    if (jobsOverlap(target, j)) return j
  }
  return null
}

/** Only HARD gender requirements (female-only / male-only) are enforced; soft prefer-* allow all. */
function isJobMatchingStaffGender(
  preference: string | null | undefined,
  staffGender: string | null | undefined
): boolean {
  if (!preference || preference === 'no-preference') return true
  if (preference === 'prefer-female' || preference === 'prefer-male') return true
  if (preference === 'female-only') return staffGender === 'female'
  if (preference === 'male-only') return staffGender === 'male'
  return true
}

function providerPreferenceLabel(pref: string | null | undefined): string {
  switch (pref) {
    case 'female-only': return 'ผู้หญิงเท่านั้น'
    case 'male-only': return 'ผู้ชายเท่านั้น'
    default: return 'ไม่ระบุ'
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The window in which an admin may assign/reassign — pending (assign) or confirmed (reassign, before
 *  the staff taps "เริ่มเดินทาง"). traveling/arrived/in_progress/completed/cancelled are LOCKED
 *  (D-P16 #3 / #4). Enforced on the server route, not just in the UI. */
export const JOB_ASSIGNABLE_STATUSES = ['pending', 'confirmed'] as const

export function isJobStatusAssignable(status: string | null | undefined): boolean {
  return !!status && (JOB_ASSIGNABLE_STATUSES as readonly string[]).includes(status)
}

export interface StaffEligibility {
  /** profiles.id — this is the value written to jobs.staff_id */
  profileId: string
  /** staff table id (staff.id) */
  staffId: string
  name: string
  gender: string | null
  isAvailable: boolean
  /** fully clean: no hard AND no soft blocks (green in the picker) */
  eligible: boolean
  /** may be assigned (no HARD blocks); if soft blocks exist the assign call must carry override=true */
  assignable: boolean
  /** true when assignable but soft-blocked → admin must type-confirm to override */
  requiresOverride: boolean
  /** reasons that can NEVER be overridden (time / serving / gender / couple) */
  hardBlocks: string[]
  /** reasons the admin may override with a typed confirmation (KYC / not-available) */
  softBlocks: string[]
}

export interface JobAssignContext {
  id: string
  booking_id: string | null
  scheduled_date: string
  scheduled_time: string
  duration_minutes: number | null
  total_duration_minutes: number | null
  status: string
  total_jobs: number | null
  staff_id: string | null
  provider_preference: string | null
}

const REQUIRED_DOC_TYPES: { type: string; label: string }[] = [
  { type: 'id_card', label: 'สำเนาบัตรประชาชน' },
  { type: 'house_registration', label: 'สำเนาทะเบียนบ้าน' },
  { type: 'bank_statement', label: 'สำเนาบัญชีธนาคาร' },
  { type: 'license', label: 'ใบประกอบวิชาชีพ' },
  { type: 'criminal_record', label: 'ใบตรวจสอบประวัติอาชญากรรม' },
]

// ---------------------------------------------------------------------------
// KYC (server port of canStaffStartWork — no session gate; service-role reads)
// ---------------------------------------------------------------------------

interface StaffRow {
  id: string
  profile_id: string
  name_th: string | null
  name_en: string | null
  gender: string | null
  status: string | null
  is_available: boolean | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
}

interface DocRow {
  staff_id: string
  document_type: string
  verification_status: string | null
}

/** Server KYC gate: mirrors staffService.canStaffStartWork's checks (status active + gender +
 *  5 verified docs + emergency contact), computed from already-fetched rows. Returns the SOFT reasons. */
function computeKycReasons(staff: StaffRow, docs: DocRow[]): string[] {
  const reasons: string[] = []

  if (staff.status !== 'active') {
    reasons.push('บัญชียังไม่ได้รับการอนุมัติจากแอดมิน')
  }
  if (!staff.gender) {
    reasons.push('พนักงานยังไม่ได้ระบุเพศ')
  }

  for (const req of REQUIRED_DOC_TYPES) {
    const doc = docs.find((d) => d.document_type === req.type)
    if (!doc) {
      reasons.push(`ยังไม่ได้อัปโหลด${req.label}`)
    } else if (doc.verification_status !== 'verified') {
      reasons.push(`${req.label}ยังไม่ผ่านการตรวจสอบ`)
    }
  }

  const emergencyFilled = !!(
    staff.emergency_contact_name &&
    staff.emergency_contact_phone &&
    staff.emergency_contact_relationship
  )
  if (!emergencyFilled) {
    reasons.push('ยังไม่ได้กรอกข้อมูลบุคคลอ้างอิงฉุกเฉิน')
  }

  return reasons
}

// ---------------------------------------------------------------------------
// Core per-staff computation (pure once data is loaded)
// ---------------------------------------------------------------------------

function computeStaffEligibility(
  job: JobAssignContext,
  staff: StaffRow,
  docs: DocRow[],
  heldJobs: JobWindowInput[],
  isServing: boolean
): StaffEligibility {
  const hardBlocks: string[] = []
  const softBlocks: string[] = []

  // HARD 1 — gender vs a hard (female-only/male-only) requirement
  if (!isJobMatchingStaffGender(job.provider_preference, staff.gender)) {
    hardBlocks.push(`เพศไม่ตรงกับที่ลูกค้าระบุ (${providerPreferenceLabel(job.provider_preference)})`)
  }

  // HARD 2 — currently serving another job (traveling/arrived/in_progress). D-P13 / D-P16 #2.
  if (isServing) {
    hardBlocks.push('กำลังติดงานอื่นอยู่ (เดินทาง/ให้บริการ)')
  }

  // HARD 3 — schedule overlap with a job the staff already holds
  const conflict = findScheduleConflict(
    {
      id: job.id,
      scheduled_date: job.scheduled_date,
      scheduled_time: job.scheduled_time,
      duration_minutes: job.duration_minutes,
      total_duration_minutes: job.total_duration_minutes,
    },
    heldJobs
  )
  if (conflict) {
    const t = (conflict.scheduled_time || '').slice(0, 5)
    hardBlocks.push(`เวลาทับซ้อนกับงานอื่น (${conflict.scheduled_date} ${t})`)
  }

  // HARD 4 — couple: a staff cannot hold both halves of the same couple booking (also caught by the
  // overlap check since the two jobs are simultaneous, but this gives a clearer reason). A5.
  if ((job.total_jobs ?? 1) > 1 && job.booking_id) {
    const onOtherHalf = heldJobs.some(
      (j: any) => j.booking_id === job.booking_id && j.id !== job.id
    )
    if (onOtherHalf) {
      hardBlocks.push('รับงานคู่นี้ไปแล้วอีกฝั่งหนึ่ง')
    }
  }

  // SOFT — KYC / identity not complete (owner allows override with a typed confirm, D-P16 #2)
  softBlocks.push(...computeKycReasons(staff, docs))

  // SOFT — staff toggled themselves not-available (informational; admin may override)
  if (staff.is_available !== true) {
    softBlocks.push('พนักงานปิดรับงานอยู่ (ไม่พร้อมรับงาน)')
  }

  const assignable = hardBlocks.length === 0
  const requiresOverride = assignable && softBlocks.length > 0

  return {
    profileId: staff.profile_id,
    staffId: staff.id,
    name: staff.name_th || staff.name_en || 'พนักงาน',
    gender: staff.gender,
    isAvailable: staff.is_available === true,
    eligible: hardBlocks.length === 0 && softBlocks.length === 0,
    assignable,
    requiresOverride,
    hardBlocks,
    softBlocks,
  }
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

/** Load the job + its booking's provider_preference. Throws a typed error if the job is missing. */
export async function loadJobAssignContext(
  supabase: SupabaseClient,
  jobId: string
): Promise<JobAssignContext> {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, booking_id, scheduled_date, scheduled_time, duration_minutes, total_duration_minutes, status, total_jobs, staff_id')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    throw new JobNotFoundError(jobId)
  }

  let providerPreference: string | null = null
  if (job.booking_id) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('provider_preference')
      .eq('id', job.booking_id)
      .single()
    providerPreference = booking?.provider_preference ?? null
  }

  return { ...(job as any), provider_preference: providerPreference }
}

export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`)
    this.name = 'JobNotFoundError'
  }
}

async function fetchHeldJobsByProfile(
  supabase: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, any[]>> {
  const map = new Map<string, any[]>()
  if (profileIds.length === 0) return map

  const { data, error } = await supabase
    .from('jobs')
    .select('id, staff_id, booking_id, scheduled_date, scheduled_time, duration_minutes, total_duration_minutes, status')
    .in('staff_id', profileIds)
    .not('status', 'in', '(completed,cancelled)')

  if (error) {
    console.error('[P16 eligibility] held-jobs query error (treating as no held jobs):', error)
    return map
  }

  for (const j of data || []) {
    const list = map.get(j.staff_id) || []
    list.push(j)
    map.set(j.staff_id, list)
  }
  return map
}

async function fetchDocsByStaff(
  supabase: SupabaseClient,
  staffIds: string[]
): Promise<Map<string, DocRow[]>> {
  const map = new Map<string, DocRow[]>()
  if (staffIds.length === 0) return map

  const { data, error } = await supabase
    .from('staff_documents')
    .select('staff_id, document_type, verification_status')
    .in('staff_id', staffIds)

  if (error) {
    console.error('[P16 eligibility] staff_documents query error (treating as no docs):', error)
    return map
  }

  for (const d of (data || []) as DocRow[]) {
    const list = map.get(d.staff_id) || []
    list.push(d)
    map.set(d.staff_id, list)
  }
  return map
}

const STAFF_SELECT =
  'id, profile_id, name_th, name_en, gender, status, is_available, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship'

/** Staff (by profile_id) currently serving a job (traveling/arrived/in_progress) — the D-P13 serving
 *  set, also the D-P16 #2 HARD "กำลังติดงานอยู่" block. Inlined here (not imported from
 *  notificationService) to keep this module free of a notificationService dependency — that module
 *  imports the assign path, and importing it back would be a cycle. Fail-open (empty set) on error. */
async function getServingStaffProfileIds(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('jobs')
    .select('staff_id')
    .not('staff_id', 'is', null)
    .in('status', ['traveling', 'arrived', 'in_progress'])
  if (error) {
    console.error('[P16 eligibility] serving-set query error (fail-open):', error)
    return new Set<string>()
  }
  return new Set((data || []).map((j) => j.staff_id).filter(Boolean) as string[])
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The whole staff pool scored for one job, for the admin picker (D-P16 #7 — show everyone + reasons). */
export async function listEligibleStaffForJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<{ job: JobAssignContext; staff: StaffEligibility[] }> {
  const job = await loadJobAssignContext(supabase, jobId)

  const { data: staffRows, error: staffErr } = await supabase
    .from('staff')
    .select(STAFF_SELECT)
    .not('profile_id', 'is', null)

  if (staffErr) {
    throw new Error(`Failed to load staff pool: ${staffErr.message}`)
  }
  const pool = (staffRows || []) as StaffRow[]

  const [heldByProfile, docsByStaff, servingSet] = await Promise.all([
    fetchHeldJobsByProfile(supabase, pool.map((s) => s.profile_id)),
    fetchDocsByStaff(supabase, pool.map((s) => s.id)),
    getServingStaffProfileIds(supabase),
  ])

  const staff = pool.map((s) =>
    computeStaffEligibility(
      job,
      s,
      docsByStaff.get(s.id) || [],
      heldByProfile.get(s.profile_id) || [],
      servingSet.has(s.profile_id)
    )
  )

  // Assignable-clean first, then assignable-with-override, then hard-blocked; name as a tiebreak.
  staff.sort((a, b) => {
    const rank = (x: StaffEligibility) => (x.eligible ? 0 : x.assignable ? 1 : 2)
    return rank(a) - rank(b) || a.name.localeCompare(b.name, 'th')
  })

  return { job, staff }
}

/** Re-check ONE staff for a job (used by the assign route before it writes jobs.staff_id). */
export async function checkStaffEligibleForJob(
  supabase: SupabaseClient,
  jobId: string,
  staffProfileId: string
): Promise<{ job: JobAssignContext; result: StaffEligibility | null }> {
  const job = await loadJobAssignContext(supabase, jobId)

  const { data: staffRow, error: staffErr } = await supabase
    .from('staff')
    .select(STAFF_SELECT)
    .eq('profile_id', staffProfileId)
    .single()

  if (staffErr || !staffRow) {
    return { job, result: null }
  }
  const staff = staffRow as StaffRow

  const [heldByProfile, docsByStaff, servingSet] = await Promise.all([
    fetchHeldJobsByProfile(supabase, [staff.profile_id]),
    fetchDocsByStaff(supabase, [staff.id]),
    getServingStaffProfileIds(supabase),
  ])

  const result = computeStaffEligibility(
    job,
    staff,
    docsByStaff.get(staff.id) || [],
    heldByProfile.get(staff.profile_id) || [],
    servingSet.has(staff.profile_id)
  )

  return { job, result }
}

export interface BookingParamsForEligibility {
  scheduledDate: string
  scheduledTime: string
  durationMinutes: number | null
  providerPreference: string | null
}

/** Score the staff pool for a job that does NOT exist yet — the QuickBooking picker preview, before the
 *  booking's jobs are created. Same rules as listEligibleStaffForJob minus the couple-same-booking guard
 *  (no booking id yet); that couple case is re-checked server-side at the actual assign. */
export async function listEligibleStaffForBookingParams(
  supabase: SupabaseClient,
  params: BookingParamsForEligibility
): Promise<{ staff: StaffEligibility[] }> {
  const syntheticJob: JobAssignContext = {
    id: '', // no job yet → findScheduleConflict skips nothing, which is correct
    booking_id: null, // → couple-same-booking guard skipped in the preview
    scheduled_date: params.scheduledDate,
    scheduled_time: params.scheduledTime,
    duration_minutes: params.durationMinutes,
    total_duration_minutes: params.durationMinutes,
    status: 'pending',
    total_jobs: 1,
    staff_id: null,
    provider_preference: params.providerPreference,
  }

  const { data: staffRows, error } = await supabase.from('staff').select(STAFF_SELECT).not('profile_id', 'is', null)
  if (error) throw new Error(`Failed to load staff pool: ${error.message}`)
  const pool = (staffRows || []) as StaffRow[]

  const [heldByProfile, docsByStaff, servingSet] = await Promise.all([
    fetchHeldJobsByProfile(supabase, pool.map((s) => s.profile_id)),
    fetchDocsByStaff(supabase, pool.map((s) => s.id)),
    getServingStaffProfileIds(supabase),
  ])

  const staff = pool.map((s) =>
    computeStaffEligibility(
      syntheticJob,
      s,
      docsByStaff.get(s.id) || [],
      heldByProfile.get(s.profile_id) || [],
      servingSet.has(s.profile_id)
    )
  )
  staff.sort((a, b) => {
    const rank = (x: StaffEligibility) => (x.eligible ? 0 : x.assignable ? 1 : 2)
    return rank(a) - rank(b) || a.name.localeCompare(b.name, 'th')
  })
  return { staff }
}
