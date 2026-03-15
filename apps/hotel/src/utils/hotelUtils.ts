/**
 * Hotel Utilities - Dynamic Hotel ID to Slug conversion
 *
 * This utility provides functions to convert between hotel IDs and slugs
 * using live database queries instead of static mappings.
 */

import { supabase } from '@bliss/supabase/auth'

// Cache for ID to slug mappings to avoid repeated database calls
const idToSlugCache = new Map<string, string>()
const slugToIdCache = new Map<string, string>()

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000

interface CacheEntry {
  value: string
  timestamp: number
}

const cache = new Map<string, CacheEntry>()

/**
 * Convert hotel ID to slug using database query
 * @param hotelId - The hotel ID
 * @returns Promise<string> - The hotel slug or fallback
 */
export async function getHotelSlugFromId(hotelId: string): Promise<string> {
  // Check cache first
  const cacheKey = `id-to-slug:${hotelId}`
  const cached = cache.get(cacheKey)

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.value
  }

  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('hotel_slug')
      .eq('id', hotelId)
      .eq('status', 'active')
      .single()

    if (error || !data?.hotel_slug) {
      console.warn('Hotel ID not found, using fallback:', hotelId)
      return 'resort-chiang-mai' // Fallback slug
    }

    // Cache the result
    cache.set(cacheKey, {
      value: data.hotel_slug,
      timestamp: Date.now()
    })

    return data.hotel_slug
  } catch (error) {
    console.error('Error fetching hotel slug:', error)
    return 'resort-chiang-mai' // Fallback slug
  }
}

/**
 * Convert hotel slug to ID using database query
 * @param hotelSlug - The hotel slug
 * @returns Promise<string | null> - The hotel ID or null if not found
 */
export async function getHotelIdFromSlug(hotelSlug: string): Promise<string | null> {
  // Check cache first
  const cacheKey = `slug-to-id:${hotelSlug}`
  const cached = cache.get(cacheKey)

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.value
  }

  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('id')
      .eq('hotel_slug', hotelSlug)
      .eq('status', 'active')
      .single()

    if (error || !data?.id) {
      return null
    }

    // Cache the result
    cache.set(cacheKey, {
      value: data.id,
      timestamp: Date.now()
    })

    return data.id
  } catch (error) {
    console.error('Error fetching hotel ID:', error)
    return null
  }
}

/**
 * Get all hotels with ID and slug mapping
 * @returns Promise<Array<{id: string, hotel_slug: string}>> - Array of hotel ID/slug pairs
 */
export async function getAllHotelMappings(): Promise<Array<{id: string, hotel_slug: string}>> {
  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('id, hotel_slug')
      .eq('status', 'active')
      .order('name_th', { ascending: true })

    if (error) {
      console.error('Error fetching hotel mappings:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching hotel mappings:', error)
    return []
  }
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearHotelCache(): void {
  cache.clear()
}

/**
 * Backward compatibility: Static mapping as fallback
 * This should be used only when database is unavailable
 */
export const STATIC_HOTEL_ID_TO_SLUG = {
  '550e8400-e29b-41d4-a716-446655440001': 'grand-palace-bangkok',
  '550e8400-e29b-41d4-a716-446655440002': 'resort-chiang-mai',
  '550e8400-e29b-41d4-a716-446655440003': 'dusit-thani-bangkok'
} as const

/**
 * Fallback function for when database is unavailable
 * @param hotelId - The hotel ID
 * @returns string - The hotel slug or fallback
 */
export function getHotelSlugFromIdStatic(hotelId: string): string {
  return STATIC_HOTEL_ID_TO_SLUG[hotelId as keyof typeof STATIC_HOTEL_ID_TO_SLUG] || 'resort-chiang-mai'
}