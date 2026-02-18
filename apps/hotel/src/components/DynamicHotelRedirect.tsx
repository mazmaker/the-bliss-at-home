/**
 * Dynamic Hotel Redirect Component
 * Redirects user to their correct hotel dashboard
 */

import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useUserHotelId } from '../hooks/useUserHotelId'
import { getHotelSlugFromId } from '../utils/hotelUtils'
import { Loader2 } from 'lucide-react'

interface DynamicHotelRedirectProps {
  fallbackTo?: string
}

export function DynamicHotelRedirect({
  fallbackTo = "/login"
}: DynamicHotelRedirectProps) {
  const { hotelId, isLoading, error } = useUserHotelId()
  const [hotelSlug, setHotelSlug] = useState<string | null>(null)
  const [slugLoading, setSlugLoading] = useState(false)

  // Fetch hotel slug when hotel ID is available
  useEffect(() => {
    if (hotelId && !slugLoading) {
      setSlugLoading(true)
      getHotelSlugFromId(hotelId)
        .then(slug => {
          console.log('🎯 Hotel slug resolved:', { hotelId, slug })
          setHotelSlug(slug)
        })
        .catch(err => {
          console.error('❌ Error getting hotel slug:', err)
          setHotelSlug('resort-chiang-mai') // Fallback
        })
        .finally(() => {
          setSlugLoading(false)
        })
    }
  }, [hotelId])

  // Loading state
  if (isLoading || slugLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-2" />
          <p className="text-stone-600">กำลังค้นหาข้อมูลโรงแรม...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    console.error('❌ DynamicHotelRedirect error:', error)
    return <Navigate to={fallbackTo} replace />
  }

  // Success - redirect to hotel dashboard using slug
  if (hotelId && hotelSlug) {
    console.log('🎯 Redirecting to hotel:', { hotelId, hotelSlug })
    return <Navigate to={`/hotel/${hotelSlug}`} replace />
  }

  // Fallback
  console.warn('⚠️ No hotel ID found, redirecting to fallback')
  return <Navigate to={fallbackTo} replace />
}

export default DynamicHotelRedirect