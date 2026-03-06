import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../useSupabaseQuery', () => ({
  useSupabaseQuery: vi.fn((options: any) => ({
    data: undefined,
    isLoading: true,
    error: null,
    _queryKey: options.queryKey,
    _enabled: options.enabled,
    _staleTime: options.staleTime,
  })),
  useSupabaseMutation: vi.fn((options: any) => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isLoading: false,
    _mutationFn: options.mutationFn,
  })),
}))

vi.mock('../../services/reviewService', () => ({
  reviewService: {
    getReviewByBookingId: vi.fn(),
    createReview: vi.fn(),
    getServiceReviewStats: vi.fn(),
    getServiceReviews: vi.fn(),
    getTopReviews: vi.fn(),
    getAllServiceReviewStats: vi.fn(),
  },
}))

vi.mock('../../types/database.types', () => ({}))

import {
  useReviewByBookingId,
  useCreateReview,
  useServiceReviewStats,
  useServiceReviews,
  useTopReviews,
  useAllServiceReviewStats,
} from '../useReviews'
import { useSupabaseQuery, useSupabaseMutation } from '../useSupabaseQuery'
import { reviewService } from '../../services/reviewService'

describe('useReviews hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useReviewByBookingId
  // ============================================
  describe('useReviewByBookingId', () => {
    it('should be a function', () => {
      expect(typeof useReviewByBookingId).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useReviewByBookingId('booking-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['reviews', 'booking', 'booking-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when bookingId is undefined', () => {
      useReviewByBookingId(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls reviewService.getReviewByBookingId', () => {
      useReviewByBookingId('booking-2')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(reviewService.getReviewByBookingId).toHaveBeenCalledWith(mockClient, 'booking-2')
    })
  })

  // ============================================
  // useCreateReview
  // ============================================
  describe('useCreateReview', () => {
    it('should be a function', () => {
      expect(typeof useCreateReview).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useCreateReview()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls reviewService.createReview', async () => {
      useCreateReview()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const review = { booking_id: 'b1', rating: 5, comment: 'Great' } as any
      await lastCall.mutationFn(mockClient, review)
      expect(reviewService.createReview).toHaveBeenCalledWith(mockClient, review)
    })

    it('should provide invalidateKeys based on result booking_id', () => {
      useCreateReview()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({ booking_id: 'b1' } as any)
      expect(keys).toEqual([['reviews', 'booking', 'b1']])
    })
  })

  // ============================================
  // useServiceReviewStats
  // ============================================
  describe('useServiceReviewStats', () => {
    it('should be a function', () => {
      expect(typeof useServiceReviewStats).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useServiceReviewStats('service-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['reviews', 'stats', 'service-1'],
          enabled: true,
          staleTime: 1000 * 60 * 5,
        })
      )
    })

    it('should disable query when serviceId is undefined', () => {
      useServiceReviewStats(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should have a 5-minute stale time', () => {
      useServiceReviewStats('service-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 300000,
        })
      )
    })

    it('should provide queryFn that returns first stat or null', async () => {
      const mockStats = [{ average_rating: 4.5, review_count: 10 }]
      vi.mocked(reviewService.getServiceReviewStats).mockResolvedValue(mockStats as any)

      useServiceReviewStats('service-1')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const result = await lastCall.queryFn(mockClient)
      expect(result).toEqual(mockStats[0])
    })

    it('should return null when stats array is empty', async () => {
      vi.mocked(reviewService.getServiceReviewStats).mockResolvedValue([] as any)

      useServiceReviewStats('service-1')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const result = await lastCall.queryFn(mockClient)
      expect(result).toBeNull()
    })
  })

  // ============================================
  // useServiceReviews
  // ============================================
  describe('useServiceReviews', () => {
    it('should be a function', () => {
      expect(typeof useServiceReviews).toBe('function')
    })

    it('should call useSupabaseQuery with default limit of 5', () => {
      useServiceReviews('service-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['reviews', 'service', 'service-1', 5],
          enabled: true,
          staleTime: 1000 * 60 * 5,
        })
      )
    })

    it('should accept custom limit', () => {
      useServiceReviews('service-1', 10)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['reviews', 'service', 'service-1', 10],
        })
      )
    })

    it('should disable query when serviceId is undefined', () => {
      useServiceReviews(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls reviewService.getServiceReviews', () => {
      useServiceReviews('service-1', 3)
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(reviewService.getServiceReviews).toHaveBeenCalledWith(mockClient, 'service-1', 3)
    })
  })

  // ============================================
  // useTopReviews
  // ============================================
  describe('useTopReviews', () => {
    it('should be a function', () => {
      expect(typeof useTopReviews).toBe('function')
    })

    it('should call useSupabaseQuery with default limit of 6', () => {
      useTopReviews()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['reviews', 'top', 6],
          staleTime: 1000 * 60 * 5,
        })
      )
    })

    it('should accept custom limit', () => {
      useTopReviews(10)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['reviews', 'top', 10],
        })
      )
    })

    it('should pass queryFn that calls reviewService.getTopReviews', () => {
      useTopReviews(8)
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(reviewService.getTopReviews).toHaveBeenCalledWith(mockClient, 8)
    })
  })

  // ============================================
  // useAllServiceReviewStats
  // ============================================
  describe('useAllServiceReviewStats', () => {
    it('should be a function', () => {
      expect(typeof useAllServiceReviewStats).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useAllServiceReviewStats()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['reviews', 'stats', 'all'],
          staleTime: 1000 * 60 * 5,
        })
      )
    })

    it('should pass queryFn that calls reviewService.getAllServiceReviewStats', () => {
      useAllServiceReviewStats()
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(reviewService.getAllServiceReviewStats).toHaveBeenCalledWith(mockClient)
    })
  })
})
