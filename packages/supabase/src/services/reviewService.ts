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

export const reviewService = {
  getReviewByBookingId,
  createReview,
};
