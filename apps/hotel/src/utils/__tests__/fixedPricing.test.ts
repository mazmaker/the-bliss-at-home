import { describe, it, expect } from 'vitest'
import {
  getServicePrice,
  getHotelServicePrice,
  getAllServicePrices,
  formatPrice,
  getPriceDisplay,
} from '../fixedPricing'
import type { Service } from '../fixedPricing'

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 'svc-1',
    name_th: 'นวดแผนไทย',
    name_en: 'Thai Massage',
    base_price: 690,
    price_60: null,
    price_90: null,
    price_120: null,
    hotel_price: 550,
    duration: 60,
    duration_options: null,
    category: 'massage',
    is_active: true,
    ...overrides,
  }
}

describe('fixedPricing', () => {
  describe('getServicePrice', () => {
    it('returns fixed price for 60 min when price_60 is set', () => {
      const service = makeService({ price_60: 690 })
      const result = getServicePrice(service, 60)
      expect(result).toEqual({ price: 690, source: 'fixed' })
    })

    it('returns fixed price for 90 min when price_90 is set', () => {
      const service = makeService({ price_90: 990 })
      const result = getServicePrice(service, 90)
      expect(result).toEqual({ price: 990, source: 'fixed' })
    })

    it('returns fixed price for 120 min when price_120 is set', () => {
      const service = makeService({ price_120: 1280 })
      const result = getServicePrice(service, 120)
      expect(result).toEqual({ price: 1280, source: 'fixed' })
    })

    it('falls back to calculated price when fixed price is null', () => {
      const service = makeService({ base_price: 690 })
      const result = getServicePrice(service, 60)
      expect(result.source).toBe('calculated')
      expect(result.price).toBe(690) // 690 * 1.0
    })

    it('calculates 90 min with multiplier 1.435', () => {
      const service = makeService({ base_price: 690 })
      const result = getServicePrice(service, 90)
      expect(result.source).toBe('calculated')
      expect(result.price).toBe(Math.round(690 * 1.435)) // 990
    })

    it('calculates 120 min with multiplier 1.855', () => {
      const service = makeService({ base_price: 1000 })
      const result = getServicePrice(service, 120)
      expect(result.source).toBe('calculated')
      expect(result.price).toBe(Math.round(1000 * 1.855)) // 1855
    })

    it('handles duration < 60 (linear)', () => {
      const service = makeService({ base_price: 600 })
      const result = getServicePrice(service, 30)
      expect(result.source).toBe('calculated')
      expect(result.price).toBe(Math.round(600 * (30 / 60))) // 300
    })

    it('handles duration > 120', () => {
      const service = makeService({ base_price: 1000 })
      const result = getServicePrice(service, 150)
      expect(result.source).toBe('calculated')
      const extraMinutes = 150 - 120
      const multiplier = 1.855 + (extraMinutes / 60) * 0.4
      expect(result.price).toBe(Math.round(1000 * multiplier))
    })

    it('handles duration between 60-120 (linear interpolation)', () => {
      const service = makeService({ base_price: 1000 })
      const result = getServicePrice(service, 75)
      expect(result.source).toBe('calculated')
      const multiplier = 1.0 + ((75 - 60) / 60) * 0.855
      expect(result.price).toBe(Math.round(1000 * multiplier))
    })
  })

  describe('getHotelServicePrice', () => {
    it('returns fixed price when available', () => {
      const service = makeService({ price_60: 690 })
      const result = getHotelServicePrice(service, 60)
      expect(result).toEqual({ price: 690, source: 'fixed' })
    })

    it('uses hotel_price for calculation when no fixed price', () => {
      const service = makeService({ hotel_price: 550 })
      const result = getHotelServicePrice(service, 90)
      expect(result.source).toBe('calculated')
      expect(result.price).toBe(Math.round(550 * 1.435))
    })
  })

  describe('getAllServicePrices', () => {
    it('returns prices for all duration_options', () => {
      const service = makeService({
        duration_options: [60, 90, 120],
        price_60: 690,
        price_90: 990,
        price_120: 1280,
      })
      const prices = getAllServicePrices(service)
      expect(Object.keys(prices)).toHaveLength(3)
      expect(prices[60]).toEqual({ price: 690, source: 'fixed' })
      expect(prices[90]).toEqual({ price: 990, source: 'fixed' })
      expect(prices[120]).toEqual({ price: 1280, source: 'fixed' })
    })

    it('defaults to [60, 90, 120] when no duration_options', () => {
      const service = makeService({ duration_options: null })
      const prices = getAllServicePrices(service)
      expect(Object.keys(prices).map(Number)).toEqual([60, 90, 120])
    })
  })

  describe('formatPrice', () => {
    it('formats price with baht symbol', () => {
      expect(formatPrice(1000)).toBe('฿1,000')
    })

    it('formats zero', () => {
      expect(formatPrice(0)).toBe('฿0')
    })

    it('formats large numbers', () => {
      expect(formatPrice(100000)).toBe('฿100,000')
    })
  })

  describe('getPriceDisplay', () => {
    it('returns formatted price without source', () => {
      const service = makeService({ price_60: 690 })
      const display = getPriceDisplay(service, 60)
      expect(display).toBe('฿690')
    })

    it('returns formatted price with source when showSource=true', () => {
      const service = makeService({ price_60: 690 })
      const display = getPriceDisplay(service, 60, true)
      expect(display).toContain('฿690')
      expect(display).toContain('ราคาคงที่')
    })

    it('shows calculated source for fallback prices', () => {
      const service = makeService({ base_price: 690 })
      const display = getPriceDisplay(service, 60, true)
      expect(display).toContain('คำนวณ')
    })
  })
})
