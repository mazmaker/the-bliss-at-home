/**
 * useStaffPosition — OPT-IN one-shot geolocation for the P19 distance feature.
 *
 * 🔴 R1 / SOS safety: geolocation permission is per-ORIGIN, not per-call. If we prompted on
 * mount and the staff tapped "Block", that Block would also deny the emergency SOS button, the
 * travel flow, and the 100 m arrival gate (all on the same staff origin). So this hook NEVER
 * calls geolocation on mount — it fires ONLY from requestPosition(), i.e. an explicit user tap
 * on the "แสดงระยะทาง" affordance. It is also fully fail-silent: a denial/timeout never throws
 * and never surfaces an error toast — the distance simply doesn't render (identical to today).
 *
 * The granted position is cached in sessionStorage so a single opt-in reveals distances across
 * the dashboard / schedule / job-detail pages for the rest of the session (each page reads the
 * cache on mount), without re-prompting.
 */
import { useCallback, useState } from 'react'
import type { LatLng } from '../utils/distance'

export type StaffPositionStatus =
  | 'idle' // not asked yet
  | 'loading' // prompt shown / resolving
  | 'granted' // have a position
  | 'denied' // user blocked location
  | 'unavailable' // no geolocation support / other error

interface CachedPosition extends LatLng {
  timestamp: number
}

const CACHE_KEY = 'bliss_staff_distance_pos_v1'
// A cached position older than this is treated as STALE and ignored, so the opt-in button
// reappears and the staff can refresh — otherwise "ห่างจากคุณ …" would show the distance from
// wherever they first tapped, for the whole session, even after they've driven away.
const MAX_AGE_MS = 10 * 60 * 1000

function readCache(): CachedPosition | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      typeof parsed.timestamp === 'number' &&
      Date.now() - parsed.timestamp < MAX_AGE_MS
    ) {
      return parsed as CachedPosition
    }
  } catch {
    /* ignore corrupt cache */
  }
  return null
}

export function useStaffPosition() {
  const [position, setPosition] = useState<CachedPosition | null>(() => readCache())
  const [status, setStatus] = useState<StaffPositionStatus>(() =>
    readCache() ? 'granted' : 'idle'
  )

  const requestPosition = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unavailable')
      return
    }
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: CachedPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: Date.now(),
        }
        setPosition(next)
        setStatus('granted')
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(next))
        } catch {
          /* sessionStorage may be unavailable — position still works in-memory */
        }
      },
      (err) => {
        // Fail-silent: never throw. Reflect status only so the affordance can hide/hint.
        setStatus(err && err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 10000 }
    )
  }, [])

  return { position, status, requestPosition }
}
