import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original env
const originalEnv = { ...process.env }

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// We need to reset the module-level token cache between tests
// The lineService uses a lazy-initialized channelAccessToken

describe('lineService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token-123'
    process.env.STAFF_LIFF_URL = 'https://liff.line.me/test'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  // We import dynamically so each test can use fresh env
  async function getLineService() {
    // Re-import to pick up env changes
    const mod = await import('../lineService.js')
    return mod.lineService
  }

  describe('pushMessage', () => {
    it('should return false when token is empty', async () => {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = ''
      // Need fresh import to reset token cache
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.pushMessage('user-1', [{ type: 'text', text: 'Hello' }])
      expect(result).toBe(false)
    })

    it('should call LINE push API with correct params', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.pushMessage('user-1', [{ type: 'text', text: 'Hello' }])

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/push',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token-123',
          }),
        })
      )
      expect(result).toBe(true)
    })

    it('should return false when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'Error' }),
      })
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.pushMessage('user-1', [{ type: 'text', text: 'Hello' }])
      expect(result).toBe(false)
    })

    it('should return false when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.pushMessage('user-1', [{ type: 'text', text: 'Hello' }])
      expect(result).toBe(false)
    })
  })

  describe('multicast', () => {
    it('should return false when no user IDs provided', async () => {
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.multicast([], [{ type: 'text', text: 'Hello' }])
      expect(result).toBe(false)
    })

    it('should call LINE multicast API', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.multicast(
        ['user-1', 'user-2'],
        [{ type: 'text', text: 'Hello' }]
      )

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/multicast',
        expect.objectContaining({ method: 'POST' })
      )
      expect(result).toBe(true)
    })
  })

  describe('sendNewJobToStaff', () => {
    it('should return true when no user IDs (no-op)', async () => {
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.sendNewJobToStaff([], {
        serviceName: 'Massage',
        scheduledDate: '2026-03-10',
        scheduledTime: '14:00',
        address: '123 Street',
        staffEarnings: 500,
        durationMinutes: 60,
      })
      expect(result).toBe(true)
    })

    it('should send notification with correct message format', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      await lineService.sendNewJobToStaff(['user-1'], {
        serviceName: 'Thai Massage',
        scheduledDate: '10 March 2026',
        scheduledTime: '14:00',
        address: '123 Bangkok',
        staffEarnings: 500,
        durationMinutes: 90,
        jobIds: ['job-1'],
      })

      expect(mockFetch).toHaveBeenCalled()
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages[0].text).toContain('Thai Massage')
      expect(callBody.messages[0].text).toContain('500')
    })
  })

  describe('sendNewBookingToAdmin', () => {
    it('should return true when no user IDs', async () => {
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.sendNewBookingToAdmin([], {
        bookingNumber: 'BK-001',
        customerName: 'John',
        serviceName: 'Massage',
        scheduledDate: '2026-03-10',
        scheduledTime: '14:00',
        finalPrice: 2000,
        isHotelBooking: false,
      })
      expect(result).toBe(true)
    })

    it('should send push to each admin individually', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      await lineService.sendNewBookingToAdmin(['admin-1', 'admin-2'], {
        bookingNumber: 'BK-001',
        customerName: 'John',
        serviceName: 'Massage',
        scheduledDate: '2026-03-10',
        scheduledTime: '14:00',
        finalPrice: 2000,
        isHotelBooking: false,
      })

      // Should call push for each admin
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('sendBookingCancelledToStaff', () => {
    it('should return true when no user IDs', async () => {
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.sendBookingCancelledToStaff([], {
        serviceName: 'Massage',
        scheduledDate: '2026-03-10',
        scheduledTime: '14:00',
        address: '123 Street',
        cancellationReason: 'Changed plans',
      })
      expect(result).toBe(true)
    })
  })

  describe('sendBookingCancelledToAdmin', () => {
    it('should return true when no user IDs', async () => {
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.sendBookingCancelledToAdmin([], {
        bookingNumber: 'BK-001',
        customerName: 'John',
        serviceName: 'Massage',
        scheduledDate: '2026-03-10',
        scheduledTime: '14:00',
        cancellationReason: 'Changed plans',
      })
      expect(result).toBe(true)
    })
  })

  describe('sendJobReminderToStaff', () => {
    it('should call pushMessage with reminder text', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      const result = await lineService.sendJobReminderToStaff('staff-1', {
        serviceName: 'Massage',
        scheduledDate: '2026-03-10',
        scheduledTime: '14:00',
        address: '123 Street',
        staffEarnings: 500,
        durationMinutes: 60,
        customerName: 'John',
        jobId: 'job-1',
        minutesBefore: 60,
      })

      expect(mockFetch).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe('lineService exports', () => {
    it('should export all expected methods', async () => {
      vi.resetModules()
      const lineService = (await import('../lineService.js')).lineService

      expect(typeof lineService.pushMessage).toBe('function')
      expect(typeof lineService.multicast).toBe('function')
      expect(typeof lineService.sendNewJobToStaff).toBe('function')
      expect(typeof lineService.sendNewBookingToAdmin).toBe('function')
      expect(typeof lineService.sendJobReAvailableToStaff).toBe('function')
      expect(typeof lineService.sendJobCancelledToAdmin).toBe('function')
      expect(typeof lineService.sendBookingCancelledToStaff).toBe('function')
      expect(typeof lineService.sendBookingCancelledToAdmin).toBe('function')
      expect(typeof lineService.sendBookingRescheduledToStaff).toBe('function')
      expect(typeof lineService.sendJobReminderToStaff).toBe('function')
      expect(typeof lineService.sendJobEscalationToStaff).toBe('function')
      expect(typeof lineService.sendPayoutCompletedToStaff).toBe('function')
    })
  })
})
