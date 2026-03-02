import { describe, it, expect } from 'vitest'
import {
  getProviderPreferenceLabel,
  getProviderPreferenceBadgeStyle,
  isSpecificPreference,
  isJobMatchingStaffGender,
} from '../providerPreference'

// ============================================
// getProviderPreferenceLabel
// ============================================
describe('getProviderPreferenceLabel', () => {
  it('returns Thai label for female-only', () => {
    expect(getProviderPreferenceLabel('female-only')).toBe('ผู้หญิงเท่านั้น')
  })

  it('returns Thai label for male-only', () => {
    expect(getProviderPreferenceLabel('male-only')).toBe('ผู้ชายเท่านั้น')
  })

  it('returns Thai label for prefer-female', () => {
    expect(getProviderPreferenceLabel('prefer-female')).toBe('ต้องการผู้หญิง')
  })

  it('returns Thai label for prefer-male', () => {
    expect(getProviderPreferenceLabel('prefer-male')).toBe('ต้องการผู้ชาย')
  })

  it('returns default label for no-preference', () => {
    expect(getProviderPreferenceLabel('no-preference')).toBe('ไม่ระบุ')
  })

  it('returns default label for null', () => {
    expect(getProviderPreferenceLabel(null)).toBe('ไม่ระบุ')
  })

  it('returns default label for undefined', () => {
    expect(getProviderPreferenceLabel(undefined)).toBe('ไม่ระบุ')
  })

  it('returns default label for empty string', () => {
    expect(getProviderPreferenceLabel('')).toBe('ไม่ระบุ')
  })

  it('returns default label for unknown value', () => {
    expect(getProviderPreferenceLabel('unknown-value')).toBe('ไม่ระบุ')
  })
})

// ============================================
// getProviderPreferenceBadgeStyle
// ============================================
describe('getProviderPreferenceBadgeStyle', () => {
  it('returns pink style for female-only', () => {
    expect(getProviderPreferenceBadgeStyle('female-only')).toBe('bg-pink-100 text-pink-700')
  })

  it('returns blue style for male-only', () => {
    expect(getProviderPreferenceBadgeStyle('male-only')).toBe('bg-blue-100 text-blue-700')
  })

  it('returns lighter pink style for prefer-female', () => {
    expect(getProviderPreferenceBadgeStyle('prefer-female')).toBe('bg-pink-50 text-pink-600')
  })

  it('returns lighter blue style for prefer-male', () => {
    expect(getProviderPreferenceBadgeStyle('prefer-male')).toBe('bg-blue-50 text-blue-600')
  })

  it('returns gray style for no-preference', () => {
    expect(getProviderPreferenceBadgeStyle('no-preference')).toBe('bg-gray-100 text-gray-700')
  })

  it('returns gray style for null', () => {
    expect(getProviderPreferenceBadgeStyle(null)).toBe('bg-gray-100 text-gray-700')
  })

  it('returns gray style for undefined', () => {
    expect(getProviderPreferenceBadgeStyle(undefined)).toBe('bg-gray-100 text-gray-700')
  })
})

// ============================================
// isSpecificPreference
// ============================================
describe('isSpecificPreference', () => {
  it('returns true for female-only', () => {
    expect(isSpecificPreference('female-only')).toBe(true)
  })

  it('returns true for male-only', () => {
    expect(isSpecificPreference('male-only')).toBe(true)
  })

  it('returns true for prefer-female', () => {
    expect(isSpecificPreference('prefer-female')).toBe(true)
  })

  it('returns true for prefer-male', () => {
    expect(isSpecificPreference('prefer-male')).toBe(true)
  })

  it('returns false for no-preference', () => {
    expect(isSpecificPreference('no-preference')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isSpecificPreference(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isSpecificPreference(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSpecificPreference('')).toBe(false)
  })
})

// ============================================
// isJobMatchingStaffGender
// ============================================
describe('isJobMatchingStaffGender', () => {
  // No preference - always match
  it('matches any gender when no-preference', () => {
    expect(isJobMatchingStaffGender('no-preference', 'female')).toBe(true)
    expect(isJobMatchingStaffGender('no-preference', 'male')).toBe(true)
    expect(isJobMatchingStaffGender('no-preference', null)).toBe(true)
  })

  it('matches any gender when null preference', () => {
    expect(isJobMatchingStaffGender(null, 'female')).toBe(true)
    expect(isJobMatchingStaffGender(null, 'male')).toBe(true)
  })

  it('matches any gender when undefined preference', () => {
    expect(isJobMatchingStaffGender(undefined, 'female')).toBe(true)
    expect(isJobMatchingStaffGender(undefined, 'male')).toBe(true)
  })

  // Soft preferences - always match
  it('matches any gender for prefer-female (soft preference)', () => {
    expect(isJobMatchingStaffGender('prefer-female', 'female')).toBe(true)
    expect(isJobMatchingStaffGender('prefer-female', 'male')).toBe(true)
    expect(isJobMatchingStaffGender('prefer-female', null)).toBe(true)
  })

  it('matches any gender for prefer-male (soft preference)', () => {
    expect(isJobMatchingStaffGender('prefer-male', 'female')).toBe(true)
    expect(isJobMatchingStaffGender('prefer-male', 'male')).toBe(true)
    expect(isJobMatchingStaffGender('prefer-male', null)).toBe(true)
  })

  // Hard requirements - strict match
  it('female-only matches only female staff', () => {
    expect(isJobMatchingStaffGender('female-only', 'female')).toBe(true)
    expect(isJobMatchingStaffGender('female-only', 'male')).toBe(false)
  })

  it('female-only rejects null/undefined gender', () => {
    expect(isJobMatchingStaffGender('female-only', null)).toBe(false)
    expect(isJobMatchingStaffGender('female-only', undefined)).toBe(false)
  })

  it('male-only matches only male staff', () => {
    expect(isJobMatchingStaffGender('male-only', 'male')).toBe(true)
    expect(isJobMatchingStaffGender('male-only', 'female')).toBe(false)
  })

  it('male-only rejects null/undefined gender', () => {
    expect(isJobMatchingStaffGender('male-only', null)).toBe(false)
    expect(isJobMatchingStaffGender('male-only', undefined)).toBe(false)
  })
})
