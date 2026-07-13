import { describe, it, expect } from 'vitest'
import { retailPriceByDuration, computeStaffEarning } from '../earnings'

describe('earnings (§1 rule)', () => {
  describe('retailPriceByDuration', () => {
    const svc = { price_60: 800, price_90: 1000, price_120: 1300, base_price: 1000, duration: 90 }

    it('picks the admin-set price for the exact duration', () => {
      expect(retailPriceByDuration(svc, 60)).toBe(800)
      expect(retailPriceByDuration(svc, 90)).toBe(1000)
      expect(retailPriceByDuration(svc, 120)).toBe(1300)
    })

    it('falls back to a proportional estimate from base_price when the duration column is null', () => {
      // base_price 1000 over the service's own 90-min default → 30-min proportional = 333
      expect(retailPriceByDuration({ base_price: 1000, duration: 90 }, 30)).toBe(333)
    })

    it('returns 0 when there is no price data at all', () => {
      expect(retailPriceByDuration({}, 90)).toBe(0)
    })
  })

  describe('computeStaffEarning — commission (§1: full pre-discount retail × rate)', () => {
    const commissionSvc = {
      use_fixed_rate: false,
      staff_commission_rate: 0.3,
      price_60: 800,
      price_90: 1000,
      price_120: 1300,
      base_price: 1000,
      duration: 90,
    }

    it('commissions on the RETAIL price for the duration, never a discounted/paid price', () => {
      expect(computeStaffEarning(commissionSvc, 90)).toBe(300) // 1000 × 0.30
      expect(computeStaffEarning(commissionSvc, 60)).toBe(240) // 800 × 0.30
      expect(computeStaffEarning(commissionSvc, 120)).toBe(390) // 1300 × 0.30
    })

    it('is add-on / discount immune by construction (it never sees final_price or add-on totals)', () => {
      // Same service+duration → same earning regardless of any discount or add-on the booking carried.
      expect(computeStaffEarning(commissionSvc, 90)).toBe(300)
    })

    it('yields 0 commission when no rate is set (no invented default)', () => {
      expect(computeStaffEarning({ ...commissionSvc, staff_commission_rate: null }, 90)).toBe(0)
    })
  })

  describe('computeStaffEarning — fixed-rate (flat per session, untouched)', () => {
    const fixedSvc = {
      use_fixed_rate: true,
      staff_earning_60: 400,
      staff_earning_90: 600,
      staff_earning_120: 850,
      // price columns present but must be IGNORED for fixed-rate
      price_60: 800,
      price_90: 1000,
      price_120: 1300,
      staff_commission_rate: 0.3,
    }

    it('pays the flat staff_earning_<duration>, ignoring price and rate', () => {
      expect(computeStaffEarning(fixedSvc, 60)).toBe(400)
      expect(computeStaffEarning(fixedSvc, 90)).toBe(600)
      expect(computeStaffEarning(fixedSvc, 120)).toBe(850)
    })
  })

  it('handles a null/undefined service defensively (0)', () => {
    expect(computeStaffEarning(null, 90)).toBe(0)
    expect(computeStaffEarning(undefined, 90)).toBe(0)
  })
})
