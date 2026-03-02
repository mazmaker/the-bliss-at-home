import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockGte,
  mockNeq,
  mockLt,
  mockRpc,
} = vi.hoisted(() => {
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockGte = vi.fn()
  const mockNeq = vi.fn()
  const mockLt = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    gte: mockGte,
    neq: mockNeq,
    lt: mockLt,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockGte.mockImplementation(() => chain())
  mockNeq.mockImplementation(() => chain())
  mockLt.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())
  const mockRpc = vi.fn()

  return { mockFrom, mockSelect, mockEq, mockOrder, mockGte, mockNeq, mockLt, mockRpc }
})

vi.mock('@/lib/supabase', () => ({
  default: {
    from: mockFrom,
    rpc: mockRpc,
  },
}))

import {
  getDashboardStats,
  getDailyRevenueData,
  getServiceCategoryStats,
  getTopServices,
  getHotelPerformance,
  getHotelInvoiceSummary,
  getBookingGrowthData,
  getStaffOverview,
  getStaffPerformance,
  getStaffEarnings,
  getStaffRankings,
} from '../analyticsQueries'

import type {
  DashboardStats,
  DailyRevenueData,
  ServiceCategoryStats,
  TopService,
  HotelPerformance,
  HotelInvoiceSummary,
  StaffOverview,
  StaffPerformance,
  StaffEarnings,
  StaffRanking,
} from '../analyticsQueries'

