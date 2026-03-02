import { useQuery } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import {
  getDashboardOverview,
  getRecentBookings,
  getPendingStaffApplications,
  getPopularServicesThisMonth,
  getQuickStats,
} from '@/lib/dashboardQueries'

// ============================================
// QUERY KEYS
// ============================================

const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  recentBookings: () => [...dashboardKeys.all, 'recentBookings'] as const,
  pendingApprovals: () => [...dashboardKeys.all, 'pendingApprovals'] as const,
  popularServices: () => [...dashboardKeys.all, 'popularServices'] as const,
  quickStats: () => [...dashboardKeys.all, 'quickStats'] as const,
}

// ============================================
// REAL-TIME UTILITY
// ============================================

function useDashboardRealTime(refetchFn: () => void, tables: string[] = ['bookings']) {
  const handleUpdate = useCallback(() => {
    const timeout = setTimeout(() => refetchFn(), 1000)
    return () => clearTimeout(timeout)
  }, [refetchFn])

  useEffect(() => {
    const subs = tables.map(table =>
      supabase
        .channel(`dashboard_${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, handleUpdate)
        .subscribe()
    )
    return () => { subs.forEach(s => supabase.removeChannel(s)) }
  }, [tables, handleUpdate])
}

// ============================================
// HOOKS
// ============================================

export function useDashboardOverview() {
  const query = useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: getDashboardOverview,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  useDashboardRealTime(query.refetch, ['bookings', 'customers', 'staff'])

  return query
}

export function useRecentBookings(limit: number = 10) {
  const query = useQuery({
    queryKey: dashboardKeys.recentBookings(),
    queryFn: () => getRecentBookings(limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  useDashboardRealTime(query.refetch, ['bookings'])

  return query
}

export function usePendingApprovals(limit: number = 5) {
  const query = useQuery({
    queryKey: dashboardKeys.pendingApprovals(),
    queryFn: () => getPendingStaffApplications(limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  useDashboardRealTime(query.refetch, ['staff_applications'])

  return query
}

export function usePopularServices(limit: number = 5) {
  const query = useQuery({
    queryKey: dashboardKeys.popularServices(),
    queryFn: () => getPopularServicesThisMonth(limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  useDashboardRealTime(query.refetch, ['bookings'])

  return query
}

export function useQuickStats() {
  const query = useQuery({
    queryKey: dashboardKeys.quickStats(),
    queryFn: getQuickStats,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  useDashboardRealTime(query.refetch, ['bookings'])

  return query
}
