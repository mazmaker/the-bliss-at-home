import { describe, it, expect, vi } from 'vitest'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  default: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}))

// Mock analytics queries
vi.mock('../../lib/analyticsQueries', () => ({
  getDashboardStats: vi.fn(),
  getDailyRevenueData: vi.fn(),
  getServiceCategoryStats: vi.fn(),
  getTopServices: vi.fn(),
  getHotelPerformance: vi.fn(),
  getBookingGrowthData: vi.fn(),
  getStaffOverview: vi.fn(),
  getStaffPerformance: vi.fn(),
  getStaffEarnings: vi.fn(),
  getStaffRankings: vi.fn(),
  getHotelInvoiceSummary: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
}))

import {
  analyticsKeys,
  useDashboardStats,
  useDailyRevenue,
  useServiceCategories,
  useTopServices,
  useHotelPerformance,
  useHotelInvoiceSummary,
  useBookingGrowth,
  useStaffOverview,
  useStaffPerformance,
  useStaffEarnings as useStaffEarningsAnalytics,
  useStaffRankings,
  useReportsData,
  useGeographicalAnalytics,
  useServiceRevenueByCategory,
  useMonthlyServiceTrends,
  useCustomerBehaviorAnalytics,
  useCustomerSegments,
  useCustomerSatisfactionMetrics,
  useAdvancedSalesMetrics,
  useSalesChannelAnalysis,
  usePaymentMethodAnalysis,
  useTimeBasedRevenueAnalysis,
  usePeriodAnalytics,
  useRealTimeDashboard,
} from '../useAnalytics'

describe('useAnalytics', () => {
  describe('analyticsKeys', () => {
    it('has an "all" key', () => {
      expect(analyticsKeys.all).toEqual(['analytics'])
    })

    it('generates dashboard key with period', () => {
      const key = analyticsKeys.dashboard('month')
      expect(key).toEqual(['analytics', 'dashboard', 'month'])
    })

    it('generates dailyRevenue key with days', () => {
      const key = analyticsKeys.dailyRevenue(30)
      expect(key).toEqual(['analytics', 'dailyRevenue', 30])
    })

    it('generates categories key with days', () => {
      const key = analyticsKeys.categories(7)
      expect(key).toEqual(['analytics', 'categories', 7])
    })

    it('generates topServices key with limit and days', () => {
      const key = analyticsKeys.topServices(5, 30)
      expect(key).toEqual(['analytics', 'topServices', 5, 30])
    })

    it('generates hotelPerformance key with days', () => {
      const key = analyticsKeys.hotelPerformance(30)
      expect(key).toEqual(['analytics', 'hotelPerformance', 30])
    })

    it('generates bookingGrowth key with days', () => {
      const key = analyticsKeys.bookingGrowth(90)
      expect(key).toEqual(['analytics', 'bookingGrowth', 90])
    })

    it('generates staffOverview key with days', () => {
      const key = analyticsKeys.staffOverview(30)
      expect(key).toEqual(['analytics', 'staffOverview', 30])
    })

    it('generates staffPerformance key with days and limit', () => {
      const key = analyticsKeys.staffPerformance(30, 10)
      expect(key).toEqual(['analytics', 'staffPerformance', 30, 10])
    })

    it('generates staffEarnings key with days', () => {
      const key = analyticsKeys.staffEarnings(30)
      expect(key).toEqual(['analytics', 'staffEarnings', 30])
    })

    it('generates staffRankings key with metricType, days, and limit', () => {
      const key = analyticsKeys.staffRankings('revenue', 30, 10)
      expect(key).toEqual(['analytics', 'staffRankings', 'revenue', 30, 10])
    })
  })

  describe('hook exports', () => {
    it('exports useDashboardStats as a function', () => {
      expect(typeof useDashboardStats).toBe('function')
    })

    it('exports useDailyRevenue as a function', () => {
      expect(typeof useDailyRevenue).toBe('function')
    })

    it('exports useServiceCategories as a function', () => {
      expect(typeof useServiceCategories).toBe('function')
    })

    it('exports useTopServices as a function', () => {
      expect(typeof useTopServices).toBe('function')
    })

    it('exports useHotelPerformance as a function', () => {
      expect(typeof useHotelPerformance).toBe('function')
    })

    it('exports useHotelInvoiceSummary as a function', () => {
      expect(typeof useHotelInvoiceSummary).toBe('function')
    })

    it('exports useBookingGrowth as a function', () => {
      expect(typeof useBookingGrowth).toBe('function')
    })

    it('exports useStaffOverview as a function', () => {
      expect(typeof useStaffOverview).toBe('function')
    })

    it('exports useStaffPerformance as a function', () => {
      expect(typeof useStaffPerformance).toBe('function')
    })

    it('exports useStaffEarnings as a function', () => {
      expect(typeof useStaffEarningsAnalytics).toBe('function')
    })

    it('exports useStaffRankings as a function', () => {
      expect(typeof useStaffRankings).toBe('function')
    })

    it('exports useReportsData as a function', () => {
      expect(typeof useReportsData).toBe('function')
    })

    it('exports useGeographicalAnalytics as a function', () => {
      expect(typeof useGeographicalAnalytics).toBe('function')
    })

    it('exports useServiceRevenueByCategory as a function', () => {
      expect(typeof useServiceRevenueByCategory).toBe('function')
    })

    it('exports useMonthlyServiceTrends as a function', () => {
      expect(typeof useMonthlyServiceTrends).toBe('function')
    })

    it('exports useCustomerBehaviorAnalytics as a function', () => {
      expect(typeof useCustomerBehaviorAnalytics).toBe('function')
    })

    it('exports useCustomerSegments as a function', () => {
      expect(typeof useCustomerSegments).toBe('function')
    })

    it('exports useCustomerSatisfactionMetrics as a function', () => {
      expect(typeof useCustomerSatisfactionMetrics).toBe('function')
    })

    it('exports useAdvancedSalesMetrics as a function', () => {
      expect(typeof useAdvancedSalesMetrics).toBe('function')
    })

    it('exports useSalesChannelAnalysis as a function', () => {
      expect(typeof useSalesChannelAnalysis).toBe('function')
    })

    it('exports usePaymentMethodAnalysis as a function', () => {
      expect(typeof usePaymentMethodAnalysis).toBe('function')
    })

    it('exports useTimeBasedRevenueAnalysis as a function', () => {
      expect(typeof useTimeBasedRevenueAnalysis).toBe('function')
    })

    it('exports usePeriodAnalytics as a function', () => {
      expect(typeof usePeriodAnalytics).toBe('function')
    })

    it('exports useRealTimeDashboard as a function', () => {
      expect(typeof useRealTimeDashboard).toBe('function')
    })
  })
})
