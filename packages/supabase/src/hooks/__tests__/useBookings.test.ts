import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../useSupabaseQuery', () => ({
  useSupabaseQuery: vi.fn((options: any) => ({
    data: undefined,
    isLoading: true,
    error: null,
    _queryKey: options.queryKey,
    _enabled: options.enabled,
  })),
  useSupabaseMutation: vi.fn((options: any) => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isLoading: false,
    _mutationFn: options.mutationFn,
  })),
}))

vi.mock('../../services', () => ({
  bookingService: {
    getCustomerBookings: vi.fn(),
    getBookingsByStatus: vi.fn(),
    getBookingById: vi.fn(),
    getBookingByNumber: vi.fn(),
    createBooking: vi.fn(),
    createBookingWithServices: vi.fn(),
    getUpcomingBookings: vi.fn(),
  },
}))

vi.mock('../../types/database.types', () => ({}))

import {
  useCustomerBookings,
  useBookingsByStatus,
  useBookingById,
  useBookingByNumber,
  useCancelBooking,
  useRescheduleBooking,
  useCreateBooking,
  useCreateBookingWithServices,
  useUpcomingBookings,
} from '../useBookings'
import { useSupabaseQuery, useSupabaseMutation } from '../useSupabaseQuery'
import { bookingService } from '../../services'

describe('useBookings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useCustomerBookings
  // ============================================
  describe('useCustomerBookings', () => {
    it('should be a function', () => {
      expect(typeof useCustomerBookings).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useCustomerBookings('cust-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['bookings', 'customer', 'cust-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useCustomerBookings(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls bookingService.getCustomerBookings', () => {
      useCustomerBookings('cust-1')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(bookingService.getCustomerBookings).toHaveBeenCalledWith(mockClient, 'cust-1')
    })
  })

  // ============================================
  // useBookingsByStatus
  // ============================================
  describe('useBookingsByStatus', () => {
    it('should be a function', () => {
      expect(typeof useBookingsByStatus).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key including status', () => {
      useBookingsByStatus('cust-1', 'confirmed')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['bookings', 'customer', 'cust-1', 'status', 'confirmed'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useBookingsByStatus(undefined, 'confirmed')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should disable query when status is undefined', () => {
      useBookingsByStatus('cust-1', undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls bookingService.getBookingsByStatus', () => {
      useBookingsByStatus('cust-1', 'pending')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(bookingService.getBookingsByStatus).toHaveBeenCalledWith(mockClient, 'cust-1', 'pending')
    })
  })

  // ============================================
  // useBookingById
  // ============================================
  describe('useBookingById', () => {
    it('should be a function', () => {
      expect(typeof useBookingById).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useBookingById('booking-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['bookings', 'detail', 'booking-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when bookingId is undefined', () => {
      useBookingById(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })
  })

  // ============================================
  // useBookingByNumber
  // ============================================
  describe('useBookingByNumber', () => {
    it('should be a function', () => {
      expect(typeof useBookingByNumber).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useBookingByNumber('BK-001')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['bookings', 'number', 'BK-001'],
          enabled: true,
        })
      )
    })

    it('should disable query when bookingNumber is undefined', () => {
      useBookingByNumber(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })
  })

  // ============================================
  // useCancelBooking
  // ============================================
  describe('useCancelBooking', () => {
    it('should be a function', () => {
      expect(typeof useCancelBooking).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useCancelBooking()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should pass invalidateQueries for bookings', () => {
      useCancelBooking()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      expect((lastCall as any).invalidateQueries).toEqual([['bookings']])
    })
  })

  // ============================================
  // useRescheduleBooking
  // ============================================
  describe('useRescheduleBooking', () => {
    it('should be a function', () => {
      expect(typeof useRescheduleBooking).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useRescheduleBooking()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should pass invalidateQueries for bookings', () => {
      useRescheduleBooking()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      expect((lastCall as any).invalidateQueries).toEqual([['bookings']])
    })
  })

  // ============================================
  // useCreateBooking
  // ============================================
  describe('useCreateBooking', () => {
    it('should be a function', () => {
      expect(typeof useCreateBooking).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useCreateBooking()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls bookingService.createBooking', async () => {
      useCreateBooking()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const booking = { customer_id: 'c1' } as any
      const addons = [{ service_addon_id: 'a1' }] as any
      await lastCall.mutationFn(mockClient, { booking, addons })
      expect(bookingService.createBooking).toHaveBeenCalledWith(mockClient, booking, addons)
    })

    it('should provide invalidateKeys based on result', () => {
      useCreateBooking()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({ customer_id: 'c1' } as any)
      expect(keys).toEqual([
        ['bookings', 'customer', 'c1'],
        ['bookings', 'upcoming', 'c1'],
      ])
    })
  })

  // ============================================
  // useCreateBookingWithServices
  // ============================================
  describe('useCreateBookingWithServices', () => {
    it('should be a function', () => {
      expect(typeof useCreateBookingWithServices).toBe('function')
    })

    it('should call useSupabaseMutation with static invalidateKeys', () => {
      useCreateBookingWithServices()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      expect(lastCall.invalidateKeys).toEqual([['bookings']])
    })
  })

  // ============================================
  // useUpcomingBookings
  // ============================================
  describe('useUpcomingBookings', () => {
    it('should be a function', () => {
      expect(typeof useUpcomingBookings).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useUpcomingBookings('cust-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['bookings', 'upcoming', 'cust-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useUpcomingBookings(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })
  })
})
