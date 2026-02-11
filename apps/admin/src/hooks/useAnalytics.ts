import { useQuery } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import {
  getDashboardStats,
  getDailyRevenueData,
  getServiceCategoryStats,
  getTopServices,
  getHotelPerformance,
  getBookingGrowthData,
  type DashboardStats,
  type DailyRevenueData,
  type ServiceCategoryStats,
  type TopService,
  type HotelPerformance,
  getStaffOverview,
  getStaffPerformance,
  getStaffEarnings,
  getStaffRankings,
  type StaffOverview,
  type StaffPerformance,
  type StaffEarnings,
  type StaffRanking
} from '../lib/analyticsQueries'

// ============================================
// QUERY KEYS
// ============================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: (period: string) => [...analyticsKeys.all, 'dashboard', period] as const,
  dailyRevenue: (days: number) => [...analyticsKeys.all, 'dailyRevenue', days] as const,
  categories: (days: number) => [...analyticsKeys.all, 'categories', days] as const,
  topServices: (limit: number, days: number) => [...analyticsKeys.all, 'topServices', limit, days] as const,
  hotelPerformance: (days: number) => [...analyticsKeys.all, 'hotelPerformance', days] as const,
  bookingGrowth: (days: number) => [...analyticsKeys.all, 'bookingGrowth', days] as const,

  // Staff Analytics Keys
  staffOverview: (days: number) => [...analyticsKeys.all, 'staffOverview', days] as const,
  staffPerformance: (days: number, limit: number) => [...analyticsKeys.all, 'staffPerformance', days, limit] as const,
  staffEarnings: (days: number) => [...analyticsKeys.all, 'staffEarnings', days] as const,
  staffRankings: (metricType: string, days: number, limit: number) => [...analyticsKeys.all, 'staffRankings', metricType, days, limit] as const,
}

// ============================================
// REAL-TIME UTILITIES
// ============================================

/**
 * Hook to enable real-time updates for analytics queries
 */
