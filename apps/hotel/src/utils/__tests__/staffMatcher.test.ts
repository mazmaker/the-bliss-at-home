import { describe, it, expect } from 'vitest'

import {
  checkTimeOverlap,
  filterStaffByPreference,
  checkStaffAvailability,
  findMatchingStaff,
  findMultipleStaff,
  getStaffMatchingSummary,
  getProviderPreferenceDisplay,
  type Staff,
  type TimeSlot,
  type ExistingBooking,
} from '../staffMatcher'

// Helper to create staff
function makeStaff(overrides: Partial<Staff> = {}): Staff {
  return {
    id: 'staff-1',
    name_th: 'สมหญิง',
    name_en: 'Somying',
    gender: 'female',
    is_active: true,
    is_available: true,
    hotel_id: 'hotel-1',
    ...overrides,
  }
}

function makeBooking(overrides: Partial<ExistingBooking> = {}): ExistingBooking {
  return {
    id: 'booking-1',
    staff_id: 'staff-1',
    booking_date: '2026-03-01',
    booking_time: '14:00',
    duration: 60,
    status: 'confirmed',
    ...overrides,
  }
}

describe('checkTimeOverlap', () => {
  it('should return false for different dates', () => {
    const slot1: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }
    const slot2: TimeSlot = { date: '2026-03-02', time: '14:00', duration: 60 }

    expect(checkTimeOverlap(slot1, slot2)).toBe(false)
  })

  it('should return true for overlapping time slots', () => {
    const slot1: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }
    const slot2: TimeSlot = { date: '2026-03-01', time: '14:30', duration: 60 }

    expect(checkTimeOverlap(slot1, slot2)).toBe(true)
  })

  it('should return false for non-overlapping time slots on the same day', () => {
    const slot1: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }
    const slot2: TimeSlot = { date: '2026-03-01', time: '16:00', duration: 60 }

    expect(checkTimeOverlap(slot1, slot2)).toBe(false)
  })

  it('should return false for adjacent time slots (end of first = start of second)', () => {
    const slot1: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }
    const slot2: TimeSlot = { date: '2026-03-01', time: '15:00', duration: 60 }

    expect(checkTimeOverlap(slot1, slot2)).toBe(false)
  })

  it('should return true for completely contained time slot', () => {
    const slot1: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 120 }
    const slot2: TimeSlot = { date: '2026-03-01', time: '14:30', duration: 30 }

    expect(checkTimeOverlap(slot1, slot2)).toBe(true)
  })

  it('should return true for identical time slots', () => {
    const slot1: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }
    const slot2: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }

    expect(checkTimeOverlap(slot1, slot2)).toBe(true)
  })
})

describe('filterStaffByPreference', () => {
  const femaleStaff = makeStaff({ id: 'f1', gender: 'female' })
  const maleStaff = makeStaff({ id: 'm1', gender: 'male' })
  const otherStaff = makeStaff({ id: 'o1', gender: 'other' })
  const allStaff = [femaleStaff, maleStaff, otherStaff]

  it('should return only female staff for female-only preference', () => {
    const result = filterStaffByPreference(allStaff, 'female-only')
    expect(result).toEqual([femaleStaff])
  })

  it('should return only male staff for male-only preference', () => {
    const result = filterStaffByPreference(allStaff, 'male-only')
    expect(result).toEqual([maleStaff])
  })

  it('should prefer female but fallback to all if no female available', () => {
    const noFemale = [maleStaff, otherStaff]
    const result = filterStaffByPreference(noFemale, 'prefer-female')
    expect(result).toEqual(noFemale)
  })

  it('should return female staff when prefer-female and females are available', () => {
    const result = filterStaffByPreference(allStaff, 'prefer-female')
    expect(result).toEqual([femaleStaff])
  })

  it('should prefer male but fallback to all if no male available', () => {
    const noMale = [femaleStaff, otherStaff]
    const result = filterStaffByPreference(noMale, 'prefer-male')
    expect(result).toEqual(noMale)
  })

  it('should return male staff when prefer-male and males are available', () => {
    const result = filterStaffByPreference(allStaff, 'prefer-male')
    expect(result).toEqual([maleStaff])
  })

  it('should return all staff for no-preference', () => {
    const result = filterStaffByPreference(allStaff, 'no-preference')
    expect(result).toEqual(allStaff)
  })

  it('should return empty array when filtering yields no results', () => {
    const result = filterStaffByPreference([otherStaff], 'female-only')
    expect(result).toEqual([])
  })
})

