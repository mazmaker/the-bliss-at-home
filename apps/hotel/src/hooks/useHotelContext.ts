import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

// ✅ Real hotel data from database
const REAL_HOTELS = {
  '550e8400-e29b-41d4-a716-446655440002': {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name_th: 'รีสอร์ทในฝัน เชียงใหม่',
    name_en: 'Nimman Resort',
    contact_person: 'คุณวิชัย รวยมั่ง',
    phone: '053-123-456',
    email: 'booking@nimman.com',
    commission_rate: 15,
    status: 'active'
  },
  '550e8400-e29b-41d4-a716-446655440003': {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name_th: 'โรงแรมดุสิต ธานี',
    name_en: 'Dusit Thani',
    contact_person: 'คุณสมหมาย ร่ำรวย',
    phone: '02-987-6543',
    email: 'info@dusit.com',
    commission_rate: 25,
    status: 'active'
  },
  '550e8400-e29b-41d4-a716-446655440001': {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name_th: 'โรงแรมฮิลตัน กรุงเทพฯ',
    name_en: 'Hilton Bangkok',
    contact_person: 'คุณสมศรี มั่งมี',
    phone: '02-123-4567',
    email: 'reservations@hilton.com',
    commission_rate: 20,
    status: 'active'
  }
} as const

export type HotelData = (typeof REAL_HOTELS)[keyof typeof REAL_HOTELS]

export const useHotelContext = () => {
  const { hotelId } = useParams<{ hotelId: string }>()
  const [hotelData, setHotelData] = useState<HotelData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)

    if (hotelId && REAL_HOTELS[hotelId as keyof typeof REAL_HOTELS]) {
      setHotelData(REAL_HOTELS[hotelId as keyof typeof REAL_HOTELS])
    } else {
      setHotelData(null)
    }

    setIsLoading(false)
  }, [hotelId])

  return {
    hotelId,
    hotelData,
    isValidHotel: !!hotelData,
    isLoading,
    // Helper methods
    getHotelName: () => hotelData?.name_th || 'Unknown Hotel',
    getHotelNameEn: () => hotelData?.name_en || 'Unknown Hotel',
    getCommissionRate: () => hotelData?.commission_rate || 20,
    // Available hotels list
    availableHotels: Object.values(REAL_HOTELS)
  }
}

// Export hotel constants for easy access
export const HOTEL_IDS = {
  NIMMAN_RESORT: '550e8400-e29b-41d4-a716-446655440002',
  DUSIT_THANI: '550e8400-e29b-41d4-a716-446655440003',
  HILTON_BANGKOK: '550e8400-e29b-41d4-a716-446655440001'
} as const

export { REAL_HOTELS }