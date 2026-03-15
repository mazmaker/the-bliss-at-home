import { describe, it, expect } from 'vitest'
import { EnhancedPriceCalculator } from '../enhancedPriceCalculator'
import type { Service, ServiceSelection } from '../../types/booking'

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 'svc-1',
    name_th: 'นวดแผนไทย',
    name_en: 'Thai Massage',
    category: 'massage',
    duration: 60,
    base_price: 1000,
    hotel_price: 800,
    is_active: true,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

describe('EnhancedPriceCalculator', () => {
  describe('calculateServicePriceWithDiscount', () => {
    it('applies percentage discount correctly', () => {
      const service = makeService({ hotel_price: 1000, duration: 60 })
      // 1000 * 20% = 200 discount → 800
      expect(EnhancedPriceCalculator.calculateServicePriceWithDiscount(service, 60, 20)).toBe(800)
    })

    it('applies discount to proportional price for different duration', () => {
      const service = makeService({ hotel_price: 600, duration: 60 })
      // rate = 600/60 = 10, 90min = 900, 10% discount = 90 → 810
      expect(EnhancedPriceCalculator.calculateServicePriceWithDiscount(service, 90, 10)).toBe(810)
    })

    it('uses fixed price_60 when available', () => {
      const service = makeService({
        hotel_price: 800,
        duration: 60,
        price_60: 750,
        original_price: 1000,
      })
      // price_60 = 750, 20% discount = 150 → 600
      expect(EnhancedPriceCalculator.calculateServicePriceWithDiscount(service, 60, 20)).toBe(600)
    })

    it('uses fixed price_90 when available', () => {
      const service = makeService({
        hotel_price: 800,
        duration: 60,
        price_90: 1100,
      })
      // price_90 = 1100, 10% discount = 110 → 990
      expect(EnhancedPriceCalculator.calculateServicePriceWithDiscount(service, 90, 10)).toBe(990)
    })

    it('uses fixed price_120 when available', () => {
      const service = makeService({
        hotel_price: 800,
        duration: 60,
        price_120: 1400,
      })
      // price_120 = 1400, 50% discount = 700 → 700
      expect(EnhancedPriceCalculator.calculateServicePriceWithDiscount(service, 120, 50)).toBe(700)
    })

    it('returns 0 for 100% discount', () => {
      const service = makeService({ hotel_price: 1000, duration: 60 })
      expect(EnhancedPriceCalculator.calculateServicePriceWithDiscount(service, 60, 100)).toBe(0)
    })

    it('returns full price for 0% discount', () => {
      const service = makeService({ hotel_price: 1000, duration: 60 })
      expect(EnhancedPriceCalculator.calculateServicePriceWithDiscount(service, 60, 0)).toBe(1000)
    })

    it('rounds to nearest baht', () => {
      const service = makeService({ hotel_price: 999, duration: 60 })
      // 999 * 15% = 149.85 → 999 - 150 = 849 (rounded)
      const result = EnhancedPriceCalculator.calculateServicePriceWithDiscount(service, 60, 15)
      expect(Number.isInteger(result)).toBe(true)
    })
  })

  describe('getDurationOptionsWithDiscountedPrices', () => {
    it('returns options with original and discounted prices', () => {
      const service = makeService({
        hotel_price: 600,
        duration: 60,
        duration_options: [60, 90],
      })
      const options = EnhancedPriceCalculator.getDurationOptionsWithDiscountedPrices(service, 20)

      expect(options).toHaveLength(2)
      expect(options[0].duration).toBe(60)
      expect(options[0].originalPrice).toBe(600)
      expect(options[0].discountedPrice).toBe(480) // 600 - 120
      expect(options[0].savings).toBe(120)
      expect(options[0].isDefault).toBe(true)
    })

    it('falls back to single duration when no options', () => {
      const service = makeService({ duration: 60, duration_options: null })
      const options = EnhancedPriceCalculator.getDurationOptionsWithDiscountedPrices(service, 10)
      expect(options).toHaveLength(1)
      expect(options[0].duration).toBe(60)
    })

    it('sorts options by duration ascending', () => {
      const service = makeService({
        duration: 60,
        duration_options: [120, 60, 90],
      })
      const options = EnhancedPriceCalculator.getDurationOptionsWithDiscountedPrices(service, 10)
      expect(options[0].duration).toBe(60)
      expect(options[1].duration).toBe(90)
      expect(options[2].duration).toBe(120)
    })

    it('labels use Thai format', () => {
      const service = makeService({ duration: 90, duration_options: [90] })
      const options = EnhancedPriceCalculator.getDurationOptionsWithDiscountedPrices(service, 10)
      expect(options[0].label).toBe('90 นาที')
    })
  })

  describe('calculateTotalPrice', () => {
    it('sums all selection prices', () => {
      const selections: ServiceSelection[] = [
        { id: '1', service: makeService(), duration: 60, recipientIndex: 0, price: 800, sortOrder: 0 },
        { id: '2', service: makeService(), duration: 90, recipientIndex: 1, price: 1200, sortOrder: 1 },
      ]
      expect(EnhancedPriceCalculator.calculateTotalPrice(selections)).toBe(2000)
    })

    it('returns 0 for empty array', () => {
      expect(EnhancedPriceCalculator.calculateTotalPrice([])).toBe(0)
    })
  })

  describe('formatPriceWithDiscount', () => {
    it('formats price with savings', () => {
      const result = EnhancedPriceCalculator.formatPriceWithDiscount(1000, 800)
      expect(result).toContain('800')
      expect(result).toContain('200')
      expect(result).toContain('฿')
    })
  })

  describe('calculateServicePrice (backward compat)', () => {
    it('uses enhanced calc when discountRate > 0', () => {
      const service = makeService({ hotel_price: 1000, duration: 60 })
      const result = EnhancedPriceCalculator.calculateServicePrice(service, 60, 20)
      expect(result).toBe(800) // 1000 - 20% = 800
    })

    it('falls back to PriceCalculator when no discount', () => {
      const service = makeService({ hotel_price: 800, duration: 60 })
      const result = EnhancedPriceCalculator.calculateServicePrice(service, 60)
      expect(result).toBe(800)
    })

    it('falls back to PriceCalculator when discountRate is 0', () => {
      const service = makeService({ hotel_price: 800, duration: 60 })
      const result = EnhancedPriceCalculator.calculateServicePrice(service, 60, 0)
      expect(result).toBe(800)
    })
  })
})
