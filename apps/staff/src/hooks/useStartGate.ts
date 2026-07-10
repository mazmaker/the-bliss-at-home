import { useState, useEffect } from 'react'

// Staff "เริ่มงาน" (start work) is allowed from 15 minutes BEFORE the scheduled SERVICE TIME
// onward — a staff who arrives early may start up to 15 min ahead of the appointment, but not
// earlier than that. (Requirement 2026-07-02, PART42 item #8; early-start window added 2026-07-09.)
// Sibling of useCompleteGate.

// Staff may start this many ms before the scheduled service time.
const EARLY_START_MS = 15 * 60_000

export interface StartGate {
  canStart: boolean
  minsUntilStart: number // minutes until the start window opens (scheduled − 15 min); 0 once open
  scheduledStartMs: number | null // parsed scheduled start (epoch ms), null if unparseable
}

/**
 * Gate the staff start-work button by the job's scheduled service time.
 * - `canStart` is true once `now >= (scheduled_date+scheduled_time) − 15min` (the early-start
 *   window). Stays true afterwards (a late staff can still start).
 * - Parses `scheduled_date`+`scheduled_time` WITHOUT a `Z` suffix, so it is device-local time
 *   (= Asia/Bangkok on staff phones) — the SAME parse as jobService.buildJobWindow, keeping the
 *   gate consistent with the overlap/schedule math. `scheduled_time` may be 'HH:MM' or 'HH:MM:SS'.
 * - `minsUntilStart` counts down to the WINDOW OPENING (scheduled − 15 min), not to the appointment.
 * - FAIL-OPEN: if the scheduled date/time is missing or unparseable, returns canStart=true so a
 *   legacy/odd job is never permanently un-startable.
 * - Client-clock based; ticks every 20s so the button flips disabled→enabled live without a refetch.
 * - This is ANDed with the KYC eligibility gate at the call site (canStartWork = canWork && canStart);
 *   it does NOT replace the eligibility check. Admin force-start (booking status cascade, service-role)
 *   bypasses the client and is unaffected. Reschedule changes scheduled_date/time → the gate moves.
 */
export function useStartGate(
  job: { scheduled_date?: string | null; scheduled_time?: string | null } | null | undefined
): StartGate {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000)
    return () => clearInterval(t)
  }, [])

  const date = job?.scheduled_date
  const time = (job?.scheduled_time || '00:00:00').slice(0, 8)
  if (!date) {
    return { canStart: true, minsUntilStart: 0, scheduledStartMs: null }
  }

  const scheduledStartMs = new Date(`${date}T${time}`).getTime()
  if (Number.isNaN(scheduledStartMs)) {
    // Unparseable schedule → fail-open (don't strand the job).
    return { canStart: true, minsUntilStart: 0, scheduledStartMs: null }
  }

  // The button opens 15 minutes before the appointment.
  const startWindowOpensMs = scheduledStartMs - EARLY_START_MS
  const canStart = now >= startWindowOpensMs
  return {
    canStart,
    minsUntilStart: canStart ? 0 : Math.ceil((startWindowOpensMs - now) / 60_000),
    scheduledStartMs,
  }
}
