import { useState, useEffect } from 'react'
import { MessageCircle, Facebook, Clock, X, Sparkles, Star } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'
import { LINE_CONTACT_URL, FACEBOOK_CONTACT_URL } from '../config/contact'

interface EmergencyBookingBannerProps {
  onContactAdmin?: (method: 'line' | 'facebook') => void
}

// Force customer app redeploy - CORS fix 2026-05-22 15:15

export default function EmergencyBookingBanner({ onContactAdmin }: EmergencyBookingBannerProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(true)
  const [currentStats, setCurrentStats] = useState(42)

  // Gentle animation for engagement
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStats(prev => prev + Math.floor(Math.random() * 2))
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  if (!isVisible) return null

  const handleContact = (method: 'line' | 'facebook') => {
    onContactAdmin?.(method)

    switch (method) {
      case 'line':
        window.open(LINE_CONTACT_URL, '_blank', 'noopener,noreferrer')
        break
      case 'facebook':
        window.open(FACEBOOK_CONTACT_URL, '_blank', 'noopener,noreferrer')
        break
    }
  }

  return (
    <div className="relative rounded-xl my-3 shadow-sm overflow-hidden border border-bliss-500" style={{ backgroundColor: '#a7a87f' }}>

      <div className="relative p-6 text-center">
        {/* Badge */}
        <div className="inline-block bg-white px-4 py-2 rounded-full text-bliss-600 text-sm font-medium mb-4 shadow-sm">
          {t('services:emergencyService.badge')}
        </div>

        {/* Main heading */}
        <h3 className="text-xl font-semibold text-bliss-900 mb-2">
          {t('services:emergencyService.heading')}
        </h3>

        {/* Subtitle */}
        <p className="text-bliss-700 text-sm mb-6">
          {t('services:emergencyService.subtitle')}
        </p>

        {/* Contact buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => handleContact('line')}
            className="flex items-center gap-2 bg-white text-bliss-700 px-4 py-2 rounded-lg text-sm hover:bg-bliss-100 transition-all border border-bliss-300 shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            {t('common:emergencyService.lineButton')}
          </button>

          <button
            onClick={() => handleContact('facebook')}
            className="flex items-center gap-2 bg-white text-bliss-700 px-4 py-2 rounded-lg text-sm hover:bg-bliss-100 transition-all border border-bliss-300 shadow-sm"
          >
            <Facebook className="w-4 h-4" />
            {t('common:emergencyService.facebookButton')}
          </button>
        </div>
      </div>
    </div>
  )
}