import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateOTP,
  storeOTP,
  verifyOTP,
  hasValidOTP,
  getRemainingTime,
  clearOTP,
  canResendOTP,
} from '../otpService'

describe('otpService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-19T10:00:00Z'))
  })

  afterEach(() => {
    clearOTP('0891234567')
    clearOTP('0899999999')
    vi.useRealTimers()
  })

  describe('generateOTP', () => {
    it('should generate a 6-digit string', () => {
      const otp = generateOTP()
      expect(otp).toHaveLength(6)
      expect(/^\d{6}$/.test(otp)).toBe(true)
    })

    it('should generate numbers between 100000 and 999999', () => {
      for (let i = 0; i < 50; i++) {
        const otp = generateOTP()
        const num = parseInt(otp, 10)
        expect(num).toBeGreaterThanOrEqual(100000)
        expect(num).toBeLessThanOrEqual(999999)
      }
    })

    it('should generate different OTPs (not always the same)', () => {
      const otps = new Set<string>()
      for (let i = 0; i < 20; i++) {
        otps.add(generateOTP())
      }
      expect(otps.size).toBeGreaterThan(1)
    })
  })

  describe('storeOTP', () => {
    it('should store OTP and make it retrievable via hasValidOTP', () => {
      storeOTP('0891234567', '123456')
      expect(hasValidOTP('0891234567')).toBe(true)
    })

    it('should overwrite previous OTP for same phone', () => {
      storeOTP('0891234567', '111111')
      storeOTP('0891234567', '222222')
      const result = verifyOTP('0891234567', '222222')
      expect(result.success).toBe(true)
    })
  })

  describe('verifyOTP', () => {
    it('should succeed with correct code', () => {
      storeOTP('0891234567', '123456')
      const result = verifyOTP('0891234567', '123456')
      expect(result).toEqual({ success: true })
    })

    it('should fail with incorrect code', () => {
      storeOTP('0891234567', '123456')
      const result = verifyOTP('0891234567', '999999')
      expect(result).toEqual({ success: false, error: 'Invalid OTP code' })
    })

    it('should fail when OTP not found', () => {
      const result = verifyOTP('0000000000', '123456')
      expect(result).toEqual({ success: false, error: 'OTP not found or expired' })
    })

    it('should fail when OTP is expired', () => {
      storeOTP('0891234567', '123456')
      // Advance time past 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)
      const result = verifyOTP('0891234567', '123456')
      // setTimeout auto-cleanup fires when fake timers advance past 5min,
      // deleting the OTP before verifyOTP can check expiry
      expect(result).toEqual({ success: false, error: 'OTP not found or expired' })
    })

    it('should fail after 3 failed attempts', () => {
      storeOTP('0891234567', '123456')
      verifyOTP('0891234567', '000001')
      verifyOTP('0891234567', '000002')
      verifyOTP('0891234567', '000003')
      const result = verifyOTP('0891234567', '123456')
      expect(result).toEqual({ success: false, error: 'Too many failed attempts' })
    })

    it('should increment attempts on wrong code', () => {
      storeOTP('0891234567', '123456')
      verifyOTP('0891234567', '000001')
      verifyOTP('0891234567', '000002')
      // Third attempt with correct code should still work
      const result = verifyOTP('0891234567', '123456')
      expect(result.success).toBe(true)
    })

    it('should delete OTP after successful verification', () => {
      storeOTP('0891234567', '123456')
      verifyOTP('0891234567', '123456')
      expect(hasValidOTP('0891234567')).toBe(false)
    })

    it('should delete OTP after expiry check', () => {
      storeOTP('0891234567', '123456')
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)
      verifyOTP('0891234567', '123456')
      expect(hasValidOTP('0891234567')).toBe(false)
    })
  })

  describe('hasValidOTP', () => {
    it('should return true for valid non-expired OTP', () => {
      storeOTP('0891234567', '123456')
      expect(hasValidOTP('0891234567')).toBe(true)
    })

    it('should return false for non-existent phone', () => {
      expect(hasValidOTP('0000000000')).toBe(false)
    })

    it('should return false for expired OTP', () => {
      storeOTP('0891234567', '123456')
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)
      expect(hasValidOTP('0891234567')).toBe(false)
    })
  })

  describe('getRemainingTime', () => {
    it('should return remaining seconds', () => {
      storeOTP('0891234567', '123456')
      // Advance 1 minute
      vi.advanceTimersByTime(60 * 1000)
      const remaining = getRemainingTime('0891234567')
      expect(remaining).toBe(4 * 60) // 4 minutes left
    })

    it('should return 0 for non-existent phone', () => {
      expect(getRemainingTime('0000000000')).toBe(0)
    })

    it('should return 0 for expired OTP', () => {
      storeOTP('0891234567', '123456')
      vi.advanceTimersByTime(6 * 60 * 1000)
      expect(getRemainingTime('0891234567')).toBe(0)
    })

    it('should return full time when just stored', () => {
      storeOTP('0891234567', '123456')
      const remaining = getRemainingTime('0891234567')
      expect(remaining).toBe(5 * 60) // 5 minutes
    })
  })

  describe('clearOTP', () => {
    it('should remove stored OTP', () => {
      storeOTP('0891234567', '123456')
      clearOTP('0891234567')
      expect(hasValidOTP('0891234567')).toBe(false)
    })

    it('should not throw when clearing non-existent OTP', () => {
      expect(() => clearOTP('0000000000')).not.toThrow()
    })
  })

  describe('canResendOTP', () => {
    it('should return true when no OTP exists', () => {
      expect(canResendOTP('0891234567')).toBe(true)
    })

    it('should return false within cooldown period (60s)', () => {
      storeOTP('0891234567', '123456')
      expect(canResendOTP('0891234567')).toBe(false)
    })

    it('should return false at 30 seconds', () => {
      storeOTP('0891234567', '123456')
      vi.advanceTimersByTime(30 * 1000)
      expect(canResendOTP('0891234567')).toBe(false)
    })

    it('should return true after cooldown period', () => {
      storeOTP('0891234567', '123456')
      vi.advanceTimersByTime(61 * 1000)
      expect(canResendOTP('0891234567')).toBe(true)
    })
  })
})
