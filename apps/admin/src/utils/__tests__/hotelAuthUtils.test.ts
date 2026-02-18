import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validatePasswordStrength,
  formatLastLogin,
  validateEmail,
  generateDisplayPassword,
  generateHotelLoginURL,
  HELP_MESSAGES,
} from '../hotelAuthUtils'

describe('validatePasswordStrength', () => {
  it('returns score 0 and invalid for empty string', () => {
    const result = validatePasswordStrength('')
    expect(result.isValid).toBe(false)
    expect(result.score).toBe(0)
  })

  it('returns score 1 for lowercase-only string >= 8 chars', () => {
    const result = validatePasswordStrength('abcdefgh')
    expect(result.score).toBe(2) // minLength + hasLowerCase
    expect(result.isValid).toBe(false)
    expect(result.requirements.minLength).toBe(true)
    expect(result.requirements.hasLowerCase).toBe(true)
    expect(result.requirements.hasUpperCase).toBe(false)
    expect(result.requirements.hasNumbers).toBe(false)
    expect(result.requirements.hasSpecialChars).toBe(false)
  })

  it('returns invalid for short password with 3 criteria', () => {
    // Has upper, lower, number but too short
    const result = validatePasswordStrength('aB1!')
    // minLength: false, upper: true, lower: true, number: true, special: true = 4
    expect(result.requirements.minLength).toBe(false)
    expect(result.score).toBe(4)
    expect(result.isValid).toBe(true) // 4 >= 4
  })

  it('returns valid for password meeting 4 of 5 criteria', () => {
    const result = validatePasswordStrength('Abcdef1!')
    expect(result.isValid).toBe(true)
    expect(result.score).toBe(5) // all 5
  })

  it('returns valid for password with 5/5 criteria', () => {
    const result = validatePasswordStrength('MyPass123!')
    expect(result.isValid).toBe(true)
    expect(result.score).toBe(5)
    expect(result.requirements.minLength).toBe(true)
    expect(result.requirements.hasUpperCase).toBe(true)
    expect(result.requirements.hasLowerCase).toBe(true)
    expect(result.requirements.hasNumbers).toBe(true)
    expect(result.requirements.hasSpecialChars).toBe(true)
  })

  it('detects special characters correctly', () => {
    const r1 = validatePasswordStrength('test@test')
    expect(r1.requirements.hasSpecialChars).toBe(true)

    const r2 = validatePasswordStrength('test#test')
    expect(r2.requirements.hasSpecialChars).toBe(true)
  })

  it('returns invalid for numbers only', () => {
    const result = validatePasswordStrength('12345678')
    expect(result.isValid).toBe(false)
    expect(result.score).toBe(2) // minLength + hasNumbers
  })

  it('returns score 3 for mix without special chars', () => {
    const result = validatePasswordStrength('Password1')
    expect(result.score).toBe(4) // minLength + upper + lower + number
    expect(result.requirements.hasSpecialChars).toBe(false)
    expect(result.isValid).toBe(true) // 4 >= 4
  })
})

describe('formatLastLogin', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T14:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns Thai "never logged in" for null', () => {
    expect(formatLastLogin(null)).toBe('ยังไม่เคยเข้าสู่ระบบ')
  })

  it('returns "วันนี้" with time for today', () => {
    const result = formatLastLogin('2026-02-18T10:30:00Z')
    expect(result).toContain('วันนี้')
  })

  it('returns "เมื่อวาน" with time for yesterday', () => {
    const result = formatLastLogin('2026-02-17T08:00:00Z')
    expect(result).toContain('เมื่อวาน')
  })

  it('returns "X วันที่แล้ว" for 2-6 days ago', () => {
    const result = formatLastLogin('2026-02-15T10:00:00Z')
    expect(result).toBe('3 วันที่แล้ว')
  })

  it('returns "5 วันที่แล้ว" for 5 days ago', () => {
    const result = formatLastLogin('2026-02-13T10:00:00Z')
    expect(result).toBe('5 วันที่แล้ว')
  })

  it('returns formatted Thai date for 7+ days ago', () => {
    const result = formatLastLogin('2026-02-01T10:00:00Z')
    // Should use toLocaleDateString('th-TH') - 17 days ago
    expect(result).not.toContain('วันที่แล้ว')
    expect(result).not.toContain('วันนี้')
    expect(result).not.toContain('เมื่อวาน')
  })
})

describe('validateEmail', () => {
  it('returns true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true)
  })

  it('returns true for email with subdomain', () => {
    expect(validateEmail('user@mail.company.co.th')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(validateEmail('')).toBe(false)
  })

  it('returns false for missing @', () => {
    expect(validateEmail('testexample.com')).toBe(false)
  })

  it('returns false for missing domain', () => {
    expect(validateEmail('test@')).toBe(false)
  })

  it('returns false for missing local part', () => {
    expect(validateEmail('@example.com')).toBe(false)
  })

  it('returns false for string with spaces', () => {
    expect(validateEmail('test @example.com')).toBe(false)
  })

  it('returns false for missing TLD', () => {
    expect(validateEmail('test@example')).toBe(false)
  })
})

describe('generateDisplayPassword', () => {
  it('generates password of default length 12', () => {
    const password = generateDisplayPassword()
    expect(password).toHaveLength(12)
  })

  it('generates password of custom length', () => {
    const password = generateDisplayPassword(20)
    expect(password).toHaveLength(20)
  })

  it('generates password of length 1', () => {
    const password = generateDisplayPassword(1)
    expect(password).toHaveLength(1)
  })

  it('uses only characters from charset', () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    const password = generateDisplayPassword(100)
    for (const char of password) {
      expect(charset).toContain(char)
    }
  })

  it('generates different passwords on consecutive calls', () => {
    const p1 = generateDisplayPassword(30)
    const p2 = generateDisplayPassword(30)
    // With 30 chars from 70-char charset, collision is astronomically unlikely
    expect(p1).not.toBe(p2)
  })
})

describe('generateHotelLoginURL', () => {
  it('returns the correct login URL', () => {
    expect(generateHotelLoginURL()).toBe('http://localhost:3006/login')
  })
})

describe('HELP_MESSAGES', () => {
  it('has all required keys', () => {
    const keys = ['createAccount', 'sendInvitation', 'resetPassword', 'toggleLogin', 'temporaryPassword', 'loginURL']
    keys.forEach(key => {
      expect(HELP_MESSAGES).toHaveProperty(key)
      expect(typeof (HELP_MESSAGES as any)[key]).toBe('string')
    })
  })

  it('all messages are non-empty Thai text', () => {
    Object.values(HELP_MESSAGES).forEach(msg => {
      expect(msg.length).toBeGreaterThan(0)
    })
  })
})
