import { useState, useEffect } from 'react'

// Staff "เสร็จสิ้นงาน" (complete job) is allowed ONLY once the booked service duration has
// FULLY elapsed — and it STAYS allowed after that (overtime).
//
// Was 10 until 2026-07-16: the button used to unlock in the last 10 minutes of the service, so
// a 120-min service could be closed at minute 110. Requirement (user, 2026-07-16): "กดปุ่ม
// เสร็จสิ้นงาน หลังจากครบเวลาการให้บริการแล้วเท่านั้น ต้องไม่สามารถกดปุ่มดังกล่าวก่อนครบเวลาให้บริการได้."
// Keep the constant rather than deleting it: it names the rule and keeps the early-unlock
// window a single, greppable knob if the business ever wants a grace period back.
export const COMPLETE_WINDOW_MIN = 0

export interface CompleteGate {
  canComplete: boolean
  inProgress: boolean
  hasStarted: boolean
  minsUntilEligible: number // minutes until the button unlocks; 0 once eligible
}

/**
 * Gate the staff complete-job button.
 * - Only completable when the job is `in_progress` AND has a `started_at` (service actually
 *   began). The guard runs BEFORE any date math on purpose: a null started_at would parse to
 *   epoch 1970 → look like huge overtime → wrongly enable the button during traveling/arrived.
 * - Enabled only once the full duration has elapsed (remaining <= 0), and stays enabled
 *   forever after the end (overtime), because `remaining <= 0` stays true when negative.
 * - Extension-aware: pass `total_duration_minutes || duration_minutes` (Dashboard) or the
 *   bookingServices-sum incl. extensions (JobDetail) as `totalDurationMinutes`.
 * - Client-clock based (same basis as ServiceTimer); ticks every 20s so the button flips
 *   disabled→enabled live without a refetch.
 */
export function useCompleteGate(
  job: { status?: string | null; started_at?: string | null } | null | undefined,
  totalDurationMinutes: number | null | undefined
): CompleteGate {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000)
    return () => clearInterval(t)
  }, [])

  const inProgress = job?.status === 'in_progress'
  const hasStarted = !!job?.started_at

  if (!inProgress || !hasStarted) {
    return { canComplete: false, inProgress, hasStarted, minsUntilEligible: 0 }
  }

  const totalDur = Number(totalDurationMinutes) || 0
  if (totalDur <= 0) {
    // Duration unknown → fail-open so a valid in-progress job is never permanently trapped.
    return { canComplete: true, inProgress, hasStarted, minsUntilEligible: 0 }
  }

  const elapsedMin = (now - new Date(job!.started_at as string).getTime()) / 60_000
  const remainingMin = totalDur - elapsedMin
  const canComplete = remainingMin <= COMPLETE_WINDOW_MIN // includes overtime (remaining <= 0)

  return {
    canComplete,
    inProgress,
    hasStarted,
    minsUntilEligible: canComplete ? 0 : Math.ceil(remainingMin - COMPLETE_WINDOW_MIN),
  }
}
