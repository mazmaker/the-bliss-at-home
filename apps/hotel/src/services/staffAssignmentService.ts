/**
 * Staff Assignment Service
 * จัดการการมอบหมายหมอนวดตาม Provider Preference
 */

import { hotelSupabase as supabase } from '../lib/supabaseClient'
import { ProviderPreference } from '../types/booking'
import {
  Staff,
  TimeSlot,
  ExistingBooking,
  findMatchingStaff,
  findMultipleStaff,
  getStaffMatchingSummary
} from '../utils/staffMatcher'

export interface StaffAssignmentRequest {
  providerPreference: ProviderPreference
  bookingDate: string
  bookingTime: string
  duration: number // in minutes
  hotelId?: string
  requiredStaffCount?: number // for couple bookings
  serviceType?: string // for specialization matching
}

export interface StaffAssignmentResult {
  success: boolean
  assignedStaff: Staff[]
  summary: {
    totalStaff: number
    activeStaff: number
    availableStaff: number
    timeAvailableStaff: number
    preferenceMatchedStaff: number
  }
  error?: string
  warnings?: string[]
}

class StaffAssignmentService {
  /**
   * Get all available staff from database
   */
  private async getAllStaff(hotelId?: string): Promise<Staff[]> {
    try {
      let query = supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)

      if (hotelId) {
        query = query.eq('hotel_id', hotelId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching staff:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch staff:', error)
      throw new Error('Unable to fetch staff data')
    }
  }

  /**
   * Get existing bookings for conflict checking
   */
  private async getExistingBookings(date: string, staffIds?: string[]): Promise<ExistingBooking[]> {
    try {
      let query = supabase
        .from('bookings')
        .select('id, staff_id, booking_date, booking_time, duration, status')
        .eq('booking_date', date)
        .in('status', ['pending', 'confirmed', 'in_progress'])

      if (staffIds && staffIds.length > 0) {
        query = query.in('staff_id', staffIds)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching bookings:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch existing bookings:', error)
      throw new Error('Unable to fetch booking data')
    }
  }

  /**
   * Assign single staff member
   */
  async assignSingleStaff(request: StaffAssignmentRequest): Promise<StaffAssignmentResult> {
    try {
      console.log('🔍 Assigning single staff with request:', request)

      // Fetch all available staff
      const allStaff = await this.getAllStaff(request.hotelId)

      if (allStaff.length === 0) {
        return {
          success: false,
          assignedStaff: [],
          summary: {
            totalStaff: 0,
            activeStaff: 0,
            availableStaff: 0,
            timeAvailableStaff: 0,
            preferenceMatchedStaff: 0
          },
          error: 'No staff available in the system'
        }
      }

      // Get existing bookings for conflict checking
      const staffIds = allStaff.map(staff => staff.id)
      const existingBookings = await this.getExistingBookings(request.bookingDate, staffIds)

      // Create time slot
      const timeSlot: TimeSlot = {
        date: request.bookingDate,
        time: request.bookingTime,
        duration: request.duration
      }

      // Find matching staff
      const matchedStaff = findMatchingStaff(
        allStaff,
        request.providerPreference,
        timeSlot,
        existingBookings,
        request.hotelId
      )

      // Get summary for debugging
      const summary = getStaffMatchingSummary(
        allStaff,
        request.providerPreference,
        timeSlot,
        existingBookings,
        request.hotelId
      )

      const warnings: string[] = []

      // Add warnings for low availability
      if (summary.preferenceMatchedStaff === 0 && summary.timeAvailableStaff > 0) {
        warnings.push(`ไม่มีหมอนวดที่ตรงกับความต้องการ แต่มีหมอนวดว่างอยู่ ${summary.timeAvailableStaff} คน`)
      }

      if (matchedStaff) {
        console.log('✅ Staff assigned successfully:', matchedStaff.name_th)
        return {
          success: true,
          assignedStaff: [matchedStaff],
          summary,
          warnings: warnings.length > 0 ? warnings : undefined
        }
      } else {
        console.log('❌ No suitable staff found')
        return {
          success: false,
          assignedStaff: [],
          summary,
          error: 'ไม่พบหมอนวดที่ว่างและเหมาะสมสำหรับช่วงเวลานี้',
          warnings: warnings.length > 0 ? warnings : undefined
        }
      }
    } catch (error) {
      console.error('Error in assignSingleStaff:', error)
      return {
        success: false,
        assignedStaff: [],
        summary: {
          totalStaff: 0,
          activeStaff: 0,
          availableStaff: 0,
          timeAvailableStaff: 0,
          preferenceMatchedStaff: 0
        },
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการจัดสรรหมอนวด'
      }
    }
  }

  /**
   * Assign multiple staff members (for couple bookings)
   */
  async assignMultipleStaff(request: StaffAssignmentRequest): Promise<StaffAssignmentResult> {
    try {
      console.log('🔍 Assigning multiple staff with request:', request)

      const requiredCount = request.requiredStaffCount || 2

      // Fetch all available staff
      const allStaff = await this.getAllStaff(request.hotelId)

      if (allStaff.length < requiredCount) {
        return {
          success: false,
          assignedStaff: [],
          summary: {
            totalStaff: allStaff.length,
            activeStaff: 0,
            availableStaff: 0,
            timeAvailableStaff: 0,
            preferenceMatchedStaff: 0
          },
          error: `ต้องการหมอนวด ${requiredCount} คน แต่มีเพียง ${allStaff.length} คน`
        }
      }

      // Get existing bookings for conflict checking
      const staffIds = allStaff.map(staff => staff.id)
      const existingBookings = await this.getExistingBookings(request.bookingDate, staffIds)

      // Create time slot
      const timeSlot: TimeSlot = {
        date: request.bookingDate,
        time: request.bookingTime,
        duration: request.duration
      }

      // Find multiple matching staff
      const matchedStaff = findMultipleStaff(
        allStaff,
        request.providerPreference,
        timeSlot,
        existingBookings,
        requiredCount,
        request.hotelId
      )

      // Get summary for debugging
      const summary = getStaffMatchingSummary(
        allStaff,
        request.providerPreference,
        timeSlot,
        existingBookings,
        request.hotelId
      )

      const warnings: string[] = []

      if (matchedStaff.length < requiredCount) {
        warnings.push(`ต้องการหมอนวด ${requiredCount} คน แต่หาได้เพียง ${matchedStaff.length} คน`)
      }

      if (matchedStaff.length > 0) {
        console.log(`✅ ${matchedStaff.length} staff assigned successfully:`, matchedStaff.map(s => s.name_th))
        return {
          success: matchedStaff.length >= requiredCount,
          assignedStaff: matchedStaff,
          summary,
          warnings: warnings.length > 0 ? warnings : undefined,
          error: matchedStaff.length < requiredCount ? `ไม่สามารถหาหมอนวดได้ครบ ${requiredCount} คน` : undefined
        }
      } else {
        console.log('❌ No suitable staff found for multiple assignment')
        return {
          success: false,
          assignedStaff: [],
          summary,
          error: 'ไม่พบหมอนวดที่ว่างและเหมาะสมสำหรับช่วงเวลานี้',
          warnings: warnings.length > 0 ? warnings : undefined
        }
      }
    } catch (error) {
      console.error('Error in assignMultipleStaff:', error)
      return {
        success: false,
        assignedStaff: [],
        summary: {
          totalStaff: 0,
          activeStaff: 0,
          availableStaff: 0,
          timeAvailableStaff: 0,
          preferenceMatchedStaff: 0
        },
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการจัดสรรหมอนวด'
      }
    }
  }

  /**
   * Get staff assignment preview (without actually assigning)
   */
  async previewStaffAssignment(request: StaffAssignmentRequest): Promise<StaffAssignmentResult> {
    if (request.requiredStaffCount && request.requiredStaffCount > 1) {
      return this.assignMultipleStaff(request)
    } else {
      return this.assignSingleStaff(request)
    }
  }

  /**
   * Check if specific staff is available for booking
   */
  async checkStaffAvailability(
    staffId: string,
    bookingDate: string,
    bookingTime: string,
    duration: number
  ): Promise<boolean> {
    try {
      // Get staff info
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .eq('is_active', true)
        .eq('is_available', true)
        .single()

      if (staffError || !staff) {
        return false
      }

      // Check for conflicts
      const existingBookings = await this.getExistingBookings(bookingDate, [staffId])

      const timeSlot: TimeSlot = {
        date: bookingDate,
        time: bookingTime,
        duration
      }

      return existingBookings.every(booking => {
        const bookingSlot: TimeSlot = {
          date: booking.booking_date,
          time: booking.booking_time,
          duration: booking.duration
        }

        // No overlap means available
        return !this.checkTimeOverlap(timeSlot, bookingSlot)
      })
    } catch (error) {
      console.error('Error checking staff availability:', error)
      return false
    }
  }

  /**
   * Helper method for time overlap checking
   */
  private checkTimeOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.date !== slot2.date) return false

    const start1 = new Date(`${slot1.date}T${slot1.time}:00`)
    const end1 = new Date(start1.getTime() + (slot1.duration * 60000))

    const start2 = new Date(`${slot2.date}T${slot2.time}:00`)
    const end2 = new Date(start2.getTime() + (slot2.duration * 60000))

    return start1 < end2 && start2 < end1
  }
}

// Export singleton instance
export const staffAssignmentService = new StaffAssignmentService()

// Export types for external use
export type { StaffAssignmentRequest, StaffAssignmentResult, Staff }