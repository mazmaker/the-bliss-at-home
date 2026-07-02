import { useState, useEffect } from 'react'

// Staff "เริ่มงาน" (start work) is only allowed once the scheduled SERVICE TIME has arrived —
// a staff who arrives early must NOT be able to start before the appointment time.
// (Requirement 2026-07-02, PART42 item #8.) Sibling of useCompleteGate.

export interface StartGate {
  canStart: boolean
  minsUntilStart: number // minutes until the scheduled start; 0 once reached
  scheduledStartMs: number | null // parsed scheduled start (epoch ms), null if unparseable
}

/**
 * Gate the staff start-work button by the job's scheduled service time.
 * - `canStart` is true once `now >= scheduled_date+scheduled_time`. Stays true afterwards
 *   (a late staff can still start).
 * - Parses `scheduled_date`+`scheduled_time` WITHOUT a `Z` suffix, so it is device-local time
 *   (= Asia/Bangkok on staff phones) — the SAME parse as jobService.buildJobWindow, keeping the
 *   gate consistent with the overlap/schedule math. `scheduled_time` may be 'HH:MM' or 'HH:MM:SS'.
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

  const canStart = now >= scheduledStartMs
  return {
    canStart,
    minsUntilStart: canStart ? 0 : Math.ceil((scheduledStartMs - now) / 60_000),
    scheduledStartMs,
  }
}
