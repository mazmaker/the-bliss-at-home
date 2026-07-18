/**
 * Staff earnings — the §1 rule (platform owner, authoritative).
 *
 * Staff commission is computed on the FULL PRE-DISCOUNT RETAIL service price
 * (services.price_60/90/120 by the job's duration) — NEVER on the discounted /
 * actually-paid price. The platform absorbs any discount (customer promo/points
 * OR hotel contract discount); staff are paid on the retail price regardless.
 * Add-ons are excluded automatically because the retail service price is
 * service-only (add-ons live in booking_addons).
 *
 * Fixed-rate services (use_fixed_rate=true) pay a flat staff_earning_<duration>
 * per session PER STAFF — untouched by discount / add-on / recipient_count.
 *
 * This mirrors the customer paid-flip trigger sync_booking_to_job() (which reads
 * the customer path's already-pre-discount booking_services.price) and the hotel
 * client's EnhancedPriceCalculator.calculateOriginalPriceForDuration. It exists so
 * the HOTEL (secure-bookings-v2) and ADMIN (createJobsFromBooking) writers — which
 * the trigger never reaches — re-derive the commission base SERVER-SIDE instead of
 * trusting a client-supplied price that may already be post-discount.
 */

export interface EarningService {
  use_fixed_rate?: boolean | null
  staff_commission_rate?: number | string | null
  staff_earning_60?: number | string | null
  staff_earning_90?: number | string | null
  staff_earning_120?: number | string | null
  price_60?: number | string | null
  price_90?: number | string | null
  price_120?: number | string | null
  base_price?: number | string | null
  duration?: number | null
}

/**
 * Retail (pre-discount) service price for a given duration.
 * Prefers the admin-set price_60/90/120; falls back to a proportional estimate
 * from base_price (mirrors the hotel client's original-price calculation).
 */
export function retailPriceByDuration(svc: EarningService, duration: number): number {
  if (duration === 60 && svc?.price_60 != null) return Number(svc.price_60)
  if (duration === 90 && svc?.price_90 != null) return Number(svc.price_90)
  if (duration === 120 && svc?.price_120 != null) return Number(svc.price_120)

  // Fallback: proportional from base_price / the service's own default duration.
  const base = Number(svc?.base_price) || 0
  const svcDuration = Number(svc?.duration) || duration || 90
  if (base > 0 && svcDuration > 0) return Math.round((base / svcDuration) * duration)
  return base
}

/**
 * Per-job / per-recipient staff earning per §1.
 * - Fixed-rate  → flat staff_earning_<duration> (full, never divided).
 * - Commission  → retail (pre-discount) service price × staff_commission_rate.
 */
export function computeStaffEarning(svc: EarningService | null | undefined, duration: number): number {
  if (svc?.use_fixed_rate) {
    const fixed = duration === 60 ? svc.staff_earning_60
      : duration === 120 ? svc.staff_earning_120
      : svc.staff_earning_90
    return Math.round(Number(fixed) || 0)
  }
  const rate = Number(svc?.staff_commission_rate) || 0
  return Math.round(retailPriceByDuration(svc || {}, duration) * rate)
}
