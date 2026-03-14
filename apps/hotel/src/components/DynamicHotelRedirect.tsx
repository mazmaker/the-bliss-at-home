/**
 * Dynamic Hotel Redirect Component
 * Redirects user to their correct hotel dashboard
 * IMPORTANT: Checks password_change_required before redirecting
 */

import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@bliss/supabase/auth'
import { supabase } from '@bliss/supabase'
import { useUserHotelId } from '../hooks/useUserHotelId'
import { getHotelSlugFromId } from '../utils/hotelUtils'
import { Loader2, AlertTriangle, LogOut } from 'lucide-react'
import { EnhancedHotelLogin } from '../pages/auth'

interface DynamicHotelRedirectProps {
  fallbackTo?: string
}

export function DynamicHotelRedirect({
  fallbackTo = "/login"
}: DynamicHotelRedirectProps) {
  const { user, isAuthenticated, logout } = useAuth()
  const { hotelId, isLoading, error } = useUserHotelId()
  const [hotelSlug, setHotelSlug] = useState<string | null>(null)
  const [slugLoading, setSlugLoading] = useState(false)
  const [passwordChangeRequired, setPasswordChangeRequired] = useState<boolean | null>(null)
  const [checkingPassword, setCheckingPassword] = useState(false)
  const [hotelStatus, setHotelStatus] = useState<string | null>(null)

  // Check password change requirement first
  useEffect(() => {
    const checkPasswordRequirement = async () => {
      if (isAuthenticated && user?.role === 'HOTEL' && user.id && !checkingPassword) {
        console.log('🔍 [DynamicRedirect] Checking password requirement for user:', user.id)
        setCheckingPassword(true)

        try {
          const { data: hotelData, error: hotelError } = await supabase
            .from('hotels')
            .select('password_change_required, status')
            .eq('auth_user_id', user.id)
            .single()

          if (!hotelError && hotelData) {
            // Check hotel status first
            if (hotelData.status === 'suspended' || hotelData.status === 'banned') {
              console.log('[DynamicRedirect] Hotel is blocked:', hotelData.status)
              setHotelStatus(hotelData.status)
              setPasswordChangeRequired(false)
              return
            }
            setHotelStatus(hotelData.status || 'active')
            setPasswordChangeRequired(hotelData.password_change_required)
          } else {
            console.error('[DynamicRedirect] Error checking hotel:', hotelError)
            setPasswordChangeRequired(false)
          }
        } catch (error) {
          console.error('[DynamicRedirect] Exception checking hotel:', error)
          setPasswordChangeRequired(false)
        } finally {
          setCheckingPassword(false)
        }
      }
    }

    checkPasswordRequirement()
  }, [isAuthenticated, user])

  // Fetch hotel slug when hotel ID is available AND password check is done
  useEffect(() => {
    if (hotelId && !slugLoading && passwordChangeRequired === false) {
      console.log('🎯 [DynamicRedirect] No password change required, getting hotel slug...')
      setSlugLoading(true)
      getHotelSlugFromId(hotelId)
        .then(slug => {
          console.log('🎯 Hotel slug resolved:', { hotelId, slug })
          setHotelSlug(slug)
        })
        .catch(err => {
          console.error('❌ Error getting hotel slug:', err)
          // Get slug from current URL instead of hard fallback
          const currentPath = window.location.pathname
          const urlSlug = currentPath.match(/\/hotel\/([^\/]+)/)?.[1] || 'resort-chiang-mai'
          console.log('🔄 Using URL-based fallback:', urlSlug)
          setHotelSlug(urlSlug)
        })
        .finally(() => {
          setSlugLoading(false)
        })
    }
  }, [hotelId, passwordChangeRequired])

  // Loading state
  if (isLoading || slugLoading || checkingPassword || passwordChangeRequired === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-2" />
          <p className="text-stone-600">กำลังค้นหาข้อมูลโรงแรม...</p>
        </div>
      </div>
    )
  }

  // Hotel is suspended or banned — block access
  if (hotelStatus === 'suspended' || hotelStatus === 'banned') {
    const handleLogout = async () => {
      try {
        await logout()
      } catch (err) {
        console.error('Logout error:', err)
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className={`w-16 h-16 ${hotelStatus === 'banned' ? 'bg-red-100' : 'bg-orange-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <AlertTriangle className={`w-8 h-8 ${hotelStatus === 'banned' ? 'text-red-500' : 'text-orange-500'}`} />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">
            {hotelStatus === 'banned' ? 'บัญชีถูกแบนถาวร' : 'บัญชีถูกระงับการใช้งาน'}
          </h1>
          <p className="text-stone-600 mb-6">
            {hotelStatus === 'banned'
              ? 'บัญชีโรงแรมของท่านถูกแบนถาวร ไม่สามารถเข้าใช้งานระบบได้ กรุณาติดต่อผู้ดูแลระบบ'
              : 'บัญชีโรงแรมของท่านถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบเพื่อขอเปิดใช้งานอีกครั้ง'}
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-700 text-white rounded-lg hover:bg-stone-800 transition"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>
    )
  }

  // If password change is required, show the login page for password change
  if (passwordChangeRequired === true) {
    return <EnhancedHotelLogin />
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