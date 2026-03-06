import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../lib/hotelQueries', () => ({
  getAllHotels: vi.fn().mockResolvedValue([]),
  getHotelById: vi.fn().mockResolvedValue(null),
  getHotelInvoices: vi.fn().mockResolvedValue([]),
  getHotelPayments: vi.fn().mockResolvedValue([]),
  getHotelBookings: vi.fn().mockResolvedValue([]),
  getHotelStats: vi.fn().mockResolvedValue({ totalBookings: 0, monthlyRevenue: 0 }),
  getTotalMonthlyRevenue: vi.fn().mockResolvedValue(0),
}))

import {
  useHotels,
  useHotel,
  useHotelInvoices,
  useHotelPayments,
  useHotelBookings,
  useTotalMonthlyRevenue,
} from '../useHotels'

describe('useHotels hooks', () => {
  it('exports useHotels as a function', () => {
    expect(typeof useHotels).toBe('function')
  })

  it('exports useHotel as a function', () => {
    expect(typeof useHotel).toBe('function')
  })

  it('exports useHotelInvoices as a function', () => {
    expect(typeof useHotelInvoices).toBe('function')
  })

  it('exports useHotelPayments as a function', () => {
    expect(typeof useHotelPayments).toBe('function')
  })

  it('exports useHotelBookings as a function', () => {
    expect(typeof useHotelBookings).toBe('function')
  })

  it('exports useTotalMonthlyRevenue as a function', () => {
    expect(typeof useTotalMonthlyRevenue).toBe('function')
  })
})
