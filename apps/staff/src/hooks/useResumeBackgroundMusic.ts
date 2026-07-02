import { useEffect, useRef } from 'react'
import { ensureBackgroundMusicPlaying, isBackgroundMusicPlaying, isMusicManuallyMuted } from '../utils/backgroundMusic'
import { isSoundEnabled } from '../utils/soundNotification'

/**
 * Resume the spa background music when the page mounts (or is refreshed) onto an
 * ACTIVE in-progress job — fixes "refresh กลางงาน → เพลงหยุด และกดเริ่มงานใหม่ไม่ได้"
 * (PART42 item #6). It ONLY reads jobs.status/started_at + plays audio; it NEVER calls
 * startJob/updateJobStatus, so jobs.started_at (ServiceTimer / complete-gate basis) is untouched.
 *
 * - Fires only when status==='in_progress' && started_at is set (not during traveling/arrived).
 * - Respects the sound setting and an intentional manual mute ("ปิดเพลง").
 * - Guards with a per-job ref so realtime job-object identity churn doesn't re-trigger
 *   (which would override a manual ปิดเพลง).
 * - Browser autoplay policy blocks audio without a user gesture: if the initial play is
 *   blocked, register a ONE-TIME click/touch listener that resumes on the first interaction.
 */
export function useResumeBackgroundMusic(
  job: { id?: string; status?: string | null; started_at?: string | null } | null | undefined
): void {
  const resumedForJobId = useRef<string | null>(null)

  useEffect(() => {
    if (!job?.id || job.status !== 'in_progress' || !job.started_at) return
    if (!isSoundEnabled() || isMusicManuallyMuted()) return
    if (resumedForJobId.current === job.id) return
    resumedForJobId.current = job.id

    let unlockAttached = false
    const unlock = () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
      unlockAttached = false
      if (!isMusicManuallyMuted()) void ensureBackgroundMusicPlaying()
    }

    void ensureBackgroundMusicPlaying().then(() => {
      // If autoplay was blocked (still not playing) and the staff hasn't muted, wait for a tap.
      if (!isBackgroundMusicPlaying() && !isMusicManuallyMuted()) {
        document.addEventListener('click', unlock, { once: true })
        document.addEventListener('touchstart', unlock, { once: true })
        unlockAttached = true
      }
    })

    return () => {
      if (unlockAttached) {
        document.removeEventListener('click', unlock)
        document.removeEventListener('touchstart', unlock)
      }
    }
  }, [job?.id, job?.status, job?.started_at])
}
