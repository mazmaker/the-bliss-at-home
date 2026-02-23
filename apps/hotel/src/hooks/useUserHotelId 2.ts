/**
 * Hook to get the correct hotel ID for the authenticated user
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@bliss/supabase/auth'
import { supabase } from '@bliss/supabase'

interface UseUserHotelIdResult {
  hotelId: string | null
  isLoading: boolean
  error: string | null
}

export function useUserHotelId(): UseUserHotelIdResult {
  const { user, isAuthenticated } = useAuth()
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserHotelId() {
      if (!isAuthenticated || !user) {
        setHotelId(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // First, check if hotel_id is in user metadata
        const userHotelId = user.user_metadata?.hotel_id
        if (userHotelId) {
          console.log('🏨 Hotel ID from user metadata:', userHotelId)
          setHotelId(userHotelId)
          setIsLoading(false)
          return
        }

        // If not in metadata, query the hotels table
        console.log('🔍 Looking up hotel for user:', user.id)

        const { data: hotels, error: queryError } = await supabase
          .from('hotels')
          .select('id, name_th')
          .eq('auth_user_id', user.id)
          .limit(1)

        if (queryError) {
          console.error('❌ Error fetching user hotel:', queryError)
          setError('ไม่สามารถดึงข้อมูลโรงแรมได้')
          setIsLoading(false)
          return
        }

        if (hotels && hotels.length > 0) {
          const foundHotelId = hotels[0].id
          console.log('✅ Found hotel for user:', {
            hotelId: foundHotelId,
            hotelName: hotels[0].name_th,
            userId: user.id
          })
          setHotelId(foundHotelId)
        } else {
          console.warn('⚠️ No hotel found for user:', user.id)
          // Fallback to default hotel for development (Resort Chiang Mai)
          const fallbackHotelId = '550e8400-e29b-41d4-a716-446655440002'
          console.log('🔄 Using fallback hotel:', fallbackHotelId, '(resort-chiang-mai)')
          setHotelId(fallbackHotelId)
        }
      } catch (err) {
        console.error('💥 Error in fetchUserHotelId:', err)
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserHotelId()
  }, [user, isAuthenticated])

  return { hotelId, isLoading, error }
}