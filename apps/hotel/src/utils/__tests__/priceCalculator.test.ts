import { describe, it, expect } from 'vitest'
import { PriceCalculator } from '../priceCalculator'
import type { Service, ServiceSelection, ServiceFormat } from '../../types/booking'

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

function makeSelection(overrides: Partial<ServiceSelection> = {}): ServiceSelection {
  return {
    id: 'sel-1',
    service: makeService(),
    duration: 60,
    recipientIndex: 0,
    price: 800,
    sortOrder: 0,
    ...overrides,
  }
}

describe('PriceCalculator', () => {
  describe('calculateServicePrice', () => {
    it('returns hotel_price for default duration (60 min)', () => {
      const service = makeService({ hotel_price: 800, duration: 60 })
      expect(PriceCalculator.calculateServicePrice(service, 60)).toBe(800)
    })

    it('calculates proportional price for 90 min', () => {
      const service = makeService({ hotel_price: 600, duration: 60 })
      // rate = 600/60 = 10/min, 90*10 = 900
      expect(PriceCalculator.calculateServicePrice(service, 90)).toBe(900)
    })

    it('calculates proportional price for 120 min', () => {
      const service = makeService({ hotel_price: 600, duration: 60 })
      expect(PriceCalculator.calculateServicePrice(service, 120)).toBe(1200)
    })

    it('rounds to nearest baht', () => {
      const service = makeService({ hotel_price: 700, duration: 60 })
      // rate = 700/60 = 11.666.., 90 * 11.666 = 1050
      expect(PriceCalculator.calculateServicePrice(service, 90)).toBe(1050)
    })

    it('handles mode parameter without affecting price', () => {
      const service = makeService({ hotel_price: 800, duration: 60 })
      expect(PriceCalculator.calculateServicePrice(service, 60, 'couple')).toBe(800)
    })
  })

  describe('calculateTotalPrice', () => {
    it('returns 0 for empty selections', () => {
      expect(PriceCalculator.calculateTotalPrice([])).toBe(0)
    })

    it('sums prices of all selections', () => {
      const selections = [
        makeSelection({ price: 800 }),
        makeSelection({ id: 'sel-2', price: 1200 }),
      ]
      expect(PriceCalculator.calculateTotalPrice(selections)).toBe(2000)
    })

    it('handles single selection', () => {
      expect(PriceCalculator.calculateTotalPrice([makeSelection({ price: 500 })])).toBe(500)
    })
  })

  describe('calculateTotalDuration', () => {
    it('returns 0 for empty selections', () => {
      expect(PriceCalculator.calculateTotalDuration([], 'single')).toBe(0)
    })

    it('returns first selection duration for single format', () => {
      const selections = [
        makeSelection({ duration: 60 }),
        makeSelection({ id: 'sel-2', duration: 90 }),
      ]
      expect(PriceCalculator.calculateTotalDuration(selections, 'single')).toBe(60)
    })

    it('returns max duration for simultaneous format', () => {
      const selections = [
        makeSelection({ duration: 60 }),
        makeSelection({ id: 'sel-2', duration: 90 }),
        makeSelection({ id: 'sel-3', duration: 120 }),
      ]
      expect(PriceCalculator.calculateTotalDuration(selections, 'simultaneous')).toBe(120)
    })

    it('returns sum of durations for sequential format', () => {
      const selections = [
        makeSelection({ duration: 60 }),
        makeSelection({ id: 'sel-2', duration: 90 }),
      ]
      expect(PriceCalculator.calculateTotalDuration(selections, 'sequential')).toBe(150)
    })
  })

  describe('getDurationOptionsWithPrices', () => {
    it('returns single option when no duration_options', () => {
      const service = makeService({ duration: 60, duration_options: null })
      const options = PriceCalculator.getDurationOptionsWithPrices(service)
      expect(options).toHaveLength(1)
      expect(options[0].duration).toBe(60)
      expect(options[0].isDefault).toBe(true)
    })

    it('returns sorted duration options with calculated prices', () => {
      const service = makeService({
        hotel_price: 600,
        duration: 60,
        duration_options: [120, 60, 90],
      })
      const options = PriceCalculator.getDurationOptionsWithPrices(service)
      expect(options).toHaveLength(3)
      expect(options[0].duration).toBe(60)
      expect(options[1].duration).toBe(90)
      expect(options[2].duration).toBe(120)
      expect(options[0].isDefault).toBe(true)
      expect(options[1].isDefault).toBe(false)
    })

    it('labels use Thai format', () => {
      const service = makeService({ duration: 60, duration_options: [60] })
      const options = PriceCalculator.getDurationOptionsWithPrices(service)
      expect(options[0].label).toBe('60 นาที')
    })
  })

  describe('validatePrice', () => {
    it('returns true for correctly calculated price', () => {
      const service = makeService({ hotel_price: 600, duration: 60 })
      expect(PriceCalculator.validatePrice(service, 90, 900)).toBe(true)
    })

    it('returns true within 1 baht tolerance', () => {
      const service = makeService({ hotel_price: 700, duration: 60 })
      const exact = (700 / 60) * 90
      expect(PriceCalculator.validatePrice(service, 90, Math.round(exact))).toBe(true)
    })

    it('returns false for incorrect price', () => {
      const service = makeService({ hotel_price: 600, duration: 60 })
      expect(PriceCalculator.validatePrice(service, 90, 999)).toBe(false)
    })
  })

  describe('calculateSavings', () => {
    it('calculates savings between base and hotel price', () => {
      const service = makeService({ base_price: 1000, hotel_price: 800, duration: 60 })
      const savings = PriceCalculator.calculateSavings(service, 60)
      expect(savings.amount).toBe(200)
      expect(savings.percentage).toBe(20)
    })

    it('returns 0 savings when hotel price >= base price', () => {
      const service = makeService({ base_price: 800, hotel_price: 800, duration: 60 })
      const savings = PriceCalculator.calculateSavings(service, 60)
      expect(savings.amount).toBe(0)
      expect(savings.percentage).toBe(0)
    })

    it('scales savings proportionally with duration', () => {
      const service = makeService({ base_price: 1000, hotel_price: 800, duration: 60 })
      const savings = PriceCalculator.calculateSavings(service, 120)
      // base: 1000/60*120 = 2000, hotel: 800/60*120 = 1600, diff = 400
      expect(savings.amount).toBe(400)
      expect(savings.percentage).toBe(20)
    })
  })

  describe('formatPrice', () => {
    it('formats price with baht symbol', () => {
      expect(PriceCalculator.formatPrice(1000)).toBe('฿1,000')
    })

    it('formats zero price', () => {
      expect(PriceCalculator.formatPrice(0)).toBe('฿0')
    })
  })
})
