import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: true, error: null })),
}))

import {
  useStaffReviews,
  useReviewsStats,
  formatDateThai,
  getRelativeTime,
} from '../useStaffReviews'

import type {
  StaffReview,
  ReviewsStats,
  ReviewFilters,
} from '../useStaffReviews'

describe('useStaffReviews hooks', () => {
  it('exports useStaffReviews as a function', () => {
    expect(typeof useStaffReviews).toBe('function')
  })

  it('exports useReviewsStats as a function', () => {
    expect(typeof useReviewsStats).toBe('function')
  })
})

describe('formatDateThai', () => {
  it('formats a date in Thai with Buddhist year', () => {
    // January 15, 2026 -> 15 ม.ค. 2569
    const result = formatDateThai('2026-01-15T00:00:00Z')
    expect(result).toContain('ม.ค.')
    expect(result).toContain('2569')
    expect(result).toContain('15')
  })

  it('formats February correctly', () => {
    const result = formatDateThai('2026-02-20T00:00:00Z')
    expect(result).toContain('ก.พ.')
  })

  it('formats March correctly', () => {
    const result = formatDateThai('2026-03-01T00:00:00Z')
    expect(result).toContain('มี.ค.')
  })

  it('formats December correctly', () => {
    const result = formatDateThai('2026-12-25T00:00:00Z')
    expect(result).toContain('ธ.ค.')
  })

  it('converts year to Buddhist era (year + 543)', () => {
    const result = formatDateThai('2025-06-01T00:00:00Z')
    expect(result).toContain('2568') // 2025 + 543
  })
})

describe('getRelativeTime', () => {
  it('returns minutes for recent times', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const result = getRelativeTime(fiveMinutesAgo)
    expect(result).toContain('นาทีที่แล้ว')
  })

  it('returns hours for times within a day', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    const result = getRelativeTime(threeHoursAgo)
    expect(result).toContain('ชั่วโมงที่แล้ว')
  })

  it('returns days for times within a week', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const result = getRelativeTime(threeDaysAgo)
    expect(result).toContain('วันที่แล้ว')
  })

  it('returns weeks for times within a month', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const result = getRelativeTime(twoWeeksAgo)
    expect(result).toContain('สัปดาห์ที่แล้ว')
  })

  it('returns formatted Thai date for times older than a month', () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const result = getRelativeTime(twoMonthsAgo)
    // Should return the formatDateThai result (contains Thai month abbreviation)
    expect(result).toMatch(/\d+\s+\S+\.\s+\d+/)
  })
})

describe('StaffReview type', () => {
  it('can create a valid StaffReview object', () => {
    const review: StaffReview = {
      id: 'review-1',
      staff_id: 'staff-1',
      customer_id: 'cust-1',
      service_id: 'svc-1',
      booking_id: 'booking-1',
      rating: 5,
      review: 'Excellent service',
      cleanliness_rating: 5,
      professionalism_rating: 5,
      skill_rating: 5,
      is_visible: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    expect(review.rating).toBe(5)
    expect(review.is_visible).toBe(true)
  })

  it('supports null optional fields', () => {
    const review: StaffReview = {
      id: 'review-2',
      staff_id: 'staff-1',
      customer_id: null,
      service_id: null,
      booking_id: null,
      rating: 3,
      review: null,
      cleanliness_rating: null,
      professionalism_rating: null,
      skill_rating: null,
      is_visible: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    expect(review.customer_id).toBeNull()
    expect(review.review).toBeNull()
  })
})

describe('ReviewsStats type', () => {
  it('can create a valid ReviewsStats object', () => {
    const stats: ReviewsStats = {
      total: 50,
      average_rating: 4.2,
      rating_distribution: {
        1: 2,
        2: 3,
        3: 5,
        4: 15,
        5: 25,
      },
    }
    expect(stats.total).toBe(50)
    expect(stats.average_rating).toBe(4.2)
    const totalFromDist = Object.values(stats.rating_distribution).reduce((a, b) => a + b, 0)
    expect(totalFromDist).toBe(stats.total)
  })
})

describe('ReviewFilters type', () => {
  it('can create filter with rating', () => {
    const filters: ReviewFilters = { rating: 5 }
    expect(filters.rating).toBe(5)
  })

  it('can create filter with sortBy', () => {
    const sortOptions: ReviewFilters['sortBy'][] = ['newest', 'oldest', 'highest', 'lowest']
    sortOptions.forEach(sortBy => {
      const filters: ReviewFilters = { sortBy }
      expect(filters.sortBy).toBe(sortBy)
    })
  })

  it('can create filter with both rating and sortBy', () => {
    const filters: ReviewFilters = { rating: 4, sortBy: 'newest' }
    expect(filters.rating).toBe(4)
    expect(filters.sortBy).toBe('newest')
  })
})
