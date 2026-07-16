/**
 * Time Slot Utilities for Hotel Booking System
 * Simple two-step selection: Hour → Minute
 */
import { getBookingHourOptions, isWithinBookingHours } from '@bliss/ui'

/**
 * Get available hours (09-21) — the bookable window, from the shared rule.
 * Hour 21 is offered on the strength of 21:00 alone; `isTimeSlotAvailable` drops 21:15+.
 */
export function getAvailableHours(): string[] {
  return getBookingHourOptions()
}

/**
 * Get 15-minute intervals
 */
export function getMinuteIntervals(): string[] {
  return ['00', '15', '30', '45']
}

/**
 * Check if specific time slot is available based on 3-hour advance rule
 */
export function isTimeSlotAvailable(date: string, hour: string, minute: string): boolean {
  // Bookable-hours window (09:00-21:00 start). This MUST be checked before the same-day
  // early-return below: the window applies to EVERY date, whereas the 3-hour rule only
  // applies to today. Putting it after would make it dead code for every future date.
  if (!isWithinBookingHours(hour, minute)) return false

  const now = new Date()
  // Use the LOCAL date, not toISOString() (which is UTC). During Thai early-morning hours
  // the UTC date is still the previous day, so a UTC todayStr would wrongly treat "today"
  // as "not today" and skip the 3-hour advance rule. Matches the customer app.
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // If not today, all slots are available
  if (date !== todayStr) return true

  // For today, check 3-hour advance rule.
  // Anchor the slot to Asia/Bangkok (+07:00): slot labels are Bangkok wall-clock, so a device-local
  // setHours mis-gates the rule on a non-Bangkok device. minTime is an absolute instant. TH = fixed UTC+7.
  const slotTime = new Date(`${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00+07:00`)

  const minTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)) // 3 hours from now

  return slotTime >= minTime
}

/**
 * Get available hours for a specific date
 */
export function getAvailableHoursForDate(date: string): string[] {
  const allHours = getAvailableHours()

  return allHours.filter(hour => {
    // Check if any minute interval in this hour is available
    return getMinuteIntervals().some(minute =>
      isTimeSlotAvailable(date, hour, minute)
    )
  })
}

/**
 * Get available minutes for a specific date and hour
 */
export function getAvailableMinutesForDateHour(date: string, hour: string): string[] {
  return getMinuteIntervals().filter(minute =>
    isTimeSlotAvailable(date, hour, minute)
  )
}