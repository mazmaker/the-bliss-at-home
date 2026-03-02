import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock global fetch for Resend API
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  sendEmail,
  emailService,
  bookingCancellationTemplate,
  hotelBookingCancellationTemplate,
  staffJobCancellationTemplate,
  receiptEmailTemplate,
  creditNoteEmailTemplate,
} from '../emailService'

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  describe('sendEmail - development mode (no RESEND_API_KEY)', () => {
    it('should log email in dev mode and return success', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
      })
      expect(result.success).toBe(true)
      consoleSpy.mockRestore()
    })

    it('should handle array of recipients', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const result = await sendEmail({
        to: ['a@test.com', 'b@test.com'],
        subject: 'Multi',
        html: '<p>Hi</p>',
      })
      expect(result.success).toBe(true)
      consoleSpy.mockRestore()
    })
  })

  describe('sendEmail - production mode (with RESEND_API_KEY)', () => {
    beforeEach(() => {
      vi.stubEnv('RESEND_API_KEY', 'test-key-123')
    })

    it('should send via Resend API and return success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email-001' }),
      })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>World</p>',
      })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key-123',
          }),
        })
      )
      consoleSpy.mockRestore()
    })

    it('should return error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid API key' }),
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Fail',
        html: '<p>Test</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid API key')
      consoleSpy.mockRestore()
    })

    it('should handle fetch exception', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Fail',
        html: '<p>Test</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      consoleSpy.mockRestore()
    })
  })

  describe('bookingCancellationTemplate', () => {
    it('should generate cancellation email with refund', () => {
      const html = bookingCancellationTemplate({
        customerName: 'สมชาย',
        bookingNumber: 'BK-001',
        serviceName: 'นวดไทย',
        bookingDate: '20 ก.พ. 2569',
        bookingTime: '14:00',
        cancellationReason: 'ลูกค้ายกเลิก',
        refundAmount: 500,
        refundPercentage: 50,
      })

      expect(html).toContain('สมชาย')
      expect(html).toContain('BK-001')
      expect(html).toContain('นวดไทย')
      expect(html).toContain('50%')
    })

    it('should generate cancellation email without refund', () => {
      const html = bookingCancellationTemplate({
        customerName: 'Test',
        bookingNumber: 'BK-002',
        serviceName: 'Massage',
        bookingDate: '2026-02-20',
        bookingTime: '10:00',
        cancellationReason: 'Late cancellation',
      })

      expect(html).toContain('ไม่มีการคืนเงิน')
    })
  })

  describe('hotelBookingCancellationTemplate', () => {
    it('should generate hotel notification email', () => {
      const html = hotelBookingCancellationTemplate({
        hotelName: 'Grand Hotel',
        bookingNumber: 'BK-003',
        customerName: 'John',
        serviceName: 'Thai Massage',
        bookingDate: '2026-02-20',
        bookingTime: '14:00',
        roomNumber: '301',
        cancellationReason: 'Customer cancelled',
      })

      expect(html).toContain('Grand Hotel')
      expect(html).toContain('Room Number')
      expect(html).toContain('301')
    })
  })

  describe('staffJobCancellationTemplate', () => {
    it('should generate staff cancellation notification', () => {
      const html = staffJobCancellationTemplate({
        staffName: 'สมศรี',
        bookingNumber: 'BK-004',
        serviceName: 'นวดน้ำมัน',
        bookingDate: '20 ก.พ.',
        bookingTime: '15:00',
        customerName: 'สมชาย',
        location: 'Grand Hotel',
        cancellationReason: 'ลูกค้ายกเลิก',
      })

      expect(html).toContain('สมศรี')
      expect(html).toContain('แจ้งยกเลิกงาน')
    })
  })

  describe('emailService object', () => {
    it('should expose sendEmail function', () => {
      expect(typeof emailService.sendEmail).toBe('function')
    })

    it('should expose template functions', () => {
      expect(typeof emailService.templates.bookingCancellation).toBe('function')
      expect(typeof emailService.templates.hotelBookingCancellation).toBe('function')
      expect(typeof emailService.templates.staffJobCancellation).toBe('function')
      expect(typeof emailService.templates.receipt).toBe('function')
      expect(typeof emailService.templates.creditNote).toBe('function')
    })
  })
})
