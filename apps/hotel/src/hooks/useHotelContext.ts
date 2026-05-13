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
  address?: string
  website?: string
  // เพิ่มข้อมูลแผนที่
  latitude?: number | null
  longitude?: number | null
  // เพิ่มข้อมูลภาษี & การชำระเงิน
  tax_id?: string
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  commission_rate: number
  discount_rate?: number
  discount_amount?: number
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'banned'
  // Banking and tax information fields
  tax_id?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  created_at?: string
  updated_at?: string
  // Credit settings
  credit_days?: number
  credit_start_date?: string | null
  credit_cycle_day?: number | null
}

// Fetch hotel by slug from database (no status filter — caller checks status)
const fetchHotelBySlug = async (slug: string): Promise<HotelData | null> => {
  const { data, error } = await supabase
    .from('hotels')
    .select('id, name_th, name_en, hotel_slug, contact_person, phone, email, address, website, latitude, longitude, tax_id, bank_name, bank_account_number, bank_account_name, commission_rate, discount_rate, discount_amount, status, created_at, updated_at, credit_days, credit_start_date, credit_cycle_day')
    .eq('hotel_slug', slug)
    .single()

  if (error) {
    // If not found by slug, try by ID (backward compatibility)
    const { data: dataById, error: errorById } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', slug)
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
    .select('id, name_th, name_en, hotel_slug, contact_person, phone, email, address, website, latitude, longitude, tax_id, bank_name, bank_account_number, bank_account_name, commission_rate, discount_rate, discount_amount, status, created_at, updated_at, credit_days, credit_start_date, credit_cycle_day')
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

  // Check if hotel is blocked (suspended or banned)
  const hotelStatus = hotelData?.status
  const isBlocked = hotelStatus === 'suspended' || hotelStatus === 'banned'

  return {
    hotelId: hotelData?.id,
    hotelSlug: hotelData?.hotel_slug,
    hotelData,
    isValidHotel,
    isLoading,
    isBlocked,
    hotelStatus,
    error: hotelError,
    // Helper methods
    getHotelName: () => hotelData?.name_th || 'Unknown Hotel',
    getHotelNameEn: () => hotelData?.name_en || 'Unknown Hotel',
    getCommissionRate: () => {
      // ✅ Commission rate สำหรับการคำนวณค่าธรรมเนียม
      return hotelData?.commission_rate || 0;
    },
    getDiscountAmount: () => {
      // ✅ ใช้ discount_amount เป็นหลัก, fallback ไป discount_rate แปลงเป็นเปอร์เซ็นต์
      if (hotelData?.discount_amount !== null && hotelData?.discount_amount !== undefined && hotelData.discount_amount > 0) {
        return hotelData.discount_amount; // จำนวนเงินคงที่ (บาท)
      }

      // Fallback: ถ้ายังไม่มี discount_amount ให้ใช้ discount_rate (backward compatibility)
      if (hotelData?.discount_rate !== null && hotelData?.discount_rate !== undefined && hotelData.discount_rate > 0) {
        // สำหรับ fallback ให้ return 0 เพื่อให้ระบบใช้ percentage calculation แทน
        console.log('🔄 Falling back to percentage discount:', hotelData.discount_rate);
        return 0; // จะใช้ getDiscountRate() แทน
      }

      console.log('🔍 Hotel discount debug:', {
        hotelSlug: hotelData?.hotel_slug,
        discount_amount: hotelData?.discount_amount,
        discount_rate: hotelData?.discount_rate,
        using: 'no_discount'
      });
      return 0;
    },
    getDiscountRate: () => {
      // ✅ สำหรับ backward compatibility เท่านั้น
      return hotelData?.discount_rate || 0;
    },
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