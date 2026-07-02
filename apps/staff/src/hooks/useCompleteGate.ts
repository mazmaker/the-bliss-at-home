import { useState, useEffect } from 'react'

// Staff "เสร็จสิ้นงาน" (complete job) is only allowed within the last COMPLETE_WINDOW_MIN
// minutes of the service — and it STAYS allowed after the service end (overtime).
export const COMPLETE_WINDOW_MIN = 10

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
 * - Enabled once remaining <= 10 min, and stays enabled forever after the end (overtime),
 *   because `remaining <= COMPLETE_WINDOW_MIN` is still true when remaining is negative.
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