describe('checkStaffAvailability', () => {
  it('should return false for inactive staff', () => {
    const staff = makeStaff({ is_active: false })
    const timeSlot: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }

    expect(checkStaffAvailability(staff, timeSlot, [])).toBe(false)
  })

  it('should return false for unavailable staff', () => {
    const staff = makeStaff({ is_available: false })
    const timeSlot: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }

    expect(checkStaffAvailability(staff, timeSlot, [])).toBe(false)
  })

  it('should return true for available staff with no conflicts', () => {
    const staff = makeStaff()
    const timeSlot: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }

    expect(checkStaffAvailability(staff, timeSlot, [])).toBe(true)
  })

  it('should return false when time slot conflicts with existing booking', () => {
    const staff = makeStaff({ id: 'staff-1' })
    const timeSlot: TimeSlot = { date: '2026-03-01', time: '14:30', duration: 60 }
    const existingBookings = [
      makeBooking({ staff_id: 'staff-1', booking_date: '2026-03-01', booking_time: '14:00', duration: 60 }),
    ]

    expect(checkStaffAvailability(staff, timeSlot, existingBookings)).toBe(false)
  })

  it('should return true when existing booking is from different staff', () => {
    const staff = makeStaff({ id: 'staff-1' })
    const timeSlot: TimeSlot = { date: '2026-03-01', time: '14:30', duration: 60 }
    const existingBookings = [
      makeBooking({ staff_id: 'staff-2', booking_date: '2026-03-01', booking_time: '14:00', duration: 60 }),
    ]

    expect(checkStaffAvailability(staff, timeSlot, existingBookings)).toBe(true)
  })

  it('should ignore cancelled bookings in conflict check', () => {
    const staff = makeStaff({ id: 'staff-1' })
    const timeSlot: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }
    const existingBookings = [
      makeBooking({
        staff_id: 'staff-1',
        booking_date: '2026-03-01',
        booking_time: '14:00',
        duration: 60,
        status: 'cancelled',
      }),
    ]

    expect(checkStaffAvailability(staff, timeSlot, existingBookings)).toBe(true)
  })
})

describe('findMatchingStaff', () => {
  const femaleStaff = makeStaff({ id: 'f1', gender: 'female' })
  const maleStaff = makeStaff({ id: 'm1', gender: 'male' })
  const allStaff = [femaleStaff, maleStaff]
  const timeSlot: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }

  it('should find a matching staff with no preference', () => {
    const result = findMatchingStaff(allStaff, 'no-preference', timeSlot, [])
    expect(result).toBeDefined()
    expect(result?.id).toBe('f1') // first in the list
  })

  it('should find female staff for female-only preference', () => {
    const result = findMatchingStaff(allStaff, 'female-only', timeSlot, [])
    expect(result?.id).toBe('f1')
  })

  it('should find male staff for male-only preference', () => {
    const result = findMatchingStaff(allStaff, 'male-only', timeSlot, [])
    expect(result?.id).toBe('m1')
  })

  it('should return null when no staff match', () => {
    const result = findMatchingStaff(
      [makeStaff({ gender: 'other' })],
      'female-only',
      timeSlot,
      []
    )
    expect(result).toBeNull()
  })

  it('should filter by hotel when hotelId is provided', () => {
    const staff1 = makeStaff({ id: 's1', hotel_id: 'hotel-1' })
    const staff2 = makeStaff({ id: 's2', hotel_id: 'hotel-2' })

    const result = findMatchingStaff([staff1, staff2], 'no-preference', timeSlot, [], 'hotel-1')
    expect(result?.id).toBe('s1')
  })

  it('should exclude staff with time conflicts', () => {
    const booking = makeBooking({
      staff_id: 'f1',
      booking_date: '2026-03-01',
      booking_time: '14:00',
      duration: 60,
    })

    const result = findMatchingStaff(allStaff, 'female-only', timeSlot, [booking])
    expect(result).toBeNull() // only female is conflicted
  })
})

