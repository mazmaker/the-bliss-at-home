/**
 * Server-side Staff Assignment Service
 * จัดการการมอบหมายหมอนวดตาม Provider Preference
 */

import { createClient } from '@supabase/supabase-js'

// Types
type ProviderPreference = 'female-only' | 'male-only' | 'prefer-female' | 'prefer-male' | 'no-preference'

interface Staff {
  id: string
  name_th: string
  gender?: 'male' | 'female' | 'other'
  is_active: boolean
  is_available: boolean
  hotel_id?: string
  specializations?: string[]
}

interface StaffAssignmentRequest {
  providerPreference: ProviderPreference
  bookingDate: string
  bookingTime: string
  duration: number
  hotelId?: string
  serviceType?: string
  requiredStaffCount?: number
}

interface StaffAssignmentResult {
  success: boolean
  assignedStaff: Staff[]
  assignedStaffIds: string[]
  summary: {
    totalStaff: number
    availableStaff: number
    matchingStaff: number
  }
  message: string
  warnings?: string[]
}

class ServerStaffAssignmentService {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Check time overlap between two bookings
   */
  private checkTimeOverlap(
    date1: string, time1: string, duration1: number,
    date2: string, time2: string, duration2: number
  ): boolean {
    if (date1 !== date2) return false

    const start1 = new Date(`${date1}T${time1}:00`)
    const end1 = new Date(start1.getTime() + (duration1 * 60000))

    const start2 = new Date(`${date2}T${time2}:00`)
    const end2 = new Date(start2.getTime() + (duration2 * 60000))

    return start1 < end2 && start2 < end1
  }

  /**
   * Filter staff by provider preference
   */
  private filterStaffByPreference(staff: Staff[], preference: ProviderPreference): Staff[] {
    switch (preference) {
      case 'female-only':
        return staff.filter(s => s.gender === 'female')

      case 'male-only':
        return staff.filter(s => s.gender === 'male')

      case 'prefer-female': {
        const femaleStaff = staff.filter(s => s.gender === 'female')
        return femaleStaff.length > 0 ? femaleStaff : staff
      }

      case 'prefer-male': {
        const maleStaff = staff.filter(s => s.gender === 'male')
        return maleStaff.length > 0 ? maleStaff : staff
      }

      case 'no-preference':
      default:
        return staff
    }
  }

  /**
   * Get available staff for given time slot
   */
  private async getAvailableStaff(
    hotelId: string,
    bookingDate: string,
    bookingTime: string,
    duration: number
  ): Promise<Staff[]> {
    try {
      // Get all active staff for this hotel
      const { data: allStaff, error: staffError } = await this.supabase
        .from('staff')
        .select('*')
        .eq('hotel_id', hotelId)
        .eq('is_active', true)
        .eq('is_available', true)

      if (staffError || !allStaff) {
        console.error('Error fetching staff:', staffError)
        return []
      }

      // Get existing bookings for this date and these staff members
      const staffIds = allStaff.map(staff => staff.id)
      const { data: existingBookings, error: bookingsError } = await this.supabase
        .from('bookings')
        .select('staff_id, booking_date, booking_time, duration')
        .eq('booking_date', bookingDate)
        .in('staff_id', staffIds)
        .in('status', ['pending', 'confirmed', 'in_progress'])

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError)
        return allStaff // Return all staff if can't check conflicts
      }

      // Filter out staff with time conflicts
      const availableStaff = allStaff.filter(staff => {
        const staffBookings = existingBookings?.filter(booking => booking.staff_id === staff.id) || []

        return !staffBookings.some(booking =>
          this.checkTimeOverlap(
            bookingDate, bookingTime, duration,
            booking.booking_date, booking.booking_time, booking.duration
          )
        )
      })

