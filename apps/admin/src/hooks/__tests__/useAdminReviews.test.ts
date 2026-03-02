import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../services/reviewService', () => ({
  getAllReviews: vi.fn(),
  getReviewStats: vi.fn(),
  toggleReviewVisibility: vi.fn(),
  getStaffList: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: true, error: null })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))

import {
  useAdminReviews,
  useAdminReviewStats,
  useToggleReviewVisibility,
  useStaffList,
} from '../useAdminReviews'

describe('useAdminReviews', () => {
  it('exports useAdminReviews as a function', () => {
    expect(typeof useAdminReviews).toBe('function')
  })

  it('exports useAdminReviewStats as a function', () => {
    expect(typeof useAdminReviewStats).toBe('function')
  })

  it('exports useToggleReviewVisibility as a function', () => {
    expect(typeof useToggleReviewVisibility).toBe('function')
  })

  it('exports useStaffList as a function', () => {
    expect(typeof useStaffList).toBe('function')
  })
})
