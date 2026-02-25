import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ============================================
// Types
// ============================================

export interface StaffReview {
  id: string
  staff_id: string
  customer_id: string | null
  service_id: string | null
  booking_id: string | null
  rating: number
  review: string | null
  cleanliness_rating: number | null
  professionalism_rating: number | null
  skill_rating: number | null
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface ReviewsStats {
  total: number
  average_rating: number
  rating_distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

export interface ReviewFilters {
  rating?: number
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest'
}

// ============================================
// Hooks
// ============================================

/**
 * Fetch all reviews for a specific staff member
 */
export function useStaffReviews(staffId: string, filters?: ReviewFilters) {
  return useQuery({
    queryKey: ['staff-reviews', staffId, filters],
    queryFn: async () => {
      let query = supabase
        .from('reviews')
        .select('*')
        .eq('staff_id', staffId)
        .eq('is_visible', true)

      // Apply rating filter
      if (filters?.rating) {
        query = query.eq('rating', filters.rating)
      }

      // Apply sorting
      switch (filters?.sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'highest':
          query = query.order('rating', { ascending: false })
          break
        case 'lowest':
          query = query.order('rating', { ascending: true })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching reviews:', error)
        throw error
      }

      return data as StaffReview[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch review statistics for a staff member
 */
export function useReviewsStats(staffId: string) {
  return useQuery({
    queryKey: ['reviews-stats', staffId],
    queryFn: async () => {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('staff_id', staffId)
        .eq('is_visible', true)

      if (error) {
        console.error('Error fetching reviews stats:', error)
        throw error
      }

      // Calculate statistics
      const total = reviews.length
      const average_rating = total > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
        : 0

      // Calculate rating distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      reviews.forEach((review) => {
        distribution[review.rating as keyof typeof distribution]++
      })

      return {
        total,
        average_rating,
        rating_distribution: distribution,
      } as ReviewsStats
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format date in Thai
 */
export function formatDateThai(dateString: string): string {
  const date = new Date(dateString)
  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]

  const day = date.getDate()
  const month = monthNames[date.getMonth()]
  const year = date.getFullYear() + 543 // Convert to Buddhist year

  return `${day} ${month} ${year}`
}

/**
 * Get relative time string (e.g., "2 วันที่แล้ว")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 60) {
    return `${diffMinutes} นาทีที่แล้ว`
  } else if (diffHours < 24) {
    return `${diffHours} ชั่วโมงที่แล้ว`
  } else if (diffDays < 7) {
    return `${diffDays} วันที่แล้ว`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} สัปดาห์ที่แล้ว`
  } else {
    return formatDateThai(dateString)
  }
}
