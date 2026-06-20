import { useState, useEffect } from 'react'
import { Phone, MessageCircle, Clock, X, Sparkles, Star } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'

interface EmergencyBookingBannerProps {
  onContactAdmin?: (method: 'phone' | 'line' | 'chat') => void
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

  const handleContact = (method: 'phone' | 'line' | 'chat') => {
    onContactAdmin?.(method)

    switch (method) {
      case 'phone':
        window.open('tel:+66-XX-XXX-XXXX')
        break
      case 'line':
        window.open('https://line.me/ti/p/@blissathome')
        break
      case 'chat':
        window.open(`https://wa.me/66XXXXXXXXX?text=${encodeURIComponent(t('emergency:bannerWhatsappText'))}`)
        break
    }
  }

  return (
    <div className="relative rounded-xl my-3 shadow-lg overflow-hidden" style={{ backgroundColor: '#D29B25' }}>

      <div className="relative p-6 text-center">
        {/* White badge */}
        <div className="inline-block bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-amber-800 text-sm font-medium mb-4">
          {t('services:emergencyService.badge')}
        </div>

        {/* Main heading */}
        <h3 className="text-xl font-semibold text-white mb-2">
          {t('services:emergencyService.heading')}
        </h3>

        {/* Subtitle */}
        <p className="text-white/90 text-sm mb-6">
          {t('services:emergencyService.subtitle')}
        </p>

        {/* Contact buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => handleContact('phone')}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm hover:bg-white/30 transition-all border border-white/20"
          >
            <Phone className="w-4 h-4" />
            {t('common:emergencyService.callButton')}
          </button>

          <button
            onClick={() => handleContact('line')}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm hover:bg-white/30 transition-all border border-white/20"
          >
            <MessageCircle className="w-4 h-4" />
            {t('common:emergencyService.lineButton')}
          </button>

          <button
            onClick={() => handleContact('chat')}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm hover:bg-white/30 transition-all border border-white/20"
          >
            <MessageCircle className="w-4 h-4" />
            {t('common:emergencyService.whatsappButton')}
          </button>
        </div>
      </div>
    </div>
  )
}