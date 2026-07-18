/**
 * Shared booking-hours window — the single source of truth for WHEN a service may be
 * scheduled to START.
 *
 * Rule (decided 2026-07-16):
 *  - customer + hotel may only pick an appointment START between 09:00 and 21:00 inclusive.
 *    21:00 is the LAST start; a service may legitimately run past the window (a 120-min
 *    service booked at 21:00 ends at 23:00 and that is allowed).
 *  - admin Quick Booking is EXEMPT (24h) and deliberately does NOT import this module —
 *    see apps/admin/src/pages/QuickBooking/ServiceSelection.tsx.
 *  - The window constrains the APPOINTMENT time only, never the wall-clock moment at which
 *    the order is placed: a customer may book at 02:00 for a 10:00 slot.
 *
 * Why here: apps/{customer,hotel,admin,staff} all alias `@bliss/ui` (vite.config.ts), so this
 * is the only file the frontend needs. Before this module the window was hand-rolled in five
 * places at three different values (create 09:00-23:45 x3, reschedule 09:00-20:00 x2) — the
 * exact drift this package exists to prevent.
 *
 * NOTE — apps/server imports NO @bliss/* package (it re-implements shared logic). Its copy of
 * this rule lives in apps/server/src/utils/bookingHours.ts and MUST be changed in lockstep.
 *
 * Timezone: booking_time is an Asia/Bangkok wall-clock 'HH:MM' string. Every function here
 * compares wall-clock against wall-clock, so there is NO Date parsing and no UTC hazard.
 */

/** Earliest bookable appointment start, as minutes from midnight (09:00). */
export const BOOKING_OPEN_MINUTE = 9 * 60

/** Latest bookable appointment START, as minutes from midnight (21:00). Inclusive. */
export const BOOKING_LAST_START_MINUTE = 21 * 60

/** Human-readable window, for UI hints and error messages. */
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
 * Unparseable input returns false (fail-closed — a time we cannot read is not a time we allow).
 */
export function isTimeWithinBookingHours(time: string): boolean {
  const min = timeToMinuteOfDay(time)
  if (!Number.isFinite(min)) return false
  return min >= BOOKING_OPEN_MINUTE && min <= BOOKING_LAST_START_MINUTE
}

/** Same rule, for callers that hold hour/minute separately (the hour+minute slot pickers). */
export function isWithinBookingHours(hour: string | number, minute: string | number): boolean {
  const h = typeof hour === 'number' ? hour : parseInt(hour, 10)
  const m = typeof minute === 'number' ? minute : parseInt(minute, 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false
  const min = h * 60 + m
  return min >= BOOKING_OPEN_MINUTE && min <= BOOKING_LAST_START_MINUTE
}

/**
 * The hours a picker may offer (09..21). An hour is included when ANY minute in it is
 * bookable, so hour 21 survives here on the strength of 21:00 alone — the caller MUST also
 * filter the minutes with `isWithinBookingHours`, or it will offer 21:15/21:30/21:45.
 */
export function getBookingHourOptions(): string[] {
  const hours: string[] = []
  const firstHour = Math.floor(BOOKING_OPEN_MINUTE / 60)
  const lastHour = Math.floor(BOOKING_LAST_START_MINUTE / 60)
  for (let h = firstHour; h <= lastHour; h++) {
    hours.push(String(h).padStart(2, '0'))
  }
  return hours
}

/**
 * Build the `HH:MM` START slots a picker offers, from startHour to endHourInclusive in
 * stepMinutes steps. Centralizes slot generation so surfaces stop hand-rolling it — the exact
 * drift this module exists to prevent (see header).
 *
 *  - Customer / hotel pickers keep to the 09:00–21:00 window (pass 9, 21 and drop 21:30/21:45
 *    with `isWithinBookingHours`, or use the hour options + minute filter).
 *  - Admin surfaces (Quick Booking, admin reschedule) pass (0, 23) for the full 24h: admin is
 *    EXEMPT from the booking window (DECISION ⑧; enforce_booking_hours_window() lets ADMIN
 *    through), so the picker must NOT cap admin at 21:00.
 */
export function generateBookingTimeSlots(
  startHour: number,
  endHourInclusive: number,
  stepMinutes = 30,
): string[] {
  const slots: string[] = []
  for (let h = startHour; h <= endHourInclusive; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}
