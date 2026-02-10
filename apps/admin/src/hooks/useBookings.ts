import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingService, type Booking, type BookingFilters, type BookingStatus, type PaymentStatus } from '../services/bookingService'
import { keepPreviousData } from '@tanstack/react-query'

export function useBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => bookingService.getAllBookings(filters),
    placeholderData: keepPreviousData,
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
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      bookingService.updateBookingStatus(id, status),
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
