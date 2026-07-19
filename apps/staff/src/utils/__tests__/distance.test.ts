import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  formatDistanceKm,
  getJobDestination,
  jobDistanceLabel,
  type LatLng,
} from '../distance'

// Independent reference implementation (spherical law of cosines) — mathematically distinct
// from the Haversine under test, so agreement cross-checks the formula (TC1).
function lawOfCosinesKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const φ1 = toRad(a.latitude)
  const φ2 = toRad(b.latitude)
  const Δλ = toRad(b.longitude - a.longitude)
  return (
    Math.acos(
      Math.min(1, Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ))
    ) * R
  )
}

describe('distance util (P19)', () => {
  // ── TC1: Haversine accuracy ───────────────────────────────────────────────
  describe('haversineKm', () => {
    it('1° of latitude ≈ 111.19 km (known reference)', () => {
      expect(haversineKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(111.19, 1)
    })

    it('matches an independent formula within ±0.2 km on a real Bangkok pair', () => {
      const staff: LatLng = { latitude: 13.7455, longitude: 100.534 } // Siam
      const job: LatLng = { latitude: 13.8, longitude: 100.55 } // ~6 km north
      const mine = haversineKm(staff, job)
      const ref = lawOfCosinesKm(staff, job)
      expect(Math.abs(mine - ref)).toBeLessThan(0.2)
      expect(mine).toBeGreaterThan(0) // sanity: a real, non-zero distance
    })

    it('is symmetric', () => {
      const a: LatLng = { latitude: 13.7, longitude: 100.5 }
      const b: LatLng = { latitude: 13.9, longitude: 100.7 }
      expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6)
    })
  })

  // ── TC6: format edges (zero renders, invalid → empty) ─────────────────────
  describe('formatDistanceKm', () => {
    it('exactly 0 → "~0 ม." (NOT blank — the old truthiness guard swallowed a real 0)', () => {
      expect(formatDistanceKm(0)).toBe('~0 ม.')
    })

    it('sub-kilometre → metres rounded to 50 m', () => {
      expect(formatDistanceKm(0.8)).toBe('~800 ม.')
      expect(formatDistanceKm(0.82)).toBe('~800 ม.')
      expect(formatDistanceKm(0.24)).toBe('~250 ม.')
    })

    it('≥ 1 km → one decimal km', () => {
      expect(formatDistanceKm(3.24)).toBe('~3.2 กม.')
      expect(formatDistanceKm(1)).toBe('~1.0 กม.')
    })

    it('0.975–1.0 km boundary → "~1.0 กม." (not "~1000 ม.")', () => {
      expect(formatDistanceKm(0.999)).toBe('~1.0 กม.')
      expect(formatDistanceKm(0.98)).toBe('~1.0 กม.')
      expect(formatDistanceKm(0.97)).toBe('~950 ม.') // just below the boundary → still metres
    })

    it('non-finite / negative → "" (so the caller renders nothing, never "NaN กม.")', () => {
      expect(formatDistanceKm(NaN)).toBe('')
      expect(formatDistanceKm(-1)).toBe('')
    })
  })

  // ── TC2: destination resolution + hotel fallback ──────────────────────────
  describe('getJobDestination', () => {
    it('uses the job’s own coords when present (customer booking)', () => {
      expect(
        getJobDestination({ latitude: 13.75, longitude: 100.5, bookings: undefined })
      ).toEqual({ latitude: 13.75, longitude: 100.5 })
    })

    it('falls back to the hotel coords when job coords are null (hotel booking)', () => {
      expect(
        getJobDestination({
          latitude: null,
          longitude: null,
          bookings: { hotel_id: 'h1', provider_preference: null, hotels: { id: 'h1', name_th: 'H', latitude: 13.8, longitude: 100.6 } },
        })
      ).toEqual({ latitude: 13.8, longitude: 100.6 })
    })

    it('returns null when neither job nor hotel has coords (→ no distance shown, not NaN)', () => {
      expect(getJobDestination({ latitude: null, longitude: null, bookings: undefined })).toBeNull()
      expect(
        getJobDestination({ latitude: null, longitude: null, bookings: { hotel_id: 'h', provider_preference: null } })
      ).toBeNull()
    })

    it('mismatched job coords (one axis null) → does NOT splice; uses the hotel’s BOTH coords', () => {
      // job has only latitude; must NOT combine job.latitude with hotel.longitude
      expect(
        getJobDestination({
          latitude: 13.9,
          longitude: null,
          bookings: { hotel_id: 'h', provider_preference: null, hotels: { id: 'h', name_th: 'H', latitude: 13.8, longitude: 100.6 } },
        })
      ).toEqual({ latitude: 13.8, longitude: 100.6 }) // hotel's pair, NOT a spliced {13.9, 100.6}
    })

    it('mismatched job coords with no hotel coords → null (never a half coordinate)', () => {
      expect(getJobDestination({ latitude: 13.9, longitude: null, bookings: undefined })).toBeNull()
    })
  })

  // ── jobDistanceLabel: end-to-end label + TC5 (couple) + TC6 (null/zero) ────
  describe('jobDistanceLabel', () => {
    const staff: LatLng = { latitude: 13.7455, longitude: 100.534 }
    const dest = { latitude: 13.8, longitude: 100.55, bookings: undefined }

    it('returns a real km label from an opted-in position', () => {
      const label = jobDistanceLabel(staff, dest)
      expect(label).toMatch(/^~[\d.]+ (กม\.|ม\.)$/)
    })

    it('returns null when there is no opted-in position (nothing rendered)', () => {
      expect(jobDistanceLabel(null, dest)).toBeNull()
    })

    it('returns null when the job has no usable coords', () => {
      expect(jobDistanceLabel(staff, { latitude: null, longitude: null, bookings: undefined })).toBeNull()
    })

    // TC6: staff standing exactly on the job → "~0 ม." (renders), not blank
    it('position === destination → "~0 ม." (renders, not blank)', () => {
      expect(jobDistanceLabel({ latitude: 13.8, longitude: 100.55 }, dest)).toBe('~0 ม.')
    })

    // TC5: a couple booking = TWO jobs sharing the SAME address → equal per-job label,
    // computed independently from ONE staff position. They must be EQUAL and each equal to the
    // single-job distance through the SAME label pipeline — so a doubled end-to-end label fails.
    it('couple: two jobs at the same address show the SAME single-job distance (never doubled)', () => {
      const recipientA = { latitude: 13.8, longitude: 100.55, bookings: undefined }
      const recipientB = { latitude: 13.8, longitude: 100.55, bookings: undefined }
      const labelA = jobDistanceLabel(staff, recipientA)
      const labelB = jobDistanceLabel(staff, recipientB)
      expect(labelA).toBe(labelB)
      // The label pipeline must equal the un-doubled single-job distance — if any caller summed
      // the two recipients, the end-to-end label would be ~2× and this would fail.
      const single = haversineKm(staff, { latitude: 13.8, longitude: 100.55 })
      expect(labelA).toBe(formatDistanceKm(single))
      expect(labelA).not.toBeNull()
      expect(single).toBeGreaterThan(5) // ~6.3 km one-way; a doubled ~12.6 km would format differently
    })
  })
})
