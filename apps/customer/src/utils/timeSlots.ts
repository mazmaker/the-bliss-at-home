/**
 * Time Slot Utilities for Booking System
 * Support 09:00-00:00 with time period grouping
 */

export interface TimeSlot {
  time: string // "09:15"
  display: string // "09:15 น."
  period: 'morning' | 'afternoon' | 'evening' | 'night'
}

export interface TimePeriod {
  key: 'morning' | 'afternoon' | 'evening' | 'night'
  label: string
  icon: string
  slots: TimeSlot[]
}

/**
 * Generate all possible time slots with 15-minute intervals
 */
export function generateAllTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = []

  // 09:00 - 23:45
  for (let h = 9; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      const period = getTimePeriod(h)
      slots.push({
        time,
        display: `${time} น.`,
        period
      })
    }
  }

  // Add 00:00 (midnight)
  slots.push({
    time: '00:00',
    display: '00:00 น.',
    period: 'night'
  })

  return slots
}

/**
 * Determine which period a time belongs to
 */
export function getTimePeriod(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 9 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night' // 22:00-00:00
}

/**
 * Check if time slot is available based on 3-hour advance rule
 */
export function isTimeSlotAvailable(date: string, time: string): boolean {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // If not today, all slots are available
  if (date !== todayStr) return true

  // For today, check 3-hour advance rule
  const [hour, minute] = time.split(':').map(Number)
  const slotTime = new Date()
  slotTime.setHours(hour, minute, 0, 0)

  // Special case for 00:00 - it's next day
  if (hour === 0) {
    slotTime.setDate(slotTime.getDate() + 1)
  }

  const minTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)) // 3 hours from now

  return slotTime >= minTime
}

/**
 * Get time periods with available slots for a given date
 */
export function getAvailableTimePeriods(date: string): TimePeriod[] {
  const allSlots = generateAllTimeSlots()
  const availableSlots = allSlots.filter(slot => isTimeSlotAvailable(date, slot.time))

  const periods: TimePeriod[] = [
    {
      key: 'morning',
      label: 'เช้า',
      icon: '🌅',
      slots: availableSlots.filter(slot => slot.period === 'morning')
    },
    {
      key: 'afternoon',
      label: 'บ่าย',
      icon: '🌞',
      slots: availableSlots.filter(slot => slot.period === 'afternoon')
    },
    {
      key: 'evening',
      label: 'เย็น',
      icon: '🌆',
      slots: availableSlots.filter(slot => slot.period === 'evening')
    },
    {
      key: 'night',
      label: 'กลางคืน',
      icon: '🌙',
      slots: availableSlots.filter(slot => slot.period === 'night')
    }
  ]

  // Only return periods that have available slots
  return periods.filter(period => period.slots.length > 0)
}