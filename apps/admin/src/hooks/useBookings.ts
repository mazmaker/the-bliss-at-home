import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingService, type Booking, type BookingFilters, type BookingStatus, type PaymentStatus } from '../services/bookingService'
import { keepPreviousData } from '@tanstack/react-query'

export function useBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => bookingService.getAllBookings(filters),
    placeholderData: keepPreviousData,
    // Live-refresh for emergency oversight (#4): the list must reflect a staff's
    // traveling/arrived transition and the "ใกล้เวลา · ยังไม่เดินทาง" at-risk flag without a
    // manual reload. 30s is a light poll on top of keepPreviousData (no flicker).
    refetchInterval: 30_000,
  })
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['bookings', id],
    queryFn: () => bookingService.getBookingById(id),
    enabled: !!id,
  })
}

export function useBookingStats() {
  return useQuery({
    queryKey: ['bookings', 'stats'],
    queryFn: () => bookingService.getBookingStats(),
  })
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status, autoMarkPaid }: { id: string; status: BookingStatus; autoMarkPaid?: boolean }) =>
      bookingService.updateBookingStatus(id, status, { autoMarkPaid }),
    onSuccess: (data) => {
      // Invalidate and refetch bookings (force refetch all queries)
      queryClient.invalidateQueries({
        queryKey: ['bookings'],
        refetchType: 'all'
      })

      // Also invalidate stats
      queryClient.invalidateQueries({ queryKey: ['bookings', 'stats'] })

      // Update the specific booking in cache
      if (data) {
        queryClient.setQueryData(['bookings', data.id], data)
      }
    },
  })
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: PaymentStatus }) =>
      bookingService.updateBookingPaymentStatus(id, paymentStatus),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['bookings'],
        refetchType: 'all'
      })
      queryClient.invalidateQueries({ queryKey: ['bookings', 'stats'] })
      if (data) {
        queryClient.setQueryData(['bookings', data.id], data)
      }
    },
  })
}

export function useAssignStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ bookingId, staffId }: { bookingId: string; staffId: string }) =>
      bookingService.assignStaff(bookingId, staffId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['bookings'],
        refetchType: 'all'
      })
      queryClient.invalidateQueries({ queryKey: ['bookings', 'stats'] })
      if (data) {
        queryClient.setQueryData(['bookings', data.id], data)
      }
    },
  })
}

export function useSearchBookings(query: string) {
  return useQuery({
    queryKey: ['bookings', 'search', query],
    queryFn: () => bookingService.searchBookings(query),
    enabled: query.length > 0,
  })
}

// Export types
export type { Booking, BookingFilters, BookingStatus, PaymentStatus }
