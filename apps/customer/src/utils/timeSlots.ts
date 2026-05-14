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
  const todayStr = now.toISOString().split('T')[0]

  // If not today, all slots are available
  if (date !== todayStr) return true

  // For today, check 3-hour advance rule
  const slotTime = new Date()
  slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0)

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