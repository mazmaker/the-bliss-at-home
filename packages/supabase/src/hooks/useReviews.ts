import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { reviewService } from '../services/reviewService';
import type { ServiceReviewStats, PublicReview } from '../services/reviewService';
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

/**
 * Get review stats for a specific service (avg rating, count)
 */
export function useServiceReviewStats(serviceId: string | undefined) {
  return useSupabaseQuery<ServiceReviewStats | null>({
    queryKey: ['reviews', 'stats', serviceId],
    queryFn: async (client) => {
      const stats = await reviewService.getServiceReviewStats(client, serviceId!);
      return stats[0] || null;
    },
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get visible reviews for a specific service
 */
export function useServiceReviews(serviceId: string | undefined, limit: number = 5) {
  return useSupabaseQuery<PublicReview[]>({
    queryKey: ['reviews', 'service', serviceId, limit],
    queryFn: (client) => reviewService.getServiceReviews(client, serviceId!, limit),
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get top-rated reviews across all services (for homepage)
 */
export function useTopReviews(limit: number = 6) {
  return useSupabaseQuery<PublicReview[]>({
    queryKey: ['reviews', 'top', limit],
    queryFn: (client) => reviewService.getTopReviews(client, limit),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get review stats for ALL services at once (for catalog/homepage)
 */
export function useAllServiceReviewStats() {
  return useSupabaseQuery<Record<string, ServiceReviewStats>>({
    queryKey: ['reviews', 'stats', 'all'],
    queryFn: (client) => reviewService.getAllServiceReviewStats(client),
    staleTime: 1000 * 60 * 5,
  });
}