function useRealTimeAnalytics(refetchFunction: () => void, tablesToWatch: string[] = ['bookings']) {
  const handleRealTimeUpdate = useCallback(() => {
    // Debounce refetches to avoid too many updates
    const timeoutId = setTimeout(() => {
      refetchFunction()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [refetchFunction])

  useEffect(() => {
    if (!tablesToWatch.length) return

    const subscriptions = tablesToWatch.map(table => {
      const subscription = supabase
        .channel(`analytics_${table}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table
        }, handleRealTimeUpdate)
        .subscribe()

      return subscription
    })

    return () => {
      subscriptions.forEach(sub => {
        supabase.removeChannel(sub)
      })
    }
  }, [tablesToWatch, handleRealTimeUpdate])
}

// ============================================
// CUSTOM HOOKS
// ============================================

/**
 * Hook for dashboard statistics with real-time updates
 */
export function useDashboardStats(period: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year' = 'month') {
  const query = useQuery({
    queryKey: analyticsKeys.dashboard(period),
    queryFn: () => getDashboardStats(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  })

  // Enable real-time updates
  useRealTimeAnalytics(query.refetch, ['bookings'])

  return query
}

/**
 * Hook for daily revenue data (charts)
 */
export function useDailyRevenue(days: number = 30) {
  return useQuery({
    queryKey: analyticsKeys.dailyRevenue(days),
    queryFn: () => getDailyRevenueData(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    select: (data: DailyRevenueData[]) => {
      // Transform data for chart consumption
      const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
      return data.map(item => ({
        ...item,
        // Convert to percentage for chart display (0-100)
        value: maxRevenue > 0 ? Math.round((item.revenue / maxRevenue) * 100) : 0
      }))
    }
  })
}

/**
 * Hook for service category statistics
 */
export function useServiceCategories(days: number = 30) {
  return useQuery({
    queryKey: analyticsKeys.categories(days),
    queryFn: () => getServiceCategoryStats(days),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })
}

/**
 * Hook for top performing services
 */
export function useTopServices(limit: number = 5, days: number = 30) {
  return useQuery({
    queryKey: analyticsKeys.topServices(limit, days),
    queryFn: () => getTopServices(limit, days),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })
}

/**
 * Hook for hotel performance data
 */
export function useHotelPerformance(days: number = 30) {
  return useQuery({
    queryKey: analyticsKeys.hotelPerformance(days),
    queryFn: () => getHotelPerformance(days),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })
}

/**
 * Hook for booking growth comparison data
 */
export function useBookingGrowth(days: number = 30) {
  return useQuery({
    queryKey: analyticsKeys.bookingGrowth(days),
    queryFn: () => getBookingGrowthData(days),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })
}

// ============================================
// STAFF ANALYTICS HOOKS
// ============================================

/**
 * Hook for staff overview statistics with real-time updates
 */
export function useStaffOverview(days: number = 30) {
  const query = useQuery({
    queryKey: analyticsKeys.staffOverview(days),
    queryFn: () => getStaffOverview(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  })

  // Enable real-time updates for staff-related changes
  useRealTimeAnalytics(query.refetch, ['bookings', 'staff', 'reviews'])

  return query
}

/**
 * Hook for detailed staff performance data with real-time updates
 */
export function useStaffPerformance(days: number = 30, limit: number = 10) {
  const query = useQuery({
    queryKey: analyticsKeys.staffPerformance(days, limit),
    queryFn: () => getStaffPerformance(days, limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  // Enable real-time updates
  useRealTimeAnalytics(query.refetch, ['bookings', 'staff', 'reviews'])

  return query
}

/**
 * Hook for staff earnings data with real-time updates
 */
export function useStaffEarnings(days: number = 30) {
  const query = useQuery({
    queryKey: analyticsKeys.staffEarnings(days),
    queryFn: () => getStaffEarnings(days),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  // Enable real-time updates for earnings-related changes
  useRealTimeAnalytics(query.refetch, ['bookings', 'staff'])

  return query
}

/**
 * Hook for staff rankings by different metrics with real-time updates
 */
export function useStaffRankings(
  metricType: 'revenue' | 'bookings' | 'rating' | 'completion_rate' = 'revenue',
  days: number = 30,
  limit: number = 10
) {
  const query = useQuery({
    queryKey: analyticsKeys.staffRankings(metricType, days, limit),
    queryFn: () => getStaffRankings(metricType, days, limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  // Enable real-time updates
  useRealTimeAnalytics(query.refetch, ['bookings', 'staff', 'reviews'])

  return query
}

// ============================================
// COMBINED HOOKS
// ============================================

/**
 * Hook that combines all reports data for performance with real-time updates
 * Use this when you need all data at once
 */
export function useReportsData(period: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year' = 'month') {
  const periodDays = {
    daily: 1,
    weekly: 7,
    month: 30,
    '3_months': 90,
    '6_months': 180,
    year: 365
  }

  const days = periodDays[period]

  const dashboardStats = useDashboardStats(period)
  const dailyRevenue = useDailyRevenue(days)
  const categories = useServiceCategories(days)
  const topServices = useTopServices(5, days)
  const hotelPerformance = useHotelPerformance(days)

  // Enable real-time updates for all analytics queries
  const refetchAll = useCallback(() => {
    dashboardStats.refetch()
    dailyRevenue.refetch()
    categories.refetch()
    topServices.refetch()
    hotelPerformance.refetch()
  }, [dashboardStats.refetch, dailyRevenue.refetch, categories.refetch, topServices.refetch, hotelPerformance.refetch])

  useRealTimeAnalytics(refetchAll, ['bookings', 'services', 'hotels'])

  // Combined loading state
  const isLoading =
    dashboardStats.isLoading ||
    dailyRevenue.isLoading ||
    categories.isLoading ||
    topServices.isLoading ||
    hotelPerformance.isLoading

  // Combined error state
  const isError =
    dashboardStats.isError ||
    dailyRevenue.isError ||
    categories.isError ||
    topServices.isError ||
    hotelPerformance.isError

  // Combined error message
  const error =
    dashboardStats.error ||
    dailyRevenue.error ||
    categories.error ||
    topServices.error ||
    hotelPerformance.error

  return {
    // Individual data
    dashboardStats: dashboardStats.data,
    dailyRevenue: dailyRevenue.data,
    categories: categories.data,
    topServices: topServices.data,
    hotelPerformance: hotelPerformance.data,

    // Combined states
    isLoading,
    isError,
    error,

    // Individual states for granular control
    states: {
      dashboardStats: {
        isLoading: dashboardStats.isLoading,
        isError: dashboardStats.isError,
        error: dashboardStats.error
      },
      dailyRevenue: {
        isLoading: dailyRevenue.isLoading,
        isError: dailyRevenue.isError,
        error: dailyRevenue.error
      },
      categories: {
        isLoading: categories.isLoading,
        isError: categories.isError,
        error: categories.error
      },
      topServices: {
        isLoading: topServices.isLoading,
        isError: topServices.isError,
        error: topServices.error
      },
      hotelPerformance: {
        isLoading: hotelPerformance.isLoading,
        isError: hotelPerformance.isError,
        error: hotelPerformance.error
      }
    },

    // Refetch functions
    refetch: {
      all: refetchAll,
      dashboardStats: dashboardStats.refetch,
      dailyRevenue: dailyRevenue.refetch,
      categories: categories.refetch,
      topServices: topServices.refetch,
      hotelPerformance: hotelPerformance.refetch,
    }
  }
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Hook for period-based queries
 * Automatically converts period to days for relevant queries
 */
export function usePeriodAnalytics(period: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year' = 'month') {
  return useReportsData(period)
}

/**
 * Hook for real-time dashboard (shorter staleTime for frequent updates)
 */
export function useRealTimeDashboard(period: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year' = 'month') {
  return useQuery({
    queryKey: analyticsKeys.dashboard(period),
    queryFn: () => getDashboardStats(period),
    staleTime: 1 * 60 * 1000, // 1 minute - more frequent updates
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user comes back
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 3,
  })
}