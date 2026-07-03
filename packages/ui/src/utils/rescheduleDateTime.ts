/**
 * Shared date/time selectability rules for the RESCHEDULE flow.
 *
 * Consumed by BOTH the customer `RescheduleModal` and the hotel
 * `HotelRescheduleModal` so the same-day + past-time + no-op rules never drift
 * between the two apps (the drift is exactly why the same bug existed in both).
 *
 * Rules (decided 2026-07-03, PART45):
 *  - Same-day reschedule IS allowed (the old `!== currentBookingDate` block is gone).
 *  - On the booking's own date, a slot must be at least `minLeadMinutes` from now
 *    (default 180 = 3h, matching the customer new-booking flow `isTimeSlotAvailable`).
 *  - The exact current slot (same date + same start time) is a no-op → not selectable.
 *  - All date math uses LOCAL wall-clock (Asia/Bangkok on the user's device), never
 *    `toISOString()` which is UTC and shifts the date around Thai midnight.
 */

export interface RescheduleDateOptions {
  /** How many days ahead can be picked (inclusive). Default 30. */
  maxDaysAhead?: number
}

export interface RescheduleTimeOptions {
  /** Minimum minutes from now that a same-day slot must be. Default 180 (3h). */
  minLeadMinutes?: number
}

/** Local `YYYY-MM-DD` for a Date (avoids the UTC `toISOString()` off-by-one near Thai midnight). */
export function toLocalDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Whether a calendar date can be picked when rescheduling.
 * Range is `[today(local), today + maxDaysAhead]` — same-day INCLUDED.
 */
export function isRescheduleDateSelectable(date: Date, opts: RescheduleDateOptions = {}): boolean {
  const { maxDaysAhead = 30 } = opts

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const maxDate = new Date()
  maxDate.setHours(0, 0, 0, 0)
  maxDate.setDate(maxDate.getDate() + maxDaysAhead)

  const dateToCheck = new Date(date)
  dateToCheck.setHours(0, 0, 0, 0)

  return dateToCheck >= today && dateToCheck <= maxDate
}

/**
 * Whether a specific time slot on a given date can be picked.
 * Future dates: always true. Today: slot must be `>= now + minLeadMinutes`.
 *
 * @param dateStr Local `YYYY-MM-DD` (use `toLocalDateStr`) of the selected date.
 * @param time    `HH:MM` slot label.
 */
export function isRescheduleTimeAvailable(
  dateStr: string,
  time: string,
  opts: RescheduleTimeOptions = {},
): boolean {
  const { minLeadMinutes = 180 } = opts

  const now = new Date()
  // Compare against the LOCAL date, not the UTC one — around Thai midnight the two differ.
  if (dateStr !== toLocalDateStr(now)) return true

  const [hour, minute] = time.split(':').map((n) => parseInt(n, 10))
  const slot = new Date()
  slot.setHours(hour, minute, 0, 0)

  const minTime = new Date(now.getTime() + minLeadMinutes * 60 * 1000)
  return slot >= minTime
}

/**
 * Whether a candidate slot is the booking's OWN current slot (same date + same start
 * time) — a no-op reschedule that should not be selectable.
 *
 * Date is compared by leading `YYYY-MM-DD` (booking_date is a DATE column) to avoid any
 * timezone parsing; time is compared on `HH:MM` (DB times may carry `:SS`).
 */
export function isSameBookingSlot(
  selectedDateStr: string,
  time: string,
  currentDate: string,
  currentTime: string,
): boolean {
  return selectedDateStr === currentDate.slice(0, 10) && time === currentTime.slice(0, 5)
}
