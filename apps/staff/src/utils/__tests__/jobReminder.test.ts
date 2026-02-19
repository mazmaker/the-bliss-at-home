import { describe, it, expect } from 'vitest'
import { REMINDER_OPTIONS } from '../jobReminder'

describe('jobReminder', () => {
  describe('REMINDER_OPTIONS', () => {
    it('should have 4 reminder options', () => {
      expect(REMINDER_OPTIONS).toHaveLength(4)
    })

    it('should have values in ascending order', () => {
      const values = REMINDER_OPTIONS.map(o => o.value)
      expect(values).toEqual([30, 60, 120, 1440])
    })

    it('should have Thai labels for all options', () => {
      REMINDER_OPTIONS.forEach(option => {
        expect(option.label).toBeTruthy()
        expect(typeof option.label).toBe('string')
      })
    })

    it('should have English labels for all options', () => {
      REMINDER_OPTIONS.forEach(option => {
        expect(option.labelEn).toBeTruthy()
        expect(typeof option.labelEn).toBe('string')
      })
    })

    it('should have correct Thai labels', () => {
      expect(REMINDER_OPTIONS[0].label).toBe('30 นาที')
      expect(REMINDER_OPTIONS[1].label).toBe('1 ชั่วโมง')
      expect(REMINDER_OPTIONS[2].label).toBe('2 ชั่วโมง')
      expect(REMINDER_OPTIONS[3].label).toBe('1 วัน')
    })

    it('should have correct English labels', () => {
      expect(REMINDER_OPTIONS[0].labelEn).toBe('30 minutes')
      expect(REMINDER_OPTIONS[1].labelEn).toBe('1 hour')
      expect(REMINDER_OPTIONS[2].labelEn).toBe('2 hours')
      expect(REMINDER_OPTIONS[3].labelEn).toBe('1 day')
    })

    it('should have 1440 minutes = 1 day', () => {
      const dayOption = REMINDER_OPTIONS.find(o => o.value === 1440)
      expect(dayOption).toBeDefined()
      expect(dayOption!.value / 60).toBe(24) // 24 hours
    })

    it('each option should have value, label, and labelEn keys', () => {
      REMINDER_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('labelEn')
      })
    })
  })
})