      return availableStaff
    } catch (error) {
      console.error('Error in getAvailableStaff:', error)
      return []
    }
  }

  /**
   * Assign staff based on provider preference
   */
  async assignStaff(request: StaffAssignmentRequest): Promise<StaffAssignmentResult> {
    try {
      console.log('🔍 Staff assignment request:', {
        preference: request.providerPreference,
        date: request.bookingDate,
        time: request.bookingTime,
        hotel: request.hotelId
      })

      if (!request.hotelId) {
        return {
          success: false,
          assignedStaff: [],
          assignedStaffIds: [],
          summary: { totalStaff: 0, availableStaff: 0, matchingStaff: 0 },
          message: 'Hotel ID is required for staff assignment'
        }
      }

      // Get available staff
      const availableStaff = await this.getAvailableStaff(
        request.hotelId,
        request.bookingDate,
        request.bookingTime,
        request.duration
      )

      console.log(`📊 Found ${availableStaff.length} available staff members`)

      if (availableStaff.length === 0) {
        return {
          success: false,
          assignedStaff: [],
          assignedStaffIds: [],
          summary: { totalStaff: 0, availableStaff: 0, matchingStaff: 0 },
          message: 'ไม่มีหมอนวดที่ว่างในช่วงเวลานี้'
        }
      }

      // Apply provider preference filtering
      const matchingStaff = this.filterStaffByPreference(availableStaff, request.providerPreference)

      console.log(`🎯 Found ${matchingStaff.length} staff matching preference: ${request.providerPreference}`)

      // Select required number of staff
      const requiredCount = request.requiredStaffCount || 1
      const selectedStaff = matchingStaff.slice(0, requiredCount)

      const warnings: string[] = []

      // Add warnings
      if (matchingStaff.length === 0 && availableStaff.length > 0) {
        warnings.push(`ไม่มีหมอนวดที่ตรงกับความต้องการ (${this.getPreferenceLabel(request.providerPreference)}) แต่มีหมอนวดอื่นที่ว่างอยู่`)
      }

      if (selectedStaff.length < requiredCount) {
        warnings.push(`ต้องการหมอนวด ${requiredCount} คน แต่หาได้เพียง ${selectedStaff.length} คน`)
      }

      const result: StaffAssignmentResult = {
        success: selectedStaff.length > 0,
        assignedStaff: selectedStaff,
        assignedStaffIds: selectedStaff.map(s => s.id),
        summary: {
          totalStaff: availableStaff.length,
          availableStaff: availableStaff.length,
          matchingStaff: matchingStaff.length
        },
        message: selectedStaff.length > 0
          ? `จัดสรรหมอนวดสำเร็จ: ${selectedStaff.map(s => s.name_th).join(', ')}`
          : 'ไม่สามารถจัดสรรหมอนวดได้',
        warnings: warnings.length > 0 ? warnings : undefined
      }

      console.log('✅ Staff assignment result:', {
        success: result.success,
        staffCount: result.assignedStaff.length,
        staffNames: result.assignedStaff.map(s => s.name_th)
      })

      return result
    } catch (error) {
      console.error('❌ Error in staff assignment:', error)
      return {
        success: false,
        assignedStaff: [],
        assignedStaffIds: [],
        summary: { totalStaff: 0, availableStaff: 0, matchingStaff: 0 },
        message: 'เกิดข้อผิดพลาดในการจัดสรรหมอนวด'
      }
    }
  }

  /**
   * Get preference label for logging
   */
  private getPreferenceLabel(preference: ProviderPreference): string {
    switch (preference) {
      case 'female-only': return 'ผู้หญิงเท่านั้น'
      case 'male-only': return 'ผู้ชายเท่านั้น'
      case 'prefer-female': return 'ต้องการผู้หญิง'
      case 'prefer-male': return 'ต้องการผู้ชาย'
      case 'no-preference': return 'ไม่ระบุ'
      default: return 'ไม่ระบุ'
    }
  }

  /**
   * Simple staff assignment (fallback if gender data not available)
   */
  async assignStaffSimple(hotelId: string, bookingDate: string, bookingTime: string, duration: number): Promise<string | null> {
    try {
      const availableStaff = await this.getAvailableStaff(hotelId, bookingDate, bookingTime, duration)
      return availableStaff.length > 0 ? availableStaff[0].id : null
    } catch (error) {
      console.error('Error in simple staff assignment:', error)
      return null
    }
  }
}

// Export singleton
export const staffAssignmentService = new ServerStaffAssignmentService()

// Export types
export type { ProviderPreference, StaffAssignmentRequest, StaffAssignmentResult }