// Customer contact visibility for the Staff App.
//
// Requirement 2026-07-09: a staff may see a job's customer phone number ONLY while
// actively serving it — from when the staff presses "เริ่มเดินทาง" (job.status → traveling)
// through until "เสร็จสิ้นงาน" (job.status → completed). It must be HIDDEN before travel
// (pending/confirmed/assigned) and after completion (completed/cancelled).
//
// All staff surfaces read the JOB status (useStaffBookings selects from `jobs`, StaffJobDetail
// loads a job), and job_status includes 'arrived' — so the visible window is exactly these three.
// Single source of truth: import this at EVERY site that renders a customer phone.
const PHONE_VISIBLE_STATUSES = new Set(['traveling', 'arrived', 'in_progress'])

export function canStaffSeeCustomerPhone(status?: string | null): boolean {
  return !!status && PHONE_VISIBLE_STATUSES.has(status)
}

// Hotel bookings have no customers row — the guest phone lives INSIDE customer_notes as
// "Guest: <name>, Phone: <number>". The tel: gate above can't hide that, so mask the
// "Phone: <value>" fragment when outside the visible window while keeping the rest of the
// note (special requests etc.). Only the explicit "Phone:" label is masked (per the 2026-07-09
// decision) — other free-text digits are left intact.
const NOTES_PHONE_RE = /(Phone:\s*)([^,\n]+)/gi

export function maskCustomerNotesPhone(notes?: string | null, status?: string | null): string {
  if (!notes) return ''
  if (canStaffSeeCustomerPhone(status)) return notes
  return notes.replace(NOTES_PHONE_RE, '$1•••••••')
}
