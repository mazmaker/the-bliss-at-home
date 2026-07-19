/**
 * Straight-line (great-circle / Haversine) distance helpers for the Staff app (PART47 P19).
 *
 * Why straight-line: it is free, instant, works offline, and answers the only question a
 * masseur needs on a job card — "how far is this job from me right now?". Road distance
 * (Google Distance Matrix) was rejected in the plan (cost/quota + client-exposed key).
 *
 * These are PURE functions — no geolocation, no network. The staff's current position is
 * supplied by the OPT-IN useStaffPosition hook (never fire-on-mount — see R1/SOS note).
 */
import type { Job } from '@bliss/supabase'

export interface LatLng {
  latitude: number
  longitude: number
}

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371 // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Format a km distance for display.
 * - `< 1 km` → metres, rounded to the nearest 50 m ("~800 ม.") — avoids false precision.
 * - otherwise → one decimal km ("~3.2 กม.").
 * - exactly 0 → "~0 ม." (NOT blank — the old truthiness guard swallowed a real 0).
 * Returns '' only for a non-finite/negative input (caller's `&&` guard then renders nothing).
 */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return ''
  if (km < 1) {
    const metres = Math.round((km * 1000) / 50) * 50
    // guard the boundary: 0.975–1.0 km rounds to 1000 m → show "~1.0 กม." not "~1000 ม."
    if (metres < 1000) return `~${Math.max(0, metres)} ม.`
  }
  return `~${km.toFixed(1)} กม.`
}

/**
 * Resolve a job's DESTINATION coordinates.
 * Customer bookings carry real picked coords on the job (job.latitude/longitude).
 * Hotel bookings land with NULL job coords → fall back to the hotel's own coords
 * (joined as job.bookings.hotels by jobService). Returns null if neither is available
 * (→ no distance is shown, rather than a bogus "NaN กม.").
 */
export function getJobDestination(
  job: Pick<Job, 'latitude' | 'longitude' | 'bookings'>
): LatLng | null {
  // Resolve per SOURCE, never per-axis: use the job's own coords only when BOTH are present,
  // else the hotel's coords only when BOTH are present. (A per-axis `??` could splice a hotel
  // latitude onto a job longitude → a coordinate that exists at neither place.)
  if (job.latitude != null && job.longitude != null) {
    return { latitude: job.latitude, longitude: job.longitude }
  }
  const hLat = job.bookings?.hotels?.latitude
  const hLng = job.bookings?.hotels?.longitude
  if (hLat != null && hLng != null) {
    return { latitude: hLat, longitude: hLng }
  }
  return null
}

/**
 * The label for a single job card: "~X.X กม." / "~800 ม." — or null when we can't/shouldn't
 * show a distance (no opted-in position yet, or the job has no usable destination coords).
 *
 * NOTE for couple/simultaneous bookings: there is ONE job PER recipient, all sharing the SAME
 * destination coords, so each card computes its OWN (equal) distance from the viewing staff's
 * position. Callers must render this PER JOB and must never sum across recipients (that would
 * double it — same class as the 240-instead-of-120 duration bug).
 */
export function jobDistanceLabel(
  position: LatLng | null,
  job: Pick<Job, 'latitude' | 'longitude' | 'bookings'>
): string | null {
  if (!position) return null
  const dest = getJobDestination(job)
  if (!dest) return null
  const label = formatDistanceKm(haversineKm(position, dest))
  return label || null
}
