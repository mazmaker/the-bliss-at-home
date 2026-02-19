// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn() },
  writable: true,
  configurable: true,
})

import {
  createHotelAccount,
  sendHotelInvitation,
  resetHotelPassword,
  toggleHotelLoginAccess,
  generateDisplayPassword,
  validatePasswordStrength,
  formatLastLogin,
  validateEmail,
  generateHotelLoginURL,
  copyToClipboard,
  HELP_MESSAGES,
} from '../hotelAuthUtils'

describe('hotelAuthUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createHotelAccount', () => {
    it('returns success with user data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          userId: 'u1', temporaryPassword: 'Temp123!', loginEmail: 'hotel@test.com',
        }),
      })

      const result = await createHotelAccount({
        hotelId: 'h1', email: 'hotel@test.com', name: 'Test Hotel',
      })

      expect(result.success).toBe(true)
      expect(result.userId).toBe('u1')
      expect(result.temporaryPassword).toBe('Temp123!')
      expect(result.loginEmail).toBe('hotel@test.com')
    })

    it('sends correct request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await createHotelAccount({ hotelId: 'h1', email: 'a@b.com', name: 'Test' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/create-account'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      )
    })

    it('returns error on server failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Email already exists' }),
      })

      const result = await createHotelAccount({ hotelId: 'h1', email: 'dup@test.com', name: 'T' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Email already exists')
    })

    it('returns default error when no error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })

      const result = await createHotelAccount({ hotelId: 'h1', email: 'a@b.com', name: 'T' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('ไม่สามารถสร้างบัญชีได้')
    })

    it('handles network error with message', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      const result = await createHotelAccount({ hotelId: 'h1', email: 'a@b.com', name: 'T' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('handles error without message', async () => {
      mockFetch.mockRejectedValue({})
      const result = await createHotelAccount({ hotelId: 'h1', email: 'a@b.com', name: 'T' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์')
    })
  })

  describe('sendHotelInvitation', () => {
    it('returns success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sent: true }),
      })
      const result = await sendHotelInvitation('h1')
      expect(result.success).toBe(true)
    })

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      })
      const result = await sendHotelInvitation('h1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed')
    })

    it('returns default error when no message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })
      const result = await sendHotelInvitation('h1')
      expect(result.error).toBe('ไม่สามารถส่งอีเมลได้')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValue(new Error('Refused'))
      const result = await sendHotelInvitation('h1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Refused')
    })

    it('handles error without message', async () => {
      mockFetch.mockRejectedValue({})
      const result = await sendHotelInvitation('h1')
      expect(result.error).toBe('เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์')
    })
  })

  describe('resetHotelPassword', () => {
    it('returns new temporary password', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ temporaryPassword: 'NewPass123!' }),
      })
      const result = await resetHotelPassword('h1')
      expect(result.success).toBe(true)
      expect(result.data?.temporaryPassword).toBe('NewPass123!')
    })

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      })
      const result = await resetHotelPassword('h1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Not found')
    })

    it('returns default error when no message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })
      const result = await resetHotelPassword('h1')
      expect(result.error).toBe('ไม่สามารถรีเซ็ตรหัสผ่านได้')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValue(new Error('Timeout'))
      const result = await resetHotelPassword('h1')
      expect(result.success).toBe(false)
    })

    it('handles error without message', async () => {
      mockFetch.mockRejectedValue({})
      const result = await resetHotelPassword('h1')
      expect(result.error).toBe('เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์')
    })
  })

  describe('toggleHotelLoginAccess', () => {
    it('returns success when enabling', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ enabled: true }),
      })
      const result = await toggleHotelLoginAccess('h1', true)
      expect(result.success).toBe(true)
    })

    it('returns success when disabling', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ enabled: false }),
      })
      const result = await toggleHotelLoginAccess('h1', false)
      expect(result.success).toBe(true)
    })

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      })
      const result = await toggleHotelLoginAccess('h1', true)
      expect(result.success).toBe(false)
    })

    it('returns default error when no message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })
      const result = await toggleHotelLoginAccess('h1', true)
      expect(result.error).toBe('ไม่สามารถเปลี่ยนสถานะได้')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValue(new Error('Offline'))
      const result = await toggleHotelLoginAccess('h1', true)
      expect(result.success).toBe(false)
    })

    it('handles error without message', async () => {
      mockFetch.mockRejectedValue({})
      const result = await toggleHotelLoginAccess('h1', true)
      expect(result.error).toBe('เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์')
    })
  })

  describe('generateDisplayPassword', () => {
    it('generates password with default length 12', () => {
      expect(generateDisplayPassword()).toHaveLength(12)
    })

    it('generates password with custom length', () => {
      expect(generateDisplayPassword(20)).toHaveLength(20)
      expect(generateDisplayPassword(1)).toHaveLength(1)
    })

    it('uses valid characters from charset', () => {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
      const pwd = generateDisplayPassword(100)
      for (const c of pwd) {
        expect(charset).toContain(c)
      }
    })

    it('generates different passwords', () => {
      expect(generateDisplayPassword(30)).not.toBe(generateDisplayPassword(30))
    })
  })

  describe('validatePasswordStrength', () => {
    it('returns all true for strong password', () => {
      const r = validatePasswordStrength('MyPass123!')
      expect(r.isValid).toBe(true)
      expect(r.score).toBe(5)
      expect(r.requirements.minLength).toBe(true)
      expect(r.requirements.hasUpperCase).toBe(true)
      expect(r.requirements.hasLowerCase).toBe(true)
      expect(r.requirements.hasNumbers).toBe(true)
      expect(r.requirements.hasSpecialChars).toBe(true)
    })

    it('returns invalid for empty', () => {
      const r = validatePasswordStrength('')
      expect(r.isValid).toBe(false)
      expect(r.score).toBe(0)
    })

    it('returns invalid for short lowercase', () => {
      const r = validatePasswordStrength('abc')
      expect(r.isValid).toBe(false)
      expect(r.requirements.minLength).toBe(false)
      expect(r.requirements.hasLowerCase).toBe(true)
    })

    it('validates 4/5 as valid', () => {
      const r = validatePasswordStrength('mypass123!')
      expect(r.score).toBe(4) // minLength + lower + numbers + special
      expect(r.isValid).toBe(true)
    })

    it('validates 3/5 as invalid', () => {
      const r = validatePasswordStrength('abcdefgh')
      expect(r.score).toBe(2) // minLength + lower
      expect(r.isValid).toBe(false)
    })
  })

  describe('formatLastLogin', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-19T14:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns never logged in for null', () => {
      expect(formatLastLogin(null)).toBe('ยังไม่เคยเข้าสู่ระบบ')
    })

    it('returns today for same day', () => {
      expect(formatLastLogin('2026-02-19T10:30:00Z')).toContain('วันนี้')
    })

    it('returns yesterday', () => {
      expect(formatLastLogin('2026-02-18T08:00:00Z')).toContain('เมื่อวาน')
    })

    it('returns days ago for 2-6 days', () => {
      expect(formatLastLogin('2026-02-16T10:00:00Z')).toBe('3 วันที่แล้ว')
    })

    it('returns full date for 7+ days', () => {
      const r = formatLastLogin('2026-02-01T10:00:00Z')
      expect(r).not.toContain('วันที่แล้ว')
      expect(r).not.toContain('วันนี้')
    })
  })

  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user@mail.co.th')).toBe(true)
    })

    it('rejects invalid emails', () => {
      expect(validateEmail('')).toBe(false)
      expect(validateEmail('notanemail')).toBe(false)
      expect(validateEmail('a@')).toBe(false)
      expect(validateEmail('@b.com')).toBe(false)
      expect(validateEmail('a b@c.com')).toBe(false)
      expect(validateEmail('test@example')).toBe(false)
    })
  })

  describe('generateHotelLoginURL', () => {
    it('returns login URL', () => {
      expect(generateHotelLoginURL()).toBe('http://localhost:3006/login')
    })
  })

  describe('copyToClipboard', () => {
    it('returns true on success', async () => {
      (navigator.clipboard.writeText as any) = vi.fn().mockResolvedValue(undefined)
      expect(await copyToClipboard('hello')).toBe(true)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello')
    })

    it('returns false on failure', async () => {
      (navigator.clipboard.writeText as any) = vi.fn().mockRejectedValue(new Error('Denied'))
      expect(await copyToClipboard('hello')).toBe(false)
    })
  })

  describe('HELP_MESSAGES', () => {
    it('has all keys', () => {
      expect(HELP_MESSAGES.createAccount).toBeDefined()
      expect(HELP_MESSAGES.sendInvitation).toBeDefined()
      expect(HELP_MESSAGES.resetPassword).toBeDefined()
      expect(HELP_MESSAGES.toggleLogin).toBeDefined()
      expect(HELP_MESSAGES.temporaryPassword).toBeDefined()
      expect(HELP_MESSAGES.loginURL).toBeDefined()
    })

    it('all messages are non-empty', () => {
      Object.values(HELP_MESSAGES).forEach(msg => {
        expect(msg.length).toBeGreaterThan(0)
      })
    })
  })
})
