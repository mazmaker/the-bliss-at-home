/**
 * Booking-hours window — SERVER COPY.
 *
 * ⚠️ This duplicates packages/ui/src/utils/bookingHours.ts ON PURPOSE: apps/server imports no
 * `@bliss/*` package (no vite alias, no workspace dep), so the shared rule is unreachable here.
 * If the window changes, change BOTH files. They are kept byte-comparable deliberately.
 *
 * Rule (decided 2026-07-16): a customer/hotel appointment may only START between 09:00 and
 * 21:00 inclusive. 21:00 is the LAST start — a service may run past the window. Admin Quick
 * Booking is exempt (24h) and never reaches this file (it inserts client-side).
 *
 * Timezone: booking_time is an Asia/Bangkok wall-clock 'HH:MM' string, and every function here
 * compares wall-clock against wall-clock. There is deliberately NO `new Date()` here — the
 * server runs UTC on Vercel, so a `new Date(date + 'T' + time)` parse would shift the window
 * by 7 hours and turn a 21:00 cap into an effective 14:00 cap in production.
 */

/** Earliest bookable appointment start, as minutes from midnight (09:00). */
export const BOOKING_OPEN_MINUTE = 9 * 60

/** Latest bookable appointment START, as minutes from midnight (21:00). Inclusive. */
export const BOOKING_LAST_START_MINUTE = 21 * 60

/** Human-readable window, for error messages. */
export const BOOKING_HOURS_LABEL = '09:00-21:00'

/** `HH:MM` (or `HH:MM:SS`) → minutes from midnight. Returns NaN for unparseable input. */
export function timeToMinuteOfDay(time: string): number {
  const parts = String(time ?? '').split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1] ?? '0', 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN
  return h * 60 + m
}

/**
 * Is this appointment START time inside the bookable window?
 * Unparseable input returns false (fail-closed).
 */
export function isTimeWithinBookingHours(time: string): boolean {
  const min = timeToMinuteOfDay(time)
  if (!Number.isFinite(min)) return false
  return min >= BOOKING_OPEN_MINUTE && min <= BOOKING_LAST_START_MINUTE
}

/** The Thai-language rejection message used by the booking routes. */
export function bookingHoursErrorMessage(time: string): string {
  return `ไม่สามารถจองเวลา ${String(time).slice(0, 5)} น. ได้ — จองบริการได้ระหว่างเวลา ${BOOKING_HOURS_LABEL} น. เท่านั้น`
}
