/**
 * Time Slot Utilities for Booking System
 * Simple two-step selection: Hour → Minute
 */

/**
 * Get available hours (09-23)
 */
export function getAvailableHours(): string[] {
  const hours: string[] = []

  // 09:00 - 23:00 (no midnight)
  for (let h = 9; h <= 23; h++) {
    hours.push(h.toString().padStart(2, '0'))
  }

  return hours
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
  const now = new Date()
  // Use the LOCAL date, not toISOString() (which is UTC). During Thai early-morning hours
  // the UTC date is still the previous day, so a UTC todayStr would wrongly treat "today"
  // as "not today" and skip the 3-hour advance rule. Matches how the calendar builds dateStr.
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // If not today, all slots are available
  if (date !== todayStr) return true

  // For today, check 3-hour advance rule.
  // Anchor the slot to Asia/Bangkok (+07:00): the slot labels are Bangkok wall-clock, so building
  // slotTime device-local (setHours) mis-gates the rule on a non-Bangkok device. minTime is an
  // absolute instant. TH = fixed UTC+7.
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