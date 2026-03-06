import { supabase } from '../lib/supabase'

export interface AdminReview {
  id: string
  booking_id: string | null
  customer_id: string | null
  staff_id: string | null
  service_id: string | null
  rating: number
  review: string | null
  cleanliness_rating: number | null
  professionalism_rating: number | null
  skill_rating: number | null
  is_visible: boolean
  created_at: string
  updated_at: string
  staff?: { id: string; name_th: string; name_en: string | null } | null
  service?: { id: string; name_th: string; name_en: string | null; category: string } | null
  customer?: { id: string; full_name: string; phone: string | null } | null
  booking?: { id: string; booking_number: string } | null
}

export interface AdminReviewFilters {
  rating?: number
  staffId?: string
  serviceCategory?: string
  search?: string
  isVisible?: 'all' | 'visible' | 'hidden'
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest'
}

export interface ReviewStats {
  total: number
  average_rating: number
  visible_count: number
  hidden_count: number
  rating_distribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
}

/**
 * Fetch all reviews with joined relations
 */
export async function getAllReviews(filters?: AdminReviewFilters): Promise<AdminReview[]> {
  let query = supabase
    .from('reviews')
    .select(`
      *,
      staff:staff_id(id, name_th, name_en),
      service:service_id(id, name_th, name_en, category),
      customer:customer_id(id, full_name, phone),
      booking:booking_id(id, booking_number)
    `)

  // Filter by rating
  if (filters?.rating) {
    query = query.eq('rating', filters.rating)
  }

  // Filter by staff
  if (filters?.staffId) {
    query = query.eq('staff_id', filters.staffId)
  }

  // Filter by visibility
  if (filters?.isVisible === 'visible') {
    query = query.eq('is_visible', true)
  } else if (filters?.isVisible === 'hidden') {
    query = query.eq('is_visible', false)
  }

  // Sort
  switch (filters?.sortBy) {
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

  if (error) throw error

  let reviews = data as AdminReview[]

  // Client-side filters
  if (filters?.serviceCategory) {
    reviews = reviews.filter((r) => r.service?.category === filters.serviceCategory)
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase()
    reviews = reviews.filter((r) =>
      r.review?.toLowerCase().includes(q) ||
      r.customer?.full_name?.toLowerCase().includes(q) ||
      r.staff?.name_th?.toLowerCase().includes(q) ||
      r.staff?.name_en?.toLowerCase().includes(q) ||
      r.booking?.booking_number?.toLowerCase().includes(q)
    )
  }

  return reviews
}

/**
 * Get review statistics
 */
export async function getReviewStats(): Promise<ReviewStats> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating, is_visible')

  if (error) throw error

  const total = data.length
  const visible_count = data.filter((r) => r.is_visible).length
  const hidden_count = total - visible_count
  const average_rating = total > 0 ? data.reduce((sum, r) => sum + r.rating, 0) / total : 0
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  data.forEach((r) => {
    distribution[r.rating as keyof typeof distribution]++
  })

  return { total, average_rating, visible_count, hidden_count, rating_distribution: distribution }
}

/**
 * Toggle review visibility
 */
export async function toggleReviewVisibility(reviewId: string, isVisible: boolean): Promise<AdminReview> {
  const { data, error } = await supabase
    .from('reviews')
    .update({ is_visible: isVisible })
    .eq('id', reviewId)
    .select()
    .single()

  if (error) throw error
  return data as AdminReview
}

/**
 * Get all staff for filter dropdown
 */
export async function getStaffList(): Promise<Array<{ id: string; name_th: string; name_en: string | null }>> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, name_th, name_en')
    .eq('status', 'active')
    .order('name_th')

  if (error) throw error
  return data
}
