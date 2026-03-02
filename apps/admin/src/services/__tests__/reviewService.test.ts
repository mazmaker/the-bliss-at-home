import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockSingle,
  mockUpdate,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    update: mockUpdate,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  return { mockFrom, mockSelect, mockEq, mockOrder, mockSingle, mockUpdate }
})

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import {
  getAllReviews,
  getReviewStats,
  toggleReviewVisibility,
  getStaffList,
} from '../reviewService'
import type { AdminReview, AdminReviewFilters, ReviewStats } from '../reviewService'

describe('reviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllReviews', () => {
    it('should fetch all reviews without filters', async () => {
      const mockReviews = [
        {
          id: '1',
          rating: 5,
          review: 'Excellent service',
          is_visible: true,
          created_at: '2026-01-01',
          staff: { name_th: 'สมหญิง' },
          customer: { full_name: 'ลูกค้า' },
        },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockReviews, error: null })

      const result = await getAllReviews()

      expect(mockFrom).toHaveBeenCalledWith('reviews')
      expect(result).toHaveLength(1)
    })

    it('should apply rating filter', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      await getAllReviews({ rating: 5 })

      expect(mockEq).toHaveBeenCalledWith('rating', 5)
    })

    it('should apply staffId filter', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      await getAllReviews({ staffId: 'staff-1' })

      expect(mockEq).toHaveBeenCalledWith('staff_id', 'staff-1')
    })

    it('should apply visible visibility filter', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      await getAllReviews({ isVisible: 'visible' })

      expect(mockEq).toHaveBeenCalledWith('is_visible', true)
    })

    it('should apply hidden visibility filter', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      await getAllReviews({ isVisible: 'hidden' })

      expect(mockEq).toHaveBeenCalledWith('is_visible', false)
    })

    it('should sort by rating ascending for lowest', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      await getAllReviews({ sortBy: 'lowest' })

      expect(mockOrder).toHaveBeenCalledWith('rating', { ascending: true })
    })

    it('should sort by rating descending for highest', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      await getAllReviews({ sortBy: 'highest' })

      expect(mockOrder).toHaveBeenCalledWith('rating', { ascending: false })
    })

    it('should filter by service category client-side', async () => {
      const mockReviews = [
        { id: '1', service: { category: 'massage' }, rating: 5, review: 'test' },
        { id: '2', service: { category: 'nail' }, rating: 4, review: 'test2' },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockReviews, error: null })

      const result = await getAllReviews({ serviceCategory: 'massage' })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should filter by search term client-side', async () => {
      const mockReviews = [
        { id: '1', review: 'Great service', customer: { full_name: 'John' }, staff: { name_th: 'Staff1', name_en: null }, booking: null },
        { id: '2', review: 'Bad experience', customer: { full_name: 'Jane' }, staff: { name_th: 'Staff2', name_en: null }, booking: null },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockReviews, error: null })

      const result = await getAllReviews({ search: 'great' })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should throw on supabase error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(getAllReviews()).rejects.toThrow()
    })
  })

  describe('getReviewStats', () => {
    it('should calculate stats from review data', async () => {
      const mockData = [
        { rating: 5, is_visible: true },
        { rating: 4, is_visible: true },
        { rating: 3, is_visible: false },
        { rating: 5, is_visible: true },
        { rating: 1, is_visible: false },
      ]

      mockSelect.mockResolvedValueOnce({ data: mockData, error: null })

      const stats = await getReviewStats()

      expect(stats.total).toBe(5)
      expect(stats.visible_count).toBe(3)
      expect(stats.hidden_count).toBe(2)
      expect(stats.average_rating).toBe(3.6)
      expect(stats.rating_distribution[5]).toBe(2)
      expect(stats.rating_distribution[4]).toBe(1)
      expect(stats.rating_distribution[3]).toBe(1)
      expect(stats.rating_distribution[1]).toBe(1)
    })

    it('should handle empty data', async () => {
      mockSelect.mockResolvedValueOnce({ data: [], error: null })

      const stats = await getReviewStats()

      expect(stats.total).toBe(0)
      expect(stats.average_rating).toBe(0)
      expect(stats.visible_count).toBe(0)
    })

    it('should throw on error', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getReviewStats()).rejects.toThrow()
    })
  })

  describe('toggleReviewVisibility', () => {
    it('should update review visibility', async () => {
      const mockReview = { id: 'review-1', is_visible: true }

      mockSingle.mockResolvedValueOnce({ data: mockReview, error: null })

      const result = await toggleReviewVisibility('review-1', true)

      expect(mockFrom).toHaveBeenCalledWith('reviews')
      expect(mockUpdate).toHaveBeenCalledWith({ is_visible: true })
      expect(result.id).toBe('review-1')
    })

    it('should throw on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(toggleReviewVisibility('bad-id', false)).rejects.toThrow()
    })
  })

  describe('getStaffList', () => {
    it('should fetch active staff list ordered by name', async () => {
      const mockStaff = [
        { id: '1', name_th: 'กาญจนา', name_en: 'Kanchana' },
        { id: '2', name_th: 'สมชาย', name_en: 'Somchai' },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockStaff, error: null })

      const result = await getStaffList()

      expect(mockFrom).toHaveBeenCalledWith('staff')
      expect(mockEq).toHaveBeenCalledWith('status', 'active')
      expect(mockOrder).toHaveBeenCalledWith('name_th')
      expect(result).toHaveLength(2)
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getStaffList()).rejects.toThrow()
    })
  })
})

describe('reviewService types', () => {
  it('should validate AdminReviewFilters shape', () => {
    const filters: AdminReviewFilters = {
      rating: 5,
      staffId: 'staff-1',
      serviceCategory: 'massage',
      search: 'test',
      isVisible: 'visible',
      sortBy: 'newest',
    }
    expect(filters).toBeDefined()
    expect(filters.rating).toBe(5)
    expect(filters.isVisible).toBe('visible')
  })

  it('should validate ReviewStats shape', () => {
    const stats: ReviewStats = {
      total: 100,
      average_rating: 4.5,
      visible_count: 80,
      hidden_count: 20,
      rating_distribution: { 1: 2, 2: 3, 3: 15, 4: 30, 5: 50 },
    }
    expect(stats.total).toBe(100)
    expect(stats.rating_distribution[5]).toBe(50)
  })
})