describe('findMultipleStaff', () => {
  const staff1 = makeStaff({ id: 's1', gender: 'female' })
  const staff2 = makeStaff({ id: 's2', gender: 'female' })
  const staff3 = makeStaff({ id: 's3', gender: 'male' })
  const allStaff = [staff1, staff2, staff3]
  const timeSlot: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }

  it('should find 2 staff for couple booking', () => {
    const result = findMultipleStaff(allStaff, 'no-preference', timeSlot, [], 2)
    expect(result).toHaveLength(2)
  })

  it('should return fewer than requested when not enough available', () => {
    const result = findMultipleStaff([staff1], 'no-preference', timeSlot, [], 2)
    expect(result).toHaveLength(1)
  })

  it('should filter by preference for multiple staff', () => {
    const result = findMultipleStaff(allStaff, 'female-only', timeSlot, [], 2)
    expect(result).toHaveLength(2)
    expect(result.every(s => s.gender === 'female')).toBe(true)
  })

  it('should default to 2 required staff', () => {
    const result = findMultipleStaff(allStaff, 'no-preference', timeSlot, [])
    expect(result).toHaveLength(2)
  })
})

describe('getStaffMatchingSummary', () => {
  const staff1 = makeStaff({ id: 's1', gender: 'female', hotel_id: 'hotel-1' })
  const staff2 = makeStaff({ id: 's2', gender: 'male', hotel_id: 'hotel-1' })
  const staff3 = makeStaff({ id: 's3', gender: 'female', hotel_id: 'hotel-2', is_active: false })
  const allStaff = [staff1, staff2, staff3]
  const timeSlot: TimeSlot = { date: '2026-03-01', time: '14:00', duration: 60 }

  it('should return correct summary counts', () => {
    const summary = getStaffMatchingSummary(allStaff, 'no-preference', timeSlot, [])

    expect(summary.totalStaff).toBe(3)
    expect(summary.activeStaff).toBe(2) // staff3 is inactive
    expect(summary.availableStaff).toBe(2) // staff3 is inactive
    expect(summary.timeAvailableStaff).toBe(2)
    expect(summary.preferenceMatchedStaff).toBe(2) // no preference, all match
  })

  it('should filter by hotelId in summary', () => {
    const summary = getStaffMatchingSummary(allStaff, 'no-preference', timeSlot, [], 'hotel-1')

    expect(summary.totalStaff).toBe(2) // only hotel-1 staff
  })

  it('should show preference-matched count', () => {
    const summary = getStaffMatchingSummary(allStaff, 'female-only', timeSlot, [])

    expect(summary.preferenceMatchedStaff).toBe(1) // only staff1 is active female
  })

  it('should include selected staff (first match)', () => {
    const summary = getStaffMatchingSummary(allStaff, 'no-preference', timeSlot, [])

    expect(summary.selectedStaff).toBeDefined()
    expect(summary.selectedStaff?.id).toBe('s1')
  })

  it('should return null selectedStaff when no match', () => {
    const summary = getStaffMatchingSummary(
      [makeStaff({ gender: 'other' })],
      'female-only',
      timeSlot,
      []
    )

    expect(summary.selectedStaff).toBeNull()
  })
})

describe('getProviderPreferenceDisplay', () => {
  it('should return correct Thai and English for female-only', () => {
    const display = getProviderPreferenceDisplay('female-only')
    expect(display.th).toBe('ผู้หญิงเท่านั้น')
    expect(display.en).toBe('Female Only')
  })

  it('should return correct Thai and English for male-only', () => {
    const display = getProviderPreferenceDisplay('male-only')
    expect(display.th).toBe('ผู้ชายเท่านั้น')
    expect(display.en).toBe('Male Only')
  })

  it('should return correct Thai and English for prefer-female', () => {
    const display = getProviderPreferenceDisplay('prefer-female')
    expect(display.th).toBe('ต้องการผู้หญิง')
    expect(display.en).toBe('Prefer Female')
  })

  it('should return correct Thai and English for prefer-male', () => {
    const display = getProviderPreferenceDisplay('prefer-male')
    expect(display.th).toBe('ต้องการผู้ชาย')
    expect(display.en).toBe('Prefer Male')
  })

  it('should return correct Thai and English for no-preference', () => {
    const display = getProviderPreferenceDisplay('no-preference')
    expect(display.th).toBe('ไม่ระบุ')
    expect(display.en).toBe('No Preference')
  })
})
