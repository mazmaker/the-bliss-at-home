import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock twilio before import
vi.mock('twilio', () => {
  const mockCreate = vi.fn().mockResolvedValue({ sid: 'SM_TEST_123' })
  return {
    default: vi.fn(() => ({
      messages: { create: mockCreate },
    })),
  }
})

import { formatPhoneNumber, smsService } from '../smsService'

describe('smsService', () => {
  describe('formatPhoneNumber', () => {
    it('should convert Thai mobile starting with 0 to +66', () => {
      expect(formatPhoneNumber('0891234567')).toBe('+66891234567')
    })

    it('should handle number starting with 06', () => {
      expect(formatPhoneNumber('0612345678')).toBe('+66612345678')
    })

    it('should handle number starting with 09', () => {
      expect(formatPhoneNumber('0912345678')).toBe('+66912345678')
    })

    it('should add + to numbers starting with 66', () => {
      expect(formatPhoneNumber('66891234567')).toBe('+66891234567')
    })

    it('should strip non-numeric characters', () => {
      expect(formatPhoneNumber('089-123-4567')).toBe('+66891234567')
    })

    it('should strip spaces', () => {
      expect(formatPhoneNumber('089 123 4567')).toBe('+66891234567')
    })

    it('should strip parentheses and dashes', () => {
      expect(formatPhoneNumber('(089) 123-4567')).toBe('+66891234567')
    })

    it('should handle already formatted +66 number', () => {
      // Since it strips +, then sees 66..., adds +
      expect(formatPhoneNumber('+66891234567')).toBe('+66891234567')
    })

    it('should prepend +66 to numbers not starting with 0 or 66', () => {
      expect(formatPhoneNumber('891234567')).toBe('+66891234567')
    })

    it('should handle empty-ish input gracefully', () => {
      const result = formatPhoneNumber('')
      expect(result).toBe('+66')
    })
  })

  describe('sendOTP', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('should return true in development mode', async () => {
      const result = await smsService.sendOTP('0891234567', '123456')
      expect(result).toBe(true)
    })
  })

  describe('sendBookingConfirmation', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('should return true in development mode', async () => {
      const result = await smsService.sendBookingConfirmation(
        '0891234567',
        'BK-2026001',
        'Thai Massage',
        '2026-02-20 14:00'
      )
      expect(result).toBe(true)
    })
  })
})
