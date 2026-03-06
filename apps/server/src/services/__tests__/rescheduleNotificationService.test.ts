import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to avoid the "Cannot access before initialization" error
const { mockInsert, mockSendBookingRescheduledToStaff } = vi.hoisted(() => ({
  mockInsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  mockSendBookingRescheduledToStaff: vi.fn().mockResolvedValue(true),
}))

// Mock supabase
vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  })),
}))

// Mock line service
vi.mock('../lineService.js', () => ({
  lineService: {
    sendBookingRescheduledToStaff: mockSendBookingRescheduledToStaff,
  },
}))

import { sendRescheduleNotifications, rescheduleNotificationService } from '../rescheduleNotificationService'

// Helper to create booking data
function createMockBooking(overrides: Record<string, any> = {}) {
  return {
    id: 'booking-1',
    booking_number: 'BK-001',
    service_name: 'Thai Massage',
    old_date: '2026-03-10',
    old_time: '14:00',
    new_date: '2026-03-15',
    new_time: '16:00',
    duration_minutes: 60,
    staff_earnings: 500,
    assigned_staff_id: undefined as string | undefined,
    staff_profile_id: undefined as string | undefined,
    staff_line_user_id: undefined as string | undefined,
    hotel_name: undefined as string | undefined,
    address: '123 Street',
    new_job_id: 'job-new-1',
    ...overrides,
  }
}

describe('rescheduleNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendRescheduleNotifications', () => {
    it('should return both false when no staff assigned', async () => {
      const booking = createMockBooking({ assigned_staff_id: undefined })
      const result = await sendRescheduleNotifications(booking)

      expect(result.staff_line).toBe(false)
      expect(result.staff_in_app).toBe(false)
    })

    it('should not send LINE notification when staff has no LINE user ID', async () => {
      const booking = createMockBooking({
        assigned_staff_id: 'staff-1',
        staff_profile_id: 'profile-1',
        staff_line_user_id: undefined,
      })

      const result = await sendRescheduleNotifications(booking)

      expect(mockSendBookingRescheduledToStaff).not.toHaveBeenCalled()
      expect(result.staff_line).toBe(false)
    })

    it('should send LINE notification when staff has LINE user ID', async () => {
      const booking = createMockBooking({
        assigned_staff_id: 'staff-1',
        staff_profile_id: 'profile-1',
        staff_line_user_id: 'line-user-1',
      })

      const result = await sendRescheduleNotifications(booking)

      expect(mockSendBookingRescheduledToStaff).toHaveBeenCalledWith(
        ['line-user-1'],
        expect.objectContaining({
          serviceName: 'Thai Massage',
          newDate: expect.any(String),
          newTime: '16:00',
        })
      )
      expect(result.staff_line).toBe(true)
    })

    it('should create in-app notification when staff has profile ID', async () => {
      const booking = createMockBooking({
        assigned_staff_id: 'staff-1',
        staff_profile_id: 'profile-1',
      })

      const result = await sendRescheduleNotifications(booking)

      // In-app notification should have been attempted
      expect(result.staff_in_app).toBe(true)
    })

    it('should not create in-app notification when staff has no profile ID', async () => {
      const booking = createMockBooking({
        assigned_staff_id: 'staff-1',
        staff_profile_id: undefined,
        staff_line_user_id: 'line-user-1',
      })

      const result = await sendRescheduleNotifications(booking)

      expect(result.staff_in_app).toBe(false)
    })

    it('should handle LINE notification failure gracefully', async () => {
      mockSendBookingRescheduledToStaff.mockResolvedValueOnce(false)

      const booking = createMockBooking({
        assigned_staff_id: 'staff-1',
        staff_profile_id: 'profile-1',
        staff_line_user_id: 'line-user-1',
      })

      // Should not throw
      const result = await sendRescheduleNotifications(booking)
      expect(result.staff_line).toBe(false)
    })

    it('should handle in-app notification failure gracefully', async () => {
      mockInsert.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })

      const booking = createMockBooking({
        assigned_staff_id: 'staff-1',
        staff_profile_id: 'profile-1',
      })

      // Should not throw
      const result = await sendRescheduleNotifications(booking)
      expect(result.staff_in_app).toBe(false)
    })
  })

  describe('rescheduleNotificationService export', () => {
    it('should export sendRescheduleNotifications method', () => {
      expect(typeof rescheduleNotificationService.sendRescheduleNotifications).toBe('function')
      expect(rescheduleNotificationService.sendRescheduleNotifications).toBe(sendRescheduleNotifications)
    })
  })
})
