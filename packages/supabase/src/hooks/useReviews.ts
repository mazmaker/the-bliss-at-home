import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { reviewService } from '../services/reviewService';
import { Database } from '../types/database.types';

type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];

/**
 * Get review by booking ID (check if already reviewed)
 */
export function useReviewByBookingId(bookingId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['reviews', 'booking', bookingId],
    queryFn: (client) => reviewService.getReviewByBookingId(client, bookingId!),
    enabled: !!bookingId,
  });
}

/**
 * Create a new review
 */
export function useCreateReview() {
  return useSupabaseMutation({
    mutationFn: async (client, review: ReviewInsert) => {
      return reviewService.createReview(client, review);
    },
    invalidateKeys: (result) => [
      ['reviews', 'booking', result?.booking_id],
    ],
  });
}
