/**
 * Time Slot Utilities for Booking System
 * Support 09:00-00:00 with 15-minute intervals
 */

export interface TimeSlot {
  hour: string
  minute: string
  full: string // "09:15"
  display: string // "09:15 น."
}

/**
 * Generate available hours (09-23, 00)
 */
export function getAvailableHours(): string[] {
  const hours: string[] = []

  // 09:00 - 23:00
  for (let h = 9; h <= 23; h++) {
    hours.push(h.toString().padStart(2, '0'))
  }

  // 00:00 (midnight)
  hours.push('00')

  return hours
}

/**
 * Generate 15-minute intervals for any hour
 */
export function getMinuteIntervals(): string[] {
  return ['00', '15', '30', '45']
}

/**
 * Generate all possible time slots (for backend validation)
 */
export function getAllTimeSlots(): string[] {
  const hours = getAvailableHours()
  const minutes = getMinuteIntervals()
  const slots: string[] = []

  hours.forEach(hour => {
    minutes.forEach(minute => {
      slots.push(`${hour}:${minute}`)
    })
  })

  return slots
}

/**
 * Format time for display
 */
export function formatTimeDisplay(hour: string, minute: string): string {
  return `${hour}:${minute} น.`
}

/**
 * Parse full time string to hour and minute
 */
export function parseTime(timeString: string): { hour: string; minute: string } {
  const [hour, minute] = timeString.split(':')
  return { hour: hour.padStart(2, '0'), minute: minute.padStart(2, '0') }
}

/**
 * Check if time slot is available based on 3-hour advance rule
 */
export function isTimeSlotAvailable(date: string, hour: string, minute: string): boolean {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // If not today, all slots are available
  if (date !== todayStr) return true

  // For today, check 3-hour advance rule
  const slotTime = new Date()
  slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0)

  // Special case for 00:00 - it's next day
  if (hour === '00') {
    slotTime.setDate(slotTime.getDate() + 1)
  }

  const minTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)) // 3 hours from now

  return slotTime >= minTime
}

/**
 * Filter available hours for a given date
 */
export function getAvailableHoursForDate(date: string): string[] {
  const allHours = getAvailableHours()
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // If not today, all hours are available
  if (date !== todayStr) return allHours

  // For today, filter based on 3-hour rule
  return allHours.filter(hour => {
    // Check if any minute interval in this hour is available
    return getMinuteIntervals().some(minute =>
      isTimeSlotAvailable(date, hour, minute)
    )
  })
}

/**
 * Filter available minutes for a given date and hour
 */
export function getAvailableMinutesForDateHour(date: string, hour: string): string[] {
  const allMinutes = getMinuteIntervals()

  return allMinutes.filter(minute =>
    isTimeSlotAvailable(date, hour, minute)
  )
}