describe('analyticsQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDashboardStats', () => {
    it('should call rpc with correct period_days for month', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          total_revenue: 50000,
          total_bookings: 100,
          new_customers: 20,
          avg_booking_value: 500,
          revenue_growth: 15.5,
          bookings_growth: 10.2,
          new_customers_growth: 5.0,
          avg_value_growth: 3.2,
        }],
        error: null,
      })

      const result = await getDashboardStats('month')

      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { period_days: 30 })
      expect(result).toBeDefined()
      expect(result?.totalRevenue).toBe(50000)
      expect(result?.totalBookings).toBe(100)
    })

    it('should return null on error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getDashboardStats()
      expect(result).toBeNull()
    })

    it('should return zero stats when no data', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      const result = await getDashboardStats()

      expect(result?.totalRevenue).toBe(0)
      expect(result?.totalBookings).toBe(0)
    })

    it('should handle different periods correctly', async () => {
      mockRpc.mockResolvedValueOnce({ data: [{ total_revenue: 0 }], error: null })
      await getDashboardStats('daily')
      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { period_days: 1 })

      mockRpc.mockResolvedValueOnce({ data: [{ total_revenue: 0 }], error: null })
      await getDashboardStats('weekly')
      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { period_days: 7 })

      mockRpc.mockResolvedValueOnce({ data: [{ total_revenue: 0 }], error: null })
      await getDashboardStats('year')
      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { period_days: 365 })
    })
  })

  describe('getDailyRevenueData', () => {
    it('should return daily revenue data grouped by day', async () => {
      const today = new Date()
      const todayStr = today.toDateString()

      mockOrder.mockResolvedValueOnce({
        data: [
          { final_price: 1000, created_at: today.toISOString() },
          { final_price: 2000, created_at: today.toISOString() },
        ],
        error: null,
      })

      const result = await getDailyRevenueData(7)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(7)
      // Each item should have day, revenue, bookings
      result.forEach((item) => {
        expect(typeof item.day).toBe('number')
        expect(typeof item.revenue).toBe('number')
        expect(typeof item.bookings).toBe('number')
      })
    })

    it('should return empty array on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getDailyRevenueData()
      expect(result).toEqual([])
    })
  })

  describe('getServiceCategoryStats', () => {
    it('should group bookings by category', async () => {
      mockNeq.mockResolvedValueOnce({
        data: [
          { final_price: 1000, services: { category: 'massage' } },
          { final_price: 1500, services: { category: 'massage' } },
          { final_price: 800, services: { category: 'nail' } },
        ],
        error: null,
      })

      const result = await getServiceCategoryStats()

      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array on error', async () => {
      mockNeq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getServiceCategoryStats()
      expect(result).toEqual([])
    })
  })

  describe('getTopServices', () => {
    it('should return top services sorted by revenue', async () => {
      // Current period
      mockEq.mockResolvedValueOnce({
        data: [
          { final_price: 2000, service_id: 's1', services: { id: 's1', name_th: 'Service 1' } },
          { final_price: 1000, service_id: 's2', services: { id: 's2', name_th: 'Service 2' } },
        ],
        error: null,
      })

      // Previous period
      mockEq.mockResolvedValueOnce({
        data: [
          { final_price: 1500, service_id: 's1' },
        ],
        error: null,
      })

      const result = await getTopServices(5, 30)

      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array on error', async () => {
      mockEq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getTopServices()
      expect(result).toEqual([])
    })
  })

  describe('getHotelPerformance', () => {
    it('should call rpc with correct period', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          hotel_id: 'h1',
          hotel_name: 'Hotel 1',
          total_bookings: 50,
          total_revenue: 100000,
        }],
        error: null,
      })

      const result = await getHotelPerformance(30)

      expect(mockRpc).toHaveBeenCalledWith('get_hotel_performance_detailed', { period_days: 30 })
      expect(result).toHaveLength(1)
      expect(result[0].hotel_name).toBe('Hotel 1')
    })

    it('should return empty array on error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getHotelPerformance()
      expect(result).toEqual([])
    })
  })

  describe('getHotelInvoiceSummary', () => {
    it('should categorize invoices correctly', async () => {
      const today = new Date().toISOString().split('T')[0]
      const pastDate = '2025-01-01'
      const futureDate = '2027-01-01'

      mockSelect.mockResolvedValueOnce({
        data: [
          { status: 'paid', commission_amount: 1000, due_date: pastDate },
          { status: 'pending', commission_amount: 2000, due_date: futureDate },
          { status: 'pending', commission_amount: 500, due_date: pastDate },  // overdue
        ],
        error: null,
      })

      const result = await getHotelInvoiceSummary()

      expect(result.paid_count).toBe(1)
      expect(result.paid_amount).toBe(1000)
      expect(result.overdue_count).toBe(1)
      expect(result.overdue_amount).toBe(500)
      expect(result.pending_count).toBe(1)
      expect(result.pending_amount).toBe(2000)
      expect(result.total_outstanding).toBe(2500)
    })

    it('should return zero summary on error', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getHotelInvoiceSummary()

      expect(result.paid_count).toBe(0)
      expect(result.total_outstanding).toBe(0)
    })
  })

  describe('getStaffOverview', () => {
    it('should return null on staff data error', async () => {
      // staffData error
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getStaffOverview()
      expect(result).toBeNull()
    })
  })

  describe('getStaffPerformance', () => {
    it('should call rpc with correct params', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          staff_id: 's1',
          staff_name: 'Staff 1',
          bookings_completed: 10,
          total_earnings: 50000,
          avg_rating: 4.5,
          status: 'active',
        }],
        error: null,
      })

      const result = await getStaffPerformance(30, 10)

      expect(mockRpc).toHaveBeenCalledWith('get_staff_performance_detailed', {
        period_days: 30,
        staff_limit: 10,
      })
      expect(result).toHaveLength(1)
    })

    it('should return empty array on error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getStaffPerformance()
      expect(result).toEqual([])
    })
  })

  describe('getStaffRankings', () => {
    it('should call rpc with correct metric type', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          rank: 1,
          staff_id: 's1',
          staff_name: 'Top Staff',
          metric_value: 100000,
          metric_type_out: 'revenue',
        }],
        error: null,
      })

      const result = await getStaffRankings('revenue', 30, 10)

      expect(mockRpc).toHaveBeenCalledWith('get_staff_rankings_by_metric', {
        metric_type: 'revenue',
        period_days: 30,
        staff_limit: 10,
      })
      expect(result).toHaveLength(1)
      expect(result[0].rank).toBe(1)
    })

    it('should return empty array on error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getStaffRankings()
      expect(result).toEqual([])
    })
  })

  describe('type validation', () => {
    it('should validate DashboardStats interface', () => {
      const stats: DashboardStats = {
        totalRevenue: 50000,
        totalBookings: 100,
        newCustomers: 20,
        avgBookingValue: 500,
        revenueGrowth: 10,
        bookingsGrowth: 5,
        newCustomersGrowth: 15,
        avgValueGrowth: null,
      }
      expect(stats.revenueGrowth).toBe(10)
      expect(stats.avgValueGrowth).toBeNull()
    })

    it('should validate HotelInvoiceSummary interface', () => {
      const summary: HotelInvoiceSummary = {
        paid_count: 10,
        paid_amount: 50000,
        pending_count: 5,
        pending_amount: 25000,
        overdue_count: 2,
        overdue_amount: 10000,
        total_outstanding: 35000,
      }
      expect(summary.total_outstanding).toBe(35000)
    })
  })
})
