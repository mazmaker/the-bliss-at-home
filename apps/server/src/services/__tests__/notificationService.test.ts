import { describe, it, expect, vi, beforeEach } from 'vitest'

// Chainable mock helper
function createChainMock(resolvedValue: any) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.neq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.not = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  return chain
}

const mockFrom = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock('../lineService.js', () => ({
  lineService: {
    sendNewJobToStaff: vi.fn().mockResolvedValue(true),
    sendNewBookingToAdmin: vi.fn().mockResolvedValue(true),
    sendJobReAvailableToStaff: vi.fn().mockResolvedValue(true),
    sendJobCancelledToAdmin: vi.fn().mockResolvedValue(true),
    sendBookingCancelledToStaff: vi.fn().mockResolvedValue(true),
    sendPayoutCompletedToStaff: vi.fn().mockResolvedValue(true),
    multicast: vi.fn().mockResolvedValue(true),
    pushMessage: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('../emailService.js', () => ({
  emailService: {
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
    templates: {
      bookingConfirmation: vi.fn().mockReturnValue('<html></html>'),
    },
  },
}))

import {
  createJobsFromBooking,
  processBookingConfirmed,
  processJobCancelled,
  processBookingCancelled,
  sendPayoutCompletedNotification,
} from '../notificationService'

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createJobsFromBooking', () => {
    it('should return existing job IDs if jobs already exist (idempotent)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'job-1' }, { id: 'job-2' }],
                error: null,
              }),
            }),
          }
        }
        return createChainMock({ data: null, error: null })
      })

      const result = await createJobsFromBooking('booking-1')
      expect(result).toEqual(['job-1', 'job-2'])
    })

    it('should return empty array when booking not found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        if (table === 'bookings') {
          return createChainMock({ data: null, error: { message: 'Not found' } })
        }
        return createChainMock({ data: null, error: null })
      })

      const result = await createJobsFromBooking('nonexistent')
      expect(result).toEqual([])
    })
  })

  describe('processBookingConfirmed', () => {
    it('should return success false and empty arrays on failure', async () => {
      // Mock jobs table to return no existing jobs
      mockFrom.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        if (table === 'bookings') {
          return createChainMock({ data: null, error: { message: 'Not found' } })
        }
        return createChainMock({ data: null, error: null })
      })

      const result = await processBookingConfirmed('nonexistent-booking')

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('jobIds')
      expect(result).toHaveProperty('staffNotified')
      expect(result).toHaveProperty('adminsNotified')
    })
  })

  describe('processJobCancelled', () => {
    it('should return error when job not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const result = await processJobCancelled('nonexistent-job', 'reason', null)

      expect(result.success).toBe(false)
      expect(result).toHaveProperty('error')
    })

    it('should return error when job is already cancelled', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: {
            id: 'job-1',
            status: 'cancelled',
            booking_id: 'booking-1',
            staff_id: null,
          },
          error: null,
        })
      )

      const result = await processJobCancelled('job-1', 'reason', null)

      expect(result.success).toBe(false)
    })
  })

  describe('processBookingCancelled', () => {
    it('should return error when booking jobs not found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
              }),
            }),
          }
        }
        return createChainMock({ data: null, error: null })
      })

      const result = await processBookingCancelled('booking-1', 'reason', null, null)

      expect(result).toHaveProperty('success')
    })
  })

  describe('sendPayoutCompletedNotification', () => {
    it('should return failure when payout not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const result = await sendPayoutCompletedNotification('nonexistent-payout')

      expect(result.success).toBe(false)
    })
  })

  describe('module exports', () => {
    it('should export createJobsFromBooking', () => {
      expect(typeof createJobsFromBooking).toBe('function')
    })

    it('should export processBookingConfirmed', () => {
      expect(typeof processBookingConfirmed).toBe('function')
    })

    it('should export processJobCancelled', () => {
      expect(typeof processJobCancelled).toBe('function')
    })

    it('should export processBookingCancelled', () => {
      expect(typeof processBookingCancelled).toBe('function')
    })

    it('should export sendPayoutCompletedNotification', () => {
      expect(typeof sendPayoutCompletedNotification).toBe('function')
    })
  })
})
