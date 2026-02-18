import { describe, it, expect } from 'vitest'
import {
  calculatePrice,
  calculateAllDurationPrices,
  getDurationLabel,
  calculateDiscountPercentage,
  getPriceDisplay,
} from '../pricingUtils'

describe('pricingUtils', () => {
  describe('calculatePrice', () => {
    it('60 min uses 1.0 multiplier', () => {
      const result = calculatePrice(690, 550, 60)
      expect(result.multiplier).toBe(1.0)
      expect(result.finalBasePrice).toBe(690)
      expect(result.finalHotelPrice).toBe(550)
    })

    it('90 min uses 1.435 multiplier', () => {
      const result = calculatePrice(690, 550, 90)
      expect(result.multiplier).toBe(1.435)
      expect(result.finalBasePrice).toBe(Math.round(690 * 1.435)) // 990
      expect(result.finalHotelPrice).toBe(Math.round(550 * 1.435)) // 789
    })

    it('120 min uses 1.855 multiplier', () => {
      const result = calculatePrice(1000, 800, 120)
      expect(result.multiplier).toBe(1.855)
      expect(result.finalBasePrice).toBe(Math.round(1000 * 1.855)) // 1855
      expect(result.finalHotelPrice).toBe(Math.round(800 * 1.855)) // 1484
    })

    it('duration < 60 uses linear ratio', () => {
      const result = calculatePrice(600, 480, 30)
      expect(result.finalBasePrice).toBe(Math.round(600 * (30 / 60))) // 300
      expect(result.finalHotelPrice).toBe(Math.round(480 * (30 / 60))) // 240
    })

    it('duration > 120 extends with gradual increase', () => {
      const result = calculatePrice(1000, 800, 180)
      const extraMinutes = 180 - 120
      const expectedMultiplier = 1.855 + (extraMinutes / 60) * 0.4
      expect(result.finalBasePrice).toBe(Math.round(1000 * expectedMultiplier))
    })

    it('duration between 60-120 uses linear interpolation', () => {
      const result = calculatePrice(1000, 800, 75)
      const expectedMultiplier = 1.0 + ((75 - 60) / 60) * 0.855
      expect(result.finalBasePrice).toBe(Math.round(1000 * expectedMultiplier))
    })

    it('returns correct structure', () => {
      const result = calculatePrice(690, 550, 60)
      expect(result).toHaveProperty('duration', 60)
      expect(result).toHaveProperty('basePrice', 690)
      expect(result).toHaveProperty('hotelPrice', 550)
      expect(result).toHaveProperty('multiplier')
      expect(result).toHaveProperty('finalBasePrice')
      expect(result).toHaveProperty('finalHotelPrice')
    })

    it('rounds multiplier to 3 decimal places', () => {
      const result = calculatePrice(690, 550, 75)
      const decimalParts = result.multiplier.toString().split('.')
      if (decimalParts[1]) {
        expect(decimalParts[1].length).toBeLessThanOrEqual(3)
      }
    })

    it('real-world example: 690 base → 990 at 90 min', () => {
      const result = calculatePrice(690, 550, 90)
      expect(result.finalBasePrice).toBe(990) // 690 * 1.435 = 990.15 → 990
    })

    it('real-world example: 690 base → 1280 at 120 min', () => {
      const result = calculatePrice(690, 550, 120)
      expect(result.finalBasePrice).toBe(Math.round(690 * 1.855)) // 1280
    })
  })

  describe('calculateAllDurationPrices', () => {
    it('returns prices for each duration', () => {
      const results = calculateAllDurationPrices(690, 550, [60, 90, 120])
      expect(results).toHaveLength(3)
      expect(results[0].duration).toBe(60)
      expect(results[1].duration).toBe(90)
      expect(results[2].duration).toBe(120)
    })

    it('handles empty duration array', () => {
      const results = calculateAllDurationPrices(690, 550, [])
      expect(results).toHaveLength(0)
    })

    it('handles single duration', () => {
      const results = calculateAllDurationPrices(690, 550, [60])
      expect(results).toHaveLength(1)
      expect(results[0].finalBasePrice).toBe(690)
    })
  })

  describe('getDurationLabel', () => {
    it('returns Thai label for 60 min', () => {
      expect(getDurationLabel(60)).toBe('60 นาที (1 ชั่วโมง)')
    })

    it('returns Thai label for 90 min', () => {
      expect(getDurationLabel(90)).toBe('90 นาที (1.5 ชั่วโมง)')
    })

    it('returns Thai label for 120 min', () => {
      expect(getDurationLabel(120)).toBe('120 นาที (2 ชั่วโมง)')
    })

    it('returns generic label for unknown durations', () => {
      expect(getDurationLabel(45)).toBe('45 นาที')
    })
  })

  describe('calculateDiscountPercentage', () => {
    it('calculates correct discount percentage', () => {
      expect(calculateDiscountPercentage(1000, 800)).toBe(20)
    })

    it('returns 0 when prices are equal', () => {
      expect(calculateDiscountPercentage(500, 500)).toBe(0)
    })

    it('returns 0 when basePrice is 0', () => {
      expect(calculateDiscountPercentage(0, 500)).toBe(0)
    })

    it('rounds to nearest integer', () => {
      // (1000 - 700) / 1000 = 0.3 → 30%
      expect(calculateDiscountPercentage(1000, 700)).toBe(30)
    })

    it('handles 100% discount', () => {
      expect(calculateDiscountPercentage(1000, 0)).toBe(100)
    })
  })

  describe('getPriceDisplay', () => {
    it('returns base price display', () => {
      const display = getPriceDisplay(690, 550, 60, false)
      expect(display).toBe('690 บาท')
    })

    it('returns hotel price display', () => {
      const display = getPriceDisplay(690, 550, 60, true)
      expect(display).toBe('550 บาท')
    })

    it('uses Thai baht suffix', () => {
      const display = getPriceDisplay(1000, 800, 60)
      expect(display).toContain('บาท')
    })
  })
})
