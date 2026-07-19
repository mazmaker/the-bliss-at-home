/**
 * JobDistance (P19) — shows the straight-line distance from the staff's opted-in position to a
 * job's destination, e.g. "ห่างจากคุณ ~3.2 กม.". Renders NOTHING when there is no
 * opted-in position yet or the job has no usable coords (fail-silent, == today's behaviour).
 *
 * Drop-in replacement for the old dead `{job.distance_km && (...)}` blocks. `variant` matches
 * the three call sites' existing markup:
 *   - 'row'    → dashboard list rows (icon + text line)
 *   - 'detail' → job-detail location block (<p>)
 *   - 'inline' → schedule "นำทาง" link suffix ("(…)")
 *
 * Couple bookings: render one <JobDistance> PER job card. Each shares the same destination so
 * the values are equal from one position — that is correct; never sum them.
 */
import { Navigation } from 'lucide-react'
import type { Job } from '@bliss/supabase'
import { jobDistanceLabel, type LatLng } from '../utils/distance'
import type { StaffPositionStatus } from '../hooks/useStaffPosition'

type DistanceJob = Pick<Job, 'latitude' | 'longitude' | 'bookings'>

interface JobDistanceProps {
  job: DistanceJob
  position: LatLng | null
  variant?: 'row' | 'detail' | 'inline'
}

export function JobDistance({ job, position, variant = 'row' }: JobDistanceProps) {
  const label = jobDistanceLabel(position, job)
  if (!label) return null

  if (variant === 'detail') {
    return <p className="text-sm text-bliss-500 mt-1">ห่างจากคุณ {label}</p>
  }

  if (variant === 'inline') {
    return <span className="text-bliss-600">({label})</span>
  }

  return (
    <div className="flex items-center gap-2 text-bliss-600">
      <Navigation className="w-4 h-4" />
      <span>ห่างจากคุณ {label}</span>
    </div>
  )
}

interface DistanceOptInProps {
  status: StaffPositionStatus
  onEnable: () => void
  className?: string
}

/**
 * The opt-in affordance (one per page). Tapping it is the ONLY thing that triggers the
 * geolocation prompt — see useStaffPosition for why this must not fire on mount.
 * Hidden once granted; shows a muted hint (not an error) if denied/unsupported.
 */
export function DistanceOptIn({ status, onEnable, className = '' }: DistanceOptInProps) {
  if (status === 'granted') return null

  if (status === 'denied' || status === 'unavailable') {
    return (
      <p className={`text-xs text-bliss-400 ${className}`}>
        {status === 'denied'
          ? 'ไม่ได้อนุญาตให้เข้าถึงตำแหน่ง จึงไม่แสดงระยะทาง'
          : 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'}
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={onEnable}
      disabled={status === 'loading'}
      className={`inline-flex items-center gap-1.5 text-sm text-bliss-700 bg-bliss-50 hover:bg-bliss-100 rounded-lg px-3 py-1.5 disabled:opacity-60 ${className}`}
    >
      <Navigation className="w-4 h-4" />
      {status === 'loading' ? 'กำลังขอตำแหน่ง…' : 'แสดงระยะทางจากตำแหน่งของคุณ'}
    </button>
  )
}
