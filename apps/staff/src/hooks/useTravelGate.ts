import { useState, useEffect } from 'react'

// Staff "เริ่มเดินทาง" (start travel / GPS tracking) is only allowed once the appointment is within
// 90 MINUTES — a staff must not start travelling too early. (Requirement 2026-07-06, PART47 P9.)
// Sibling of useStartGate ("เริ่มงาน" = at/after the scheduled time) and useCompleteGate.

const TRAVEL_WINDOW_MS = 90 * 60_000 // the button opens 90 minutes before the appointment

export interface TravelGate {
  canStartTravel: boolean
  minsUntilWindow: number // minutes until the 90-min pre-window opens; 0 once open
  scheduledStartMs: number | null // parsed scheduled start (epoch ms), null if unparseable
}

/**
 * Gate the staff "เริ่มเดินทาง" button by the job's scheduled service time.
 * - `canStartTravel` is true once `now >= scheduled_start − 90min`. Stays true afterwards through and
 *   PAST the appointment (D-P9-1: no upper bound — a late staff can still start travelling).
 * - Parses `scheduled_date`+`scheduled_time` WITHOUT a `Z` suffix, so it is device-local time
 *   (= Asia/Bangkok on staff phones) — the SAME parse as useStartGate / jobService.buildJobWindow.
 *   `scheduled_time` may be 'HH:MM' or 'HH:MM:SS'.
 * - FAIL-OPEN: if the scheduled date/time is missing or unparseable, returns canStartTravel=true so a
 *   legacy/odd job is never permanently un-startable.
 * - Client-clock based; ticks every 20s so the button flips disabled→enabled live without a refetch.
 * - ANDed with the existing gating at the call site (it does NOT replace anything). Admin force-actions
 *   (service-role cascades) bypass the client and are unaffected. Reschedule changes the date/time →
 *   the gate moves automatically.
 */
export function useTravelGate(
  job: { scheduled_date?: string | null; scheduled_time?: string | null } | null | undefined
): TravelGate {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000)
    return () => clearInterval(t)
  }, [])

  const date = job?.scheduled_date
  const time = (job?.scheduled_time || '00:00:00').slice(0, 8)
  if (!date) {
    return { canStartTravel: true, minsUntilWindow: 0, scheduledStartMs: null }
  }

  const scheduledStartMs = new Date(`${date}T${time}`).getTime()
  if (Number.isNaN(scheduledStartMs)) {
    // Unparseable schedule → fail-open (don't strand the job).
    return { canStartTravel: true, minsUntilWindow: 0, scheduledStartMs: null }
  }

  const windowOpensMs = scheduledStartMs - TRAVEL_WINDOW_MS
  const canStartTravel = now >= windowOpensMs
  return {
    canStartTravel,
    minsUntilWindow: canStartTravel ? 0 : Math.ceil((windowOpensMs - now) / 60_000),
    scheduledStartMs,
  }
}
