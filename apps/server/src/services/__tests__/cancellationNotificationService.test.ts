import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// Mock email service
vi.mock('../emailService.js', () => ({
  emailService: {
    templates: {
      bookingCancellation: vi.fn().mockReturnValue('<html>cancellation email</html>'),
      hotelBookingCancellation: vi.fn().mockReturnValue('<html>hotel cancellation email</html>'),
    },
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
  },
}))

// Mock line service
vi.mock('../lineService.js', () => ({
  lineService: {
    sendBookingCancelledToStaff: vi.fn().mockResolvedValue(true),
    sendBookingCancelledToAdmin: vi.fn().mockResolvedValue(true),
  },
}))

import { sendCancellationNotifications } from '../cancellationNotificationService'

// Helper to create a base booking object
function createMockBooking(overrides: Record<string, any> = {}) {
  return {
    id: 'booking-1',
    booking_number: 'BK-001',
    service_name: 'Thai Massage',
    scheduled_date: '2026-03-10',
    scheduled_time: '14:00',
    customer_id: 'cust-1',
    customer_email: 'customer@example.com',
    customer_profile_id: 'profile-cust-1',
    customer_name: 'John Doe',
    customer_phone: '0812345678',
    assigned_staff_id: undefined as string | undefined,
    staff_profile_id: undefined as string | undefined,
    staff_email: undefined as string | undefined,
    staff_line_user_id: undefined as string | undefined,
    hotel_id: undefined as string | undefined,
    hotel_email: undefined as string | undefined,
    source: 'customer' as 'customer' | 'hotel',
    cancellation_reason: 'Changed plans',
    payment_status: 'paid',
    ...overrides,
  }
}

describe('cancellationNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock for admin profiles query
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          // For admin query that returns array
          then: undefined,
        }
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      if (table === 'cancellation_notifications') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    })
  })

  describe('sendCancellationNotifications', () => {
    it('should return result object with customer, staff, hotel, admin fields', async () => {
      // Mock admin profiles query to return empty
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const booking = createMockBooking()
      const result = await sendCancellationNotifications(booking)

      expect(result).toHaveProperty('customer')
      expect(result).toHaveProperty('staff')
      expect(result).toHaveProperty('hotel')
      expect(result).toHaveProperty('admin')
    })

    it('should always attempt to notify customer', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const booking = createMockBooking()
      const result = await sendCancellationNotifications(booking)

      // Customer notification should have been attempted (result may be true if email is sent)
      expect(typeof result.customer).toBe('boolean')
    })

    it('should not notify staff when no staff assigned', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const booking = createMockBooking({ assigned_staff_id: undefined })
      const result = await sendCancellationNotifications(booking)

      expect(result.staff).toBe(false)
    })

    it('should not notify hotel when source is not hotel', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const booking = createMockBooking({ source: 'customer', hotel_id: undefined })
      const result = await sendCancellationNotifications(booking)

      expect(result.hotel).toBe(false)
    })

    it('should handle errors gracefully and not throw', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('DB error')
      })

      const booking = createMockBooking()
      // Should not throw even if internals fail
      await expect(sendCancellationNotifications(booking)).resolves.toBeDefined()
    })
  })
})
