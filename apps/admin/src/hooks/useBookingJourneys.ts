import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// PART47 P17 — resolve the LIVE staff-travel journeys for a booking, for the admin booking-detail map.
//
// GPS id-space trap (verified against LIVE prod FKs + RLS on 2026-07-20):
//   `staff_journeys.booking_id` is a FK to **jobs.id** — it holds a JOB id, NOT a booking id.
// So to find the journeys for a booking we embed the job (`jobs!inner`, resolved via that FK) and
// filter on the job's REAL booking id (`jobs.booking_id`). Filtering `staff_journeys.booking_id`
// against a booking id matches 0 rows (the customer /track filter bug — do not copy it).
//
// A couple booking has one job per recipient, hence one journey per recipient — we return ALL of
// them (never `.limit(1)`), deduped to the newest journey per job so a re-tapped "เริ่มเดินทาง"
// does not surface two cards for the same person.
//
// This is a pure frontend read: an admin can SELECT every journey/job/booking under LIVE policies
// (`staff_journeys_read_all USING(true)` + `staff_journeys_admin_policy` role=ADMIN, plus
// "Admins can view all jobs/bookings"), so no RPC / RLS change / migration is required.

export interface BookingJourney {
  journeyId: string
  status: string // 'traveling' | 'arrived'
}

// Keyed by JOB id (= staff_journeys.booking_id) so the detail modal can look up the active journey
// for each job card directly.
export type JourneysByJobId = Record<string, BookingJourney>

const ACTIVE_STATUSES = ['traveling', 'arrived']
const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 นาที — realtime อาจไม่เปิด project-wide, ให้ poll เป็นหลัก (ประหยัดเครดิต)

export function useBookingJourneys(bookingId: string | undefined, enabled = true) {
  const [journeysByJobId, setJourneysByJobId] = useState<JourneysByJobId>({})
  const [isLoading, setIsLoading] = useState(false)

  const fetchJourneys = useCallback(async () => {
    if (!bookingId || !enabled) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('staff_journeys')
        // `jobs!inner` resolves via staff_journeys.booking_id -> jobs.id; we then filter on the
        // job's real booking id. NOTE: never embed staff on jobs here — jobs.staff_id -> profiles,
        // so a `staff(...)` embed 400s (PGRST200) and silently nukes the whole query to null.
        .select('id, status, started_at, booking_id, jobs!inner(id, booking_id)')
        .eq('jobs.booking_id', bookingId)
        .in('status', ACTIVE_STATUSES)
        .order('started_at', { ascending: false })

      if (error) {
        // A hard query error must NOT be treated as "no journey": log it and keep the previous map.
        console.error('[useBookingJourneys] query error:', error)
        return
      }
      // NOTE: ADMIN-ONLY hook. A logged-in ADMIN can SELECT every jobs row (policy "Admins can view
      // all jobs"), so the `jobs!inner` embed is never silently RLS-emptied for the intended actor —
      // an empty `data` genuinely means "no active journey". If this hook were reused by a non-admin
      // app (or an admin mis-provisioned with a role other than exactly 'ADMIN'), the inner join could
      // return [] with error=null and be misread as "no journey"; that is why this stays in apps/admin.

      // Dedupe newest-per-job: rows are ordered started_at DESC, so the FIRST row seen for a given
      // job id is the newest. `staff_journeys.booking_id` IS the job id.
      const byJob: JourneysByJobId = {}
      for (const row of (data || []) as any[]) {
        const jobId = row.booking_id as string // = job id (id-space trap)
        if (!jobId || byJob[jobId]) continue
        byJob[jobId] = { journeyId: row.id, status: row.status }
      }
      setJourneysByJobId(byJob)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId, enabled])

  useEffect(() => {
    if (!bookingId || !enabled) {
      setJourneysByJobId({})
      return
    }
    fetchJourneys()
    const interval = setInterval(fetchJourneys, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [bookingId, enabled, fetchJourneys])

  return { journeysByJobId, isLoading }
}
