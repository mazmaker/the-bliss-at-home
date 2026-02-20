/**
 * Staff Matcher Utility
 * จัดหมอนวดตาม Provider Preference และความพร้อมใช้งาน
 */

import { ProviderPreference } from '../types/booking'

// Staff interface with gender information
export interface Staff {
  id: string
  name_th: string
  name_en?: string
  gender?: 'male' | 'female' | 'other'
  specializations?: string[]
  is_active: boolean
  is_available: boolean
  hotel_id?: string
}

// Booking time conflict check
export interface TimeSlot {
  date: string
  time: string
  duration: number // in minutes
}

export interface ExistingBooking {
  id: string
  staff_id: string
  booking_date: string
  booking_time: string
  duration: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
}

/**
 * Check if two time slots overlap
 */
export const checkTimeOverlap = (
  slot1: TimeSlot,
  slot2: TimeSlot
): boolean => {
  if (slot1.date !== slot2.date) return false

  const start1 = new Date(`${slot1.date}T${slot1.time}:00`)
  const end1 = new Date(start1.getTime() + (slot1.duration * 60000))

  const start2 = new Date(`${slot2.date}T${slot2.time}:00`)
  const end2 = new Date(start2.getTime() + (slot2.duration * 60000))

  return start1 < end2 && start2 < end1
}

/**
 * Filter staff by provider preference
 */
export const filterStaffByPreference = (
  availableStaff: Staff[],
  preference: ProviderPreference
): Staff[] => {
  switch (preference) {
    case 'female-only':
      return availableStaff.filter(staff => staff.gender === 'female')

    case 'male-only':
      return availableStaff.filter(staff => staff.gender === 'male')

    case 'prefer-female': {
      const femaleStaff = availableStaff.filter(staff => staff.gender === 'female')
      return femaleStaff.length > 0 ? femaleStaff : availableStaff
    }

    case 'prefer-male': {
      const maleStaff = availableStaff.filter(staff => staff.gender === 'male')
      return maleStaff.length > 0 ? maleStaff : availableStaff
    }

    case 'no-preference':
    default:
      return availableStaff
  }
}

/**
 * Check staff availability for a specific time slot
 */
export const checkStaffAvailability = (
  staff: Staff,
  timeSlot: TimeSlot,
  existingBookings: ExistingBooking[]
): boolean => {
  // Check if staff is active and available
  if (!staff.is_active || !staff.is_available) return false

  // Check for time conflicts with existing bookings
  const staffBookings = existingBookings.filter(
    booking =>
      booking.staff_id === staff.id &&
      ['pending', 'confirmed', 'in_progress'].includes(booking.status)
  )

  for (const booking of staffBookings) {
    const bookingSlot: TimeSlot = {
      date: booking.booking_date,
      time: booking.booking_time,
      duration: booking.duration
    }

    if (checkTimeOverlap(timeSlot, bookingSlot)) {
      return false // Time conflict found
    }
  }

  return true // No conflicts, staff is available
}

/**
 * Find the best matching staff for booking
 */
export const findMatchingStaff = (
  allStaff: Staff[],
  preference: ProviderPreference,
  timeSlot: TimeSlot,
  existingBookings: ExistingBooking[],
  hotelId?: string
): Staff | null => {
  // Filter by hotel if specified
  let availableStaff = hotelId
    ? allStaff.filter(staff => staff.hotel_id === hotelId)
    : allStaff

  // Filter by active/available status first
  availableStaff = availableStaff.filter(staff =>
    staff.is_active && staff.is_available
  )

  // Check time availability
  availableStaff = availableStaff.filter(staff =>
    checkStaffAvailability(staff, timeSlot, existingBookings)
  )

  // Apply provider preference filtering
  const preferenceFilteredStaff = filterStaffByPreference(availableStaff, preference)

  // Return best match (first in the list after filtering)
  return preferenceFilteredStaff.length > 0 ? preferenceFilteredStaff[0] : null
}

/**
 * Find multiple staff for couple bookings
 */
export const findMultipleStaff = (
  allStaff: Staff[],
  preference: ProviderPreference,
  timeSlot: TimeSlot,
  existingBookings: ExistingBooking[],
  requiredStaffCount: number = 2,
  hotelId?: string
): Staff[] => {
  // Filter by hotel if specified
  let availableStaff = hotelId
    ? allStaff.filter(staff => staff.hotel_id === hotelId)
    : allStaff

  // Filter by active/available status first
  availableStaff = availableStaff.filter(staff =>
    staff.is_active && staff.is_available
  )

  // Check time availability
  availableStaff = availableStaff.filter(staff =>
    checkStaffAvailability(staff, timeSlot, existingBookings)
  )

  // Apply provider preference filtering
  const preferenceFilteredStaff = filterStaffByPreference(availableStaff, preference)

  // Return requested number of staff (up to available)
  return preferenceFilteredStaff.slice(0, requiredStaffCount)
}

/**
 * Get staff matching summary for debugging/logging
 */
export const getStaffMatchingSummary = (
  allStaff: Staff[],
  preference: ProviderPreference,
  timeSlot: TimeSlot,
  existingBookings: ExistingBooking[],
  hotelId?: string
): {
  totalStaff: number
  activeStaff: number
  availableStaff: number
  timeAvailableStaff: number
  preferenceMatchedStaff: number
  selectedStaff: Staff | null
} => {
  const totalStaff = hotelId
    ? allStaff.filter(staff => staff.hotel_id === hotelId).length
    : allStaff.length

  const activeStaff = allStaff.filter(staff =>
    staff.is_active && (!hotelId || staff.hotel_id === hotelId)
  ).length

  const availableStaff = allStaff.filter(staff =>
    staff.is_active && staff.is_available && (!hotelId || staff.hotel_id === hotelId)
  ).length

  const timeAvailableList = allStaff.filter(staff =>
    staff.is_active && staff.is_available &&
    (!hotelId || staff.hotel_id === hotelId) &&
    checkStaffAvailability(staff, timeSlot, existingBookings)
  )

  const preferenceMatched = filterStaffByPreference(timeAvailableList, preference)

  return {
    totalStaff,
    activeStaff,
    availableStaff,
    timeAvailableStaff: timeAvailableList.length,
    preferenceMatchedStaff: preferenceMatched.length,
    selectedStaff: preferenceMatched.length > 0 ? preferenceMatched[0] : null
  }
}

/**
 * Format provider preference for display
 */
export const getProviderPreferenceDisplay = (preference: ProviderPreference): {
  th: string
  en: string
} => {
  switch (preference) {
    case 'female-only':
      return { th: 'ผู้หญิงเท่านั้น', en: 'Female Only' }
    case 'male-only':
      return { th: 'ผู้ชายเท่านั้น', en: 'Male Only' }
    case 'prefer-female':
      return { th: 'ต้องการผู้หญิง', en: 'Prefer Female' }
    case 'prefer-male':
      return { th: 'ต้องการผู้ชาย', en: 'Prefer Male' }
    case 'no-preference':
    default:
      return { th: 'ไม่ระบุ', en: 'No Preference' }
  }
}