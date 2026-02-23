import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'

// ✅ Hotel data interface from database
export interface HotelData {
  id: string
  name_th: string
  name_en: string
  hotel_slug: string
  contact_person?: string
  phone?: string
  email?: string
  commission_rate: number
  status: 'active' | 'inactive'
  // Banking and tax information fields
  tax_id?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  created_at?: string
  updated_at?: string
}

// Fetch hotel by slug from database
const fetchHotelBySlug = async (slug: string): Promise<HotelData | null> => {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('hotel_slug', slug)
    .eq('status', 'active')
    .single()

  if (error) {
    // If not found by slug, try by ID (backward compatibility)
    const { data: dataById, error: errorById } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', slug)
      .eq('status', 'active')
      .single()

    if (errorById) {
      console.warn('Hotel not found:', slug)
      return null
    }

    return dataById as HotelData
  }

  return data as HotelData
}

// Fetch all hotels from database
const fetchAllHotels = async (): Promise<HotelData[]> => {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('status', 'active')
    .order('name_th', { ascending: true })

  if (error) {
    console.error('Error fetching hotels:', error)
    return []
  }

  return (data || []) as HotelData[]
}

export const useHotelContext = () => {
  const { hotelSlug } = useParams<{ hotelSlug: string }>()

  // Fetch current hotel data by slug/ID
  const {
    data: hotelData,
    isLoading: hotelLoading,
    error: hotelError
  } = useQuery({
    queryKey: ['hotel', hotelSlug],
    queryFn: () => fetchHotelBySlug(hotelSlug!),
    enabled: !!hotelSlug,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1
  })

  // Fetch all available hotels
  const {
    data: availableHotels = [],
    isLoading: hotelsLoading
  } = useQuery({
    queryKey: ['hotels', 'all'],
    queryFn: fetchAllHotels,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    retry: 1
  })

  const isLoading = hotelLoading || hotelsLoading
  const isValidHotel = !!hotelData && !hotelError

  return {
    hotelId: hotelData?.id,
    hotelSlug: hotelData?.hotel_slug,
    hotelData,
    isValidHotel,
    isLoading,
    error: hotelError,
    // Helper methods
    getHotelName: () => hotelData?.name_th || 'Unknown Hotel',
    getHotelNameEn: () => hotelData?.name_en || 'Unknown Hotel',
    getCommissionRate: () => hotelData?.commission_rate || 20,
    getHotelSlug: () => hotelData?.hotel_slug || 'unknown-hotel',
    // Available hotels list (now from database)
    availableHotels
  }
}

// Export hotel constants for easy access (backward compatibility)
// Note: These should eventually be phased out as data comes from database
export const HOTEL_IDS = {
  NIMMAN_RESORT: '550e8400-e29b-41d4-a716-446655440002',
  DUSIT_THANI: '550e8400-e29b-41d4-a716-446655440003',
  HILTON_BANGKOK: '550e8400-e29b-41d4-a716-446655440001'
} as const

export const HOTEL_SLUGS = {
  RESORT_CHIANG_MAI: 'resort-chiang-mai',
  DUSIT_THANI_BANGKOK: 'dusit-thani-bangkok',
  GRAND_PALACE_BANGKOK: 'grand-palace-bangkok'
} as const