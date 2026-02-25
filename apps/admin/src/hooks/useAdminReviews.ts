import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAllReviews,
  getReviewStats,
  toggleReviewVisibility,
  getStaffList,
  type AdminReviewFilters,
} from '../services/reviewService'

/**
 * Fetch all reviews with filters
 */
export function useAdminReviews(filters?: AdminReviewFilters) {
  return useQuery({
    queryKey: ['admin-reviews', filters],
    queryFn: () => getAllReviews(filters),
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Fetch review statistics
 */
export function useAdminReviewStats() {
  return useQuery({
    queryKey: ['admin-reviews', 'stats'],
    queryFn: () => getReviewStats(),
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Toggle review visibility mutation
 */
export function useToggleReviewVisibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reviewId, isVisible }: { reviewId: string; isVisible: boolean }) =>
      toggleReviewVisibility(reviewId, isVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
  })
}

/**
 * Fetch staff list for filter dropdown
 */
export function useStaffList() {
  return useQuery({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
    staleTime: 1000 * 60 * 10,
  })
}
