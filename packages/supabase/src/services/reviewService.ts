import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type Review = Database['public']['Tables']['reviews']['Row'];
type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];

/**
 * Get review by booking ID (check if review already exists)
 */
export async function getReviewByBookingId(
  client: SupabaseClient<Database>,
  bookingId: string
): Promise<Review | null> {
  const { data, error } = await client
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create a new review for a booking
 */
export async function createReview(
  client: SupabaseClient<Database>,
  review: ReviewInsert
): Promise<Review> {
  const { data, error } = await client
    .from('reviews')
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// -- Types for public review display --

export interface ServiceReviewStats {
  service_id: string;
  avg_rating: number;
  review_count: number;
  avg_cleanliness: number | null;
  avg_professionalism: number | null;
  avg_skill: number | null;
}

export interface PublicReview {
  id: string;
  rating: number;
  review: string | null;
  cleanliness_rating: number | null;
  professionalism_rating: number | null;
  skill_rating: number | null;
  created_at: string;
  customer_display_name: string;
  service_id: string;
  service_name_th: string | null;
  service_name_en: string | null;
}

/**
 * Get aggregated review stats for all services (or one specific service)
 */
export async function getServiceReviewStats(
  client: SupabaseClient<Database>,
  serviceId?: string
): Promise<ServiceReviewStats[]> {
  const { data, error } = await client.rpc('get_service_review_stats', {
    p_service_id: serviceId || null,
  });
  if (error) throw error;
  return (data as ServiceReviewStats[]) || [];
}

/**
 * Get visible reviews for a specific service
 */
export async function getServiceReviews(
  client: SupabaseClient<Database>,
  serviceId: string,
  limit: number = 5
): Promise<PublicReview[]> {
  const { data, error } = await client.rpc('get_visible_reviews', {
    p_service_id: serviceId,
    p_limit: limit,
    p_min_rating: 1,
  });
  if (error) throw error;
  return (data as PublicReview[]) || [];
}

/**
 * Get top-rated reviews across all services (for homepage)
 */
export async function getTopReviews(
  client: SupabaseClient<Database>,
  limit: number = 6
): Promise<PublicReview[]> {
  const { data, error } = await client.rpc('get_visible_reviews', {
    p_service_id: null,
    p_limit: limit,
    p_min_rating: 4,
  });
  if (error) throw error;
  return (data as PublicReview[]) || [];
}

/**
 * Get review stats for all services at once (for catalog/homepage)
 */
export async function getAllServiceReviewStats(
  client: SupabaseClient<Database>
): Promise<Record<string, ServiceReviewStats>> {
  const stats = await getServiceReviewStats(client);
  const map: Record<string, ServiceReviewStats> = {};
  for (const stat of stats) {
    if (stat.service_id) map[stat.service_id] = stat;
  }
  return map;
}

export const reviewService = {
  getReviewByBookingId,
  createReview,
  getServiceReviewStats,
  getServiceReviews,
  getTopReviews,
  getAllServiceReviewStats,
};
